import { graphqlRequest } from "@/graphql/client";
import type { OrderNode, Connection } from "../types/core.types";

interface MeOrdersResponse {
  me: {
    orders: Connection<OrderNode>;
  } | null;
}

export async function getOrders(first = 20): Promise<Connection<OrderNode>> {
  const query = `
    query MeOrders($first: Int!) {
      me {
        orders(first: $first) {
          edges {
            node {
              id
              number
              created
              status
              statusDisplay
              total {
                gross { amount currency }
              }
              userEmail
              lines {
                id
                productName
                variantName
                quantity
                unitPrice {
                  gross {
                    amount
                    currency
                  }
                }
                undiscountedUnitPrice {
                  gross {
                    amount
                    currency
                  }
                }
                thumbnail {
                  url
                  alt
                }
                variant {
                  id
                  name
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  const variables = { first };
  const data = await graphqlRequest<MeOrdersResponse>(query, variables);
  
  if (!data.me || !data.me.orders) {
    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    };
  }
  
  return data.me.orders;
}
