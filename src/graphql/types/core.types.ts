// core.types.ts
// --- Core Interface Types for GraphQL Nodes and Connections ---

export interface Node {
  id: string | number;
}

export interface MutationError {
  field: string | null;
  message: string;
  code: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export interface Edge<T extends Node> {
  node: T;
}

export interface Connection<T extends Node> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

// --- General E-commerce Node Types ---

/**
 * Represents a Warehouse for inventory.
 */
export interface WarehouseNode extends Node {
  name: string;
  slug: string;
  address: {
    city: string;
    country: string;
  };
}

/**
 * Represents an Order Line Item (product in order).
 */
export interface OrderLineNode {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: {
    gross: {
      amount: number;
      currency: string;
    };
  };
  undiscountedUnitPrice: {
    gross: {
      amount: number;
      currency: string;
    };
  };
  thumbnail: {
    url: string;
    alt: string | null;
  } | null;
  variant: {
    id: string;
    name: string;
  } | null;
}

/**
 * Represents a full Order object.
 */
export interface OrderNode extends Node {
  number: string | null;
  created: string;
  status: 'FULFILLED' | 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'CANCELED';
  statusDisplay?: string;
  total: {
    gross: { amount: number; currency: string };
  };
  userEmail: string;
  lines: OrderLineNode[];
}

// --- General Data Response Types ---

/**
 * Type for the top-level data response when fetching a list of warehouses.
 */
export interface WarehousesData {
  warehouses: Connection<WarehouseNode>;
}

/**
 * Type for the top-level data response when fetching a list of orders.
 */
export interface OrdersData {
  orders: Connection<OrderNode>;
}

// --- General Mutation Response Types ---

/**
 * Standard mutation response structure for fulfilling an order.
 */
export interface OrderFulfillMutationResponse {
  orderFulfill: {
    order: OrderNode | null;
    errors: MutationError[];
  };
}