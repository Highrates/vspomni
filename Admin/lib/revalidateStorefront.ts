/**
 * On-demand ISR витрины (Front Next), не Admin.
 * Нужны STOREFRONT_URL + REVALIDATE_SECRET (тот же, что на Front).
 */
export async function revalidateStorefront(opts?: {
  paths?: string[];
  tags?: string[];
}): Promise<boolean> {
  const base = process.env.STOREFRONT_URL?.trim().replace(/\/+$/, '');
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!base || !secret) return false;

  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paths: opts?.paths ?? ['/'],
        tags: opts?.tags ?? [],
      }),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
