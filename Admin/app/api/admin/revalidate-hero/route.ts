import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdminSection } from '@/lib/requireAdminSection';
import { revalidateStorefront } from '@/lib/revalidateStorefront';

export const runtime = 'nodejs';

export async function POST() {
  const gate = await requireAdminSection('settings');
  if (!gate.ok) return gate.response;

  // ISR-теги Admin (наборы / промо / hero, если ещё используются)
  revalidateTag('hero');
  revalidateTag('homepage-sets');
  revalidateTag('home-promo');
  revalidatePath('/');

  // Витрина (Front) — отдельный Next-процесс
  const storefront = await revalidateStorefront({
    paths: ['/'],
    tags: ['hero', 'homepage-sets', 'home-promo'],
  });

  return NextResponse.json({ revalidated: true, storefront });
}
