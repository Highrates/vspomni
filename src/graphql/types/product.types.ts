// product.types.ts
// --- Product-Related Types ---
import { Node, Connection, PageInfo } from './core.types';
import type { MutationError } from './core.types';

// --- Core Product Types ---

/**
 * Represents a simplified Product object for lists.
 */
export interface ProductNode extends Node {
  name: string;
  slug: string;
  isPublished?: boolean;
  description?: any;
  thumbnail?: {
    url: string;
    alt?: string;
  };
  media?: MediaItem[];
  category?: {
    id: string;
    name: string;
  };
  collections?: ProductCollections[];
  defaultVariant?: BestSellersProductVariant;
  rating?: number;
  metadata?: {
    key: string;
    value: string;
  }[];
}

/**
 * Represents a detailed Product object.
 */
export interface ProductDetailNode extends Omit<ProductNode, 'category'> {
  descriptionPlaintext?: string;
  productType: {
    name: string;
  };
  category: {
    name: string;
    id: string;
  };
  media: MediaItem[];
  productVariants: {
    edges: ProductVariant[];
    totalCount?: number;
  };
  reviews?: Review[];
  thumbnail: {
    alt: string;
    url: string;
  };
  pricing?: {
    priceRange: {
      start: { net: { amount: number; currency: string } };
      stop: { net: { amount: number; currency: string } };
    };
  };
  isAvailableForPurchase?: boolean;
  availableForPurchaseAt?: string;
  attributes?: Attribute[];
}

/**
 * Represents a Product Variant (edge format).
 */
export interface ProductVariant {
  node: {
    id: string;
    sku: string;
    name: string;
    quantityAvailable?: number;
    pricing: {
      discount?: {
        net?: {
          amount: number;
          currency: string;
        };
        gross?: {
          amount: number;
          currency: string;
        };
      };
      price: {
        gross: {
          amount: number;
          currency: string;
        };
      };
      priceUndiscounted?: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
  };
}

/**
 * Represents a default/bestseller product variant (non-edge format).
 */
export interface BestSellersProductVariant {
  id?: string;
  sku: string;
  name: string;
  pricing: {
    price: {
      currency?: string;
      gross: {
        amount: number;
        currency?: string;
      };
    };
  };
}

/**
 * Represents a bestseller product (transformed format for UI).
 */
export interface BestSellersProduct {
  id: string;
  size: string;
  title: string;
  description: string;
  slug: string;
  price: number;
  stars?: 1 | 2 | 3 | 4 | 5;
  reviews?: number;
  oldPrice?: number;
  discount?: number;
  label?: string;
  images: string | string[];
  thumbnail: string;
  productVariants: ProductVariant[];
  collections: ProductCollections[];
}

// --- Product-Related Supporting Types ---

export interface MediaItem {
  url: string;
  alt?: string;
  id?: string;
}

export interface Review {
  id?: string;
  text: string;
}

export interface ProductCollections {
  id: string;
  name: string;
  slug: string;
}

export interface AttributeValue {
  boolean: boolean | null;
  date: string | null;
  dateTime: string | null;
  externalReference: string | null;
  inputType: string;
  name: string;
  plainText: string | null;
  reference: string | null;
  richText: any;
  slug: string;
  value?: string;
}

export interface Attribute {
  attribute: {
    id: string;
    name: string;
    slug: string;
    metadata: any[];
  };
  values: AttributeValue[];
}

// --- Product Connection & Edge Types ---

export interface ProductEdge {
  node: ProductNode;
}

export interface ProductsConnection extends Connection<ProductNode> {
  totalCount?: number;
}

// --- Product Data Response Types ---

/**
 * Type for the top-level data response when fetching a list of products.
 */
export interface ProductsData {
  products: ProductsConnection;
}

/**
 * Type for the top-level data response when fetching a single product.
 */
export interface ProductData {
  product: ProductDetailNode | null;
}

/**
 * Type for bestseller collection response.
 */
// export interface BestSellersResponse {
//   collection: {
//     id?: string;
//     name?: string;
//     products: {
//       edges: ProductEdge[];
//     };
//   };
// }

export interface BestSellersResponse {
  // collection: {
  //   id?: string;
  //   name?: string;
    products: {
      edges: ProductEdge[];
    };
  // };
}


export interface ProductsByCategorySlugResponse{

  category: BestSellersResponse 

}

/**
 * Type for bestseller connection.
 */
export interface BestsellerConnection {
  edges: ProductEdge[];
}

// --- Product Mutation Response Types ---

/**
 * Standard mutation response structure for updating a product.
 */
export interface ProductUpdateMutationResponse {
  productUpdate: {
    product: ProductNode | null;
    errors: MutationError[];
  };
}