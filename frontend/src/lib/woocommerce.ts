/**
 * WooCommerce REST API v3 Client (/wc/v3)
 * Server-Side ONLY - Requires Consumer Key & Consumer Secret.
 * NEVER import or run this in Client Components ("use client").
 */

import { buildRestUrl } from "./config";
import { WCProduct, WCVariation } from "@/types/woocommerce";

const CONSUMER_KEY = process.env.WC_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || "";

function getAuthHeader(): HeadersInit {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    return {};
  }
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

export function hasWooCommerceCredentials(): boolean {
  return Boolean(
    CONSUMER_KEY &&
    CONSUMER_SECRET &&
    !CONSUMER_KEY.includes("xxx") &&
    !CONSUMER_SECRET.includes("xxx")
  );
}

/**
 * Fetch products via WooCommerce REST API v3 (Server-Side)
 */
export async function getWooCommerceProducts(params: Record<string, string | number | boolean> = {}): Promise<{
  success: boolean;
  products: WCProduct[];
  error?: string;
  statusCode?: number;
}> {
  if (!hasWooCommerceCredentials()) {
    return {
      success: false,
      products: [],
      error: "Δεν έχουν ρυθμιστεί τα WC_CONSUMER_KEY και WC_CONSUMER_SECRET στο .env.local",
    };
  }

  try {
    const url = buildRestUrl("wc/v3/products", {
      per_page: 20,
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
      ...params,
    });
    const res = await fetch(url, {
      headers: getAuthHeader(),
      next: { revalidate: 60 }, // Cache for 60s
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        products: [],
        statusCode: res.status,
        error: `WooCommerce API Error (HTTP ${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const products: WCProduct[] = await res.json();
    return {
      success: true,
      products,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      products: [],
      error: `Network/Fetch Error: ${message}`,
    };
  }
}

/**
 * Fetch a single product by ID via WooCommerce REST API v3
 */
export async function getWooCommerceProductById(id: number): Promise<WCProduct | null> {
  if (!hasWooCommerceCredentials()) return null;
  try {
    const url = buildRestUrl(`wc/v3/products/${id}`, {
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    });
    const res = await fetch(url, {
      headers: getAuthHeader(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[getWooCommerceProductById] Error for ${id}:`, err);
    return null;
  }
}

/**
 * Fetch variations for a variable product
 */
export async function getWooCommerceVariations(productId: number): Promise<WCVariation[]> {
  if (!hasWooCommerceCredentials()) return [];
  try {
    const url = buildRestUrl(`wc/v3/products/${productId}/variations`, {
      per_page: 50,
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    });
    const res = await fetch(url, {
      headers: getAuthHeader(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`[getWooCommerceVariations] Error for product ${productId}:`, err);
    return [];
  }
}
