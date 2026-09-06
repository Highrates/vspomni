import type { OrderApi, OrdersPagination } from './types'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchUserOrders(options?: {
  page?: number
  pageSize?: number
}): Promise<{
  orders: OrderApi[]
  pagination: OrdersPagination
}> {
  const baseUrl = getBaseUrl()
  const token = getAuthToken()

  if (!token) {
    throw new Error('Войдите в аккаунт, чтобы увидеть заказы.')
  }
  if (!baseUrl) {
    throw new Error('Не настроен адрес API.')
  }

  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })

  const response = await fetch(`${baseUrl}/auth/orders/?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(token),
  })

  const data = await response.json()

  if (response.status === 401) {
    throw new Error('Сессия истекла. Войдите снова, чтобы увидеть заказы.')
  }
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Ошибка при загрузке заказов')
  }

  return {
    orders: data.orders || [],
    pagination: data.pagination || {
      page,
      pageSize,
      total: (data.orders || []).length,
      hasNext: false,
      hasPrevious: page > 1,
    },
  }
}

export async function fetchUserOrderDetail(orderRef: string): Promise<OrderApi> {
  const baseUrl = getBaseUrl()
  const token = getAuthToken()

  if (!token) {
    throw new Error('Войдите в аккаунт, чтобы открыть заказ.')
  }
  if (!baseUrl) {
    throw new Error('Не настроен адрес API.')
  }

  const response = await fetch(
    `${baseUrl}/auth/orders/${encodeURIComponent(orderRef)}/`,
    {
      method: 'GET',
      headers: authHeaders(token),
    },
  )

  const data = await response.json()

  if (response.status === 401) {
    throw new Error('Сессия истекла. Войдите снова.')
  }
  if (response.status === 404 || !data.ok) {
    throw new Error(data.error || 'Заказ не найден')
  }

  return data.order as OrderApi
}
