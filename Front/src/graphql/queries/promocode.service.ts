import type { CartItem } from "@/types/cart";
import type {
  PromoDiscountType,
  PromoScope,
  PromoValidationResult,
  PromoValueType,
} from "@/lib/promo";
import { ApiError, apiJson, getOrCreateGuestId } from "@/api/apiClient";
import { cartSubtotal } from "@/lib/promo";

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
  /** Nest-промокоды не бывают на доставку; параметры оставлены для совместимости. */
  shippingAmount?: number;
  shippingCarrier?: string | null;
}

/** Ответ Nest `POST /promo/validate` (PromoApplyResult). */
export type NestPromoValidateResponse = {
  code: string;
  type: "PERCENT" | "FIXED" | string;
  value: number;
  discountAmount: number;
  subtotal: number;
  eligibleSubtotal?: number;
  total?: number;
  minOrderAmount: number | null;
  scope: "CATEGORY" | "PRODUCTS" | null;
};

export function mapNestPromoToValidation(
  data: NestPromoValidateResponse,
  fallbackCode: string,
): PromoValidationResult {
  const valueType: PromoValueType = data.type === "PERCENT" ? "PERCENTAGE" : "FIXED";
  const discountType: PromoDiscountType = valueType;
  const scope: PromoScope = data.scope ? "PRODUCTS" : "ORDER";
  return {
    code: String(data.code || fallbackCode),
    discountType,
    discountValueType: valueType,
    discountValue: Number(data.value) || 0,
    discountAmount: Number(data.discountAmount) || 0,
    scope,
    minSpent: data.minOrderAmount != null ? Number(data.minOrderAmount) : null,
  };
}

/** Проверка промокода по правилам Nest для текущего состава корзины. */
export async function validatePromoCode(
  promoCode: string,
  items: CartItem[],
  options: ValidatePromoOptions = {},
): Promise<PromoValidationResult> {
  const trimmedCode = promoCode.trim();
  if (!trimmedCode) {
    throw new PromoCodeError("Введите промокод", true);
  }

  const lines: Array<{ variantId: string; qty: number }> = [];
  for (const item of items) {
    const itemId = item.product ? item.variantId || item.id : null;
    if (!itemId) continue;
    lines.push({ variantId: itemId, qty: Math.max(1, Math.floor(item.quantity) || 1) });
  }
  if (lines.length === 0) {
    throw new PromoCodeError("Добавьте товары в корзину, чтобы применить промокод", true);
  }

  try {
    const data = await apiJson<NestPromoValidateResponse>("/promo/validate", "POST", {
      code: trimmedCode,
      subtotal: Math.max(0, Math.floor(cartSubtotal(items))),
      email: options.email || undefined,
      guestId: getOrCreateGuestId() || undefined,
      lines,
    });
    return mapNestPromoToValidation(data, trimmedCode);
  } catch (e) {
    if (e instanceof ApiError) {
      // 400 — правило промокода не выполнено (не найден / истёк / порог / one-shot)
      if (e.status === 400) throw new PromoCodeError(e.message, true);
      if (e.status === 429) {
        throw new PromoCodeError("Слишком много попыток. Подождите минуту и повторите.", false);
      }
      throw new PromoCodeError(e.message || "Не удалось проверить промокод. Попробуйте позже.", false);
    }
    throw new PromoCodeError("Не удалось проверить промокод. Проверьте соединение.", false);
  }
}
