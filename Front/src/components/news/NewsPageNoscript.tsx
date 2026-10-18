import type { NewsListItem } from '@/lib/articles/newsList'

type Props = {
  items: NewsListItem[]
}

export default function NewsPageNoscript({ items }: Props) {
  if (items.length === 0) return null

  return (
    <noscript>
      <nav className="container px-4 py-4" aria-label="Новости ВСПОМНИ">
        <h2>Новости и публикации</h2>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <a href={item.articleUrl}>
                {item.title}
                {item.date ? ` — ${item.date}` : ''}
              </a>
              {item.shortText ? <p>{item.shortText}</p> : null}
            </li>
          ))}
        </ul>
      </nav>
    </noscript>
  )
}
