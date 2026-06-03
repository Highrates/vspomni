import { CHANNEL, graphqlRequest } from '../client';
import { CategoryConnection, SingleCategoryConnection } from '@/graphql/types/category.types';
import { Category} from "@/types/category"
import { pickComingSoonCategories } from '@/lib/category/catalogCategories'

export async function getAllCategory(first: number): Promise<Category[]> {
  const query = `
    query Category($first: Int!) {
      categories(first: $first) {
        edges {
          node {
            id
            description
            name
            slug
            backgroundImage{
              url
            }
          }
        }
      }
    }
  `;

  const variables = { first };
  const data = await graphqlRequest<CategoryConnection>(query, variables)
 
  const result = data.categories.edges.map((edge:any)=>{
    let description = '';
    try {
      if (edge.node.description) {
        const parsed = JSON.parse(edge.node.description);
        description = parsed.blocks?.[0]?.data?.text || '';
      }
    } catch (e) {
      description = '';
    }
    
    return {
      id: edge.node.id,
      name: edge.node.name,
      slug: edge.node.slug,
      description: description,
      backgroundImage: edge.node.backgroundImage?.url || ''
    }
  })
  
  return result;
}

export async function getAllCategorMenu(): Promise<any[]> {
  const query = `
    query getAllCategory {
      categories(first: 20) {
        edges {
          node {
            id
            name
            slug
            parent {
              id
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<CategoryConnection>(query);

  // Оставляем только корневые (parent === null)
  return data.categories.edges.map((e: any) => e.node).filter((cat: any) => !cat.parent);
}
export async function getSingleCategory(
  first: number,
  slug: string
): Promise<SingleCategoryConnection['category']> {
  const query = `
    query getSingleCategory($slug: String!, $channel: String!, $first: Int!) {
      category(slug: $slug) {
        id
        description
        metadata {
          key
          value
        }
        name
        products(channel: $channel, first: $first) {
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
          edges {
            node {
              id
              name
              slug
              description
              isAvailableForPurchase
              media {
                alt
                url
              }
              pricing {
                discount {
                  gross {
                    fractionalAmount
                    amount
                    currency
                  }
                }
              }
              thumbnail {
                alt
                url
              }
              weight {
                unit
                value
              }
              category {
                name
                slug
              }
            }
          }
        }
        slug
      }
    }
  `;

  const variables = { channel: CHANNEL, slug, first };
  const data = await graphqlRequest<SingleCategoryConnection>(query, variables);
  return data.category;
}

export async function getComingSoonCategories(): Promise<Category[]> {
  try {
    const allCategories = await getAllCategory(20);
    return pickComingSoonCategories(allCategories);
  } catch (error) {
    console.error('Error fetching coming soon categories:', error);
    return [];
  }
}

/** Категория по ID (для баннера «Подарочные пакеты» — Q2F0ZWdvcnk6Ng==) */
export async function getCategoryById(id: string): Promise<Category | null> {
  const query = `
    query getCategoryById($id: ID!) {
      category(id: $id) {
        id
        name
        slug
        description
        backgroundImage { url }
      }
    }
  `
  try {
    const data = await graphqlRequest<{ category: { id: string; name: string; slug: string; description: string; backgroundImage: { url: string } | null } | null }>(query, { id })
    const node = data.category
    if (!node) return null
    let description = ''
    try {
      if (node.description) {
        const parsed = JSON.parse(node.description)
        description = parsed.blocks?.[0]?.data?.text || ''
      }
    } catch {
      description = ''
    }
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      description,
      backgroundImage: node.backgroundImage?.url || '',
    }
  } catch (e) {
    console.error('getCategoryById error:', e)
    return null
  }
}

/** Имя и slug категории по slug (для заголовка страницы, без зависимости от zustand) */
export async function getCategoryMetaBySlug(
  slug: string,
): Promise<{ name: string; slug: string } | null> {
  const query = `
    query CategoryMeta($slug: String!) {
      category(slug: $slug) {
        name
        slug
      }
    }
  `
  try {
    const data = await graphqlRequest<{
      category: { name: string; slug: string } | null
    }>(query, { slug })
    const c = data.category
    if (!c?.name || !c?.slug) return null
    return { name: c.name, slug: c.slug }
  } catch {
    return null
  }
}
