import type { WarehousesData } from '../types/core.types'

/** Склады Saleor в Nest не используются → пустая выборка. */
export async function getWarehouses(_first = 50): Promise<WarehousesData['warehouses']> {
  return {
    edges: [],
    pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null },
  }
}
