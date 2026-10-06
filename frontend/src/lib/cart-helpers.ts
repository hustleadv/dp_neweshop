/**
 * DP AGRON - WooCommerce Cart & Checkout Transition Helpers
 * Handles redirecting the user to WooCommerce for cart & checkout,
 * including variable products with specific variation IDs.
 */

import { WP_URL } from "./config";

/**
 * Returns direct URL to add a simple product to WooCommerce cart.
 * Example: https://pgagron.hustlelabs.gr/cart/?add-to-cart=12&quantity=1
 */
export function getWooCommerceAddToCartUrl(
  productId: number,
  quantity = 1,
  directToCheckout = false
): string {
  const target = directToCheckout ? "checkout" : "cart";
  return `${WP_URL}/${target}/?add-to-cart=${productId}&quantity=${quantity}`;
}

/**
 * Returns direct URL to add a specific product variation to WooCommerce cart.
 * In WooCommerce, variations are added using their variation ID as the add-to-cart target.
 * Example: https://pgagron.hustlelabs.gr/cart/?add-to-cart=45&quantity=1
 */
export function getWooCommerceVariationAddToCartUrl(
  variationId: number,
  quantity = 1,
  directToCheckout = false
): string {
  const target = directToCheckout ? "checkout" : "cart";
  return `${WP_URL}/${target}/?add-to-cart=${variationId}&quantity=${quantity}`;
}

/**
 * Returns direct URL to view WooCommerce Cart page
 */
export function getWooCommerceCartUrl(): string {
  return `${WP_URL}/cart/`;
}

/**
 * Returns direct URL to view WooCommerce Checkout page
 */
export function getWooCommerceCheckoutUrl(): string {
  return `${WP_URL}/checkout/`;
}
