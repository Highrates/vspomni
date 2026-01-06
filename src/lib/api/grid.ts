import api from "../axios";
import { ProductsGridResp } from '@/types/product'

export const gridApi = {
   productsgrid: () => api.get<ProductsGridResp>("/productsgrid"),
   popularscents: () => api.get<ProductsGridResp>("/popularscents"),
}