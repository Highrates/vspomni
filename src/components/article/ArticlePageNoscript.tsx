import type { ArticleNode } from '@/graphql/queries/articles.service'
import { extractArticleText, formatArticleDate } from '@/lib/articles'

type Props = {
  article: ArticleNode
}

export default function ArticlePageNoscript({ article }: Props) {
  const mainText = extractArticleText(article.osnovnojTekst, 8000)
  const bodyText = extractArticleText(article.content, 8000)
  const date = formatArticleDate(article.publishedAt || article.created)

  return (
    <noscript>
      <article className="max-w-3xl mx-auto px-4 py-6">
        <h1>{article.title}</h1>
        {mainText ? <p>{mainText}</p> : null}
        {bodyText ? <p>{bodyText}</p> : null}
        {date ? <p>{date}</p> : null}
      </article>
    </noscript>
  )
}
