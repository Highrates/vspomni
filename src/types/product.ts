export interface Product {
  id: number
  title: string
  sizes?: ItemSize[]
  price: ItemPrice
  overview: string
  notes?: ItemAromaNotes[]
  groups: ItemGroups[]
  img: ItemImages
  size?: string
  capacity?: string[] 
  about?: string
}

export interface ItemSize {
  id: number
  size: string
}

export interface ItemPrice {
  id: number
  price: number
  isDiscont: boolean
  regularPrice?: number
  discont?: number
}

export interface ItemNote {
  id: number
  title: string
}

export interface ItemGroups {
  id: number
  group: string
  title: string
}

export interface ItemAromaNotes {
  id: number
  name: string
}

export interface ItemImages {
  id: number
  main: string
  gallery: string[]
}

export interface ProductsGridResp {
  date: string
  items: Product[]
}




export interface ProductCardItem{
  id: string;
  name: string;
  slug: string;
  size: string;
  thumbnail: string;
  image: string;
  gallery?: string[]; // дополнительные изображения для слайдера
  aromas: string[];
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  group: ItemGroups[];
  variantId?: string; // ID варианта товара для Saleor checkout
}

export interface StarChoiceItem{
  id: string;
  name: string;
  size: string;
  thumbnail: string;
  image: string;
  price: number;
  oldPrice: number;
  star: string;
  date: string
  slug: string;

}