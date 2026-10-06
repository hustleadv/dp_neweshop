import { NextResponse } from "next/server";
import { WP_URL, USE_PLAIN_PERMALINKS, buildRestUrl } from "@/lib/config";
import { hasWooCommerceCredentials, getWooCommerceProducts } from "@/lib/woocommerce";
import { getStoreProducts } from "@/lib/store-api";
import { getWPPages } from "@/lib/wordpress";

export async function GET() {
  const credentialsConfigured = hasWooCommerceCredentials();

  // Test Store API
  const storeRes = await getStoreProducts({ per_page: 5 });

  // Test WC REST API v3
  const wcRes = credentialsConfigured ? await getWooCommerceProducts({ per_page: 5 }) : null;

  // Test WP Pages
  const pages = await getWPPages();

  return NextResponse.json({
    wordpressUrl: WP_URL,
    usePlainPermalinks: USE_PLAIN_PERMALINKS,
    credentialsConfigured,
    endpoints: {
      storeApi: {
        testedUrl: buildRestUrl("wc/store/v1/products"),
        success: storeRes.success,
        productsFound: storeRes.products.length,
        error: storeRes.error || null,
      },
      woocommerceRestV3: credentialsConfigured
        ? {
            testedUrl: buildRestUrl("wc/v3/products"),
            success: wcRes?.success,
            productsFound: wcRes?.products?.length || 0,
            error: wcRes?.error || null,
          }
        : {
            status: "not_configured",
            message: "WC_CONSUMER_KEY & WC_CONSUMER_SECRET are not set in .env.local",
          },
      wordpressPages: {
        testedUrl: buildRestUrl("wp/v2/pages"),
        pagesCount: pages.length,
        pages: pages.map((p) => ({ id: p.id, slug: p.slug, title: p.title.rendered })),
      },
    },
  });
}
