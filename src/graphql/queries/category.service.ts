import { CHANNEL, graphqlRequest } from '../client';
import { CategoryConnection, SingleCategoryConnection } from '@/graphql/types/category.types';
import { Category} from "@/types/category"

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

    // Жёстко выбираем нужные категории по ID и всегда показываем их
    // в блоке "Скоро в продаже", независимо от наличия товаров.
    const targetIds = ['Q2F0ZWdvcnk6Mw==', 'Q2F0ZWdvcnk6NA=='];

    return allCategories.filter((category) => targetIds.includes(category.id));
  } catch (error) {
    console.error('Error fetching coming soon categories:', error);
    return [];
  }
}
