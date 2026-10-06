/**
 * WordPress REST API Client (/wp/v2)
 * Used for public posts, pages, CMS content. No secret keys required.
 */

import { buildRestUrl } from "./config";
import { WPPage, WPPost } from "@/types/woocommerce";

export async function getWPPages(): Promise<WPPage[]> {
  try {
    const url = buildRestUrl("wp/v2/pages", { per_page: 20 });
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[getWPPages] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error("[getWPPages] Error:", err);
    return [];
  }
}

export async function getWPPosts(): Promise<WPPost[]> {
  try {
    const url = buildRestUrl("wp/v2/posts", { per_page: 10 });
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[getWPPosts] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error("[getWPPosts] Error:", err);
    return [];
  }
}

export async function getWPPageBySlug(slug: string): Promise<WPPage | null> {
  try {
    const url = buildRestUrl("wp/v2/pages", { slug });
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const pages: WPPage[] = await res.json();
    return pages[0] || null;
  } catch (err) {
    console.error(`[getWPPageBySlug] Error for slug ${slug}:`, err);
    return null;
  }
}
