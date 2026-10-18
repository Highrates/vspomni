import { getFaqItems as fetchNestFaqItems } from '@/api/settingsApi'

export interface FaqItem {
  id: string
  title: string
  shortText: string
  answer: string
}

/** Корп. Telegram — как в Header / Footer / «Связаться». */
const TELEGRAM_CORP_HREF = 'https://t.me/vspomni_corp'
const TELEGRAM_CORP_LINK = `<a href="${TELEGRAM_CORP_HREF}" target="_blank" rel="noopener noreferrer">онлайн-чате Telegram</a>`

const WHOLESALE_ANSWER_HTML =
  `Мы предоставляем специальные условия для оптовых заказов. Свяжитесь, пожалуйста, с менеджером для получения информации по ценам и условиям в ${TELEGRAM_CORP_LINK}.`

function isWholesaleFaq(question: string): boolean {
  const q = question.toLowerCase()
  return q.includes('оптов') || q.includes('оптовый')
}

/** Гарантируем кликабельный Telegram в ответе про опт. */
export function enrichFaqAnswer(question: string, answer: string): string {
  if (!isWholesaleFaq(question)) return answer
  if (/онлайн-чате\s+Telegram/i.test(answer)) {
    return answer.replace(/онлайн-чате\s+Telegram/gi, TELEGRAM_CORP_LINK)
  }
  if (/t\.me\//i.test(answer)) return answer
  return WHOLESALE_ANSWER_HTML
}

/** Nest `GET /settings/faq` → `{ id, title, shortText, answer }` (формат Saleor-версии UI). */
export async function getFaqItems(): Promise<FaqItem[]> {
  const rows = await fetchNestFaqItems()
  return rows
    .filter((r) => r.question?.trim() && r.answer?.trim())
    .map((r) => {
      const title = r.question.trim()
      return {
        id: r.id,
        title,
        shortText: title,
        answer: enrichFaqAnswer(title, r.answer),
      }
    })
}

/** Имя, которое уже используют `app/page.tsx` и `stores/useFaq.ts`. */
export const getAllFaqs = getFaqItems
