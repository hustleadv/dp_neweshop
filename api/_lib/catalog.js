/* ==========================================================================
   DP AGRON - Advisor catalog loader (server-side only)
   - Base catalog: js/data.js (same data the front-end renders cards from)
   - Live overlay: WooCommerce Store API on Papaki (public, no keys) for
     price & stock of products that have a wcId. Cached for 10 minutes.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, products: null, faqs: null };

function loadBaseData() {
  const candidates = [
    path.join(process.cwd(), "js", "data.js"),
    path.join(__dirname, "..", "..", "js", "data.js")
  ];
  const file = candidates.find(f => fs.existsSync(f));
  if (!file) throw new Error("Catalog file js/data.js not found");
  const src = fs.readFileSync(file, "utf8");
  // data.js declares `const DPAgronData = {...}` for the browser; evaluate it in isolation.
  // eslint-disable-next-line no-new-func
  return new Function(`${src}\n;return DPAgronData;`)();
}

async function fetchLiveWooPrices(baseUrl) {
  if (!baseUrl) return new Map();
  const url = `${baseUrl.replace(/\/$/, "")}/?rest_route=/wc/store/v1/products&per_page=100`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "DP-Agron-Advisor/1.0" } });
    if (!res.ok) return new Map();
    const items = await res.json();
    const map = new Map();
    for (const it of Array.isArray(items) ? items : []) {
      const minor = it.prices && Number(it.prices.currency_minor_unit || 2);
      const price = it.prices && it.prices.price ? Number(it.prices.price) / Math.pow(10, minor) : null;
      map.set(String(it.id), { price, inStock: !!it.is_in_stock });
    }
    return map;
  } catch (e) {
    return new Map(); // Papaki down / slow -> keep base data
  } finally {
    clearTimeout(timer);
  }
}

function compactProduct(p) {
  const specs = p.specs && typeof p.specs === "object"
    ? Object.entries(p.specs).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join("; ")
    : "";
  return {
    id: String(p.id),
    title: p.title,
    brand: p.brand || "",
    category: p.category || "",
    subcategory: p.subcategory || "",
    price: p.price,
    inStock: p.inStock !== false,
    power: p.powerSource || "",
    level: p.usageLevel || "",
    features: (p.keyFeatures || []).slice(0, 2).join(" | "),
    specs
  };
}

async function getCatalog() {
  const now = Date.now();
  if (cache.products && now - cache.at < CACHE_TTL_MS) return cache;

  const data = loadBaseData();
  const live = await fetchLiveWooPrices(process.env.WC_STORE_URL || "https://pgagron.hustlelabs.gr");

  const products = (data.products || []).map(p => {
    const overlay = p.wcId != null ? live.get(String(p.wcId)) : null;
    const merged = overlay
      ? { ...p, price: overlay.price != null ? overlay.price : p.price, inStock: overlay.inStock }
      : p;
    return compactProduct(merged);
  });

  cache = {
    at: now,
    products,
    faqs: (data.faqs || []).map(f => ({ q: f.q, a: f.a }))
  };
  return cache;
}

module.exports = { getCatalog };
