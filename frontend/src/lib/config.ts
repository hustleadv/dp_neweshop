/**
 * API Configuration & Endpoint Resolver
 */

export const WP_URL = (
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://pgagron.hustlelabs.gr"
).replace(/\/$/, "");

// Check if site uses plain permalinks (?rest_route=)
export const USE_PLAIN_PERMALINKS =
  process.env.NEXT_PUBLIC_WP_USE_PLAIN_PERMALINKS === "true";

/**
 * Builds the proper REST URL taking into account plain vs pretty permalinks.
 * Example:
 *   buildRestUrl('wc/v3/products')
 *   -> 'https://pgagron.hustlelabs.gr/wp-json/wc/v3/products' (Pretty)
 *   -> 'https://pgagron.hustlelabs.gr/index.php?rest_route=/wc/v3/products' (Plain)
 */
export function buildRestUrl(endpoint: string, queryParams: Record<string, string | number | boolean> = {}): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  let base: string;
  const searchParams = new URLSearchParams();

  if (USE_PLAIN_PERMALINKS) {
    base = `${WP_URL}/index.php`;
    searchParams.set("rest_route", cleanEndpoint);
  } else {
    base = `${WP_URL}/wp-json${cleanEndpoint}`;
  }

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const queryStr = searchParams.toString();
  return queryStr ? `${base}${base.includes("?") ? "&" : "?"}${queryStr}` : base;
}
