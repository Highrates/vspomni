import { apiFetch, apiJson, uploadsUrl } from '@/api/apiClient';
import type { NestAddressInfo as AddressInfo } from '@/api/types';

type NestAddress = {
  id: string;
  recipientName: string | null;
  phone: string | null;
  city: string;
  address: string;
  apartment: string | null;
  region: string | null;
  district: string | null;
  postalCode: string | null;
  comment: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type NestOrderItem = {
  id: string;
  title: string;
  sku: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  isGift?: boolean;
  imageUrl: string | null;
  variantName: string | null;
  shadeName: string | null;
  productId?: string | null;
  productSlug?: string | null;
  productType?: string | null;
  variantId?: string | null;
};

export type NestOrderSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  discountTotal?: number;
  giftCertificateAmount?: number;
  createdAt: string;
  items: NestOrderItem[];
  tracking: string | null;
  trackingProvider: string | null;
  canPay?: boolean;
  payToken?: string | null;
  payExpiresAt?: string | null;
};

export function mapNestAddressToInfo(a: NestAddress): AddressInfo {
  const parts = (a.recipientName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    id: a.id,
    firstName,
    lastName,
    phone: a.phone || '',
    city: a.city,
    streetAddress1: a.address,
    streetAddress2: a.comment || '',
    postalCode: a.postalCode || '',
    apartment: a.apartment || '',
    cityArea: a.district || '',
    countryArea: a.region || '',
    isDefaultBillingAddress: a.isDefault,
    isDefaultShippingAddress: a.isDefault,
    companyName: '',
    metadata: [],
    country: { code: 'RU', country: 'Russia' },
  };
}

export function mapInfoToNestAddress(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  postalCode?: string;
  apartment?: string;
  countryArea?: string;
  cityArea?: string;
}): {
  recipientName?: string;
  phone?: string;
  city: string;
  address: string;
  apartment?: string;
  region?: string;
  district?: string;
  postalCode?: string;
  comment?: string;
} {
  const recipientName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim() || undefined;
  return {
    recipientName,
    phone: input.phone,
    city: input.city || '',
    address: input.streetAddress1 || '',
    apartment: input.apartment || undefined,
    region: input.countryArea || undefined,
    district: input.cityArea || undefined,
    postalCode: input.postalCode,
    comment: input.streetAddress2,
  };
}

async function listAddressesRaw(): Promise<NestAddress[]> {
  const res = await apiFetch<NestAddress[] | { items?: NestAddress[] }>('/account/addresses');
  return Array.isArray(res) ? res : (res.items ?? []);
}

export async function listAddresses(): Promise<AddressInfo[]> {
  const rows = await listAddressesRaw();
  return rows.map(mapNestAddressToInfo);
}

export async function createAddress(
  input: Parameters<typeof mapInfoToNestAddress>[0],
  isDefault = false,
): Promise<AddressInfo[]> {
  const created = await apiJson<NestAddress>('/account/addresses', 'POST', {
    ...mapInfoToNestAddress(input),
    isDefault,
  });
  const list = await listAddresses();
  // Nest сортирует default → updatedAt desc; UI ожидает «новый адрес — последний» (как в Saleor).
  const idx = created?.id ? list.findIndex((a) => a.id === created.id) : -1;
  if (idx >= 0 && idx !== list.length - 1) {
    const [row] = list.splice(idx, 1);
    list.push(row!);
  }
  return list;
}

export async function updateAddress(
  id: string,
  input: Parameters<typeof mapInfoToNestAddress>[0],
): Promise<AddressInfo[]> {
  await apiJson(`/account/addresses/${encodeURIComponent(id)}`, 'PATCH', mapInfoToNestAddress(input));
  return listAddresses();
}

export async function deleteAddress(id: string): Promise<AddressInfo[]> {
  await apiJson(`/account/addresses/${encodeURIComponent(id)}`, 'DELETE');
  return listAddresses();
}

export async function setDefaultAddress(id: string): Promise<AddressInfo[]> {
  await apiJson(`/account/addresses/${encodeURIComponent(id)}/default`, 'POST');
  return listAddresses();
}

export type NestOrderLine = {
  id: string;
  productName: string;
  productType: string | null;
  quantity: number;
  variantName?: string;
  unitPrice: { gross: { amount: number; currency: string } };
  isGift: boolean;
  thumbnail?: { url: string };
  variant: {
    id?: string;
    product: { id?: string; slug?: string; thumbnail?: { url: string } };
  };
};

export type NestOrderNode = {
  id: string;
  number: string | null;
  created: string;
  status: 'FULFILLED' | 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'CANCELED';
  statusDisplay?: string;
  isPaid: boolean;
  total: { gross: { amount: number; currency: string } };
  subtotal?: number;
  shippingCost?: number;
  discountTotal?: number;
  giftCertificateAmount?: number;
  userEmail: string;
  tracking: string | null;
  trackingProvider: string | null;
  canPay: boolean;
  payToken: string | null;
  payExpiresAt: string | null;
  lines: NestOrderLine[];
};

export type NestOrdersConnection = {
  edges: Array<{ node: NestOrderNode }>;
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; endCursor: string | null };
};

function mapOrderStatus(status: string): NestOrderNode['status'] {
  const s = status.toUpperCase();
  if (s.includes('CANCEL')) return 'CANCELED';
  if (s.includes('FULFIL') && !s.includes('UN')) return 'FULFILLED';
  if (s.includes('PARTIAL')) return 'PARTIALLY_FULFILLED';
  return 'UNFULFILLED';
}

function mapOrderToNode(o: NestOrderSummary): NestOrderNode {
  const statusUpper = o.status.toUpperCase();
  const canPay =
    o.canPay ??
    (statusUpper === 'AWAITING_PAYMENT' || statusUpper === 'NEW');
  return {
    id: o.id,
    number: o.number,
    created: o.createdAt,
    status: mapOrderStatus(o.status),
    statusDisplay: o.status,
    isPaid: !['AWAITING_PAYMENT', 'DRAFT', 'CANCELLED', 'NEW'].includes(statusUpper),
    total: { gross: { amount: o.total, currency: 'RUB' } },
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    discountTotal: o.discountTotal,
    giftCertificateAmount: o.giftCertificateAmount,
    userEmail: '',
    tracking: o.tracking,
    trackingProvider: o.trackingProvider,
    canPay,
    payToken: o.payToken ?? null,
    payExpiresAt: o.payExpiresAt ?? null,
    lines: o.items.map((item) => ({
      id: item.id,
      productName: item.title,
      productType: item.productType?.trim() || null,
      quantity: item.qty,
      variantName: item.variantName || item.shadeName || undefined,
      unitPrice: { gross: { amount: item.unitPrice, currency: 'RUB' } },
      isGift: Boolean(item.isGift),
      thumbnail: item.imageUrl ? { url: uploadsUrl(item.imageUrl) || item.imageUrl } : undefined,
      variant: {
        id: item.variantId || undefined,
        product: {
          id: item.productId || undefined,
          slug: item.productSlug || undefined,
          thumbnail: item.imageUrl ? { url: uploadsUrl(item.imageUrl) || item.imageUrl } : undefined,
        },
      },
    })),
  };
}

export type NestOrderDetail = NestOrderSummary & {
  email?: string;
  phone?: string;
  customerName?: string | null;
  promoCode?: string | null;
  refundedAmount?: number;
  canCancel?: boolean;
  shippingAddress: {
    city: string;
    address: string;
    apartment: string;
    region: string;
    district: string;
    postalCode: string;
    comment: string;
    pvzCode: string;
    phone: string;
    recipientName: string;
  } | null;
  shipments?: Array<{
    id: string;
    provider: string;
    tracking: string | null;
    status?: string;
    createdAt?: string;
  }>;
};

/** Сырой список заказов (`GET /account/orders`, без пагинации на сервере). */
export async function fetchOrderSummaries(): Promise<NestOrderSummary[]> {
  const rows = await apiFetch<NestOrderSummary[] | { items?: NestOrderSummary[] }>('/account/orders');
  return Array.isArray(rows) ? rows : (rows?.items ?? []);
}

/** Сырая карточка заказа (`GET /account/orders/:id`). Бросает ApiError (404 и т.п.). */
export async function fetchOrderDetailRaw(id: string): Promise<NestOrderDetail> {
  return apiFetch<NestOrderDetail>(`/account/orders/${encodeURIComponent(id)}`);
}

export async function cancelUnpaidOrder(id: string): Promise<void> {
  await apiJson(`/account/orders/${encodeURIComponent(id)}/cancel`, 'POST');
}

export async function listOrders(): Promise<NestOrdersConnection> {
  const rows = await apiFetch<NestOrderSummary[]>('/account/orders');
  return {
    edges: (rows ?? []).map((o) => ({ node: mapOrderToNode(o) })),
    pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null },
  };
}

export async function getOrder(id: string): Promise<NestOrderNode | null> {
  try {
    const o = await apiFetch<NestOrderSummary & { email?: string; phone?: string }>(
      `/account/orders/${encodeURIComponent(id)}`,
    );
    const node = mapOrderToNode(o);
    if (o.email) node.userEmail = o.email;
    return node;
  } catch {
    return null;
  }
}

// ——— Favorites ———

export async function fetchFavoriteIds(): Promise<string[]> {
  const res = await apiFetch<string[] | { variantIds?: string[] }>('/account/favorites');
  if (Array.isArray(res)) return res;
  return res.variantIds ?? [];
}

export async function replaceFavorites(variantIds: string[]): Promise<void> {
  await apiJson('/account/favorites', 'PUT', { variantIds });
}

export async function addFavorite(variantId: string): Promise<void> {
  await apiJson(`/account/favorites/${encodeURIComponent(variantId)}`, 'POST');
}

export async function removeFavorite(variantId: string): Promise<void> {
  await apiJson(`/account/favorites/${encodeURIComponent(variantId)}`, 'DELETE');
}

export async function fetchFavoriteItems(): Promise<
  Array<{
    variantId: string;
    productId: string;
    slug: string;
    name: string;
    price: number;
    listPrice: number | null;
    imageUrl: string | null;
    imageUrls: string[];
    variantName: string | null;
    shortDescription: string | null;
    discountPercent: number | null;
  }>
> {
  const res = await apiFetch<
    | Array<{
        variantId: string;
        productId?: string;
        id?: string;
        slug: string;
        name: string;
        price: number;
        oldPrice?: number | null;
        listPrice?: number | null;
        imageUrl: string | null;
        imageUrls?: string[];
        variantName: string | null;
        shortDescription?: string | null;
        discountPercent?: number | null;
      }>
    | {
        items?: Array<{
          variantId: string;
          productId?: string;
          id?: string;
          slug: string;
          name: string;
          price: number;
          oldPrice?: number | null;
          listPrice?: number | null;
          imageUrl: string | null;
          imageUrls?: string[];
          variantName: string | null;
          shortDescription?: string | null;
          discountPercent?: number | null;
        }>;
      }
  >('/account/favorites/items');
  const rows = Array.isArray(res) ? res : (res.items ?? []);
  return rows.map(r => ({
    variantId: r.variantId,
    productId: r.productId || r.id || '',
    slug: r.slug,
    name: r.name,
    price: r.price,
    listPrice: r.listPrice ?? r.oldPrice ?? null,
    imageUrl: r.imageUrl ? uploadsUrl(r.imageUrl) || r.imageUrl : null,
    imageUrls: (r.imageUrls ?? [])
      .map(url => (url ? uploadsUrl(url) || url : ''))
      .filter(Boolean),
    variantName: r.variantName,
    shortDescription: r.shortDescription ?? null,
    discountPercent: r.discountPercent ?? null,
  }));
}
