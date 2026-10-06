/* ==========================================================================
   DP AGRON - DATA STORE & CATALOG
   Realistic Greek Agricultural Data, Olive Season & Professional Equipment
   ========================================================================== */

const DPAgronData = {
  categories: [
    {
      id: "olive-harvest",
      name: "Ελαιοκομία & Συγκομιδή",
      slug: "olive-harvest",
      count: 58,
      isFeatured: true,
      image: "assets/images/solution_harvest.jpg",
      description: "Πλήρης εξοπλισμός συλλογής ελαιοκάρπου, ελαιοραβδιστικά τελευταίας τεχνολογίας, ελαιόπανα και δίχτυα υψηλής αντοχής."
    },
    {
      id: "pruning-cutting",
      name: "Κλάδεμα & Κοπή",
      slug: "pruning-cutting",
      count: 42,
      isFeatured: false,
      image: "assets/images/prod_shears.jpg",
      description: "Επαγγελματικά ψαλίδια κλαδέματος μπαταρίας, αλυσοπρίονα και κονταροπρίονα."
    },
    {
      id: "nets-storage",
      name: "Δίχτυα & Αποθήκευση",
      slug: "nets-storage",
      count: 36,
      isFeatured: false,
      image: "assets/images/prod_net.jpg",
      description: "Ενισχυμένα ελαιόπανα 100gr/m², δίχτυα ελαιοσυλλογής και εξαρτήματα."
    },
    {
      id: "power-batteries",
      name: "Μπαταρίες & Ενέργεια",
      slug: "power-batteries",
      count: 24,
      isFeatured: false,
      image: "assets/images/prod_generator.jpg",
      description: "Φορητές γεννήτριες 12V/24V για ραβδιστικά, μπαταρίες λιθίου και φορτιστές."
    }
  ],

  categoryMegaMenu: [
    {
      id: "olive-harvest",
      name: "Ελαιοκομία & Συγκομιδή",
      icon: "olive",
      count: 58,
      subcategories: [
        { id: "harvesters", name: "Ελαιοραβδιστικά", hint: "Carbon Brushless & Παλμικά" },
        { id: "nets", name: "Δίχτυα Ελιάς & Ελαιόπανα", hint: "Ενισχυμένα 100gr" },
        { id: "poles", name: "Κοντάρια & Εξαρτήματα", hint: "Τηλεσκοπικά Carbon" },
        { id: "consumables", name: "Αναλώσιμα & Λιπαντικά", hint: "Βιοδιασπώμενα λάδια" },
        { id: "spare-parts", name: "Ανταλλακτικά & Κεφαλές", hint: "Ραβδάκια & γρανάζια" },
        { id: "harvest-accessories", name: "Αξεσουάρ Συγκομιδής", hint: "Τελάρα & σακιά" }
      ]
    },
    {
      id: "pruning-cutting",
      name: "Κλάδεμα & Κοπή",
      icon: "scissors",
      count: 42,
      subcategories: [
        { id: "shears", name: "Ψαλίδια Μπαταρίας 40mm", hint: "Brushless με 2 μπαταρίες" },
        { id: "chainsaws", name: "Mini Αλυσοπρίονα Μπαταρίας", hint: "Ελαφριά κοπής 6'' & 8''" },
        { id: "pole-saws", name: "Τηλεσκοπικά Κονταροπρίονα", hint: "Για ψηλά κλαδιά" },
        { id: "manual-pruning", name: "Χειροκίνητα Ψαλίδια Felco", hint: "Ελβετική ακρίβεια" },
        { id: "blades-chains", name: "Λάμες & Αλυσίδες Κοπής", hint: "Ανταλλακτικά παντός τύπου" },
        { id: "lubricants", name: "Λιπαντικά & Προστατευτικά", hint: "Σπρέι καθαρισμού" }
      ]
    },
    {
      id: "nets-storage",
      name: "Δίχτυα & Αποθήκευση",
      icon: "grid",
      count: 36,
      subcategories: [
        { id: "reinforced-nets", name: "Ενισχυμένα Ελαιόπανα 100gr", hint: "Μονόκλωνα με ενίσχυση" },
        { id: "monofilament-nets", name: "Δίχτυα Συλλογής", hint: "Ανθεκτικά σε κλαδιά" },
        { id: "crates-boxes", name: "Τελάρα & Κλούβες", hint: "Αεριζόμενα πλαστικά" },
        { id: "sacks-bags", name: "Σάκοι Μεταφοράς", hint: "Γιούτινα & πλαστικά" },
        { id: "straps", name: "Ιμάντες & Στερέωση", hint: "Ασφάλεια φόρτωσης" },
        { id: "tarps", name: "Μουσαμάδες Προστασίας", hint: "Αδιάβροχοι βαρέως τύπου" }
      ]
    },
    {
      id: "power-batteries",
      name: "Μπαταρίες & Ενέργεια",
      icon: "battery",
      count: 24,
      subcategories: [
        { id: "generators", name: "Γεννήτριες 12V / 24V", hint: "Για ελαιοραβδιστικά" },
        { id: "backpack-batteries", name: "Μπαταρίες Λιθίου Πλάτης", hint: "Αυτονομία 8-12 ώρες" },
        { id: "chargers", name: "Φορτιστές & Inverters", hint: "Ταχυφορτιστές πεδίου" },
        { id: "cables", name: "Καλώδια Σύνδεσης", hint: "Ενισχυμένα καλώδια 15m" },
        { id: "deep-cycle", name: "Μπαταρίες Βαθέως Κύκλου", hint: "Μακράς διάρκειας" },
        { id: "power-stations", name: "Φορητά Power Stations", hint: "Αυτόνομη ισχύς στον αγρό" }
      ]
    },
    {
      id: "protection-workwear",
      name: "Προστασία & Ενδυμασία",
      icon: "shield",
      count: 28,
      subcategories: [
        { id: "work-suits", name: "Επαγγελματικές Φόρμες", hint: "Ανθεκτικές με ενίσχυση" },
        { id: "gloves", name: "Γάντια Προστασίας & Κλαδέματος", hint: "Αντιολισθητικά & δερμάτινα" },
        { id: "safety-boots", name: "Μπότες & Υποδήματα", hint: "Αδιάβροχα ασφαλείας S3" },
        { id: "eye-face", name: "Γυαλιά & Ασπίδες", hint: "Προστασία ματιών & προσώπου" },
        { id: "ergonomics", name: "Επιγονατίδες & Ζώνες Μέσης", hint: "Εργονομική υποστήριξη" },
        { id: "thermal-rain", name: "Αδιάβροχα & Θερμικά", hint: "Για χειμερινή συγκομιδή" }
      ]
    },
    {
      id: "pro-tools",
      name: "Επαγγελματικά Εργαλεία",
      icon: "wrench",
      count: 31,
      subcategories: [
        { id: "maintenance-kits", name: "Σετ Επισκευής & Service", hint: "Καστάνιες & ειδικά κλειδιά" },
        { id: "cleaners-sprays", name: "Λιπαντικά & Spray Καθαρισμού", hint: "Απομάκρυνση ρετσινιού" },
        { id: "measuring", name: "Μετρητικά Όργανα & Υγρασιόμετρα", hint: "Έλεγχος καρπού & εδάφους" },
        { id: "sprayers", name: "Ψεκαστήρες Προπιέσεως", hint: "Χειροκίνητοι & πλάτης" },
        { id: "sharpeners", name: "Τροχιστικά Αλυσίδων & Λεπίδων", hint: "Ηλεκτρικά & χειρός" },
        { id: "toolboxes", name: "Εργαλειοθήκες Συνεργείου", hint: "Ανθεκτικές μεταφοράς" }
      ]
    }
  ],

  oliveSubcategories: [
    { id: "all", name: "Όλα για την Ελιά" },
    { id: "harvesters", name: "Ελαιοραβδιστικά" },
    { id: "pruning", name: "Ψαλίδια Κλαδέματος" },
    { id: "nets", name: "Δίχτυα & Ελαιόπανα" },
    { id: "power", name: "Μπαταρίες & Γεννήτριες" },
    { id: "chainsaws", name: "Αλυσοπρίονα Κοπής" },
    { id: "protection", name: "Προστασία & Ενδυμασία" },
    { id: "consumables", name: "Αναλώσιμα & Λιπαντικά" }
  ],

  hotSearches: [
    "Ελαιοραβδιστικά",
    "Ψαλίδια Μπαταρίας",
    "Ελαιόπανα",
    "Γεννήτριες",
    "Mini Αλυσοπρίονα"
  ],

  solutions: [
    {
      id: "sol-small-grove",
      title: "Για μικρό ελαιώνα",
      subtitle: "Ευέλικτος, αθόρυβος εξοπλισμός μπαταρίας για οικογενειακούς ελαιώνες και εργασία από ένα άτομο.",
      image: "assets/images/solution_small.jpg",
      targetFilter: "harvesters"
    },
    {
      id: "sol-organized-harvest",
      title: "Για οργανωμένη συγκομιδή",
      subtitle: "Αξιόπιστα πακέτα εξοπλισμού για ομάδες παραγωγών με ελαιοραβδιστικά carbon, ενισχυμένα δίχτυα και μέσα μεταφοράς.",
      image: "assets/images/solution_harvest.jpg",
      targetFilter: "harvesters"
    },
    {
      id: "sol-pro-commercial",
      title: "Για επαγγελματική χρήση",
      subtitle: "Μηχανήματα βαρέως τύπου, αυτόνομες γεννήτριες 12V/24V και εξοπλισμός συνεχούς λειτουργίας για συνεργεία και συνεταιρισμούς.",
      image: "assets/images/solution_pro.jpg",
      targetFilter: "harvesters"
    }
  ],

  brands: [
    { name: "STIHL", country: "Γερμανία" },
    { name: "CAMPAGNOLA", country: "Ιταλία" },
    { name: "PELLENC", country: "Γαλλία" },
    { name: "VOLPI", country: "Ιταλία" },
    { name: "LISAM", country: "Ιταλία" },
    { name: "FELCO", country: "Ελβετία" },
    { name: "MAKITA", country: "Ιαπωνία" },
    { name: "ZANON", country: "Ιταλία" }
  ],

  products: [
    {
      id: "prod-vortex-pro",
      title: "Επαγγελματικό Ελαιοραβδιστικό Carbon Brushless 12V-48V",
      category: "olive-harvest",
      subcategory: "harvesters",
      brand: "CAMPAGNOLA",
      sku: "DP-VX-4800",
      price: 489.00,
      originalPrice: 599.00,
      vatExcludedPrice: 394.35,
      inStock: true,
      stockCount: 14,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.9,
      reviewsCount: 38,
      powerSource: "12V / 48V",
      usageLevel: "Επαγγελματική",
      description: "Το κορυφαίο ελαιοραβδιστικό με κεφαλή από ανθρακονήματα (carbon) και μοτέρ Brushless νέας γενιάς. Εξασφαλίζει μέγιστη απόδοση συγκομιδής με μηδενικό τραυματισμό στα κλαδιά και τα φύλλα της ελιάς. Ελαφρύ και απόλυτα ισορροπημένο για ξεκούραστη πολύωρη εργασία.",
      images: [
        { url: "assets/images/prod_harvester.jpg", label: "Κύρια Όψη", tag: "Προϊόν", isLifestyle: false },
        { url: "assets/images/hero_harvest.jpg", label: "Στον Ελαιώνα", tag: "Lifestyle", isLifestyle: true },
        { url: "assets/images/solution_harvest.jpg", label: "Συγκομιδή Πεδίου", tag: "Χρήση", isLifestyle: true },
        { url: "assets/images/prod_spike.jpg", label: "Κεφαλή Carbon", tag: "Ανταλλακτικά", isLifestyle: false }
      ],
      specs: {
        "Τύπος Κεφαλής": "Παλμική με 14 ράβδους Carbon υψηλής ελαστικότητας",
        "Κινητήρας": "Brushless 500W χωρίς ψήκτρες βαρέως τύπου",
        "Τάση Λειτουργίας": "12V DC / 48V Converter",
        "Βάρος": "2.25 kg (εξαιρετικά ισορροπημένο)",
        "Μήκος Κονταριού": "Τηλεσκοπικό 100% Carbon 2.20m - 3.20m",
        "Παλμοί": "1.350 / λεπτό (ρυθμιζόμενοι)",
        "Καλώδιο": "15 μέτρα ενισχυμένο σιλικονούχο",
        "Εγγύηση": "2 Χρόνια Επίσημης Ελληνικής Αντιπροσωπείας"
      },
      keyFeatures: [
        "Ανθρακονήματα υψηλής ελαστικότητας για μηδενική ζημιά στα μάτια του δέντρου",
        "Τηλεσκοπικός σωλήνας 100% full carbon (ελάχιστο βάρος στο χέρι 2.25 kg)",
        "Ηλεκτρονικός ελεγκτής ταχύτητας για προσαρμογή σε πυκνά ή αραιά κλαδιά",
        "Συμβατό τόσο με κοινή μπαταρία 12V αυτοκινήτου όσο και με γεννήτρια"
      ],
      variants: {
        poleLength: ["2.20m - 3.20m Carbon", "1.90m - 2.60m Αλουμινίου (-45€)"],
        package: ["Βασικό Σετ (Καλώδιο 15m)", "Πλήρες Σετ με Μπαταρία Λιθίου Πλάτης (+180€)"]
      },
      reviews: [
        {
          name: "Νικόλαος Κ.",
          location: "Καλαμάτα, Μεσσηνία",
          verified: true,
          rating: 5,
          date: "12 Σεπτεμβρίου 2026",
          title: "Απίστευτη ελαφρότητα και μηδενικός κόπος στο κοντάρι",
          comment: "Το δουλεύουμε σε 800 δέντρα Κορωνέικη. Το βάρος του στο κοντάρι είναι απίστευτα ελαφρύ και δεν κουράζει καθόλου τους ώμους. Τα ανθρακονήματα δεν τραυματίζουν καθόλου τα μάτια του δέντρου και ο καρπός πέφτει καθαρός χωρίς πολλά φύλλα. Αξίζει κάθε ευρώ για επαγγελματία παραγωγό."
        },
        {
          name: "Γεώργιος Μ.",
          location: "Ηράκλειο Κρήτης",
          verified: true,
          rating: 5,
          date: "28 Αυγούστου 2026",
          title: "Άψογη εξυπηρέτηση DP Agron και τρομερή ροπή",
          comment: "Εξαιρετική εμπειρία παραγγελίας. Ήρθε σε μόλις 2 ημέρες στην Κρήτη άψογα συσκευασμένο με το τιμολόγιο απαλλαγής ΦΠΑ 39α έτοιμο. Το μοτέρ brushless έχει απίστευτη ροπή ακόμα και σε πολύ πυκνά κλαδιά."
        },
        {
          name: "Παναγιώτης Δ.",
          location: "Σπάρτη Λακωνίας",
          verified: true,
          rating: 5,
          date: "15 Αυγούστου 2026",
          title: "Στιβαρή ιταλική κατασκευή Campagnola",
          comment: "Έχουμε συνεργείο συγκομιδής 4 ατόμων. Πήραμε 2 τέτοια ραβδιστικά και η διαφορά στην ταχύτητα σε σχέση με τα παλαιότερα παλμικά είναι θεαματική. Το 15μετρο καλώδιο σιλικόνης αντέχει στο πάτημα και στις πέτρες."
        },
        {
          name: "Ιωάννης Β.",
          location: "Αίγιο Αχαΐας",
          verified: true,
          rating: 4,
          date: "2 Αυγούστου 2026",
          title: "Πολύ καλό εργαλείο, ποιοτικό και αξιόπιστο",
          comment: "Πολύ καλή επιλογή. Το τηλεσκοπικό carbon κοντάρι φτάνει άνετα τα 3.20 μέτρα χωρίς να λυγίζει. Εξαιρετική ποιότητα συναρμογής και πολύ χαμηλή κατανάλωση ρεύματος από τη μπαταρία."
        }
      ]
    },
    {
      id: "prod-pruning-shear-40",
      title: "Ηλεκτρικό Ψαλίδι Κλαδέματος Μπαταρίας 40mm Brushless",
      category: "pruning-cutting",
      subcategory: "pruning",
      brand: "VOLPI",
      sku: "DP-MC-400B",
      price: 289.00,
      originalPrice: 349.00,
      vatExcludedPrice: 233.06,
      inStock: true,
      stockCount: 22,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: true,
      rating: 4.8,
      reviewsCount: 52,
      powerSource: "Μπαταρία Li-Ion 21V",
      usageLevel: "Επαγγελματική",
      description: "Επαγγελματικό επαναφορτιζόμενο ψαλίδι κλαδέματος με διάμετρο κοπής έως 40mm. Διαθέτει λεπίδα SK5 τιτανίου, οθόνη LCD ενδείξεων μπαταρίας/κοπών και σύστημα προστασίας δακτύλων anti-cut.",
      images: [
        { url: "assets/images/prod_shears.jpg", label: "Ψαλίδι 40mm", tag: "Προϊόν", isLifestyle: false },
        { url: "assets/images/solution_small.jpg", label: "Κλάδεμα στον Αγρό", tag: "Lifestyle", isLifestyle: true },
        { url: "assets/images/prod_oil.jpg", label: "Συντήρηση Λεπίδας", tag: "Αξεσουάρ", isLifestyle: false }
      ],
      specs: {
        "Διάμετρος Κοπής": "15mm - 40mm (Προοδευτική κοπή)",
        "Λεπίδα": "Ιαπωνικό ατσάλι SK5 με επικάλυψη τιτανίου",
        "Μπαταρίες": "Περιλαμβάνει 2x Li-Ion 21V 4.0Ah",
        "Αυτονομία": "Έως 8 ώρες συνεχούς εργασίας",
        "Βάρος": "980 gr (με τη μπαταρία)",
        "Οθόνη": "Ψηφιακή LCD με καταμέτρηση κοπών και στάθμη"
      },
      keyFeatures: [
        "Προοδευτική σκανδάλη ακριβείας - κινείται ταυτόχρονα με το δάκτυλο",
        "2 ρυθμίσεις ανοίγματος λάμας (25mm / 40mm)",
        "Εργονομική αντιολισθητική λαβή SoftGrip",
        "Περιλαμβάνει βαλιτσάκι μεταφοράς και 2 μπαταρίες λιθίου"
      ],
      variants: {
        poleLength: ["Χειρός", "Με τηλεσκοπική προέκταση 1.5m-2.1m (+75€)"],
        package: ["Σετ με 2 Μπαταρίες 4.0Ah & Βαλιτσάκι", "Σετ με 3 Μπαταρίες 4.0Ah (+40€)"]
      },
      reviews: [
        {
          name: "Δημήτριος Π.",
          location: "Ναύπλιο Αργολίδας",
          verified: true,
          rating: 5,
          date: "5 Σεπτεμβρίου 2026",
          title: "Καθαρές κοπές σε χοντρά κλαδιά",
          comment: "Κόβει 35-40mm σαν βούτυρο χωρίς να μασάει καθόλου. Οι 2 μπαταρίες βγάζουν άνετα ολόκληρο οκτάωρο κλαδέματος. Πολύ καλή εργονομία."
        }
      ]
    },
    {
      id: "prod-olive-net-812",
      title: "Ενισχυμένο Ελαιόπανο Συγκομιδής 8x12m Βαρέως Τύπου 100gr/m²",
      category: "nets-storage",
      subcategory: "nets",
      brand: "DP AGRON",
      sku: "DP-NET-812",
      price: 54.00,
      originalPrice: 65.00,
      vatExcludedPrice: 43.55,
      inStock: true,
      stockCount: 150,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.9,
      reviewsCount: 89,
      powerSource: "Χειροκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Ελαιόπανο βαρέως τύπου monofilament (μονόκλωνο) 100gr/m², με περιμετρική ενίσχυση και μπουντούζια σε όλες τις γωνίες. Εξαιρετικά ανθεκτικό σε πέτρες, αγκαθωτά ζιζάνια και τριβές.",
      images: [
        { url: "assets/images/prod_net.jpg", label: "Ελαιόπανο 8x12m", tag: "Προϊόν", isLifestyle: false },
        { url: "assets/images/hero_harvest.jpg", label: "Στρωμένο στο Χωράφι", tag: "Lifestyle", isLifestyle: true },
        { url: "assets/images/solution_harvest.jpg", label: "Συγκομιδή Καρπού", tag: "Χρήση", isLifestyle: true }
      ],
      specs: {
        "Διαστάσεις": "8 x 12 μέτρα (96 m² καθαρής κάλυψης)",
        "Βάρος Πλέγματος": "100 gr / m² ενισχυμένο",
        "Υλικό": "100% Παρθένο Πολυαιθυλένιο (HDPE) UV σταθεροποιημένο",
        "Αντοχή": "UV προστασία 5 ετών έναντι ηλιακής ακτινοβολίας",
        "Περιμετρικό Ρέλι": "Διπλή ραφή με ενισχυμένο πολυεστερικό ιμάντα"
      },
      keyFeatures: [
        "Δεν ξεφτίζει και δεν σκίζεται στις άκρες",
        "Μικρό βάρος μεταφοράς ανά τετραγωνικό μέτρο",
        "Ειδική πλέξη που αποτρέπει το μπέρδεμα των κλαδιών",
        "Ενισχυμένα μπουντούζια ανά 1 μέτρο περιμετρικά"
      ],
      variants: {
        dimensions: ["6x10m (38,00 €)", "8x12m (54,00 €)", "10x14m (78,00 €)"]
      },
      reviews: [
        {
          name: "Κώστας Τ.",
          location: "Χανιά Κρήτης",
          verified: true,
          rating: 5,
          date: "1 Σεπτεμβρίου 2026",
          title: "Απίστευτη αντοχή σε πέτρες",
          comment: "Τα καλύτερα δίχτυα που έχουμε πάρει τα τελευταία 5 χρόνια. Στο κακοτράχαλο έδαφος με πέτρες δεν άνοιξε καμία τρύπα."
        }
      ]
    },
    {
      id: "prod-generator-olive-12v",
      title: "Γεννήτρια Ελαιοραβδιστικών 12V-24V DP-Power Dyna 7.0HP",
      category: "power-batteries",
      subcategory: "power",
      brand: "ZANON",
      sku: "DP-GEN-7000",
      price: 580.00,
      originalPrice: 680.00,
      vatExcludedPrice: 467.74,
      inStock: true,
      stockCount: 8,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: true,
      rating: 4.7,
      reviewsCount: 19,
      powerSource: "Βενζινοκίνητο 4-χρονο",
      usageLevel: "Επαγγελματική",
      description: "Επαγγελματική αυτόνομη γεννήτρια ελαιοσυλλογής με ισχυρό τετράχρονο κινητήρα 7.0HP και δυναμό 70A. Δυνατότητα ταυτόχρονης τροφοδοσίας έως και 4 ελαιοραβδιστικών με ανεξάρτητους ρυθμιστές τάσης.",
      images: [
        { url: "assets/images/prod_generator.jpg", label: "Γεννήτρια 7.0HP", tag: "Προϊόν", isLifestyle: false },
        { url: "assets/images/solution_pro.jpg", label: "Συνεργείο στον Ελαιώνα", tag: "Lifestyle", isLifestyle: true }
      ],
      specs: {
        "Κινητήρας": "4-χρονος OHV 212cc 7.0 HP",
        "Δυναμό": "Heavy Duty 12V / 24V - 70 Ampere",
        "Παροχές": "4 ανεξάρτητες πρίζες για ραβδιστικά",
        "Ρύθμιση Τάσης": "Ηλεκτρονικός ροοστάτης 12V - 20V",
        "Πλαίσιο": "Τροχήλατο με συμπαγείς τροχούς και πτυσσόμενο χερούλι",
        "Βάρος": "28 kg"
      },
      keyFeatures: [
        "Τροφοδοτεί άνετα 4 εργάτες ταυτόχρονα χωρίς πτώση τάσης",
        "Χαμηλή κατανάλωση καυσίμου (μόλις 0.8 lt/ώρα)",
        "Σύστημα προστασίας στάθμης λαδιού (Oil Alert)"
      ],
      variants: {
        engine: ["DP Engine 7.0HP", "Κινητήρας Honda GP200 (+140€)"]
      }
    },
    {
      id: "prod-mini-chainsaw-8",
      title: "Mini Αλυσοπρίονο Κλαδέματος Μπαταρίας 8 ιντσών Brushless",
      category: "pruning-cutting",
      subcategory: "chainsaws",
      brand: "MAKITA",
      sku: "DP-CS-800B",
      price: 169.00,
      originalPrice: 210.00,
      vatExcludedPrice: 136.29,
      inStock: true,
      stockCount: 35,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.8,
      reviewsCount: 64,
      powerSource: "Μπαταρία Li-Ion 21V",
      usageLevel: "Ημιεπαγγελματική",
      description: "Εξαιρετικά πρακτικό και ελαφρύ αλυσοπρίονο μπαταρίας για άμεσο καθάρισμα χοντρών κλαδιών ελιάς και οπωροφόρων. Εφοδιασμένο με αντλία αυτόματης λίπανσης αλυσίδας και τέντωμα χωρίς εργαλεία.",
      images: [
        "assets/images/prod_chainsaw.jpg"
      ],
      specs: {
        "Μήκος Λάμας": "8 ίντσες (20 cm καθαρή κοπή)",
        "Ταχύτητα Αλυσίδας": "11 m/sec",
        "Μοτέρ": "Brushless 650W υψηλής ροπής",
        "Σύστημα Λίπανσης": "Αυτόματη αντλία με δοχείο λαδιού",
        "Βάρος": "1.35 kg (με μπαταρία)"
      },
      keyFeatures: [
        "Κόβει κλαδί διαμέτρου 15cm σε λιγότερο από 6 δευτερόλεπτα",
        "Διακόπτης ασφαλείας διπλής ενέργειας και προστατευτικό κάλυμμα",
        "Περιλαμβάνει 2 μπαταρίες 4.0Ah και σκληρή βαλίτσα"
      ],
      variants: {
        barLength: ["8 ίντσες (20cm)", "6 ίντσες (15cm) (-20€)"]
      }
    },
    {
      id: "prod-harvester-hedgehog",
      title: "Ελαιοραβδιστικό Αχινός Παλμικό DP-Spike Pro 12V",
      category: "olive-harvest",
      subcategory: "harvesters",
      brand: "LISAM",
      sku: "DP-SP-120T",
      price: 369.00,
      originalPrice: 430.00,
      vatExcludedPrice: 297.58,
      inStock: true,
      stockCount: 19,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: false,
      rating: 4.6,
      reviewsCount: 27,
      powerSource: "12V DC",
      usageLevel: "Επαγγελματική",
      description: "Κλασικό και δοκιμασμένο παλμικό ελαιοραβδιστικό τύπου αχινός με σφαιρικές κεφαλές. Ιδανικό για ποικιλίες ελιάς με πυκνό φύλλωμα (π.χ. Κορωνέικη, Καλαμών), καθώς διεισδύει βαθιά χωρίς να μπλέκεται.",
      images: [
        "assets/images/prod_spike.jpg"
      ],
      specs: {
        "Τύπος Κίνησης": "Παλμική περιστροφική κεφαλή τύπου αχινός",
        "Ραβδιά": "32 ελαστικά θερμοπλαστικά ραβδάκια",
        "Μήκος": "Τηλεσκοπικό 2.10m - 3.10m",
        "Βάρος": "2.65 kg",
        "Καλώδιο": "14 μέτρα ενισχυμένο με ασφαλειοθήκη"
      },
      keyFeatures: [
        "Εξαιρετική διείσδυση σε πυκνά και ακλάδευτα δέντρα",
        "Ελαστικά ραβδιά που αλλάζουν μεμονωμένα με μία βίδα",
        "Στιβαρός μειωτήρας με ατσάλινα γρανάζια"
      ],
      variants: {
        package: ["Μόνο Κεφαλή & Κοντάρι", "Σετ με Μετατροπέα 12V->18V (+35€)"]
      }
    },
    {
      id: "prod-safety-suit",
      title: "Στολή Εργασίας & Ελαιοσυλλογής DP-Armour",
      category: "protection",
      subcategory: "protection",
      brand: "DP AGRON",
      sku: "DP-SEC-SUIT",
      price: 68.00,
      originalPrice: 85.00,
      vatExcludedPrice: 54.84,
      inStock: true,
      stockCount: 45,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: true,
      rating: 4.9,
      reviewsCount: 31,
      powerSource: "Χειροκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Ειδικά σχεδιασμένη για τις απαιτητικές χειμερινές συνθήκες της συγκομιδής. Ύφασμα rip-stop ανθεκτικό σε αγκάθια, 100% αδιάβροχη, με διαπνέουσα μεμβράνη και ενισχύσεις σε γόνατα και αγκώνες.",
      images: [
        "assets/images/prod_suit.jpg"
      ],
      specs: {
        "Υλικό": "Oxford 600D Rip-Stop με επικάλυψη PU",
        "Αδιαβροχοποίηση": "8.000 mm στήλης ύδατος",
        "Διαπνοή": "5.000 gr/m²/24h",
        "Τσέπες": "6 ειδικές τσέπες για εργαλεία"
      },
      keyFeatures: [
        "Ειδική ενίσχυση στα γόνατα για εργασία στο έδαφος",
        "Ανακλαστικές λεπτομέρειες για ορατότητα",
        "Ελαστικές μανσέτες που σφραγίζουν από χώμα"
      ],
      variants: {
        size: ["M", "L", "XL", "2XL", "3XL"]
      }
    },
    {
      id: "prod-bio-chain-oil",
      title: "Βιοδιασπώμενο Λάδι Αλυσίδας & Εργαλείων 5L",
      category: "consumables",
      subcategory: "consumables",
      brand: "DP AGRON",
      sku: "DP-OIL-BIO5",
      price: 26.50,
      originalPrice: 32.00,
      vatExcludedPrice: 21.37,
      inStock: true,
      stockCount: 80,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 5.0,
      reviewsCount: 44,
      powerSource: "Χειροκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Φιλικό προς το περιβάλλον βιοδιασπώμενο λιπαντικό φυτικής βάσης. Δεν μολύνει τον ελαιόκαρπο ούτε το έδαφος του ελαιώνα. Εξαιρετική πρόσφυση και αντοχή σε υψηλές θερμοκρασίες.",
      images: [
        "assets/images/prod_oil.jpg"
      ],
      specs: {
        "Χωρητικότητα": "Δοχείο 5 Λίτρων",
        "Βάση": "Φυτική - Βιοδιασπώμενο κατά 98%",
        "Ιξώδες": "ISO VG 68 για χειμώνα",
        "Πρόσθετα": "Αντιδιαβρωτικά & αντιοξειδωτικά"
      },
      keyFeatures: [
        "Πιστοποιημένο για βιολογική γεωργία",
        "Μειώνει τη φθορά λάμας και αλυσίδας έως και 30%",
        "Δεν αφήνει χημικά υπολείμματα στον καρπό"
      ],
      variants: {
        volume: ["Δοχείο 5L", "Κιβώτιο 4x5L (Έκπτωση 10%)"]
      }
    },
    {
      id: "prod-stihl-sp92",
      title: "Επαγγελματικό Βενζινοκίνητο Ελαιοραβδιστικό SP 92 TC-E 2-MIX",
      category: "olive-harvest",
      subcategory: "harvesters",
      brand: "STIHL",
      sku: "ST-SP92-TCE",
      price: 849.00,
      originalPrice: 940.00,
      vatExcludedPrice: 684.68,
      inStock: true,
      stockCount: 11,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.9,
      reviewsCount: 42,
      powerSource: "Βενζινοκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Κορυφαίο βενζινοκίνητο ελαιοραβδιστικό STIHL με κινητήρα 2-MIX χαμηλής κατανάλωσης και σύστημα εκκίνησης ErgoStart. Ιδανικό για πολύωρη συγκομιδή σε απαιτητικούς ελαιώνες.",
      images: [
        "assets/images/prod_harvester.jpg"
      ],
      specs: {
        "Κινητήρας": "STIHL 2-MIX 21.4 cm³",
        "Βάρος": "5.4 kg",
        "Μήκος": "2.31 m",
        "Ραβδιά": "8 Ανθρακονήματα Carbon"
      },
      keyFeatures: [
        "Σύστημα STIHL ErgoStart για ξεκούραστη εκκίνηση",
        "Ηλεκτρονικός έλεγχος στροφών ECOSPEED",
        "Αντιδονητικό σύστημα 4 σημείων"
      ],
      variants: {
        package: ["Βασικό Μηχάνημα", "Με δεύτερο σετ χτένια (+45€)"]
      }
    },
    {
      id: "prod-felco-822",
      title: "Ηλεκτρικό Ψαλίδι Κλαδέματος 45mm FELCO 822 HP Power Blade",
      category: "pruning-cutting",
      subcategory: "pruning",
      brand: "FELCO",
      sku: "FL-822-HP",
      price: 1390.00,
      originalPrice: 1520.00,
      vatExcludedPrice: 1120.97,
      inStock: true,
      stockCount: 6,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: true,
      rating: 5.0,
      reviewsCount: 18,
      powerSource: "Μπαταρία Li-Ion",
      usageLevel: "Επαγγελματική",
      description: "Το ισχυρότερο επαγγελματικό ψαλίδι της ελβετικής FELCO για χοντρά κλαδιά ελιάς έως 45mm. Αξεπέραστη αντοχή, προοδευτική κοπή και μέγιστη εργονομία.",
      images: [
        "assets/images/prod_shears.jpg"
      ],
      specs: {
        "Διάμετρος Κοπής": "Έως 45 mm",
        "Βάρος": "980 gr",
        "Λεπίδα": "Ατσάλι FELCO HSS",
        "Μπαταρία": "Power Pack 36V"
      },
      keyFeatures: [
        "Ελβετική κατασκευή ακριβείας με εγγύηση εφ' όρου ζωής στο σώμα",
        "Σύνδεση Bluetooth με FELCO App για ρυθμίσεις κοπής",
        "Πλήρως επισκευάσιμο με 100% διαθεσιμότητα ανταλλακτικών"
      ],
      variants: {
        package: ["Σετ με Μπαταρία Power Pack", "Μόνο Ψαλίδι (Bare Tool) (-350€)"]
      }
    },
    {
      id: "prod-pellenc-power-ulib",
      title: "Επαγγελματική Μπαταρία Πλάτης ULiB 1500 Multi-Device",
      category: "power-batteries",
      subcategory: "power",
      brand: "PELLENC",
      sku: "PL-ULIB-1500",
      price: 1280.00,
      originalPrice: 1390.00,
      vatExcludedPrice: 1032.26,
      inStock: true,
      stockCount: 9,
      isOliveSpecial: false,
      isBestseller: true,
      isNew: false,
      rating: 4.9,
      reviewsCount: 23,
      powerSource: "Μπαταρία Li-Ion",
      usageLevel: "Επαγγελματική",
      description: "Μπαταρία πλάτης λιθίου υπερυψηλής ενεργειακής πυκνότητας 1527Wh. Παρέχει αυτονομία έως και 3 πλήρεις εργάσιμες ημέρες σε ελαιοραβδιστικά και ψαλίδια Pellenc.",
      images: [
        "assets/images/prod_generator.jpg"
      ],
      specs: {
        "Ενέργεια": "1527 Wh",
        "Βάρος": "7.5 kg με εργονομικό γιλέκο",
        "Κύκλοι Φόρτισης": "Έως 1300 πλήρεις κύκλοι"
      },
      keyFeatures: [
        "Αυτονομία έως 3 ημέρες συνεχούς λειτουργίας",
        "Αδιάβροχη προστασία IP54 για εργασία στη βροχή",
        "Έξυπνη οθόνη ένδειξης υπολειπόμενου χρόνου σε ώρες"
      ],
      variants: {
        harness: ["Εργονομικό Γιλέκο Comfort", "Standard Ζώνη (-60€)"]
      }
    },
    {
      id: "prod-stihl-ms170",
      title: "Βενζινοκίνητο Αλυσοπρίονο MS 170 30.1cm³ με Λάμα 35cm",
      category: "pruning-cutting",
      subcategory: "chainsaws",
      brand: "STIHL",
      sku: "ST-MS170-35",
      price: 219.00,
      originalPrice: 249.00,
      vatExcludedPrice: 176.61,
      inStock: true,
      stockCount: 28,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.8,
      reviewsCount: 75,
      powerSource: "Βενζινοκίνητο",
      usageLevel: "Ημιεπαγγελματική",
      description: "Το κλασικό, αξιόπιστο ελαφρύ αλυσοπρίονο της STIHL για κοπή ξύλων και χοντρών κλαδιών ελιάς. Εξαιρετική σχέση βάρους/ισχύος και σύστημα αντιδόνησης.",
      images: [
        "assets/images/prod_chainsaw.jpg"
      ],
      specs: {
        "Κυβισμός": "30.1 cm³",
        "Ισχύς": "1.2 kW / 1.6 HP",
        "Βάρος": "4.1 kg",
        "Μήκος Λάμας": "35 cm"
      },
      keyFeatures: [
        "Σύστημα STIHL QuickStop για άμεσο φρενάρισμα αλυσίδας",
        "Αντιδονητικό σύστημα STIHL για ξεκούραστο κράτημα",
        "Αντισταθμιστής καρμπυρατέρ για σταθερή ισχύ"
      ],
      variants: {
        barLength: ["Λάμα 35cm Rollomatic E", "Λάμα 30cm (-15€)"]
      }
    },
    {
      id: "prod-zanon-karbonium",
      title: "Ηλεκτρικό Ελαιοραβδιστικό Carbon Karbonium EVO 33V",
      category: "olive-harvest",
      subcategory: "harvesters",
      brand: "ZANON",
      sku: "ZN-KARB-EVO",
      price: 549.00,
      originalPrice: 620.00,
      vatExcludedPrice: 442.74,
      inStock: true,
      stockCount: 16,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.8,
      reviewsCount: 39,
      powerSource: "12V / 48V",
      usageLevel: "Επαγγελματική",
      description: "Το διάσημο Karbonium EVO με πατενταρισμένη ελλειπτική κίνηση ανθρακονημάτων. Μεγάλη ταχύτητα συλλογής χωρίς ρίξιμο φύλλων και ελάχιστη κατανάλωση ρεύματος.",
      images: [
        "assets/images/prod_harvester.jpg"
      ],
      specs: {
        "Μοτέρ": "500W Brushless",
        "Τάση": "33V με ηλεκτρονικό μετατροπέα 12V",
        "Μήκος": "Τηλεσκοπικό 2.10m - 3.40m Carbon",
        "Βάρος": "2.4 kg"
      },
      keyFeatures: [
        "Ελλειπτική παλμική κίνηση για μέγιστη απόδοση συγκομιδής",
        "Ραβδιά από 100% ανθρακόνημα υψηλής αντοχής",
        "Συμβατό με γεννήτρια ή μπαταρία αυτοκινήτου"
      ],
      variants: {
        poleLength: ["Τηλεσκοπικό 2.10m - 3.40m", "Σταθερό 2.40m Carbon (-40€)"]
      }
    },
    {
      id: "prod-pellenc-c35",
      title: "Ψαλίδι Κλαδέματος Μπαταρίας C35 με Σύστημα Activ'Security",
      category: "pruning-cutting",
      subcategory: "pruning",
      brand: "PELLENC",
      sku: "PL-C35-SEC",
      price: 980.00,
      originalPrice: 1090.00,
      vatExcludedPrice: 790.32,
      inStock: true,
      stockCount: 12,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: true,
      rating: 4.9,
      reviewsCount: 22,
      powerSource: "Μπαταρία Li-Ion",
      usageLevel: "Επαγγελματική",
      description: "Επαγγελματικό ψαλίδι με σύστημα άμεσης αποτροπής κοπής δακτύλου Activ'Security. Ιδανικό για πολύωρο κλάδεμα ελιάς και αμπελώνα με απόλυτη ασφάλεια.",
      images: [
        "assets/images/prod_shears.jpg"
      ],
      specs: {
        "Κοπή": "35 mm",
        "Βάρος": "720 gr",
        "Μοτέρ": "Pellenc Brushless 800W",
        "Αυτονομία": "Έως 9 ώρες με μπαταρία 150"
      },
      keyFeatures: [
        "Πατενταρισμένο σύστημα ασφαλείας Activ'Security",
        "4 διαφορετικές λειτουργίες χρήσης και ρύθμισης ανοίγματος",
        "Εξαιρετικά ελαφρύ βάρος μόλις 720 γραμμάρια"
      ],
      variants: {
        package: ["Σετ με Μπαταρία ULiB 150 & Φορτιστή", "Σετ με Διπλή Μπαταρία ULiB 250 (+190€)"]
      }
    },
    {
      id: "prod-lisam-tipper",
      title: "Πνευματικό Ψαλίδι Κλαδέματος Αέρος LISAM Sly Super Light",
      category: "pruning-cutting",
      subcategory: "pruning",
      brand: "LISAM",
      sku: "LS-SLY-AIR",
      price: 145.00,
      originalPrice: 175.00,
      vatExcludedPrice: 116.94,
      inStock: true,
      stockCount: 30,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: false,
      rating: 4.7,
      reviewsCount: 19,
      powerSource: "Χειροκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Κλασικό πνευματικό ψαλίδι κλαδέματος με ατσάλινες λεπίδες και σώμα από κράμα μαγνησίου. Συνδέεται σε αεροσυμπιεστή ελαιοσυλλογής για ταχύτατες κοπές.",
      images: [
        "assets/images/prod_shears.jpg"
      ],
      specs: {
        "Διάμετρος Κοπής": "30 mm",
        "Πίεση Λειτουργίας": "8 - 10 bar",
        "Βάρος": "550 gr εξαιρετικά ελαφρύ"
      },
      keyFeatures: [
        "Σφυρήλατο σώμα αλουμινίου/μαγνησίου",
        "Σύστημα προστασίας παγώματος βαλβίδας",
        "Συμβατό με όλες τις τηλεσκοπικές προεκτάσεις Lisam"
      ],
      variants: {
        extension: ["Χειρός", "Με προέκταση 1.5m (+45€)"]
      }
    },
    {
      id: "prod-olive-net-610",
      title: "Δίχτυ Ελαιοσυλλογής Monofilament 6x10m 100gr/m²",
      category: "nets-storage",
      subcategory: "nets",
      brand: "DP AGRON",
      sku: "DP-NET-610",
      price: 42.00,
      originalPrice: 50.00,
      vatExcludedPrice: 33.87,
      inStock: true,
      stockCount: 95,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: false,
      rating: 4.8,
      reviewsCount: 54,
      powerSource: "Χειροκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Μονόκλωνο ελαιόπανο 6x10m με θερμοκολλημένες άκρες και ανοξείδωτα μπουντούζια. Εύκολο στο άπλωμα και το μάζεμα, ανθεκτικό σε σχισίματα.",
      images: [
        "assets/images/prod_net.jpg"
      ],
      specs: {
        "Διαστάσεις": "6 x 10 m (60 m²)",
        "Βάρος": "100 gr/m²",
        "Πλέξη": "Monofilament UV stabilised"
      },
      keyFeatures: [
        "Ενισχυμένες ραφές περιμετρικά",
        "Μπουντούζια στις 4 γωνίες για σταθεροποίηση",
        "Αντοχή στην ηλιακή ακτινοβολία 5 έτη"
      ],
      variants: {
        package: ["1 Τεμάχιο", "Δέσμη 3 Τεμαχίων (-10%)"]
      }
    },
    {
      id: "prod-volpi-kamikaze",
      title: "Επαναφορτιζόμενο Mini Αλυσοπρίονο KVS5000 14.4V",
      category: "pruning-cutting",
      subcategory: "chainsaws",
      brand: "VOLPI",
      sku: "VP-KVS-5000",
      price: 235.00,
      originalPrice: 280.00,
      vatExcludedPrice: 189.52,
      inStock: true,
      stockCount: 15,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: true,
      rating: 4.7,
      reviewsCount: 28,
      powerSource: "Μπαταρία Li-Ion",
      usageLevel: "Επαγγελματική",
      description: "Mini αλυσοπρίονο μπαταρίας με λάμα 5 ιντσών και αυτόματη λίπανση. Ιδανικό για γρήγορα καθαρίσματα μέσα στο δέντρο χωρίς καλώδια.",
      images: [
        "assets/images/prod_chainsaw.jpg"
      ],
      specs: {
        "Μήκος Λάμας": "5 ίντσες (13 cm)",
        "Μπαταρία": "2x Li-Ion 14.4V 2.5Ah",
        "Βάρος": "1.2 kg"
      },
      keyFeatures: [
        "Αυτόματη λίπανση αλυσίδας με διαφανές δοχείο",
        "Οθόνη ένδειξης φόρτισης μπαταρίας",
        "Περιλαμβάνει πρακτική βαλίτσα μεταφοράς και 2 μπαταρίες"
      ],
      variants: {
        package: ["Standard Kit (2 Μπαταρίες 2.5Ah)", "Pro Kit (2 Μπαταρίες 4.0Ah + Έξτρα Αλυσίδα) (+45€)"]
      }
    },
    {
      id: "prod-makita-battery-set",
      title: "Σετ Διπλής Μπαταρίας 18V LXT 5.0Ah & Ταχυφορτιστής DC18RD",
      category: "power-batteries",
      subcategory: "power",
      brand: "MAKITA",
      sku: "MK-PWR-2X5",
      price: 179.00,
      originalPrice: 220.00,
      vatExcludedPrice: 144.35,
      inStock: true,
      stockCount: 40,
      isOliveSpecial: false,
      isBestseller: true,
      isNew: false,
      rating: 4.9,
      reviewsCount: 61,
      powerSource: "Μπαταρία Li-Ion",
      usageLevel: "Επαγγελματική",
      description: "Αυθεντικό σετ Makita Power Source Kit με 2 μπαταρίες BL1850B 18V 5.0Ah και διπλό ταχυφορτιστή. Συμβατό με όλη τη σειρά αγροτικών εργαλείων Makita 18V και 36V.",
      images: [
        "assets/images/prod_generator.jpg"
      ],
      specs: {
        "Τάση": "18V",
        "Χωρητικότητα": "2x 5.0Ah (90Wh)",
        "Χρόνος Φόρτισης": "45 λεπτά",
        "Τεχνολογία": "Star Protection Computer Controls"
      },
      keyFeatures: [
        "Ταχεία φόρτιση 2 μπαταριών ταυτόχρονα σε 45 λεπτά",
        "Ενσωματωμένη ένδειξη LED στάθμης φόρτισης 4 επιπέδων",
        "Προστασία από υπερθέρμανση και υπερφόρτωση"
      ],
      variants: {
        case: ["Σε βαλίτσα Makpac Type 3", "Χωρίς Βαλίτσα (-20€)"]
      }
    },
    {
      id: "prod-stihl-advance-gloves",
      title: "Επαγγελματικά Γάντια Κλαδέματος & Συγκομιδής Advance Ergo Grip",
      category: "protection",
      subcategory: "protection",
      brand: "STIHL",
      sku: "ST-GLV-ADV",
      price: 28.50,
      originalPrice: 34.00,
      vatExcludedPrice: 22.98,
      inStock: true,
      stockCount: 75,
      isOliveSpecial: true,
      isBestseller: false,
      isNew: false,
      rating: 4.8,
      reviewsCount: 37,
      powerSource: "Χειροκίνητο",
      usageLevel: "Επαγγελματική",
      description: "Ανθεκτικά δερμάτινα γάντια με αντιολισθητική επένδυση και ενίσχυση παλάμης. Προστατεύουν από αγκάθια και απορροφούν τους κραδασμούς του ελαιοραβδιστικού.",
      images: [
        "assets/images/prod_suit.jpg"
      ],
      specs: {
        "Υλικό": "Δέρμα κατσίκας & ελαστικό spandex",
        "Προστασία": "EN 388 Level 3",
        "Κλείσιμο": "Velcro στον καρπό"
      },
      keyFeatures: [
        "Αξεπέραστη αίσθηση αφής στη λαβή του εργαλείου",
        "Ενίσχυση στα σημεία τριβής μεταξύ δείκτη και αντίχειρα",
        "Διαπνέουσα ράχη για δροσερά χέρια"
      ],
      variants: {
        size: ["M (8)", "L (9)", "XL (10)", "2XL (11)"]
      }
    },
    {
      id: "prod-campagnola-alice",
      title: "Ηλεκτρικό Ελαιοραβδιστικό ALICE Premium Carbon 12V 58V",
      category: "olive-harvest",
      subcategory: "harvesters",
      brand: "CAMPAGNOLA",
      sku: "CP-ALICE-58",
      price: 620.00,
      originalPrice: 710.00,
      vatExcludedPrice: 500.00,
      inStock: true,
      stockCount: 14,
      isOliveSpecial: true,
      isBestseller: true,
      isNew: false,
      rating: 4.9,
      reviewsCount: 58,
      powerSource: "12V / 48V",
      usageLevel: "Επαγγελματική",
      description: "Το θρυλικό ALICE της Campagnola με διπλή αντίθετη κίνηση χτενιών από τεχνοπολυμερές και carbon. Εγγυάται τη μέγιστη συγκομιδή χωρίς να πληγώνει τα καρποφόρα μάτια.",
      images: [
        "assets/images/prod_spike.jpg"
      ],
      specs: {
        "Κεφαλή": "Διπλή αντίθετη κίνηση 1.150 rpm",
        "Μοτέρ": "Power 58V Brushless",
        "Τηλεσκοπικό": "Carbon 1.85m - 2.70m",
        "Βάρος": "2.5 kg"
      },
      keyFeatures: [
        "Μηδενικός τραυματισμός στα κλαδιά και τα μάτια της ελιάς",
        "Αντίθετη κίνηση χτενιών για εξάλειψη κραδασμών στο χέρι",
        "Μοτέρ Brushless 58V υψηλής ροπής με ηλεκτρονική προστασία"
      ],
      variants: {
        poleLength: ["Τηλεσκοπικό Carbon 1.85m - 2.70m", "Τηλεσκοπικό Carbon 2.00m - 3.20m (+35€)"]
      }
    }
  ],

  faqs: [
    {
      q: "Ποιο ελαιοραβδιστικό είναι κατάλληλο για την ποικιλία και το μέγεθος των δέντρων μου;",
      a: "Για πυκνά, άγρια ή ψηλά δέντρα (όπως Κορωνέικη, Λιανολιά) προτείνουμε παλμικά μοντέλα Carbon Brushless με λεπτά ραβδιά που διεισδύουν χωρίς να σπάνε τους βλαστούς. Για ελιές επιτραπέζιες (Καλαμών, Χαλκιδικής) όπου απαιτείται απόλυτη προστασία του καρπού από χτυπήματα, προτείνουμε ραβδιστικά με ελαστικές κεφαλές και ρυθμιστή χαμηλών στροφών. Μπορείτε επίσης να χρησιμοποιήσετε τον ψηφιακό σύμβουλο DP SmartAdvisor για άμεση πρόταση."
    },
    {
      q: "Ισχύει απαλλαγή ΦΠΑ (Άρθρο 39α) για επαγγελματίες και αγρότες ειδικού καθεστώτος;",
      a: "Βεβαίως! Η DP Agron υποστηρίζει πλήρως την έκδοση τιμολογίου με απαλλαγή καταβολής ΦΠΑ σύμφωνα με τις ισχύουσες φορολογικές διατάξεις για αγροτικό εξοπλισμό και επαγγελματίες. Κατά την ολοκλήρωση της παραγγελίας ή την υποβολή B2B αιτήματος, συμπληρώνετε το ΑΦΜ σας και η τιμολόγηση προσαρμόζεται αυτόματα."
    },
    {
      q: "Πώς γίνεται η αποστολή βαρέων μηχανημάτων, γεννητριών και μεγάλων δεμάτων;",
      a: "Μικρά και μεσαία δέματα (ψαλίδια, ανταλλακτικά, ελαιοραβδιστικά) αποστέλλονται με ταχυμεταφορές (Courier) στην πόρτα σας σε 24-48 ώρες. Βαριά μηχανήματα, γεννήτριες και μεγάλες παραγγελίες διχτυών αποστέλλονται με αξιόπιστες πρακτορειακές μεταφορικές εταιρείες σε όλη την ηπειρωτική και νησιωτική Ελλάδα με ασφαλή συσκευασία σε παλέτα."
    },
    {
      q: "Τι εγγύηση και τεχνική υποστήριξη (Service / Ανταλλακτικά) παρέχετε;",
      a: "Όλα τα μηχανήματα και εργαλεία καλύπτονται από 2 έως 3 έτη επίσημης εργοστασιακής εγγύησης. Διαθέτουμε πιστοποιημένο τμήμα service στις κεντρικές μας εγκαταστάσεις και πλήρη παρακαταθήκη αυθεντικών ανταλλακτικών (μοτέρ, ανθρακονήματα, λάμες, διακόπτες) με δυνατότητα άμεσης αποστολής ακόμα και κατά τη διάρκεια της συγκομιδής."
    },
    {
      q: "Προσφέρετε εκπτώσεις για αγροτικούς συνεταιρισμούς ή αγορές στόλου εξοπλισμού;",
      a: "Ναι! Διαθέτουμε ειδικό τμήμα B2B με κλιμακωτές εκπτώσεις όγκου, προσαρμοσμένα πακέτα για ομάδες παραγωγών και δυνατότητα δοκιμής εξοπλισμού κατόπιν συνεννόησης. Επικοινωνήστε με τη σελίδα 'Για Επαγγελματίες' για λήψη επίσημης προσφοράς εντός 24 ωρών."
    }
  ]
};
