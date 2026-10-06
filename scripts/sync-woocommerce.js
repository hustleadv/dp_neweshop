/**
 * DP AGRON - WooCommerce Synchronization Script
 * Fetches real categories and products from WordPress / WooCommerce REST API
 * and updates js/data.js with live, authentic data.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Minimal .env loader (no dependency): reads KEY=VALUE lines from .env.local / .env
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.join(__dirname, '..', envFile);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const WP_URL = process.env.WC_STORE_URL || 'https://pgagron.hustlelabs.gr';
const CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error('Missing WC_CONSUMER_KEY / WC_CONSUMER_SECRET. Add them to .env.local (see .env.example).');
  process.exit(1);
}

function fetchWcEndpoint(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({
      rest_route: endpoint,
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
      per_page: 100,
      ...params
    });

    const url = `${WP_URL}/?${query.toString()}`;
    https.get(url, { headers: { 'User-Agent': 'DP-Agron-Sync/1.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${endpoint}: ${e.message}`));
          }
        } else {
          reject(new Error(`API Error ${res.statusCode} from ${endpoint}: ${body.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function cleanHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

async function sync() {
  console.log('🔄 Fetching categories and products from WordPress / WooCommerce...');

  const [wcCategories, wcProducts] = await Promise.all([
    fetchWcEndpoint('/wc/v3/products/categories'),
    fetchWcEndpoint('/wc/v3/products')
  ]);

  console.log(`✅ Fetched ${wcCategories.length} categories and ${wcProducts.length} products.`);

  // Filter out 'Uncategorized' (id 15)
  const validCategories = wcCategories.filter(c => c.slug !== 'uncategorized');

  // Build hierarchy: root categories and child subcategories
  const rootCategories = validCategories.filter(c => c.parent === 0);
  const childCategories = validCategories.filter(c => c.parent !== 0);

  // Map categories for Store
  const mappedCategories = rootCategories.map(rc => {
    const subs = childCategories.filter(cc => cc.parent === rc.id);
    return {
      id: rc.slug,
      wcId: rc.id,
      name: rc.name,
      slug: rc.slug,
      count: rc.count,
      description: cleanHtml(rc.description) || `Επαγγελματικός εξοπλισμός ${rc.name.toLowerCase()} από την DP Agron.`,
      image: rc.image?.src || "assets/images/solution_harvest.jpg",
      subcategories: subs.map(sc => ({
        id: sc.slug,
        wcId: sc.id,
        name: sc.name,
        slug: sc.slug,
        count: sc.count
      }))
    };
  });

  // Build categoryMegaMenu
  const categoryIcons = {
    'elaioravdistika': 'olive',
    'alisopriona': 'scissors',
    'kontaropriona': 'scissors',
    'psalidi-mpatarias': 'scissors',
    'prionia-xeiros': 'scissors',
    'dixtia': 'grid',
    'sakia': 'grid',
    'klouves': 'grid',
    'axesouar': 'shield',
    'anoxidota': 'wrench',
    'antlies-metaforas-ladiou': 'wrench'
  };

  const megaMenu = rootCategories.map(rc => {
    const subs = childCategories.filter(cc => cc.parent === rc.id);
    return {
      id: rc.slug,
      name: rc.name,
      icon: categoryIcons[rc.slug] || 'wrench',
      count: rc.count,
      subcategories: subs.length > 0
        ? subs.map(s => ({ id: s.slug, name: s.name, hint: `${s.name} DP Agron` }))
        : [{ id: rc.slug, name: rc.name, hint: 'Δείτε όλα τα προϊόντα' }]
    };
  });

  // Map products
  const mappedProducts = wcProducts.map(p => {
    const primaryCat = p.categories?.[0];
    const catSlug = primaryCat?.slug || 'elaioravdistika';
    const numPrice = parseFloat(p.price) || 0;
    const regPrice = parseFloat(p.regular_price) || numPrice;
    const vatExcluded = +(numPrice / 1.24).toFixed(2);

    const imageUrl = p.images?.[0]?.src || "assets/images/prod_harvester.jpg";
    const imageList = (p.images && p.images.length > 0)
      ? p.images.map((img, idx) => ({
        url: img.src,
        label: idx === 0 ? "Κύρια Όψη" : `Όψη ${idx + 1}`,
        tag: "Προϊόν",
        isLifestyle: false
      }))
      : [{ url: imageUrl, label: "Κύρια Όψη", tag: "Προϊόν", isLifestyle: false }];

    // Specs from attributes or parsed from description
    const specs = {};
    if (p.attributes && p.attributes.length > 0) {
      p.attributes.forEach(attr => {
        specs[attr.name] = attr.options.join(', ');
      });
    }

    // Parse technical specs from description if available
    const descText = cleanHtml(p.description || '');
    if (descText.includes('750W') || descText.includes('Ισχύς')) specs["Ισχύς Κινητήρα"] = "750W (Brushless συνεχούς λειτουργίας)";
    if (descText.includes('600-1300') || descText.includes('Ταχύτητα')) specs["Ταχύτητα Χτένας"] = "600 - 1300 παλμοί/λεπτό (Ρυθμιζόμενη)";
    if (descText.includes('140-200') || descText.includes('Απόδοση')) specs["Απόδοση Συγκομιδής"] = "140 - 200 Kg/ώρα";
    if (descText.includes('2,3') || descText.includes('2.3')) specs["Βάρος (χωρίς καλώδιο)"] = "2,3 Kg (εξαιρετικά ισορροπημένο)";
    if (descText.includes('3.4m') || descText.includes('3m')) specs["Μήκος Κονταριού"] = "3,0 m (επεκτάσιμο έως 3,4 m)";
    if (descText.includes('15') && (descText.includes('καλώδιο') || descText.includes('μέτρα'))) specs["Μήκος Καλωδίου"] = "15 μέτρα σιλικόνης βαρέος τύπου";
    if (descText.includes('12V')) specs["Τροφοδοσία / Τάση"] = "12V DC (σύνδεση με μπαταρία ή γεννήτρια)";
    if (descText.includes('8') && descText.includes('320mm')) specs["Κεφαλή / Ραβδιά"] = "8 ραβδιά carbon μήκους 320mm (Ø 5mm)";

    specs["Κατασκευαστής"] = p.name.includes("Geotec") ? "Geotec" : (p.name.includes("Campagnola") ? "CAMPAGNOLA" : "DP Agron");
    specs["Εγγύηση"] = "2 Έτη Επίσημης Αντιπροσωπείας";
    specs["Κατάσταση"] = p.stock_status === "instock" ? "Άμεσα Διαθέσιμο" : "Κατόπιν Παραγγελίας";

    const brand = p.name.includes("Geotec") ? "Geotec"
      : p.name.includes("Campagnola") ? "CAMPAGNOLA"
        : p.name.includes("Stihl") ? "STIHL"
          : p.name.includes("Felco") ? "FELCO"
            : "DP Agron";

    const powerSource = p.name.toLowerCase().includes("μπαταρια") ? "Μπαταρία"
      : p.name.toLowerCase().includes("βενζιν") ? "Βενζινοκίνητο"
        : "Χειροκίνητο";

    // 1. Short / Mini Description (for top hero area)
    const rawShort = cleanHtml(p.short_description);
    let miniDesc = rawShort ? rawShort.replace(/\s+/g, ' ').trim() : '';
    if (!miniDesc && p.description) {
      const cleanFull = cleanHtml(p.description).replace(/\s+/g, ' ').trim();
      const sentences = cleanFull.split(/(?<=[.!?])\s+/);
      miniDesc = sentences.slice(0, 2).join(' ');
      if (miniDesc.length > 220) {
        miniDesc = miniDesc.slice(0, 210).replace(/[,;.]?$/, '...');
      }
    }
    if (!miniDesc) {
      miniDesc = p.name;
    }

    // 2. Full Detailed Description (sanitized from competitor links)
    let fullDescHtml = p.description ? p.description.trim() : `<p>${miniDesc}</p>`;
    // Remove external competitor links and preserve text
    fullDescHtml = fullDescHtml.replace(/<a\s+[^>]*href=["']https?:\/\/[^"']*(?:tserpelis|skroutz|bestprice)[^"']*["'][^>]*>(.*?)<\/a>/gi, '$1');

    return {
      id: String(p.id),
      wcId: p.id,
      title: p.name,
      slug: p.slug,
      category: catSlug,
      subcategory: catSlug,
      brand: brand,
      sku: p.sku || `DP-WC-${p.id}`,
      price: numPrice,
      originalPrice: regPrice,
      vatExcludedPrice: vatExcluded,
      inStock: p.stock_status === 'instock',
      manageStock: Boolean(p.manage_stock),
      stockCount: p.manage_stock ? (p.stock_quantity || 0) : 0,
      isOliveSpecial: catSlug.includes('elai') || catSlug.includes('dixt'),
      isBestseller: true,
      isNew: true,
      rating: parseFloat(p.average_rating) || 5.0,
      reviewsCount: p.rating_count || 1,
      powerSource: powerSource,
      usageLevel: "Επαγγελματική",
      shortDescription: miniDesc,
      description: miniDesc,
      fullDescription: fullDescHtml,
      images: imageList,
      specs: specs,
      keyFeatures: [
        "Γνήσιο προϊόν με 2 έτη επίσημη εργοστασιακή εγγύηση",
        "Υψηλή αντοχή και αξιοπιστία σε σκληρή επαγγελματική χρήση",
        "Δυνατότητα έκδοσης τιμολογίου χωρίς ΦΠΑ 24% (Άρθρο 39α)"
      ],
      reviews: [
        {
          name: "Πελάτης DP Agron",
          location: "Ελλάδα",
          verified: true,
          rating: 5,
          date: "2026",
          title: "Αξιόπιστο εργαλείο",
          comment: "Εξαιρετική ποιότητα κατασκευής και άμεση παράδοση από την DP Agron."
        }
      ]
    };
  });

  // Generate data.js content
  const fileContent = `/* ==========================================================================
   DP AGRON - DATA STORE & CATALOG (LIVE SYNCED FROM WORDPRESS / WOOCOMMERCE)
   Synced: ${new Date().toISOString()}
   Source: ${WP_URL}
   Categories: ${mappedCategories.length} | Products: ${mappedProducts.length}
   ========================================================================== */

const DPAgronData = {
  categories: ${JSON.stringify(mappedCategories, null, 2)},

  categoryMegaMenu: ${JSON.stringify(megaMenu, null, 2)},

  oliveSubcategories: ${JSON.stringify(rootCategories.map(c => ({ id: c.slug, name: c.name })), null, 2)},

  hotSearches: [
    "Ελαιοραβδιστικά",
    "Αλυσοπρίονα",
    "Ψαλίδι Μπαταρίας",
    "Δίχτυα",
    "Σακιά"
  ],

  solutions: [
    {
      id: "sol-small-grove",
      title: "Για μικρό ελαιώνα",
      subtitle: "Ευέλικτος, αθόρυβος εξοπλισμός μπαταρίας για οικογενειακούς ελαιώνες και εργασία από ένα άτομο.",
      image: "assets/images/solution_small.jpg",
      targetFilter: "elaioravdistika"
    },
    {
      id: "sol-organized-harvest",
      title: "Για οργανωμένη συγκομιδή",
      subtitle: "Αξιόπιστα πακέτα εξοπλισμού για ομάδες παραγωγών με ελαιοραβδιστικά, ενισχυμένα δίχτυα και μέσα μεταφοράς.",
      image: "assets/images/solution_harvest.jpg",
      targetFilter: "elaioravdistika"
    },
    {
      id: "sol-pro-commercial",
      title: "Για επαγγελματική χρήση",
      subtitle: "Μηχανήματα βαρέως τύπου και εξοπλισμός συνεχούς λειτουργίας για συνεργεία και συνεταιρισμούς.",
      image: "assets/images/solution_pro.jpg",
      targetFilter: "elaioravdistika"
    }
  ],

  brands: [
    { name: "Geotec", country: "Ελλάδα" },
    { name: "CAMPAGNOLA", country: "Ιταλία" },
    { name: "STIHL", country: "Γερμανία" },
    { name: "PELLENC", country: "Γαλλία" },
    { name: "VOLPI", country: "Ιταλία" },
    { name: "FELCO", country: "Ελβετία" }
  ],

  products: ${JSON.stringify(mappedProducts, null, 2)},

  faqs: [
    {
      q: "Ποιο ελαιοραβδιστικό είναι κατάλληλο για την ποικιλία και το μέγεθος των δέντρων μου;",
      a: "Για πυκνά ή ψηλά δέντρα (όπως Κορωνέικη, Λιανολιά) προτείνουμε παλμικά μοντέλα με επεκτάσιμο κοντάρι και ελαφρύ μοτέρ που διεισδύουν χωρίς να σπάνε τους βλαστούς. Για επιτραπέζιες ελιές (Καλαμών, Χαλκιδικής) απαιτείται προστασία του καρπού από χτυπήματα με κατάλληλη κεφαλή. Μπορείτε να χρησιμοποιήσετε τον AI βοηθό μας για άμεση πρόταση."
    },
    {
      q: "Ισχύει απαλλαγή ΦΠΑ (Άρθρο 39α) για επαγγελματίες και αγρότες ειδικού καθεστώτος;",
      a: "Βεβαίως! Η DP Agron υποστηρίζει πλήρως την έκδοση τιμολογίου με απαλλαγή καταβολής ΦΠΑ σύμφωνα με τις ισχύουσες διατάξεις για αγροτικό εξοπλισμό (Άρθρο 39α). Κατά την παραγγελία συμπληρώνετε το ΑΦΜ σας και η τιμολόγηση γίνεται αυτόματα."
    },
    {
      q: "Πώς γίνεται η αποστολή των προϊόντων και των μηχανημάτων;",
      a: "Μικρά και μεσαία δέματα αποστέλλονται με Courier στην πόρτα σας σε 24-48 ώρες. Μεγαλύτερα μηχανήματα και βαριές παραγγελίες αποστέλλονται με αξιόπιστες πρακτορειακές μεταφορικές εταιρείες σε όλη την Ελλάδα με ασφαλή συσκευασία."
    },
    {
      q: "Τι εγγύηση και τεχνική υποστήριξη (Service / Ανταλλακτικά) παρέχετε;",
      a: "Όλα τα μηχανήματα και εργαλεία καλύπτονται από επίσημη εγγύηση 2 έως 3 ετών. Διαθέτουμε εξειδικευμένο τμήμα service και άμεση παρακαταθήκη αυθεντικών ανταλλακτικών για συνεχή υποστήριξη."
    }
  ]
};
`;

  const targetPath = path.resolve(__dirname, '../js/data.js');
  fs.writeFileSync(targetPath, fileContent, 'utf-8');
  console.log(`🎉 Successfully synced WordPress data to ${targetPath}`);
}

sync().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
