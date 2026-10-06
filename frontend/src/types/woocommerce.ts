/**
 * DP AGRON - WooCommerce & WordPress TypeScript Type Definitions
 */

export interface WCImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WCProductAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  type: "simple" | "variable" | "grouped" | "external";
  status: "draft" | "pending" | "private" | "publish";
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  stock_quantity: number | null;
  manage_stock: boolean;
  categories: WCCategory[];
  images: WCImage[];
  attributes: WCProductAttribute[];
  variations: number[]; // Variation IDs for variable products
}

export interface WCVariation {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  stock_quantity: number | null;
  image: WCImage;
  attributes: {
    id: number;
    name: string;
    option: string;
  }[];
}

export interface WCStoreProductPrice {
  price: string;
  regular_price: string;
  sale_price: string;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WCStoreProductImage {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
}

export interface WCStoreProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: "simple" | "variable" | "grouped" | "external";
  variation: string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: WCStoreProductPrice;
  is_in_stock: boolean;
  is_purchasable: boolean;
  has_options: boolean;
  images: WCStoreProductImage[];
  categories: { id: number; name: string; slug: string }[];
  variations: { id: number; attributes: { name: string; value: string }[] }[];
}

export interface WPPage {
  id: number;
  slug: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
}

export interface WPPost {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
}
