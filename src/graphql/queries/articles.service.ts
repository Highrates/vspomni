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
    .map(e => {
      const node = e.node;
      // Извлекаем изображение из атрибутов
      const imageAttribute = node.assignedAttributes.find(
        attr => attr.attribute.slug === 'image' || 
                attr.attribute.slug === 'cover' ||
                attr.attribute.name?.toLowerCase().includes('изображение') ||
                attr.attribute.name?.toLowerCase().includes('image')
      );
      
    return {
      ...node,
      imageUrl: imageAttribute?.fileValue?.url || undefined,
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
  
  // Извлекаем изображение из атрибутов
  const imageAttribute = data.page.assignedAttributes.find(
    attr => attr.attribute.slug === 'image' || 
            attr.attribute.slug === 'cover' ||
            attr.attribute.name?.toLowerCase().includes('изображение') ||
            attr.attribute.name?.toLowerCase().includes('image')
  );
  
  return {
    ...data.page,
    imageUrl: imageAttribute?.fileValue?.url || undefined,
  };
}
