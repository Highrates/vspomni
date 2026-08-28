import { graphqlRequest, CHANNEL } from "@/graphql/client";
import { getAccountEmail } from "@/lib/auth/accountEmail";
import type { CheckoutContact } from "@/lib/checkout/deliveryAddress";
import {
  mergeCheckoutContact,
  resolveCheckoutDeliveryAddress,
  toSaleorDeliveryAddress,
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
): Promise<number | null> {
  const amount = Number(shippingAmount) || 0
  if (amount <= 0) {
    return getCheckoutTotal(checkoutId)
  }

  const url = `${getSaleorRestBaseUrl()}/checkout/apply-external-shipping/`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkoutId,
      shippingAmount: amount,
      shippingCarrier: shippingCarrier || 'cdek',
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
): Promise<number> {
  try {
    const totalFromShipping = await syncCheckoutExternalShipping(
      checkoutId,
      shippingPrice,
      shippingCarrier,
    )
    if (totalFromShipping != null && totalFromShipping > 0) {
      return totalFromShipping
    }
  } catch (error) {
    console.warn('syncCheckoutExternalShipping failed, falling back:', error)
  }

  const saleorTotal = await getCheckoutTotal(checkoutId)
  if (saleorTotal != null && saleorTotal > 0) {
    const shipping = Number(shippingPrice) || 0
    if (shipping > 0 && saleorTotal < cartTotalPrice - 0.01) {
      return saleorTotal + shipping
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
    streetAddress1: (address.streetAddress1 || '').trim() || 'Адрес не указан',
    city: (address.city || '').trim() || 'Москва',
    postalCode: (address.postalCode || '').trim() || '000000',
    country: countryCode,
  };

  if (address.streetAddress2) {
    addressInput.streetAddress2 = String(address.streetAddress2).trim();
  }
  if (address.countryArea) {
    addressInput.countryArea = String(address.countryArea).trim();
  }
  if (address.phone) {
    addressInput.phone = String(address.phone).trim();
  }
  if (address.companyName) {
    addressInput.companyName = String(address.companyName).trim();
  }

  return addressInput;
}

const MINIMAL_CHECKOUT_ADDRESS: Partial<AddressInfo> = {
  firstName: 'Пользователь',
  lastName: '',
  streetAddress1: 'Адрес не указан',
  city: 'Москва',
  postalCode: '000000',
  country: { code: 'RU', country: 'Russia' },
  phone: '',
};

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
      } else if (meInfo) {
        address = {
          firstName: contact?.firstName || meInfo.firstName || 'Пользователь',
          lastName: contact?.lastName || meInfo.lastName || '',
          streetAddress1: 'Адрес не указан',
          city: 'Москва',
          postalCode: '000000',
          country: { code: 'RU', country: 'Russia' },
          phone: contact?.phone || '',
        };
      }
    } catch (error) {
      console.warn('Could not load profile address for checkout:', error);
    }
  }

  const resolved = toSaleorDeliveryAddress(
    (address || MINIMAL_CHECKOUT_ADDRESS) as AddressInfo,
  );
  await setCheckoutBillingAddress(checkoutId, resolved);
  await setCheckoutShippingAddress(checkoutId, resolved);
}

/**
 * Прокинуть выбранный адрес доставки в Saleor checkout (billing + shipping).
 * Вызывать после создания checkout и перед completeCheckout.
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
    }),
  })

  const result = await response.json()

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

export async function completeCheckout(
  checkoutId: string,
  userEmail?: string,
  paymentAmount?: number,
  paymentId?: string,
  deliveryAddress?: AddressInfo | null,
  contact?: CheckoutContact,
  shippingAmount?: number,
  shippingCarrier?: ShippingCarrier | null,
): Promise<{ order: any; errors: any[] }> {
  const normalizedEmail = (
    userEmail?.trim() ||
    (typeof window !== 'undefined' ? getAccountEmail() : '')
  ).toLowerCase();

  console.log('completeCheckout called with:', {
    checkoutId,
    userEmail: normalizedEmail,
    paymentAmount,
    paymentId,
    shippingAmount,
    shippingCarrier,
    hasDeliveryAddress: Boolean(deliveryAddress),
  });

  // Преобразуем token в GraphQL ID
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  console.log('Converted checkoutId to GraphQL ID:', { original: checkoutId, graphql: graphqlCheckoutId });

  // Transaction создаётся на бэкенде в complete-without-stock-check (HANDLE_PAYMENTS не нужен на фронте)

  const isBrowser = typeof window !== 'undefined'

  // GraphQL-подготовка только в браузере (JWT, sessionStorage). Webhook идёт сразу в REST.
  if (isBrowser) {
    if (normalizedEmail) {
      try {
        console.log('Attaching checkout to customer:', normalizedEmail)
        await attachCheckoutToCustomer(checkoutId, normalizedEmail)
        console.log('Checkout attached to customer successfully')
      } catch (error) {
        console.warn('Failed to attach checkout to customer:', error)
      }
    }

    try {
      await applyCheckoutAddresses(checkoutId, deliveryAddress, contact)
      console.log('Checkout shipping/billing addresses set successfully')
    } catch (addressError: unknown) {
      const message =
        addressError instanceof Error ? addressError.message : 'Неизвестная ошибка'
      console.error('Failed to set checkout addresses:', addressError)
      throw new Error(`Не удалось установить адрес для заказа: ${message}`)
    }
  }

  console.log('Calling complete checkout REST endpoint')
  console.log('Checkout token:', checkoutId)

  try {
    return await finalizeCheckoutViaRest({
      checkoutId,
      userEmail: normalizedEmail,
      paymentAmount,
      paymentId,
      shippingAmount,
      shippingCarrier,
    })
  } catch (error: unknown) {
    console.error('Error in completeCheckout via REST:', error)

    // Если REST endpoint не работает, пробуем GraphQL как fallback
    console.log('Falling back to GraphQL checkoutComplete...');

    const mutation = `
      mutation CheckoutComplete($checkoutId: ID!) {
        checkoutComplete(id: $checkoutId) {
          order {
            id
            number
            status
            statusDisplay
            created
            total {
              gross {
                amount
                currency
              }
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

    const variables = { checkoutId: graphqlCheckoutId };

    try {
      const graphqlResult = await graphqlRequest<{
        checkoutComplete: {
          order: any | null;
          errors: Array<{ message: string; field: string; code: string }>;
        };
      }>(mutation, variables);

      console.log('checkoutComplete GraphQL result:', graphqlResult);

      if (graphqlResult.checkoutComplete.errors?.length > 0) {
        const errorMessages = graphqlResult.checkoutComplete.errors.map((e) => e.message).join(', ');
        console.error('checkoutComplete GraphQL errors:', graphqlResult.checkoutComplete.errors);
        throw new Error(errorMessages);
      }

      if (!graphqlResult.checkoutComplete.order) {
        throw new Error('Order was not created');
      }

      return {
        order: graphqlResult.checkoutComplete.order,
        errors: graphqlResult.checkoutComplete.errors || [],
      };
    } catch (graphqlError: any) {
      console.error('Error in GraphQL checkoutComplete fallback:', graphqlError);
      throw graphqlError;
    }
  }
}