import { graphqlRequest } from '../client';

// ===== Типы =====

export interface ArticleAssignedAttribute {
  attribute: {
    id: string;
    slug: string;
    name: string;
  };
  fileValue?: {
    url: string;
  };
  textValue?: string;
  /** Saleor: AssignedPlainTextAttribute */
  textValuePlain?: string;
}

export interface ArticleNode {
  id: string;
  slug: string;
  title: string;
  created: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  content?: string | null;
  assignedAttributes: ArticleAssignedAttribute[];
  metadata?: {
    key: string;
    value: string;
  }[];
  // Helper property for image URL
  imageUrl?: string | null;
  /** Атрибут osnovnoj-tekst */
  osnovnojTekst?: string | null;
  /** Атрибуты dop-izobrazhenie-1 / dop-izobrazhenie-2 */
  dopIzobrazhenie1Url?: string | null;
  dopIzobrazhenie2Url?: string | null;
}

export interface ArticlesConnection {
  pages: {
    edges: {
      node: ArticleNode;
    }[];
    totalCount: number;
  };
}

export interface SingleArticleConnection {
  page: ArticleNode | null;
}

/** URL главного изображения страницы (Saleor): приоритет атрибуту glavnoe-izobrazhenie */
export function extractArticleMainImageUrl(node: {
  assignedAttributes: ArticleAssignedAttribute[];
}): string | undefined {
  const attrs = node.assignedAttributes;
  const main = attrs.find((a) => a.attribute.slug === 'glavnoe-izobrazhenie');
  if (main?.fileValue?.url) return main.fileValue.url;

  const fallback = attrs.find(
    (attr) =>
      attr.attribute.slug === 'image' ||
      attr.attribute.slug === 'cover' ||
      attr.attribute.name?.toLowerCase().includes('изображение') ||
      attr.attribute.name?.toLowerCase().includes('image'),
  );
  return fallback?.fileValue?.url || undefined;
}

export function extractArticleTextAttribute(
  node: { assignedAttributes: ArticleAssignedAttribute[] },
  slug: string,
): string | undefined {
  const attr = node.assignedAttributes.find((a) => a.attribute.slug === slug);
  if (!attr) return undefined;
  const v = attr.textValue ?? attr.textValuePlain;
  if (typeof v !== 'string' || !v.trim()) return undefined;
  return v;
}

export function extractArticleFileAttributeUrl(
  node: { assignedAttributes: ArticleAssignedAttribute[] },
  slug: string,
): string | undefined {
  const attr = node.assignedAttributes.find((a) => a.attribute.slug === slug);
  return attr?.fileValue?.url || undefined;
}

// ============================================
// ================ Запросы ===================
// ============================================

interface PageTypesConnection {
  pageTypes: {
    edges: {
      node: {
        id: string;
        name: string;
        slug: string;
      };
    }[];
  };
}

interface ArticlesPagesConnection {
  pages: {
    edges: {
      node: ArticleNode & {
        pageType?: {
          id: string;
          name: string;
          slug: string;
        };
      };
    }[];
  };
}

// 🔹 1. Получить все статьи (pages) с фильтрацией по типу страницы
export async function getAllArticles(
  first: number, 
  pageTypeSlug?: string
): Promise<ArticleNode[]> {
  const pageTypeQuery = `
    query GetArticlePageType {
      pageTypes(first: 100) {
        edges {
          node {
            id
            name
            slug
          }
        }
      }
    }
  `;

  const pageTypesData = await graphqlRequest<PageTypesConnection>(pageTypeQuery);
  const articlePageType = pageTypesData.pageTypes.edges.find(
    (e) => e.node.name.toLowerCase() === 'статьи' || 
           e.node.slug.toLowerCase() === 'articles' ||
           e.node.slug.toLowerCase() === 'statii'
  );

  if (!articlePageType) {
    return [];
  }

  const query = `
    query GetAllArticles($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            created
            publishedAt
            isPublished
            content
            pageType {
              id
              name
              slug
            }
            assignedAttributes {
              attribute {
                id
                slug
                name
              }
              ... on AssignedFileAttribute {
                fileValue: value {
                  url
                }
              }
              ... on AssignedTextAttribute {
                textValue: value
              }
            }
            metadata {
              key
              value
            }
          }
        }
      }
    }
  `;

  const variables = { 
    first,
    pageTypeId: articlePageType.node.id
  };

  const data = await graphqlRequest<ArticlesPagesConnection>(query, variables);
  
  // Фильтруем только опубликованные страницы на клиенте
  const articles = data.pages.edges
    .filter(e => e.node.isPublished === true) // Фильтруем опубликованные
    .map((e) => {
      const node = e.node;
      return {
        ...node,
        imageUrl: extractArticleMainImageUrl(node),
      };
    });
    
  return articles;
}

// 🔹 2. Получить одну статью по slug
export async function getSingleArticle(slug: string): Promise<ArticleNode | null> {
  const query = `
    query GetSingleArticle($slug: String!) {
      page(slug: $slug) {
        id
        slug
        title
        created
        publishedAt
        content
        assignedAttributes {
          attribute {
            id
            slug
            name
          }
          
          ... on AssignedFileAttribute {
            fileValue: value {
              url
            }
          }
          ... on AssignedTextAttribute {
            textValue: value
          }
          ... on AssignedPlainTextAttribute {
            textValuePlain: value
          }
        }
        metadata {
          key
          value
        }
      }
    }
  `;

  const variables = { slug };

  const data = await graphqlRequest<SingleArticleConnection>(query, variables);
  if (!data.page) return null;
  
  return {
    ...data.page,
    imageUrl: extractArticleMainImageUrl(data.page),
    osnovnojTekst:
      extractArticleTextAttribute(data.page, 'osnovnoj-tekst') ?? null,
    dopIzobrazhenie1Url:
      extractArticleFileAttributeUrl(data.page, 'dop-izobrazhenie-1') ?? null,
    dopIzobrazhenie2Url:
      extractArticleFileAttributeUrl(data.page, 'dop-izobrazhenie-2') ?? null,
  };
}
