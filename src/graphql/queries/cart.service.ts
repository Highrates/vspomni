import { graphqlRequest, CHANNEL } from "@/graphql/client";
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
 * Получить сумму checkout для создания transaction
 */
async function getCheckoutTotal(checkoutId: string): Promise<number | null> {
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
 * Создать transaction в Saleor для checkout после успешной оплаты.
 * В Saleor суммы в TransactionCreateInput.amountCharged.amount передаются
 * в основных единицах валюты (Decimal), а не в копейках.
 */
async function createCheckoutTransactionWithAmount(
  checkoutId: string,
  amountInRubles: number,
  paymentId?: string,
): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  
  // Создаем transaction для checkout
  const mutation = `
    mutation TransactionCreate($id: ID!, $transaction: TransactionCreateInput!, $transactionEvent: TransactionEventInput) {
      transactionCreate(id: $id, transaction: $transaction, transactionEvent: $transactionEvent) {
        transaction {
          id
          chargedAmount {
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

  const transactionInput = {
    name: paymentId ? `YooKassa Payment ${paymentId}` : 'YooKassa Payment',
    pspReference: paymentId || '',
    message: paymentId ? `Payment ID: ${paymentId}` : 'Payment via YooKassa',
    availableActions: ['CHARGE', 'REFUND'], // Указываем доступные действия
    amountCharged: {
      // Передаём сумму в основных единицах (рубли), Saleor ожидает Decimal
      amount: amountInRubles,
      currency: 'RUB',
    },
    externalUrl: paymentId ? `https://yookassa.ru/my/payments/${paymentId}` : undefined,
  };

  // TransactionEventInput содержит только pspReference и message
  // События с amount, type, externalUrl создаются отдельно через transactionEventReport
  const transactionEvent = {
    pspReference: paymentId || '',
    message: 'Payment successful via YooKassa',
  };

  try {
    console.log('Creating transaction with amount (RUB):', amountInRubles);
    
    const result = await graphqlRequest<{
      transactionCreate: {
        transaction: any | null;
        errors: Array<{ message: string; field: string; code: string }>;
      };
    }>(mutation, { 
      id: graphqlCheckoutId, 
      transaction: transactionInput,
      transactionEvent: transactionEvent,
    });

    if (result.transactionCreate.errors?.length > 0) {
      console.warn('Error creating transaction:', result.transactionCreate.errors);
      // Не выбрасываем ошибку, так как transaction может уже существовать
    } else {
      console.log('Transaction created successfully:', result.transactionCreate.transaction);
    }
  } catch (error) {
    console.warn('Failed to create transaction:', error);
    // Не выбрасываем ошибку, продолжаем выполнение
  }
}

/**
 * Создать transaction в Saleor для checkout после успешной оплаты.
 * Приоритетно используем сумму checkout.totalPrice из Saleor как источник истины.
 */
async function createCheckoutTransaction(
  checkoutId: string,
  amount: number,
  paymentId?: string,
): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  
  // Получаем реальную сумму checkout, чтобы убедиться, что transaction покрывает её
  const checkoutTotal = await getCheckoutTotal(checkoutId);
  
  console.log('=== Transaction Creation Debug ===');
  console.log('Checkout total from Saleor (in RUB):', checkoutTotal);
  console.log('Payment amount from frontend (in RUB):', amount);
  
  // Определяем правильную сумму в рублях.
  // Если checkoutTotal доступен, используем его (он всегда правильный).
  // Иначе используем amount, но проверяем, что он разумный.
  let finalAmountInRubles: number;
  
  if (checkoutTotal !== null) {
    // Всегда используем checkoutTotal если он доступен - это источник истины
    finalAmountInRubles = checkoutTotal;
    console.log('Using checkoutTotal as source of truth:', finalAmountInRubles);
  } else {
    // Если checkoutTotal недоступен, используем amount из платежки
    finalAmountInRubles = amount;
    console.log('Using payment amount (checkoutTotal unavailable):', finalAmountInRubles);
  }
  
  if (checkoutTotal !== null && Math.abs(checkoutTotal - amount) > 0.01) {
    console.warn('⚠️ WARNING: Checkout total and payment amount differ!', {
      checkoutTotal,
      paymentAmount: amount,
      difference: Math.abs(checkoutTotal - amount)
    });
  }
  
  // Вызываем внутреннюю функцию с уже вычисленной суммой в рублях
  await createCheckoutTransactionWithAmount(checkoutId, finalAmountInRubles, paymentId);
}

/**
 * Установить billing address в checkout
 */
async function setCheckoutBillingAddress(checkoutId: string, address: any): Promise<void> {
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  
  const mutation = `
    mutation CheckoutBillingAddressUpdate($id: ID!, $billingAddress: AddressInput!) {
      checkoutBillingAddressUpdate(id: $id, billingAddress: $billingAddress) {
        checkout {
          id
        }
        errors {
          message
          field
          code
        }
      }
    }
  `;

  // Преобразуем адрес в формат AddressInput
  // Убеждаемся, что все обязательные поля заполнены
  const countryCode = typeof address.country === 'object' && address.country !== null
    ? address.country.code
    : address.country || 'RU';
  
  const addressInput: any = {
    firstName: (address.firstName || '').trim() || 'Пользователь',
    lastName: (address.lastName || '').trim() || '',
    streetAddress1: (address.streetAddress1 || '').trim() || 'Адрес не указан',
    city: (address.city || '').trim() || 'Москва',
    postalCode: (address.postalCode || '').trim() || '000000',
    country: countryCode,
  };
  
  // Добавляем опциональные поля только если они есть
  if (address.streetAddress2) {
    addressInput.streetAddress2 = address.streetAddress2.trim();
  }
  if (address.countryArea) {
    addressInput.countryArea = address.countryArea.trim();
  }
  if (address.phone) {
    addressInput.phone = address.phone.trim();
  }
  if (address.companyName) {
    addressInput.companyName = address.companyName.trim();
  }
  
  console.log('Address input for checkout:', addressInput);

  try {
    const result = await graphqlRequest<{
      checkoutBillingAddressUpdate: {
        checkout: any | null;
        errors: Array<{ message: string; field: string; code: string }>;
      };
    }>(mutation, { id: graphqlCheckoutId, billingAddress: addressInput });

    if (result.checkoutBillingAddressUpdate.errors?.length > 0) {
      console.warn('Error setting checkout billing address:', result.checkoutBillingAddressUpdate.errors);
      throw new Error(result.checkoutBillingAddressUpdate.errors.map(e => e.message).join(', '));
    }
    
    console.log('Checkout billing address set successfully');
  } catch (error) {
    console.error('Failed to set checkout billing address:', error);
    throw error;
  }
}

/**
 * Связать checkout с пользователем по email
 */
export async function attachCheckoutToCustomer(checkoutId: string, userEmail: string): Promise<void> {
  // Преобразуем token в GraphQL ID (если нужно)
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  
  // Сначала обновляем email
  const emailMutation = `
    mutation CheckoutEmailUpdate($id: ID!, $email: String!) {
      checkoutEmailUpdate(id: $id, email: $email) {
        checkout {
          id
          email
        }
        errors {
          message
          field
          code
        }
      }
    }
  `;

  try {
    const emailResult = await graphqlRequest<{
      checkoutEmailUpdate: {
        checkout: any | null;
        errors: Array<{ message: string; field: string; code: string }>;
      };
    }>(emailMutation, { id: graphqlCheckoutId, email: userEmail });

    if (emailResult.checkoutEmailUpdate.errors?.length > 0) {
      console.warn('Error updating checkout email:', emailResult.checkoutEmailUpdate.errors);
    }

    // Saleor автоматически свяжет checkout с пользователем по email при completeCheckout
    // если пользователь существует с таким email
  } catch (error) {
    console.warn('Failed to update checkout email:', error);
    // Продолжаем выполнение, так как это не критично
  }
}

export async function completeCheckout(checkoutId: string, userEmail?: string, paymentAmount?: number, paymentId?: string): Promise<{ order: any; errors: any[] }> {
  console.log('completeCheckout called with:', { checkoutId, userEmail, paymentAmount, paymentId });
  
  // Преобразуем token в GraphQL ID
  const graphqlCheckoutId = tokenToGraphQLId(checkoutId);
  console.log('Converted checkoutId to GraphQL ID:', { original: checkoutId, graphql: graphqlCheckoutId });
  
  // Создаем transaction в Saleor для checkout ПЕРЕД всеми остальными операциями
  // Это критично, чтобы Saleor знал о платеже перед завершением checkout
  // Transaction должен быть создан с amountCharged, чтобы Saleor считал checkout оплаченным
  if (paymentAmount !== undefined && paymentAmount > 0) {
    try {
      console.log('Creating transaction for checkout (BEFORE other operations):', { checkoutId, amount: paymentAmount, paymentId });
      await createCheckoutTransaction(checkoutId, paymentAmount, paymentId);
      console.log('Transaction created successfully');
    } catch (error) {
      console.warn('Failed to create transaction, continuing anyway:', error);
      // Продолжаем выполнение, возможно transaction уже существует
    }
  }
  
  // Связываем checkout с пользователем перед завершением
  if (userEmail) {
    try {
      console.log('Attaching checkout to customer:', userEmail);
      // Передаем оригинальный checkoutId (token), функция сама преобразует его
      await attachCheckoutToCustomer(checkoutId, userEmail);
      console.log('Checkout attached to customer successfully');
      
      // Получаем адрес пользователя и устанавливаем billing address
      try {
        const { getMeInfo } = await import('@/graphql/queries/auth.service');
        const meInfo = await getMeInfo();
        
        if (meInfo && meInfo.addresses && meInfo.addresses.length > 0) {
          // Используем адрес по умолчанию или первый доступный
          const address = meInfo.addresses.find(
            (addr) => addr.isDefaultBillingAddress || addr.isDefaultShippingAddress
          ) || meInfo.addresses[0];
          
          console.log('Setting billing address from user address:', address);
          await setCheckoutBillingAddress(checkoutId, address);
          console.log('Billing address set successfully');
        } else {
          // Если нет адреса, создаем минимальный адрес из данных пользователя
          console.warn('No user address found, creating minimal billing address');
          const minimalAddress = {
            firstName: meInfo?.firstName || 'Пользователь',
            lastName: meInfo?.lastName || '',
            streetAddress1: 'Адрес не указан',
            city: 'Москва',
            postalCode: '000000',
            country: { code: 'RU' },
            phone: '',
          };
          await setCheckoutBillingAddress(checkoutId, minimalAddress);
          console.log('Minimal billing address set');
        }
      } catch (addressError: any) {
        console.error('Failed to set billing address:', addressError);
        // Пробуем создать минимальный адрес
        try {
          console.log('Trying to set minimal billing address as fallback');
          const minimalAddress = {
            firstName: 'Пользователь',
            lastName: '',
            streetAddress1: 'Адрес не указан',
            city: 'Москва',
            postalCode: '000000',
            country: { code: 'RU' },
            phone: '',
          };
          await setCheckoutBillingAddress(checkoutId, minimalAddress);
          console.log('Minimal billing address set as fallback');
        } catch (minimalError: any) {
          console.error('Failed to set minimal billing address:', minimalError);
          // Если не удалось установить адрес, выбрасываем ошибку
          throw new Error(`Не удалось установить адрес для заказа: ${minimalError.message || 'Неизвестная ошибка'}`);
        }
      }
    } catch (error) {
      console.warn('Failed to attach checkout to customer:', error);
      // Продолжаем выполнение, так как это не критично
    }
  }

  // Если опция "Automatically complete checkout upon full payment" включена,
  // Saleor автоматически завершит checkout когда transaction покрывает сумму
  // Ждём немного, чтобы Saleor успел автоматически завершить checkout
  console.log('Waiting for automatic checkout completion (if enabled)...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Ждём 2 секунды

  // Используем кастомный REST endpoint для завершения checkout без проверки наличия
  // Это обходит проблему "Insufficient stock" при завершении checkout
  // Важно: URL должен быть без /graphql/ префикса
  // Получаем базовый URL - используем GRAPHQL_PUBLIC_API_URL и убираем /graphql/
  const graphqlUrl = process.env.GRAPHQL_PUBLIC_API_URL || 'https://vspomni.store/graphql/';
  // Убираем /graphql/ из конца URL чтобы получить базовый URL
  const baseUrl = graphqlUrl.replace(/\/graphql\/?$/, '').replace(/\/$/, '') || 'https://vspomni.store';
  const completeUrl = `${baseUrl}/checkout/complete-without-stock-check/`;
  
  console.log('Calling complete checkout REST endpoint:', completeUrl);
  console.log('GraphQL URL:', graphqlUrl);
  console.log('Base URL (after cleanup):', baseUrl);
  console.log('Checkout token:', checkoutId);
  
  try {
    const response = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutId: checkoutId,
      }),
    });

    const result = await response.json();
    console.log('Complete checkout REST response:', result);

    if (!response.ok) {
      const errorMessage = result.error || 'Failed to complete checkout';
      console.error('Complete checkout REST error:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!result.success || !result.order) {
      console.error('Complete checkout returned no order:', result);
      throw new Error('Order was not created');
    }

    console.log('Order created successfully via REST endpoint:', result.order);

    // Преобразуем ответ в формат, совместимый с GraphQL ответом
    return {
      order: {
        id: result.order.id,
        number: result.order.number,
        status: result.order.status,
        statusDisplay: result.order.status,
        created: new Date().toISOString(),
        total: {
          gross: {
            amount: 0, // Сумма будет получена из order позже
            currency: 'RUB',
          },
        },
      },
      errors: [],
    };
  } catch (error: any) {
    console.error('Error in completeCheckout via REST:', error);
    
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