import { CHANNEL } from "../client";
import type { CartItem } from "@/types/cart";
import type {
  PromoDiscountType,
  PromoScope,
  PromoValidationResult,
  PromoValueType,
} from "@/lib/promo";

/**
 * rejected=true — бэкенд отклонил промокод для этой корзины (промокод надо снять);
 * rejected=false — временная ошибка (сеть, лимит запросов), промокод не трогаем.
 */
export class PromoCodeError extends Error {
  constructor(
    message: string,
    public readonly rejected: boolean,
  ) {
    super(message);
    this.name = "PromoCodeError";
  }
}

export interface ValidatePromoOptions {
  email?: string;
  shippingAmount?: number;
  shippingCarrier?: string | null;
}

const DISCOUNT_TYPES: PromoDiscountType[] = ["PERCENTAGE", "FIXED", "SHIPPING"];
const SCOPES: PromoScope[] = ["ORDER", "PRODUCTS", "CHEAPEST", "SHIPPING"];

/** Проверка промокода по правилам Saleor для текущего состава корзины. */
export async function validatePromoCode(
  promoCode: string,
  items: CartItem[],
  options: ValidatePromoOptions = {},
): Promise<PromoValidationResult> {
  const trimmedCode = promoCode.trim();
  if (!trimmedCode) {
    throw new PromoCodeError("Введите промокод", true);
  }

  const variantIds: string[] = [];
  const quantities: number[] = [];
  for (const item of items) {
    const itemId = item.product ? item.variantId || item.id : null;
    if (!itemId) continue;
    variantIds.push(itemId);
    quantities.push(Math.max(1, Math.floor(item.quantity) || 1));
  }
  if (variantIds.length === 0) {
    throw new PromoCodeError("Добавьте товары в корзину, чтобы применить промокод", true);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? "";
  if (!baseUrl) {
    throw new PromoCodeError("Не настроен URL API сервера", false);
  }

  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}/voucher/validate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promoCode: trimmedCode,
        variantIds,
        quantities,
        channel: CHANNEL,
        email: options.email || undefined,
        shippingAmount: options.shippingAmount || undefined,
        shippingCarrier: options.shippingCarrier || undefined,
      }),
    });
  } catch {
    throw new PromoCodeError("Не удалось проверить промокод. Проверьте соединение.", false);
  }

  const data = await resp.json().catch(() => null);

  if (resp.status === 400 && data?.error) {
    throw new PromoCodeError(String(data.error), true);
  }
  if (!resp.ok || !data?.ok) {
    throw new PromoCodeError(
      data?.error ? String(data.error) : "Не удалось проверить промокод. Попробуйте позже.",
      false,
    );
  }

  const discountType: PromoDiscountType = DISCOUNT_TYPES.includes(data.discountType)
    ? data.discountType
    : "FIXED";
  const discountValueType: PromoValueType =
    data.discountValueType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

  return {
    code: String(data.code || trimmedCode),
    discountType,
    discountValueType,
    discountValue: Number(data.discountValue) || 0,
    discountAmount: Number(data.discountAmount) || 0,
    scope: SCOPES.includes(data.scope) ? data.scope : "ORDER",
    minSpent: data.minSpent != null ? Number(data.minSpent) : null,
  };
}
