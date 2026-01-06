import { graphqlRequest, CHANNEL } from "../client";
import type {
  PromoCodeAddResponse,
  PromoCodeRemoveResponse,
} from "../types/promocode.types";
import { createCart } from "./cart.service"; // оставляем, если где-то используется

export interface VoucherInfo {
  code: string;
  discountPercent: number;
  discountAmount?: number;
  discountType?: "PERCENTAGE" | "FIXED";
}

// Преобразование checkout token -> GraphQL ID (Checkout:token -> base64)
function checkoutIdToGraphQLId(id: string): string {
  if (!id) return id;
  // если уже GraphQL ID
  if (id.startsWith("Q2hlY2tvdXQ6")) {
    return id;
  }
  const raw = `Checkout:${id}`;
  try {
    // в браузере есть btoa
    return typeof window !== "undefined" ? btoa(raw) : Buffer.from(raw).toString("base64");
  } catch {
    return id; // в крайнем случае шлём как есть
  }
}

// Валидация промокода через кастомный REST-эндпоинт (без привязки к checkout)
export async function validatePromoCode(
  promoCode: string,
  checkoutId?: string,
): Promise<VoucherInfo | null> {
  try {
    const trimmedCode = promoCode.trim();
    if (!trimmedCode) {
      throw new Error("Промокод не может быть пустым");
    }

    const { useCartStore } = await import("@/stores/useCart");
    const cartState = useCartStore.getState();
    const items = cartState.items || [];

    if (!items || items.length === 0) {
      throw new Error("Корзина пуста. Добавьте товары в корзину перед применением промокода.");
    }

    const variantIds: string[] = [];
    const quantities: number[] = [];

    for (const item of items) {
      if (!item.product) continue;
      const itemId = item.variantId || item.id;
      if (!itemId) continue;
      variantIds.push(itemId);
      // Для валидации промокода не даём больше 1 позиции на товар,
      // чтобы не ловить ошибку Saleor \"Cannot add more than 1 times this item\"
      quantities.push(1);
    }

    if (variantIds.length === 0) {
      throw new Error(
        "Не удалось определить товары в корзине. Убедитесь, что товары добавлены в корзину и имеют корректные данные.",
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? "";
    if (!baseUrl) {
      throw new Error("Не настроен URL API сервера");
    }

    const resp = await fetch(`${baseUrl}/voucher/validate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promoCode: trimmedCode,
        variantIds,
        quantities,
        channel: CHANNEL,
      }),
    });

    const data = await resp.json().catch((err) => {
      console.error("Failed to parse promo validate response:", err);
      return { ok: false, error: "Ошибка при обработке ответа сервера" };
    });

    if (!resp.ok || !data.ok) {
      throw new Error(data.error || "Ваучер не найден");
    }

    let discountPercent = 0;
    if (data.discountType === "PERCENTAGE") {
      discountPercent = data.discountPercent || 0;
    } else if (data.discountType === "FIXED") {
      const subtotal = items.reduce(
        (sum: number, i: any) => sum + (i.product?.price || 0) * i.quantity,
        0,
      );
      if (subtotal > 0 && data.discountAmount > 0) {
        discountPercent = Math.round((data.discountAmount / subtotal) * 100);
      }
    }

    return {
      code: data.code || trimmedCode,
      discountPercent,
      discountAmount: data.discountAmount,
      discountType: data.discountType,
    };
  } catch (error: any) {
    console.error("Error validating promo code:", error);
    throw error;
  }
}

// Привязка промокода к реальному checkout через checkoutAddPromoCode
export async function addPromoCodeService(promoCode: string, checkoutId: string | null) {
  const mutation = `
    mutation addPromoCode($promoCode: String!, $checkoutId: ID!) {
      checkoutAddPromoCode(promoCode: $promoCode, id: $checkoutId) {
        checkout {
          id
          totalPrice {
            gross {
              amount
              currency
            }
          }
          voucherCode
          quantity
          lines {
            id
            isGift
            quantity
            totalPrice {
              gross {
                amount
                currency
              }
            }
            undiscountedTotalPrice {
              amount
              currency
            }
            variant {
              name
            }
          }
        }
        errors {
          code
          field
          message
        }
      }
    }
  `;

  if (!checkoutId) {
    throw new Error("Checkout ID is required to apply promo code");
  }

  const variables = { promoCode, checkoutId: checkoutIdToGraphQLId(checkoutId) };

  const result = await graphqlRequest<PromoCodeAddResponse>(mutation, variables);
  const errors = result.checkoutAddPromoCode.errors || [];

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => e.message).join(", ");
    const errorCodes = errors.map((e) => e.code).join(", ");
    throw new Error(`Не удалось применить промокод: ${errorMessages} (коды: ${errorCodes})`);
  }

  return result.checkoutAddPromoCode.checkout;
}

export async function removePromoCodeService(promoCode: string, checkoutId: string) {
  const mutation = `
    mutation removePromoCode($promoCode: String!, $checkoutId: ID!) {
      checkoutRemovePromoCode(promoCode: $promoCode, id: $checkoutId) {
        checkout {
          id
          totalPrice {
            gross {
              amount
              currency
            }
          }
          voucherCode
          quantity
          lines {
            id
            isGift
            quantity
            totalPrice {
              gross {
                amount
                currency
              }
            }
            undiscountedTotalPrice {
              amount
              currency
            }
          }
        }
        errors {
          code
          message
          field
        }
      }
    }
  `;

  const variables = { promoCode, checkoutId: checkoutIdToGraphQLId(checkoutId) };

  const result = await graphqlRequest<PromoCodeRemoveResponse>(mutation, variables);
  const errors = result.checkoutRemovePromoCode.errors || [];

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => e.message).join(", ");
    throw new Error(`Не удалось удалить промокод: ${errorMessages}`);
  }

  return result.checkoutRemovePromoCode.checkout;
}
