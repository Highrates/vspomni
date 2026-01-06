import { graphqlRequest } from '@/graphql/client';
import { PublishedReview } from '../types/reviews.types';

export async function getAllPublishedReviews(): Promise<PublishedReview[]> {
  const query = `
    query ReviewsAll {
      products(first: 100, channel: "web") {
        edges {
          node {
            id
            name
            thumbnail {
              url
            }
            reviews {
              id
              rating
              text
              createdAt
              image1
              image2
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<any>(query);

  const allReviews: PublishedReview[] = [];

  data.products.edges.forEach((p: any) => {
    const productName = p.node.name;
    const thumbnail = p.node.thumbnail?.url ?? null;

    p.node.reviews.forEach((r: any) => {
      allReviews.push({
        id: r.id,
        text: r.text,
        rating: r.rating,
        createdAt: r.createdAt,
        image1: r.image1,
        image2: r.image2,
        product: {
          name: productName,
          thumbnail
        }
      });
    });
  });

  return allReviews;
}
