import { CHANNEL, graphqlRequest } from '@/graphql/client';
import { ProductNode, ProductsData } from '@/graphql/types/product.types';

export interface SearchProductsResponse {
  products: {
    edges: {
      node: ProductNode;
    }[];
    totalCount: number;
  };
}

export async function searchProducts(query: string, first = 10): Promise<ProductNode[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim();
  const searchQuery = `
    query SearchProducts($query: String!, $channel: String!, $first: Int!) {
      products(
        first: $first,
        channel: $channel,
        search: $query,
        filter: { isPublished: true }
      ) {
        edges {
          node {
            id
            name
            slug
            rating
            thumbnail {
              url
              alt
            }
            media {
              id
              url
              alt
            }
            defaultVariant {
              id
              pricing {
                price {
                  gross {
                    amount
                    currency
                  }
                }
              }
            }
          }
        }
        totalCount
      }
    }
  `;

  const variables = {
    query: searchTerm,
    channel: CHANNEL,
    first: 50,
  };

  try {
    const data = await graphqlRequest<SearchProductsResponse>(searchQuery, variables);
    let results = data.products.edges.map((e) => e.node);
    
    if (results.length === 0) {
      const allProductsQuery = `
        query GetAllProducts($channel: String!, $first: Int!) {
          products(
            first: $first,
            channel: $channel,
            filter: { isPublished: true }
          ) {
            edges {
              node {
                id
                name
                slug
                rating
                thumbnail {
                  url
                  alt
                }
                media {
                  id
                  url
                  alt
                }
                defaultVariant {
                  id
                  pricing {
                    price {
                      gross {
                        amount
                        currency
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const allData = await graphqlRequest<SearchProductsResponse>(allProductsQuery, {
        channel: CHANNEL,
        first: 100,
      });
      
      const searchLower = searchTerm.toLowerCase();
      results = allData.products.edges
        .map((e) => e.node)
        .filter((product) => {
          const name = product.name?.toLowerCase() || '';
          return name.includes(searchLower);
        })
        .slice(0, first);
    }
    
    return results.slice(0, first);
  } catch (error: any) {
    try {
      const allProductsQuery = `
        query GetAllProducts($channel: String!, $first: Int!) {
          products(
            first: $first,
            channel: $channel,
            filter: { isPublished: true }
          ) {
            edges {
              node {
                id
                name
                slug
                rating
                thumbnail {
                  url
                  alt
                }
                media {
                  id
                  url
                  alt
                }
                defaultVariant {
                  id
                  pricing {
                    price {
                      gross {
                        amount
                        currency
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const allData = await graphqlRequest<SearchProductsResponse>(allProductsQuery, {
        channel: CHANNEL,
        first: 100,
      });
      
      const searchLower = searchTerm.toLowerCase();
      const results = allData.products.edges
        .map((e) => e.node)
        .filter((product) => {
          const name = product.name?.toLowerCase() || '';
          return name.includes(searchLower);
        })
        .slice(0, first);
      
      return results;
    } catch {
      return [];
    }
  }
}

