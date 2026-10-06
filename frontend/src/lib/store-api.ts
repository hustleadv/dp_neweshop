/**
 * WooCommerce Store API Client (/wc/store/v1)
 * PUBLIC Client - Does NOT require Consumer Key or Secret.
 * Ideal for public catalog browsing, category listings, and shopper cart interactions.
 */

import { buildRestUrl } from "./config";
import { WCStoreProduct } from "@/types/woocommerce";

export async function getStoreProducts(params: Record<string, string | number | boolean> = {}): Promise<{
  success: boolean;
  products: WCStoreProduct[];
  error?: string;
  statusCode?: number;
}> {
  try {
    const url = buildRestUrl("wc/store/v1/products", { per_page: 20, ...params });
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        products: [],
        statusCode: res.status,
        error: `Store API Error (HTTP ${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const products: WCStoreProduct[] = await res.json();
    return {
      success: true,
      products,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      products: [],
      error: `Network Error: ${message}`,
    };
  }
}

export async function getStoreProductById(id: number): Promise<WCStoreProduct | null> {
  try {
    const url = buildRestUrl(`wc/store/v1/products/${id}`);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[getStoreProductById] Error for ${id}:`, err);
    return null;
  }
}

export async function getStoreCategories(): Promise<{ id: number; name: string; slug: string; count: number }[]> {
  try {
    const url = buildRestUrl("wc/store/v1/products/categories");
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("[getStoreCategories] Error:", err);
    return [];
  }
}
