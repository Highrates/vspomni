import { graphqlRequest, CHANNEL } from "@/graphql/client";
import { getAccountEmail } from "@/lib/auth/accountEmail";
import type { CheckoutContact } from "@/lib/checkout/deliveryAddress";
import {
  mergeCheckoutContact,
  resolveCheckoutDeliveryAddress,
  toSaleorDeliveryAddress,
  validateDeliveryAddressForCheckout,
} from "@/lib/checkout/deliveryAddress";
import type { AddressInfo } from "@/graphql/types/auth.types";
import {
  computeCheckoutPaymentAmount,
  getSaleorRestBaseUrl,
  type ShippingCarrier,
} from "@/lib/checkout/paymentAmount";
import type {
  Cart,
  GetCartData,
  CreateCartResponse,
  CheckoutLineInput,
  AddLineResponse,
  UpdateLineResponse,
  RemoveLineResponse,
} from "@/graphql/types/cart.types";

const CART_FIELDS = `
  id
  totalPrice {
    gross {
      amount
      currency
    }
  }
  lines {
    id
    quantity
    variant {
      id
      name
      product {
        id
        name
        slug
        rating
        thumbnail { url alt }
      }
    }
    totalPrice {
      gross {
        amount
        currency
      }
    }
  }
`;

export async function getCart(cartId: string): Promise<Cart | null> {
  const query = `
    query CheckoutDetails($cartId: ID!) {
      checkout(id: $cartId) {
        ${CART_FIELDS}
      }
    }
  `;

  const variables = { cartId };
  const data = await graphqlRequest<GetCartData>(query, variables);
  return data.checkout;
}

export async function createCart(
  lines: CheckoutLineInput[] = [],
  channel?: string
): Promise<CreateCartResponse> {
  const mutation = `
    mutation CheckoutCreate($lines: [CheckoutLineInput!]!, $channel: String) {
      checkoutCreate(input: { lines: $lines, channel: $channel }) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
          field
        }
      }
    }
  `;

  const variables = { lines, channel: channel || CHANNEL };
  return graphqlRequest<CreateCartResponse>(mutation, variables);
}

export async function addCartLine(
  cartId: string,
  variantId: string,
  quantity: number
): Promise<AddLineResponse> {
  const mutation = `
    mutation CheckoutLinesAdd($cartId: ID!, $lines: [CheckoutLineInput!]!) {
      checkoutLinesAdd(
        checkoutId: $cartId
        lines: $lines
      ) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

  const variables = {
    cartId,
    lines: [{ variantId, quantity }],
  };
  return graphqlRequest<AddLineResponse>(mutation, variables);
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<UpdateLineResponse> {
  const mutation = `
    mutation CheckoutLinesUpdate($cartId: ID!, $lineId: ID!, $quantity: Int!) {
      checkoutLinesUpdate(
        checkoutId: $cartId
        lines: [{ lineId: $lineId, quantity: $quantity }]
      ) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

  const variables = { cartId, lineId, quantity };
  return graphqlRequest<UpdateLineResponse>(mutation, variables);
}

export async function removeCartLine(
  cartId: string,
  lineIds: string[]
): Promise<RemoveLineResponse> {
  const mutation = `
    mutation CheckoutLinesDelete($cartId: ID!, $lineIds: [ID!]!) {
      checkoutLinesDelete(
        checkoutId: $cartId
        linesIds: $lineIds
      ) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

  const variables = { cartId, lineIds };
  return graphqlRequest<RemoveLineResponse>(mutation, variables);
}

/**
 * Преобразует checkout token (UUID) в GraphQL ID
 * Формат GraphQL ID для Saleor: base64("Checkout:{token}")
 */
function tokenToGraphQLId(token: string): string {
  // Если это уже GraphQL ID (начинается с "Q2hlY2tvdXQ6"), возвращаем как есть
  if (token.startsWith('Q2hlY2tvdXQ6')) {
    return token;
  }

  // Преобразуем token в GraphQL ID
  // Формат: base64("Checkout:{token}")
  const idString = `Checkout:${token}`;
  // В браузере используем btoa для base64 кодирования
  const graphqlId = btoa(idString);
  console.log('Converted token to GraphQL ID:', { token, graphqlId, idString });
  return graphqlId;
}

/**
 * Создать payment в Saleor для checkout после успешной оплаты
 * Используем checkoutPaymentCreate для правильной связи payment с checkout
 */
async function createCheckoutPayment(checkoutId: string, amount: number, paymentId?: string): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);

  // Создаем payment для checkout через checkoutPaymentCreate
  const mutation = `
    mutation CheckoutPaymentCreate($id: ID!, $input: PaymentInput!) {
      checkoutPaymentCreate(id: $id, input: $input) {
        payment {
          id
          chargeStatus
          total {
            amount
            currency
          }
        }
        errors {
          message
          field
          code
        }
      }
    }
  `;

  // Преобразуем amount в Decimal формат для Saleor (не копейки, а рубли)
  const amountDecimal = amount.toFixed(2);

  const paymentInput = {
    gateway: 'mirumee.payments.dummy', // Используем dummy gateway, так как реальный платеж уже прошел через YooKassa
    amount: amountDecimal,
    token: paymentId || 'yookassa-payment',
    metadata: paymentId ? [
      { key: 'yookassa_payment_id', value: paymentId },
      { key: 'payment_method', value: 'yookassa' },
    ] : [],
  };

  try {
    console.log('Creating payment for checkout with:', {
      checkoutId: graphqlCheckoutId,
      amount: amountDecimal,
      paymentId
    });

    const result = await graphqlRequest<{
      checkoutPaymentCreate: {
        payment: any | null;
        errors: Array<{ message: string; field: string; code: string }>;
      };
    }>(mutation, {
      id: graphqlCheckoutId,
      input: paymentInput,
    });

    if (result.checkoutPaymentCreate.errors?.length > 0) {
      console.warn('Error creating payment:', result.checkoutPaymentCreate.errors);
      // Не выбрасываем ошибку, возможно payment уже существует
    } else {
      console.log('Payment created successfully:', result.checkoutPaymentCreate.payment);
    }
  } catch (error) {
    console.warn('Failed to create payment:', error);
    // Не выбрасываем ошибку, продолжаем выполнение
  }
}

/**
 * Получить сумму checkout для оплаты (включая доставку, если она уже в Saleor).
 */
export async function getCheckoutTotal(checkoutId: string): Promise<number | null> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);

  const query = `
    query GetCheckout($id: ID!) {
      checkout(id: $id) {
        totalPrice {
          gross {
            amount
            currency
          }
        }
      }
    }
  `;

  try {
    const result = await graphqlRequest<{
      checkout: {
        totalPrice: {
          gross: {
            amount: number;
            currency: string;
          };
        };
      } | null;
    }>(query, { id: graphqlCheckoutId });

    if (result.checkout?.totalPrice?.gross?.amount) {
      return result.checkout.totalPrice.gross.amount;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get checkout total:', error);
    return null;
  }
}

/**
 * Записать внешнюю доставку (CDEK/Yandex/Ozon) в Saleor checkout перед оплатой.
 */
export async function syncCheckoutExternalShipping(
  checkoutId: string,
  shippingAmount: number,
  shippingCarrier?: ShippingCarrier | null,
  options?: { allowFreeShipping?: boolean },
): Promise<number | null> {
  const amount = Number(shippingAmount) || 0
  const allowFreeShipping = Boolean(options?.allowFreeShipping)
  const effectiveAmount = allowFreeShipping ? 0 : amount

  if (effectiveAmount <= 0 && !allowFreeShipping) {
    return getCheckoutTotal(checkoutId)
  }

  const url = `${getSaleorRestBaseUrl()}/checkout/apply-external-shipping/`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkoutId,
      shippingAmount: effectiveAmount,
      shippingCarrier: shippingCarrier || 'cdek',
      allowFreeShipping,
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'Failed to apply external shipping')
  }

  const totalAmount = result.total?.amount
  return totalAmount != null && Number.isFinite(Number(totalAmount))
    ? Number(totalAmount)
    : null
}

/**
 * Итог к оплате: синхронизирует доставку в Saleor и берёт total оттуда.
 */
export async function resolveCheckoutPaymentAmount(
  checkoutId: string,
  shippingPrice: number,
  shippingCarrier: ShippingCarrier | null | undefined,
  cartTotalPrice: number,
  saleorSubtotalAfterPromo?: number | null,
  options?: { allowFreeShipping?: boolean },
): Promise<number> {
  const allowFreeShipping = Boolean(options?.allowFreeShipping)
  try {
    const totalFromShipping = await syncCheckoutExternalShipping(
      checkoutId,
      shippingPrice,
      shippingCarrier,
      { allowFreeShipping },
    )
  if (totalFromShipping != null && totalFromShipping > 0) {
    if (cartTotalPrice > totalFromShipping + 0.01) {
      return cartTotalPrice
    }
    return totalFromShipping
  }
  } catch (error) {
    console.warn('syncCheckoutExternalShipping failed, falling back:', error)
  }

  const saleorTotal = await getCheckoutTotal(checkoutId)
  if (saleorTotal != null && saleorTotal > 0) {
    if (cartTotalPrice > saleorTotal + 0.01) {
      return cartTotalPrice
    }
    return saleorTotal
  }

  return computeCheckoutPaymentAmount(
    saleorSubtotalAfterPromo,
    shippingPrice,
    cartTotalPrice,
  )
}

function addressToCheckoutInput(address: Partial<AddressInfo> & Record<string, unknown>) {
  const validationError = validateDeliveryAddressForCheckout(address as AddressInfo)
  if (validationError) {
    throw new Error(validationError)
  }

  const countryRaw = address.country
  const countryCode =
    typeof countryRaw === 'object' && countryRaw !== null && 'code' in countryRaw
      ? String((countryRaw as { code: string }).code)
      : typeof countryRaw === 'string' && countryRaw
        ? countryRaw
        : 'RU';

  const addressInput: Record<string, string> = {
    firstName: (address.firstName || '').trim() || 'Пользователь',
    lastName: (address.lastName || '').trim() || '',
    streetAddress1: (address.streetAddress1 || '').trim(),
    city: (address.city || '').trim(),
    postalCode: (address.postalCode || '').trim(),
    country: countryCode,
    phone: (address.phone || '').trim(),
  };

  if (address.streetAddress2) {
    addressInput.streetAddress2 = String(address.streetAddress2).trim();
  }
  if (address.countryArea) {
    addressInput.countryArea = String(address.countryArea).trim();
  }
  if (address.companyName) {
    addressInput.companyName = String(address.companyName).trim();
  }

  return addressInput;
}

async function setCheckoutBillingAddress(checkoutId: string, address: Partial<AddressInfo>): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  const addressInput = addressToCheckoutInput(address);

  const mutation = `
    mutation CheckoutBillingAddressUpdate($id: ID!, $billingAddress: AddressInput!) {
      checkoutBillingAddressUpdate(id: $id, billingAddress: $billingAddress) {
        checkout { id }
        errors { message field code }
      }
    }
  `;

  const result = await graphqlRequest<{
    checkoutBillingAddressUpdate: {
      checkout: unknown | null;
      errors: Array<{ message: string; field: string; code: string }>;
    };
  }>(mutation, { id: graphqlCheckoutId, billingAddress: addressInput });

  if (result.checkoutBillingAddressUpdate.errors?.length > 0) {
    throw new Error(
      result.checkoutBillingAddressUpdate.errors.map((e) => e.message).join(', '),
    );
  }
}

async function setCheckoutShippingAddress(checkoutId: string, address: Partial<AddressInfo>): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  const addressInput = addressToCheckoutInput(address);

  const mutation = `
    mutation CheckoutShippingAddressUpdate($id: ID!, $shippingAddress: AddressInput!) {
      checkoutShippingAddressUpdate(id: $id, shippingAddress: $shippingAddress) {
        checkout { id }
        errors { message field code }
      }
    }
  `;

  const result = await graphqlRequest<{
    checkoutShippingAddressUpdate: {
      checkout: unknown | null;
      errors: Array<{ message: string; field: string; code: string }>;
    };
  }>(mutation, { id: graphqlCheckoutId, shippingAddress: addressInput });

  if (result.checkoutShippingAddressUpdate.errors?.length > 0) {
    throw new Error(
      result.checkoutShippingAddressUpdate.errors.map((e) => e.message).join(', '),
    );
  }
}

async function applyCheckoutAddresses(
  checkoutId: string,
  deliveryAddress?: AddressInfo | null,
  contact?: CheckoutContact,
): Promise<void> {
  let address: Partial<AddressInfo> | null =
    resolveCheckoutDeliveryAddress(deliveryAddress);

  if (address && contact) {
    address = mergeCheckoutContact(address as AddressInfo, contact);
  }

  if (!address) {
    try {
      const { getMeInfo } = await import('@/graphql/queries/auth.service');
      const meInfo = await getMeInfo();
      if (meInfo?.addresses?.length) {
        address =
          meInfo.addresses.find(
            (addr) => addr.isDefaultShippingAddress || addr.isDefaultBillingAddress,
          ) || meInfo.addresses[0];
        if (contact) {
          address = mergeCheckoutContact(address as AddressInfo, contact);
        }
      }
    } catch (error) {
      console.warn('Could not load profile address for checkout:', error);
    }
  }

  const validationError = validateDeliveryAddressForCheckout(address as AddressInfo | null)
  if (validationError) {
    throw new Error(validationError)
  }

  const resolved = toSaleorDeliveryAddress(address as AddressInfo)
  try {
    await setCheckoutBillingAddress(checkoutId, resolved);
    await setCheckoutShippingAddress(checkoutId, resolved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // После create-without-stock-check GraphQL address update снова
    // гоняет check_lines_quantity (лимит / «0 remaining in stock»).
    // Адрес уже пишем через REST create/complete — не блокируем оплату.
    if (
      message.includes('Cannot add more than') ||
      message.includes('remaining in stock') ||
      message.includes('Could not add items')
    ) {
      console.warn(
        'GraphQL address update skipped due to stock/quantity check:',
        message,
      );
      return;
    }
    throw error;
  }
}

/**
 * Прокинуть выбранный адрес доставки в Saleor checkout (billing + shipping).
 * Вызывать после создания checkout и перед оплатой.
 */
export async function syncCheckoutDeliveryAddress(
  checkoutId: string,
  deliveryAddress?: AddressInfo | null,
  contact?: CheckoutContact,
): Promise<void> {
  await applyCheckoutAddresses(checkoutId, deliveryAddress, contact);

  const accountEmail = getAccountEmail();
  if (accountEmail) {
    await attachCheckoutToCustomer(checkoutId, accountEmail);
  }
}

/**
 * Связать checkout с пользователем: email + checkoutCustomerAttach (JWT).
 */
export async function attachCheckoutToCustomer(checkoutId: string, userEmail: string): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  const normalizedEmail = userEmail.trim().toLowerCase();

  const emailMutation = `
    mutation CheckoutEmailUpdate($id: ID!, $email: String!) {
      checkoutEmailUpdate(id: $id, email: $email) {
        checkout { id email }
        errors { message field code }
      }
    }
  `;

  try {
    const emailResult = await graphqlRequest<{
      checkoutEmailUpdate: {
        checkout: { id: string; email: string } | null;
        errors: Array<{ message: string; field: string; code: string }>;
      };
    }>(emailMutation, { id: graphqlCheckoutId, email: normalizedEmail });

    if (emailResult.checkoutEmailUpdate.errors?.length > 0) {
      console.warn('Error updating checkout email:', emailResult.checkoutEmailUpdate.errors);
    }
  } catch (error) {
    console.warn('Failed to update checkout email:', error);
  }

  let rawToken: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      rawToken = localStorage.getItem('token');
    } catch {
      rawToken = null;
    }
  }
  const token =
    rawToken && rawToken !== 'null' && rawToken !== 'undefined' ? rawToken : null;

  if (!token) {
    console.log('No JWT — checkoutCustomerAttach skipped (email link only)');
    return;
  }

  const attachMutation = `
    mutation CheckoutCustomerAttach($id: ID!) {
      checkoutCustomerAttach(id: $id) {
        checkout {
          id
          email
          user { id email }
        }
        errors { message field code }
      }
    }
  `;

  try {
    const attachResult = await graphqlRequest<{
      checkoutCustomerAttach: {
        checkout: { id: string; email: string; user: { id: string; email: string } | null } | null;
        errors: Array<{ message: string; field: string; code: string }>;
      };
    }>(attachMutation, { id: graphqlCheckoutId }, { token });

    if (attachResult.checkoutCustomerAttach.errors?.length > 0) {
      const errors = attachResult.checkoutCustomerAttach.errors;
      const benign = errors.every((e) =>
        e.message.toLowerCase().includes('already attached'),
      );
      if (!benign) {
        console.warn('checkoutCustomerAttach errors:', errors);
      }
    } else {
      console.log(
        'checkoutCustomerAttach OK:',
        attachResult.checkoutCustomerAttach.checkout?.user?.email,
      );
    }
  } catch (error) {
    console.warn('checkoutCustomerAttach failed:', error);
  }
}

export type FinalizeCheckoutParams = {
  checkoutId: string
  userEmail?: string
  paymentAmount?: number
  paymentId?: string
  shippingAmount?: number
  shippingCarrier?: ShippingCarrier | null
  allowFreeShipping?: boolean
  address?: Partial<AddressInfo> | null
}

export type InsufficientStockItem = {
  variantId?: string
  productName?: string
  requested?: number
  available?: number
}

export type CheckoutFinalizeErrorDetails = {
  code: string
  requiresRefund?: boolean
  items?: InsufficientStockItem[]
  expectedTotal?: number
  paidAmount?: number
}

export class CheckoutFinalizeError extends Error {
  readonly code: string
  readonly requiresRefund?: boolean
  readonly items?: InsufficientStockItem[]
  readonly expectedTotal?: number
  readonly paidAmount?: number

  constructor(message: string, details: CheckoutFinalizeErrorDetails) {
    super(message)
    this.name = 'CheckoutFinalizeError'
    this.code = details.code
    this.requiresRefund = details.requiresRefund
    this.items = details.items
    this.expectedTotal = details.expectedTotal
    this.paidAmount = details.paidAmount
  }
}

export class InsufficientStockError extends CheckoutFinalizeError {
  constructor(
    message: string,
    details?: { items?: InsufficientStockItem[]; requiresRefund?: boolean },
  ) {
    super(message, {
      code: 'INSUFFICIENT_STOCK',
      items: details?.items,
      requiresRefund: details?.requiresRefund,
    })
    this.name = 'InsufficientStockError'
  }
}

/**
 * Финализация checkout через Saleor REST (работает и в браузере, и на сервере/webhook).
 * Адрес и attach должны быть уже на checkout (sync до оплаты).
 */
export async function finalizeCheckoutViaRest({
  checkoutId,
  userEmail,
  paymentAmount,
  paymentId,
  shippingAmount,
  shippingCarrier,
  allowFreeShipping,
  address,
}: FinalizeCheckoutParams): Promise<{ order: any; errors: any[] }> {
  const normalizedEmail = (userEmail?.trim() || '').toLowerCase()
  const baseUrl = getSaleorRestBaseUrl()
  const completeUrl = `${baseUrl}/checkout/complete-without-stock-check/`

  const response = await fetch(completeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkoutId,
      paymentId,
      paymentAmount,
      userEmail: normalizedEmail || undefined,
      shippingAmount,
      shippingCarrier,
      allowFreeShipping,
      address: address || undefined,
    }),
  })

  const result = await response.json()

  if (response.status === 409 && result.code === 'INSUFFICIENT_STOCK') {
    throw new InsufficientStockError(
      result.message || result.error || 'Insufficient stock',
      {
        items: Array.isArray(result.items) ? result.items : undefined,
        requiresRefund: Boolean(result.requiresRefund),
      },
    )
  }

  if (response.status === 409 && result.code) {
    throw new CheckoutFinalizeError(
      result.message || result.error || 'Checkout finalize failed',
      {
        code: String(result.code),
        requiresRefund: Boolean(result.requiresRefund),
        expectedTotal:
          result.expectedTotal != null ? Number(result.expectedTotal) : undefined,
        paidAmount: result.paidAmount != null ? Number(result.paidAmount) : undefined,
      },
    )
  }

  if (!response.ok) {
    throw new Error(result.error || 'Failed to complete checkout')
  }

  if (!result.success || !result.order) {
    throw new Error('Order was not created')
  }

  return {
    order: {
      id: result.order.id,
      number: result.order.number,
      status: result.order.status,
      statusDisplay: result.order.status,
      created: new Date().toISOString(),
      total: {
        gross: { amount: 0, currency: 'RUB' },
      },
    },
    errors: [],
  }
}