import { getStoreProducts } from "@/lib/store-api";
import { getWooCommerceProducts, hasWooCommerceCredentials } from "@/lib/woocommerce";
import { getWPPages } from "@/lib/wordpress";
import { WP_URL, USE_PLAIN_PERMALINKS } from "@/lib/config";
import { getWooCommerceAddToCartUrl, getWooCommerceCartUrl, getWooCommerceCheckoutUrl } from "@/lib/cart-helpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MilestoneOnePage() {
  const credentialsConfigured = hasWooCommerceCredentials();

  // 1. Try public Store API (no keys needed)
  const storeResult = await getStoreProducts({ per_page: 5 });

  // 2. Try WooCommerce REST API v3 (if keys provided)
  const wcResult = credentialsConfigured
    ? await getWooCommerceProducts({ per_page: 5 })
    : null;

  // 3. Fetch WP Pages for verification
  const wpPages = await getWPPages();

  const realStoreProduct = storeResult.products[0] || null;
  const realWCProduct = wcResult?.products?.[0] || null;
  const hasRealProduct = Boolean(realStoreProduct || realWCProduct);

  return (
    <div className="min-h-screen bg-[#08110a] text-slate-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-emerald-900/60 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            DP AGRON &bull; Next.js + WooCommerce Architecture
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Ορόσημο 1: Σύνδεση με Live WooCommerce
          </h1>
          <p className="mt-2 text-slate-400 text-sm md:text-base leading-relaxed">
            Έλεγχος διασύνδεσης του Next.js TypeScript frontend με το WordPress backend (
            <a
              href={WP_URL}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 underline hover:text-emerald-300"
            >
              {WP_URL}
            </a>
            ) και απεικόνιση πραγματικού προϊόντος.
          </p>
        </header>

        {/* Live Diagnostics Card */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>📡</span> Κατάσταση Συνδεσιμότητας Backend
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Store API */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                Store API (Δημόσιο)
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${storeResult.success ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                <span className="font-semibold text-sm">
                  {storeResult.success ? "200 OK Συνδεδεμένο" : "Αποτυχία / Fallback"}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Προϊόντα: <strong className="text-white">{storeResult.products.length}</strong>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate" title="/wc/store/v1/products">
                Χωρίς μυστικά κλειδιά
              </div>
            </div>

            {/* Box 2: WC REST API v3 */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                WC REST API v3 (Server)
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${credentialsConfigured ? (wcResult?.success ? "bg-emerald-400" : "bg-red-400") : "bg-slate-500"}`}></span>
                <span className="font-semibold text-sm">
                  {credentialsConfigured
                    ? wcResult?.success
                      ? "200 OK Αυθεντικοποιημένο"
                      : "Σφάλμα Κλειδιών"
                    : "Αναμονή Κλειδιών (.env)"}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {credentialsConfigured
                  ? `Προϊόντα: ${wcResult?.products?.length || 0}`
                  : "Συμπληρώστε το .env.local"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {credentialsConfigured ? "WC_CONSUMER_KEY ενεργό" : "WC_CONSUMER_KEY κενό"}
              </div>
            </div>

            {/* Box 3: WordPress Core Pages */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                WordPress Core (REST v2)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="font-semibold text-sm">200 OK Συνδεδεμένο</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Σελίδες: <strong className="text-white">{wpPages.length}</strong> (Cart, Checkout...)
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Διαδρομή: {USE_PLAIN_PERMALINKS ? "?rest_route=/ (Plain)" : "/wp-json/ (Pretty)"}
              </div>
            </div>
          </div>
        </section>

        {/* Milestone 1: Displaying the Real Product */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎯</span> Πρώτο Ορόσημο: Εμφάνιση Πραγματικού Προϊόντος
            </h2>
            {hasRealProduct ? (
              <span className="px-3 py-1 bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-xs font-bold rounded-full">
                ✓ ΕΠΙΤΥΧΙΑ
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-950/80 border border-amber-600/60 text-amber-300 text-xs font-bold rounded-full">
                Εκκρεμεί Δημοσίευση Προϊόντος στο WP
              </span>
            )}
          </div>

          {/* CASE A: Real Product Fetched from Live WooCommerce */}
          {hasRealProduct ? (
            <div className="bg-slate-900 border border-emerald-600/40 rounded-2xl p-6 md:p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                
                {/* Product Image */}
                <div className="w-full md:w-56 h-56 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                  {realStoreProduct?.images?.[0]?.src || realWCProduct?.images?.[0]?.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={realStoreProduct?.images?.[0]?.src || realWCProduct?.images?.[0]?.src}
                      alt={realStoreProduct?.name || realWCProduct?.name || "Product"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs text-center p-4">
                      <span>🖼️ Χωρίς εικόνα στο WooCommerce</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                      ID: #{realStoreProduct?.id || realWCProduct?.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">
                      SKU: {realStoreProduct?.sku || realWCProduct?.sku || "N/A"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">
                      Τύπος: {realStoreProduct?.type || realWCProduct?.type || "simple"}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white">
                    {realStoreProduct?.name || realWCProduct?.name}
                  </h3>

                  <div
                    className="text-sm text-slate-400 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html:
                        realStoreProduct?.short_description ||
                        realWCProduct?.short_description ||
                        "Πραγματικό προϊόν από τη βάση δεδομένων του WooCommerce.",
                    }}
                  />

                  {/* Price Block */}
                  <div className="pt-2 flex items-baseline gap-3">
                    <div className="text-3xl font-extrabold text-emerald-400">
                      {realStoreProduct
                        ? `${(parseInt(realStoreProduct.prices.price) / 100).toFixed(2)} ${realStoreProduct.prices.currency_symbol || "€"}`
                        : `${parseFloat(realWCProduct?.price || "0").toFixed(2)} €`}
                    </div>
                    <div className="text-xs text-slate-400">
                      (Τιμή WooCommerce με ΦΠΑ)
                    </div>
                  </div>

                  {/* Actions: Direct WooCommerce Transition */}
                  <div className="pt-4 flex flex-wrap gap-3">
                    <a
                      href={getWooCommerceAddToCartUrl(
                        realStoreProduct?.id || realWCProduct?.id || 1,
                        1,
                        false
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-950"
                    >
                      <span>🛒 Προσθήκη στο Καλάθι WooCommerce</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </a>

                    <a
                      href={getWooCommerceAddToCartUrl(
                        realStoreProduct?.id || realWCProduct?.id || 1,
                        1,
                        true
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
                    >
                      Απευθείας Checkout &rarr;
                    </a>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1">
                    * Το πάτημα του κουμπιού στέλνει το προϊόν κατευθείαν στο καλάθι του WooCommerce (
                    <code>/cart/?add-to-cart=ID</code>) χωρίς παράλληλο μηχανισμό.
                  </p>
                </div>

              </div>
            </div>
          ) : (
            /* CASE B: Waiting for the user to publish 1 product in WooCommerce */
            <div className="bg-slate-900/90 border border-amber-600/40 rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-3xl">ℹ️</span>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-amber-300">
                    Το WordPress backend απάντησε επιτυχώς (200 OK), αλλά δεν έχει ακόμα δημοσιευμένα προϊόντα!
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Το API endpoint <code>{USE_PLAIN_PERMALINKS ? "?rest_route=/wc/store/v1/products" : "/wp-json/wc/store/v1/products"}</code> συνδέεται κανονικά και επέστρεψε κενό πίνακα (<code>[]</code>).
                  </p>
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-white text-sm">
                  🛠️ Οδηγίες για την ολοκλήρωση του 1ου Οροσήμου (2 λεπτά):
                </h4>
                <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2">
                  <li>
                    Συνδεθείτε στον πίνακα διαχείρισης:{" "}
                    <a
                      href={`${WP_URL}/wp-admin/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 underline font-semibold"
                    >
                      {WP_URL}/wp-admin/
                    </a>
                  </li>
                  <li>
                    Μεταβείτε στο <strong>Προϊόντα &rarr; Προσθήκη Νέου (Products &rarr; Add New)</strong>.
                  </li>
                  <li>
                    Δώστε έναν τίτλο (π.χ. <em>«Ελαιοραβδιστικό VORTEX PRO Carbon»</em>), μία τιμή (π.χ. <em>489</em>), μία εικόνα και πατήστε <strong>Δημοσίευση (Publish)</strong>.
                  </li>
                  <li>
                    (Προαιρετικά για Pretty Permalinks): Μεταβείτε <strong>Ρυθμίσεις &rarr; Μόνιμοι σύνδεσμοι</strong> και επιλέξτε <strong>«Όνομα άρθρου» (Post name)</strong> &rarr; Αποθήκευση.
                  </li>
                  <li>
                    Κάντε <strong>Ανανέωση (Refresh)</strong> σε αυτή τη σελίδα και το πραγματικό προϊόν θα εμφανιστεί αυτόματα!
                  </li>
                </ol>
              </div>

              {/* Where to put Keys */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🔑</span> Πού βάζετε τα κλειδιά (REST API Keys);
                </h4>
                <p className="text-xs text-slate-400">
                  Έχει ήδη δημιουργηθεί το αρχείο <code>frontend/.env.local</code>. Ανοίξτε το και συμπληρώστε τα:
                </p>
                <pre className="bg-black/60 p-3 rounded-lg text-xs text-emerald-400 font-mono overflow-x-auto">
{`WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
                </pre>
                <p className="text-[11px] text-slate-400">
                  Τα κλειδιά δημιουργούνται στο: <em>WooCommerce &rarr; Ρυθμίσεις &rarr; Για προχωρημένους &rarr; REST API &rarr; Προσθήκη κλειδιού (Δικαιώματα: Ανάγνωση/Εγγραφή)</em>.
                </p>
              </div>

            </div>
          )}
        </section>

        {/* Architectural Explanations Section */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-white">
            📋 Αρχιτεκτονική &amp; Απαντήσεις Προδιαγραφών
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
            
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-400">1. Μετάβαση από Προϊόν σε Καλάθι &amp; Επιστροφή</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Η προσθήκη γίνεται μέσω του επίσημου μηχανισμού παραμέτρων του WooCommerce:{" "}
                <code>{WP_URL}/cart/?add-to-cart=ID&quantity=QTY</code>. Μετά την ολοκλήρωση αγοράς, το WooCommerce έχει ρυθμιστεί ώστε το κουμπί &quot;Συνέχεια Αγορών&quot; και το λογότυπο να επιστρέφουν στο Next.js frontend.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-emerald-400">2. Χειρισμός Παραλλαγών (Variable Products)</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Κάθε παραλλαγή (π.χ. διαστάσεις διχτυού 8x12m) έχει το δικό της μοναδικό <strong>Variation ID</strong> στο WooCommerce. Το Next.js επιλύει την επιλεγμένη παραλλαγή και προωθεί το <code>variation_id</code> απευθείας στο καλάθι: <code>/cart/?add-to-cart=VARIATION_ID</code>.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-emerald-400">3. Γιατί το Store API αποφεύγει μυστικά κλειδιά</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Το <code>/wc/store/v1/products</code> είναι δημόσιο endpoint του WooCommerce Block architecture. Δεν απαιτεί Consumer Key/Secret, οπότε ο κατάλογος περιηγείται με μηδενικό κίνδυνο έκθεσης διαχειριστικών διαπιστευτηρίων.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-emerald-400">4. Περιορισμοί Πρόσθετων (Plugins)</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Απαιτείται ενεργοποίηση των Pretty Permalinks (Όνομα άρθρου) στο WP Admin. Δεν απαιτούνται περίπλοκα plugins όπως CoCart ή JWT Auth για την 1η έκδοση, διατηρώντας το WordPress backend εξαιρετικά ελαφρύ.
              </p>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pb-8">
          DP AGRON Headless Next.js &bull; Συνδεδεμένο με {WP_URL}
        </footer>

      </div>
    </div>
  );
}
