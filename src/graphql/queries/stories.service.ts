import { graphqlRequest } from '@/graphql/client';

export interface StoryImage {
  id: string;
  image: string;
  order: number;
}

export interface StoryNode {
  id: string;
  title: string;
  slug: string;
  image?: string | null;
  order: number;
  isPublished: boolean;
  publishedAt?: string | null;
  items: StoryImage[];
}

interface StoryAssignedAttribute {
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

interface StoryPageNode {
  id: string;
  slug: string;
  title: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  assignedAttributes: StoryAssignedAttribute[];
  pageType?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface StoriesPagesConnection {
  pages: {
    edges: {
      node: StoryPageNode;
    }[];
  };
}

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

export async function getAllStories(): Promise<StoryNode[]> {
  const pageTypeQuery = `
    query GetStoryPageType {
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
  const storyPageType = pageTypesData.pageTypes.edges.find(
    (e) => e.node.name.toLowerCase() === 'сторис' || e.node.slug.toLowerCase() === 'stories'
  );

  if (!storyPageType) {
    return [];
  }

  const pagesQuery = `
    query GetAllStories($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            publishedAt
            isPublished
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
          }
        }
      }
    }
  `;

  const pagesData = await graphqlRequest<StoriesPagesConnection>(pagesQuery, { 
    first: 100,
    pageTypeId: storyPageType.node.id
  });

  const stories = pagesData.pages.edges
    .filter((e) => {
      const node = e.node;
      return node.isPublished === true;
    })
    .map((e) => {
      const node = e.node;
      const imageAttributes = node.assignedAttributes
        .filter((attr) => {
          const slug = attr.attribute.slug.toLowerCase();
          return (
            slug.includes('kartinka') ||
            slug.includes('image') ||
            slug.includes('картинка')
          );
        })
        .sort((a, b) => {
          const aSlug = a.attribute.slug.toLowerCase();
          const bSlug = b.attribute.slug.toLowerCase();
          const aNum = parseInt(aSlug.match(/\d+/)?.[0] || '0');
          const bNum = parseInt(bSlug.match(/\d+/)?.[0] || '0');
          return aNum - bNum;
        });

      const items: StoryImage[] = imageAttributes
        .map((attr, index) => ({
          id: attr.attribute.id,
          image: attr.fileValue?.url || '',
          order: index + 1,
        }))
        .filter((item) => item.image);

      const firstImage = items[0]?.image || null;

      return {
        id: node.id,
        title: node.title,
        slug: node.slug,
        image: firstImage,
        order: 0,
        isPublished: node.isPublished || false,
        publishedAt: node.publishedAt,
        items,
      };
    })
    .filter((story) => story.items.length > 0);

  return stories;
}

