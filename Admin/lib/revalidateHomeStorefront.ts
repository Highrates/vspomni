export type HomeRevalidateResult = {
  /** Admin ISR сброшен */
  ok: boolean;
  /** Front ISR сброшен (нужны STOREFRONT_URL + REVALIDATE_SECRET) */
  storefront: boolean;
};

/** Сброс ISR главной: Admin-кэш + витрина Front. */
export async function revalidateHomeStorefront(): Promise<HomeRevalidateResult> {
  try {
    const res = await fetch('/api/admin/revalidate-hero', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!res.ok) return { ok: false, storefront: false };
    const data = (await res.json()) as { storefront?: boolean };
    return { ok: true, storefront: Boolean(data.storefront) };
  } catch {
    return { ok: false, storefront: false };
  }
}

/** Честный тост, если Front не сбросили — ISR главной ~60 с. */
export function homeRevalidateLagToast(result: HomeRevalidateResult): string | null {
  if (result.storefront) return null;
  return 'Главная обновится в течение минуты';
}
