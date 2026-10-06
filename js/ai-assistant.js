/* ==========================================================================
   DP AGRON - AI FARM ASSISTANT ENGINE (js/ai-assistant.js)
   Intelligent Agronomic Advisory, Natural Greek NLP, Smart Bundling & Recommendations
   ========================================================================== */

const AIAssistant = {
  // Hybrid mode: "hybrid" = Gemini via /api/advisor with local rule-engine fallback, "rules" = local only
  aiMode: "hybrid",
  apiEndpoint: "/api/advisor",
  llmTimeoutMs: 13000,
  llmDisabled: false, // set true for the page session if the API is missing / not configured

  activeSession: {
    history: [],
    llmHistory: [], // compact plain-text turns sent to the LLM for context
    treesCount: null,
    acresCount: null,
    workersCount: null,
    hasBattery: false,
    hasGenerator: false,
    hasNets: false,
    powerPreference: null,
    addedShear: false,
    addedSaw: false,
    lastIntent: null,
    currentBundle: [],
    currentBundleItems: []
  },

  placeholders: [
    "π.χ. Θέλω να μαζέψω ελιές από 3 στρέμματα...",
    "π.χ. Ψάχνω ελαφρύ ραβδιστικό carbon που δεν πληγώνει τα μάτια...",
    "π.χ. Χρειάζομαι ψαλίδι μπαταρίας για χοντρά κλαδιά...",
    "π.χ. Πόσα δίχτυα 100gr χρειάζομαι για 60 δέντρα;",
    "π.χ. Ποια γεννήτρια σηκώνει 2 ελαιοραβδιστικά ταυτόχρονα;"
  ],
  placeholderIdx: 0,
  placeholderInterval: null,
  speechRecognition: null,
  isListening: false,
  activeMicTarget: "home", // "home" or "advisor"

  init() {
    this.initPlaceholderRotator();
    // Create the SpeechRecognition instance only once (init() is called on load AND on every #home route)
    if (!this.speechRecognition) this.initSpeechRecognition();
  },

  // Guard against the same query being dispatched twice in quick succession
  // (e.g. late STT result after stop(), double Enter, voice + manual submit)
  _lastDispatch: { text: "", time: 0 },
  isDuplicateDispatch(query) {
    const now = Date.now();
    const key = (query || "").trim().toLowerCase();
    if (key && key === this._lastDispatch.text && now - this._lastDispatch.time < 1500) return true;
    this._lastDispatch = { text: key, time: now };
    return false;
  },

  /* --------------------------------------------------------------------------
     1. Text Normalization & Session Context Extraction
     -------------------------------------------------------------------------- */
  normalizeGreek(str) {
    if (!str) return "";
    let s = str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove Greek accents
      .replace(/ς/g, "σ")             // unify final sigma
      .trim();

    // Universal agricultural phonetic & typo normalizations (works for both typed and STT inputs)
    s = s.replace(/ελευθεραπευτικ[α-ω]*/g, "ελαιοραβδιστικα")
         .replace(/ελαιοθεραπευτικ[α-ω]*/g, "ελαιοραβδιστικα")
         .replace(/ελευθερα\s*πευτικ[α-ω]*/g, "ελαιοραβδιστικα")
         .replace(/ελεφθεραπευτικ[α-ω]*/g, "ελαιοραβδιστικα")
         .replace(/\bνυχια\b/g, "διχτυα")
         .replace(/καρμπον/g, "carbon")
         .replace(/αγκιναρα/g, "αχινος")
         .replace(/αγγιναρα/g, "αχινος");

    return s;
  },

  extractSessionEntities(rawQuery, norm) {
    // 1. Extract trees count (e.g. "400 ελιες", "400 δεντρα", "μαζεψω 400", "εχω 400", "σε 400")
    const treeMatch = norm.match(/(\d+)\s*(?:δεντρ|δενδρ|ριζ|ελι|ελαι)/i) || 
                      norm.match(/(?:δεντρ|δενδρ|ριζ|ελι[αες]*)\s*(?:μου\s*)?(\d+)/i) ||
                      norm.match(/(?:μαζεψ[ωει]*|μαζεμα|μαζευω)\s*(\d+)/i) ||
                      norm.match(/(?:για|σε)\s*(\d+)\s*(?:ελι|δεντρ)/i);
    if (treeMatch && parseInt(treeMatch[1], 10) >= 10) {
      this.activeSession.treesCount = parseInt(treeMatch[1], 10);
      this.activeSession.acresCount = Math.max(1, Math.round(this.activeSession.treesCount / 25));
    }

    // 2. Extract acres count (e.g. "15 στρεμματα", "3 στρεμματα")
    const acreMatch = norm.match(/(\d+)\s*στρεμμ/i);
    if (acreMatch && parseInt(acreMatch[1], 10) > 0) {
      this.activeSession.acresCount = parseInt(acreMatch[1], 10);
      if (!this.activeSession.treesCount) {
        this.activeSession.treesCount = this.activeSession.acresCount * 25;
      }
    }

    // 2b. Qualitative grove size if no numbers were given
    if (!this.activeSession.treesCount && !this.activeSession.acresCount) {
      if (/(?:λιγ[αες]*\s*(?:δεντρ|δενδρ|ελι|ριζ)|μικρ[οα]*\s*(?:ελαιων|κτημα|λιοστασ|χωραφ)|ερασιτεχν|για\s+το\s+σπιτι)/i.test(norm)) {
        this.activeSession.treesCount = 40;
        this.activeSession.acresCount = 2;
      } else if (/(?:πολλ[αες]*\s*(?:δεντρ|δενδρ|ελι|ριζ)|μεγαλ[οα]*\s*(?:ελαιων|κτημα|λιοστασ|χωραφ)|επαγγελματι[α-ω]*\s*ελαι)/i.test(norm)) {
        this.activeSession.treesCount = 350;
        this.activeSession.acresCount = 14;
      }
    }

    // 3. Extract workers count (e.g. "5 εργατες", "ειμαστε 4 ατομα", "συνεργειο 3", "εχω 5 εργατες", "για 5 εργατες", "5 χειριστες")
    const workerMatch = norm.match(/(\d+)\s*(?:εργατ|χειριστ|ατομ|παιδι|βοηθ)/i) ||
                        norm.match(/(?:ειμαστε|εχω|συνεργειο)\s*(\d+)\s*(?:εργατ|χειριστ|ατομ|παιδι|βοηθ)?/i) ||
                        norm.match(/(?:για|σε)\s*(\d+)\s*(?:εργατ|χειριστ|ατομ|παιδι|βοηθ)/i);
    if (workerMatch && parseInt(workerMatch[1], 10) > 0) {
      const parsedWorkers = parseInt(workerMatch[1], 10);
      if (parsedWorkers <= 35) {
        this.activeSession.workersCount = parsedWorkers;
      }
    }

    // 4. Power & Equipment ownership (own generator, battery, nets)
    const hasOwnGen = /εχω\s+(?:ηδη\s+|δικ[ηο]\s+μου\s+)?(?:γεννητρι|δυναμο)|δικ[ηο]\s+μου\s+(?:γεννητρι|δυναμο)|διαθετω\s+(?:ηδη\s+)?(?:γεννητρι|δυναμο)|εχουμε\s+(?:ηδη\s+)?(?:γεννητρι|δυναμο)|υπαρχει\s+γεννητρι|χωρισ\s+γεννητρι|βγαλ[ετε]+\s+(?:τη[ν]?\s+)?γεννητρι|δεν\s+(?:θελω|χρειαζομαι)\s+γεννητρι|δε\s+χρειαζομαι\s+γεννητρι|μη[ν]?\s+βαλ[ειτεσ]+\s+γεννητρι/i.test(norm) ||
      norm.includes("εχω γεννητρι") || norm.includes("εχω ηδη γεννητρι") || norm.includes("δικη μου γεννητρι") || norm.includes("δικο μου δυναμο") || norm.includes("διαθετω γεννητρι") || norm.includes("εχουμε γεννητρι") || norm.includes("εχουμε ηδη γεννητρι") || norm.includes("εχω δυναμο") || norm.includes("εχω ηδη δυναμο") || norm.includes("χωρισ γεννητρι") || norm.includes("βγαλε τη γεννητρι") || norm.includes("βγαλε γεννητρι") || norm.includes("δεν θελω γεννητρι") || norm.includes("μη βαλεισ γεννητρι");

    const hasOwnBattery = /εχω\s+(?:ηδη\s+|δικ[ηο]\s+μου\s+)?μπαταρι|δικ[ηο]\s+μου\s+μπαταρι|διαθετω\s+(?:ηδη\s+)?μπαταρι|εχουμε\s+(?:ηδη\s+)?μπαταρι|υπαρχει\s+μπαταρι|χωρισ\s+μπαταρι|βγαλ[ετε]+\s+(?:τη[ν]?\s+)?μπαταρι|δεν\s+(?:θελω|χρειαζομαι)\s+μπαταρι|δε\s+χρειαζομαι\s+μπαταρι|μη[ν]?\s+βαλ[ειτεσ]+\s+μπαταρι/i.test(norm) ||
      norm.includes("εχω μπαταρι") || norm.includes("εχω ηδη μπαταρι") || norm.includes("δικη μου μπαταρι") || norm.includes("διαθετω μπαταρι") || norm.includes("εχουμε μπαταρι") || norm.includes("χωρισ μπαταρι") || norm.includes("βγαλε τη μπαταρι") || norm.includes("βγαλε μπαταρι") || norm.includes("δεν θελω μπαταρι");

    const hasOwnNets = /εχω\s+(?:ηδη\s+|δικ[αο]\s+μου\s+)?(?:διχτυ|πανι|ελαιοπαν)|δικ[αο]\s+μου\s+(?:διχτυ|πανι|ελαιοπαν)|διαθετω\s+(?:ηδη\s+)?(?:διχτυ|πανι|ελαιοπαν)|χωρισ\s+(?:διχτυ|πανι|ελαιοπαν)|βγαλ[ετε]+\s+(?:τα\s+)?(?:διχτυ|πανι|ελαιοπαν)|δεν\s+(?:θελω|χρειαζομαι)\s+(?:διχτυ|πανι|ελαιοπαν)/i.test(norm) ||
      norm.includes("εχω διχτυ") || norm.includes("εχω ηδη διχτυ") || norm.includes("δικα μου διχτυ") || norm.includes("χωρισ διχτυ") || norm.includes("βγαλε τα διχτυ") || norm.includes("βγαλε διχτυ") || norm.includes("δεν θελω διχτυ") || norm.includes("εχω πανι") || norm.includes("εχω ηδη πανι");

    if (hasOwnGen) {
      this.activeSession.hasGenerator = true;
      this.activeSession.powerPreference = "generator";
    }
    if (hasOwnBattery) {
      this.activeSession.hasBattery = true;
      this.activeSession.powerPreference = "battery";
    }
    if (hasOwnNets) {
      this.activeSession.hasNets = true;
    }

    // 5. Tool additions
    if (norm.includes("ψαλιδ")) {
      this.activeSession.addedShear = true;
    }
    if (norm.includes("αλυσοπριον") || (norm.includes("πριον") && !norm.includes("αποτυπωμα"))) {
      this.activeSession.addedSaw = true;
    }
  },

  /* --------------------------------------------------------------------------
     2. Placeholder Animation
     -------------------------------------------------------------------------- */
  initPlaceholderRotator() {
    const input = document.getElementById("ai-home-input");
    if (!input) return;

    if (this.placeholderInterval) clearInterval(this.placeholderInterval);
    this.placeholderInterval = setInterval(() => {
      if (document.activeElement === input || input.value.trim().length > 0) return;
      this.placeholderIdx = (this.placeholderIdx + 1) % this.placeholders.length;
      input.setAttribute("placeholder", this.placeholders[this.placeholderIdx]);
    }, 4000);
  },

  /* --------------------------------------------------------------------------
     3. Speech-to-Text Recognition (Greek Native & Agricultural Auto-Corrector)
     -------------------------------------------------------------------------- */
  speechBuffer: "",
  speechSilenceTimer: null,

  correctSpeechTranscript(text) {
    if (!text) return "";
    let s = text.trim();

    // Helper to build Unicode-safe boundary regex for Greek words
    const makeRegex = (pattern) => new RegExp("(?<![\\p{L}\\p{N}])(?:" + pattern + ")(?![\\p{L}\\p{N}])", "giu");

    const corrections = [
      // Brands phonetically transcribed in Greek
      { pattern: "τζιοτεκ|τζεοτεκ|τζιοτεχ|γεωτεκ|γαιοτεκ|τζιοτεκς|τζιοτε|τζιότεκ|τζεότεκ", replacement: "Geotec" },
      { pattern: "βορτεξ|βορτεχ|βορτεχς|βορτεκ|βόρτεξ", replacement: "Vortex" },
      { pattern: "φελκο|φέλκο|φελκοου|φελκ", replacement: "Felco" },
      { pattern: "βολπι|βόλπι|βολπυ", replacement: "Volpi" },
      { pattern: "στιλ|στηλ|στίλ|στιχλ|στίχλ", replacement: "Stihl" },
      { pattern: "ζανον|ζανόν", replacement: "Zanon" },
      { pattern: "πελενκ|πελένκ|πελεν|πελλενκ", replacement: "Pellenc" },
      { pattern: "καμπανιολα|καμπανιόλα", replacement: "Campagnola" },
      { pattern: "μακιτα|μακίτα", replacement: "Makita" },
      { pattern: "λιζαμ|λισαμ", replacement: "Lisam" },

      // Common mishearings: "έλλο" -> "άλλο", "μυστικά" -> "ραβδιστικά"
      { pattern: "έλλο|ελλο", replacement: "άλλο" },
      { pattern: "μυστικ[α-ω]*\\s*(?:να\\s+)?(?:αγορασω|παρω|βρω|προτεινεισ)", replacement: "ελαιοραβδιστικά να αγοράσω" },
      { pattern: "(?:εξοπλισμ[ο-ω]*|εργαλει[α-ω]*|μηχανημ[α-ω]*)\\s*μυστικ[α-ω]*", replacement: "ελαιοραβδιστικά" },
      { pattern: "(\\d+)\\s*χρονων\\s+αγροτης", replacement: "αγρότης με $1 δέντρα" },
      { pattern: "(\\d+)\\s*χρονων\\s*(?:ελιες|δεντρα|δενδρα)", replacement: "$1 δέντρα" },

      // Split compound agricultural terms
      { pattern: "ελαιο\\s+ραβδιστικ[οαουωνες]+", replacement: "ελαιοραβδιστικό" },
      { pattern: "ελαιο\\s+ραβδι[αων]*", replacement: "ελαιοραβδιστικό" },
      { pattern: "ελαιο\\s+παν[ιαουων]+", replacement: "ελαιόπανα" },
      { pattern: "αλυσο\\s+πριον[οαουων]+", replacement: "αλυσοπρίονο" },
      { pattern: "κονταρο\\s+πριον[οαουων]+", replacement: "κονταροπρίονο" },
      { pattern: "κλαδευτικ[οα]\\s+ψαλιδ[ια]*", replacement: "ψαλίδι κλαδέματος" },

      // Common STT phonetic misrecognitions of olive harvest items
      { pattern: "ελευθεραπευτικ[οαουων]+|ελευθεραπευτικά|ελαιοθεραπευτικ[οαουων]+|ελευθερα\\s*πευτικ[οαουων]+|ελεφθεραπευτικ[οαουων]+", replacement: "ελαιοραβδιστικό" },
      { pattern: "ελαιο\\s*ραβδιστικ[οαουων]+", replacement: "ελαιοραβδιστικό" },
      { pattern: "(?:τι|ποσα|ποια)?\\s*(?:νυχια|νύχια)(?:\\s+να\\s+(?:παρω|βαλω))?", replacement: " δίχτυα " },
      { pattern: "(?:μαζεψ[ωει]*|ελι[αες]*)\\s+(?:τι\\s+)?(?:νυχια|νύχια)", replacement: " ελιές τι δίχτυα " },
      { pattern: "(?:νυχια|νύχια)\\s+(?:για\\s+)?(?:ελιες|ελιές)", replacement: "δίχτυα για ελιές" },
      { pattern: "δίκτυα|δίκτυο|δικτυα|δικτυο|δικτια", replacement: "δίχτυα" },
      { pattern: "δικτυ", replacement: "δίχτυ" },
      { pattern: "(?:μπάνια|παλιά|παιδιά)\\s+(?:για\\s+)?(?:ελιες|ελιές|ελαιοσυλλογη|ελαιοσυλλογή)", replacement: "πανιά για ελιές" },
      { pattern: "παλια|μπανια", replacement: "πανιά" },
      { pattern: "ελαιοπανα|ελαιοπανο|ελαιοπανα", replacement: "ελαιόπανα" },
      { pattern: "καρμπον|καρμπόν|καρβουν", replacement: "carbon" },
      { pattern: "παλμικα|παλμικο|παλμικη", replacement: "παλμικό" },
      { pattern: "αχινος|αχινούς|αχινοι", replacement: "αχινός" },
      { pattern: "χτενα|χτένα|χτενια|χτένια|κτενα|κτένα", replacement: "χτένα" },
      { pattern: "κουπεπε|κουπέπε|κουπεπέ", replacement: "κουπεπέ" },
      { pattern: "μινοταυρος|μινώταυρος|μινοταυρο", replacement: "Μινώταυρος" },
      { pattern: "αγκιναρα|αγγιναρα|αγκινάρα", replacement: "αγκινάρα" },
      { pattern: "βεργα|βέργα|βεργες|βέργες", replacement: "βέργες" },
      { pattern: "ανθρακονημα|ανθρακονήματα|ανθρακόνημα|ανθρακονημάτων", replacement: "ανθρακονήματα carbon" },
      { pattern: "τηλεσκοπικ[οαη]+|τηλεσκοπικό", replacement: "τηλεσκοπικό" },
      { pattern: "βενζινοκινητ[οαη]+|βενζινοκίνητο", replacement: "βενζινοκίνητο" },
      { pattern: "δωδεκαβολτ[οα]|δωδεκάβολτο|12\\s*βολτο", replacement: "12V" },
      { pattern: "τελαρα|τελάρα|κλουβες|κλούβες", replacement: "τελάρα συγκομιδής" },
      { pattern: "ελαιοδιχτυ[α]?|ελαιοδιχτα|ελαιόδιχτα|ελαιοδίχτυα", replacement: "ελαιόδιχτα" },
      { pattern: "μοτερ|μοτέρ", replacement: "μοτέρ" },
      { pattern: "γεννητρια|γεννήτρια", replacement: "γεννήτρια" },

      // Tax exemption & Article 39a mishearings
      { pattern: "(?:αρθρο|άρθρο)?\\s*(?:39|τριαντα\\s+εννια|τριάντα\\s+εννιά)\\s*(?:α|άλφα|αλφα|alpha|a)", replacement: " Άρθρο 39α " },
      { pattern: "(?:χωρις|χωρίς)\\s+φπα", replacement: " χωρίς ΦΠΑ (39α) " },
      { pattern: "(?:απαλλαγη|απαλλαγή)\\s+φπα", replacement: " απαλλαγή ΦΠΑ (39α) " },

      // Spoken Greek numbers to digits before agricultural terms
      { pattern: "τετρακοσια|τετρακόσια", replacement: "400" },
      { pattern: "πεντακοσια|πεντακόσια", replacement: "500" },
      { pattern: "τριακοσια|τριακόσια", replacement: "300" },
      { pattern: "διακοσια|διακόσια", replacement: "200" },
      { pattern: "εκατο|εκατό", replacement: "100" },
      { pattern: "χιλια|χίλια", replacement: "1000" },
      { pattern: "πενηντα|πενήντα", replacement: "50" },
      { pattern: "εξηντα|εξήντα", replacement: "60" },
      { pattern: "εβδομηντα|εβδομήντα", replacement: "70" },
      { pattern: "ογδοντα|ογδόντα", replacement: "80" },
      { pattern: "ενενηντα|ενενήντα", replacement: "90" },
      { pattern: "σαραντα|σαράντα", replacement: "40" },
      { pattern: "τριαντα|τριάντα", replacement: "30" },
      { pattern: "εικοσι|είκοσι", replacement: "20" },
      { pattern: "δεκα|δέκα", replacement: "10" },
      { pattern: "πεντε|πέντε", replacement: "5" },
      { pattern: "εξι|έξι", replacement: "6" },
      { pattern: "επτα|εφτα|επτά|εφτά", replacement: "7" },
      { pattern: "οκτω|οχτω|οκτώ|οχτώ", replacement: "8" },
      { pattern: "εννια|εννιά|εννεα|εννέα", replacement: "9" },
      { pattern: "τεσσερα|τεσσερις|τέσσερα|τέσσερις", replacement: "4" },
      { pattern: "τρια|τρεις|τρία", replacement: "3" },
      { pattern: "δυο|δύο", replacement: "2" },

      // Olive tree phonetic mishearings
      { pattern: "τεντα|τέντα", replacement: "δέντρα" },
      { pattern: "δενδρα|δένδρα", replacement: "δέντρα" },
      { pattern: "ριζες|ρίζες", replacement: "δέντρα" },

      // Measurements & Acreage
      { pattern: "στρεματα|στρεμα|τρεματα|τρέμματα", replacement: "στρέμματα" },
      { pattern: "(?:100|εκατο|εκατό)\\s*(?:γραμμαρια|γραμμάρια|γραμμ|γρ)", replacement: "100gr" },
      { pattern: "8\\s*(?:επι|x|επί)\\s*12|οκτω\\s*(?:επι|επί)\\s*δωδεκα", replacement: "8x12m" },
      { pattern: "6\\s*(?:επι|x|επί)\\s*10|εξι\\s*(?:επι|επί)\\s*δεκα", replacement: "6x10m" },
      { pattern: "10\\s*(?:επι|x|επί)\\s*14|δεκα\\s*(?:επι|επί)\\s*δεκατεσσερα", replacement: "10x14m" },

      // Power & Batteries
      { pattern: "12\\s*βολτ|12\\s*β|δωδεκα\\s+βολτ", replacement: "12V" },
      { pattern: "24\\s*βολτ|24\\s*β|εικοσι\\s+τεσσερα\\s+βολτ", replacement: "24V" },
      { pattern: "μπαταρια\\s+πλατης|μπαταριας\\s+πλατης", replacement: "μπαταρία πλάτης" },
      { pattern: "δυναμο|δυναμό", replacement: "δυναμό" }
    ];

    for (const { pattern, replacement } of corrections) {
      s = s.replace(makeRegex(pattern), replacement);
    }

    // Clean whitespace & capitalize
    s = s.replace(/\s+/g, " ").trim();
    if (s.length > 0) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }

    return s;
  },

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.lang = "el-GR";
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;

      this.speechRecognition.onresult = (e) => {
        // Chrome fires one final onresult AFTER stop() is called. If we already committed, ignore it,
        // otherwise it re-schedules the silence timer and the same question is submitted twice.
        if (!this.isListening) return;

        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = 0; i < e.results.length; ++i) {
          const res = e.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript + " ";
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const sessionText = (finalTranscript + interimTranscript).trim();
        // Prepend text captured before an automatic restart (see onend)
        const currentText = ((this.speechPrefix ? this.speechPrefix + " " : "") + sessionText).trim();
        this.speechBuffer = currentText;

        // Live display in active input while user speaks
        const inputId = this.activeMicTarget === "advisor" ? "advisor-refine-input" : "ai-home-input";
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
          inputEl.value = currentText;
        }

        // Adaptive silence window: people pause after the first word ("Θέλω... ") while thinking.
        // Short phrases get much more patience; a still-interim result gets extra time too.
        clearTimeout(this.speechSilenceTimer);
        const wordCount = currentText.split(/\s+/).filter(Boolean).length;
        let silenceMs = wordCount < 3 ? 4000 : (wordCount < 6 ? 2600 : 2000);
        if (interimTranscript.trim().length > 0) silenceMs += 600;

        this.speechSilenceTimer = setTimeout(() => {
          if (this.isListening && this.speechBuffer.trim().length > 0) {
            this.commitVoiceSpeech();
          }
        }, silenceMs);
      };

      this.speechRecognition.onerror = (err) => {
        console.warn("Speech recognition notice:", err.error);
        if (err.error !== "no-speech" && err.error !== "aborted") {
          this.stopListening();
        }
      };

      this.speechRecognition.onend = () => {
        if (!this.isListening) return;
        const text = (this.speechBuffer || "").trim();
        const wordCount = text.split(/\s+/).filter(Boolean).length;

        // Chrome sometimes ends the session on its own after a short pause.
        // If the user has said only 1-2 words, keep listening instead of submitting a fragment.
        if (wordCount < 3 && (this.speechRestarts || 0) < 3) {
          this.speechRestarts = (this.speechRestarts || 0) + 1;
          this.speechPrefix = text;
          try {
            this.speechRecognition.start();
            return;
          } catch (e) { /* fall through */ }
        }

        if (text.length > 0) {
          this.commitVoiceSpeech();
        } else {
          this.stopListening();
        }
      };
    } catch (err) {
      console.warn("Speech recognition error:", err);
    }
  },

  toggleVoiceSearch() {
    this.activeMicTarget = "home";
    this.toggleListening("ai-mic-btn", "ai-home-input");
  },

  toggleAdvisorVoice() {
    this.activeMicTarget = "advisor";
    this.toggleListening("advisor-mic-btn", "advisor-refine-input");
  },

  toggleListening(btnId, inputId) {
    if (!this.speechRecognition) {
      App.showToast("Η φωνητική αναζήτηση υποστηρίζεται σε Chrome & Edge. Μπορείτε να πληκτρολογήσετε άμεσα!", "info");
      return;
    }

    if (this.isListening) {
      clearTimeout(this.speechSilenceTimer);
      if (this.speechBuffer && this.speechBuffer.trim().length > 0) {
        this.commitVoiceSpeech();
      } else {
        this.stopListening();
      }
    } else {
      this.startListening(btnId, inputId);
    }
  },

  startListening(btnId, inputId) {
    if (!this.speechRecognition) return;
    try {
      this.speechBuffer = "";
      this.speechPrefix = "";
      this.speechRestarts = 0;
      clearTimeout(this.speechSilenceTimer);

      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        inputEl.value = "";
        inputEl.setAttribute("placeholder", "Ακούω... Μιλήστε τώρα στα ελληνικά...");
        const formWrap = inputEl.closest("form") || inputEl;
        formWrap.classList.add("is-voice-listening");
      }

      const btn = document.getElementById(btnId);
      if (btn) btn.classList.add("listening");

      this.speechRecognition.start();
      this.isListening = true;
      App.showToast("Μιλήστε τώρα (π.χ. «θέλω δίχτυα 100gr για 50 δέντρα»)...", "info");
    } catch (e) {
      console.warn("Start listening error:", e);
      this.isListening = false;
    }
  },

  stopListening() {
    this.isListening = false;
    this.speechPrefix = "";
    this.speechRestarts = 0;
    clearTimeout(this.speechSilenceTimer);

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
    }

    document.querySelectorAll(".ai-mic-btn, .advisor-mic-btn").forEach(btn => btn.classList.remove("listening"));
    document.querySelectorAll(".is-voice-listening").forEach(el => el.classList.remove("is-voice-listening"));

    const homeInput = document.getElementById("ai-home-input");
    if (homeInput) homeInput.setAttribute("placeholder", this.placeholders[this.placeholderIdx] || "π.χ. Θέλω να μαζέψω ελιές από 3 στρέμματα...");

    const advInput = document.getElementById("advisor-refine-input");
    if (advInput) advInput.setAttribute("placeholder", "Ρωτήστε κάτι συμπληρωματικό (π.χ. «θέλω και ψαλίδι», «πόσα δίχτυα χρειάζομαι;»)...");
  },

  commitVoiceSpeech(autoSubmit = false) {
    const raw = (this.speechBuffer || "").trim();
    this.speechBuffer = ""; // consume buffer so onend / late events can't commit it again
    this.stopListening();

    if (!raw) return;

    // Apply Greek Agricultural Phonetic Auto-Corrector
    const corrected = this.correctSpeechTranscript(raw);

    const inputId = this.activeMicTarget === "advisor" ? "advisor-refine-input" : "ai-home-input";
    const inputEl = document.getElementById(inputId);
    if (inputEl) {
      inputEl.value = corrected;
      inputEl.focus();
      try {
        inputEl.setSelectionRange(corrected.length, corrected.length);
      } catch (e) {}

      inputEl.classList.add("ai-input-editing-highlight");
      setTimeout(() => inputEl.classList.remove("ai-input-editing-highlight"), 1800);

      if (this.activeMicTarget === "advisor") {
        const bottomDock = document.querySelector(".advisor-bottom-dock");
        if (bottomDock) {
          bottomDock.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }
    }

    if (autoSubmit) {
      App.showToast(`Αναγνωρίστηκε: «${corrected}»`, "success");
      // Dispatch query to AI engine
      if (this.activeMicTarget === "advisor") {
        this.handleAdvisorRefine(null, corrected);
      } else {
        this.handleUserSubmit(null, corrected);
      }
    } else {
      App.showToast("Καταγράφηκε! Ελέγξτε ή διορθώστε το κείμενο και πατήστε Αποστολή (➔)", "info");
    }
  },

  /* --------------------------------------------------------------------------
     4. User Query Handlers
     -------------------------------------------------------------------------- */
  handleChipClick(text) {
    const input = document.getElementById("ai-home-input");
    if (input) input.value = text;
    this.handleUserSubmit(null, text);
  },

  handleUserSubmit(event, directText = null) {
    if (event) event.preventDefault();

    const input = document.getElementById("ai-home-input");
    const query = directText || (input ? input.value.trim() : "");
    if (!query) return;
    if (this.isDuplicateDispatch(query)) return;

    if (input) input.value = "";

    // Clear previous advisor thread for a fresh query from home
    const thread = document.getElementById("advisor-thread");
    if (thread) thread.innerHTML = "";
    this.activeSession.history = [];
    this.activeSession.llmHistory = [];
    this.activeSession.treesCount = null;
    this.activeSession.acresCount = null;
    this.activeSession.workersCount = null;
    this.activeSession.hasBattery = false;
    this.activeSession.hasGenerator = false;
    this.activeSession.hasNets = false;
    this.activeSession.powerPreference = null;
    this.activeSession.addedShear = false;
    this.activeSession.addedSaw = false;
    this.activeSession.lastIntent = null;
    this.activeSession.currentBundle = [];
    this.activeSession.currentBundleItems = [];

    // Navigate to Screen 2 (#advisor)
    App.navigateTo("advisor");

    // 1. Append User Message Bubble
    this.appendUserMessage(query);

    // 2. Show Typing Indicator
    this.showTypingIndicator();

    // 3. Process Intent & Respond (LLM first, rule-engine fallback)
    this.processQuery(query);
  },

  handleAdvisorRefine(event, directText = null) {
    if (event) event.preventDefault();

    const input = document.getElementById("advisor-refine-input");
    const query = directText || (input ? input.value.trim() : "");
    if (!query) return;
    if (this.isDuplicateDispatch(query)) return;

    if (input) {
      input.value = "";
      input.placeholder = "Ρωτήστε κάτι συμπληρωματικό (π.χ. «θέλω και ψαλίδι», «πόσα δίχτυα χρειάζομαι;»)...";
    }

    // 1. Append User Follow-up Query
    this.appendUserMessage(query);

    // 2. Show Typing Indicator
    this.showTypingIndicator();

    // 3. Process Intent & Respond (LLM first, rule-engine fallback)
    this.processQuery(query);
  },

  /* --------------------------------------------------------------------------
     4b. Hybrid LLM pipeline (Gemini via /api/advisor) with rule-engine fallback
     -------------------------------------------------------------------------- */
  async processQuery(query) {
    const startedAt = Date.now();
    const cleaned = this.correctSpeechTranscript(query);
    const norm = this.normalizeGreek(cleaned);
    this.extractSessionEntities(cleaned, norm);

    let llm = null;
    if (this.aiMode === "hybrid" && !this.llmDisabled) {
      llm = await this.fetchLLMAdvice(cleaned);
    }

    // Keep a short natural "typing" pause even when the answer is instant
    const minDelay = 550 - (Date.now() - startedAt);
    if (minDelay > 0) await new Promise(r => setTimeout(r, minDelay));
    this.removeTypingIndicator();

    if (llm) {
      try {
        this.renderLLMAdvice(llm, cleaned, norm);
        this.pushLLMHistory(cleaned, llm.reply_html);
        return;
      } catch (err) {
        console.warn("LLM render failed, using rule engine:", err);
      }
    }
    this.generateAgronomicAdvice(query);
  },

  async fetchLLMAdvice(query) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.llmTimeoutMs);
    try {
      const s = this.activeSession;
      const res = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          query,
          history: (s.llmHistory || []).slice(-8),
          session: {
            treesCount: s.treesCount, acresCount: s.acresCount, workersCount: s.workersCount,
            hasGenerator: s.hasGenerator, hasBattery: s.hasBattery, hasNets: s.hasNets
          }
        })
      });
      // API missing (static hosting / file://) or not configured -> stop trying for this page session
      if ([404, 405, 501, 503].includes(res.status)) {
        this.llmDisabled = true;
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data.reply_html === "string" && data.reply_html.trim() ? data : null;
    } catch (err) {
      return null; // timeout / offline -> rule engine
    } finally {
      clearTimeout(timer);
    }
  },

  renderLLMAdvice(data, cleaned, norm) {
    const intro = this.sanitizeLLMHtml(data.reply_html);
    const action = data.action || { type: "none" };
    const introBlock = `<div class="ai-msg-text">${intro}</div>`;
    let html = "";

    if (action.type === "bundle") {
      const trees = Number(action.trees);
      if (trees > 0) {
        this.activeSession.treesCount = trees;
        this.activeSession.acresCount = Math.max(1, Math.round(trees / 25));
        html = introBlock + this.buildAcreageResponse(this.normalizeGreek(`${trees} δέντρα`), `${trees} δέντρα`);
      } else if (this.activeSession.treesCount || this.activeSession.acresCount) {
        html = introBlock + this.buildAcreageResponse(norm, cleaned);
      } else {
        html = introBlock + this.buildGroveClarificationResponse();
      }
      this.activeSession.lastIntent = "acreage";
    } else if (action.type === "calendar") {
      const topicKeyword = {
        harvest: "ελαιοσυλλογη", fertilize: "λιπασμα", spraying: "ψεκασμοσ",
        pruning: "κλαδεμα", irrigation: "ποτισμα", planting: "φυτευση"
      }[action.topic];
      html = introBlock + this.buildTimingResponse(topicKeyword || norm, cleaned);
      this.activeSession.lastIntent = "timing";
    } else if (action.type === "b2b") {
      html = introBlock + this.buildB2BResponse(norm, cleaned);
      this.activeSession.lastIntent = "b2b";
    } else {
      const products = (data.product_ids || [])
        .map(id => (DPAgronData.products || []).find(p => String(p.id) === String(id)))
        .filter(Boolean);
      if (products.length) this.activeSession.currentBundle = products.map(p => p.id);

      const followups = (data.followups && data.followups.length)
        ? data.followups
        : ["Πόσα ελαιοραβδιστικά χρειάζομαι;", "Πόσα δίχτυα χρειάζομαι;", "Τιμολόγιο με άρθρο 39α"];

      html = `
        ${introBlock}
        ${products.length ? `<div class="ai-product-cards-grid">${products.map(p => this.renderChatProductCard(p)).join("")}</div>` : ""}
        <div class="ai-followup-box">
          <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-target></use></svg> ${data.needs_clarification ? "Ή διαλέξτε:" : "Μπορείτε επίσης να ρωτήσετε:"}</div>
          <div class="ai-followup-actions">
            ${followups.map(f => `<button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, '${this.escapeInlineJs(f)}')">${this.escapeHtml(f)}</button>`).join("")}
          </div>
        </div>`;
      this.activeSession.lastIntent = "llm";
    }

    this.appendBotMessage(html);
  },

  pushLLMHistory(userText, replyHtml) {
    const tmp = document.createElement("div");
    tmp.innerHTML = replyHtml || "";
    const plain = (tmp.textContent || "").replace(/\s+/g, " ").trim().slice(0, 600);
    const h = this.activeSession.llmHistory || (this.activeSession.llmHistory = []);
    h.push({ role: "user", text: userText }, { role: "model", text: plain || "(πρόταση προϊόντων)" });
    if (h.length > 16) h.splice(0, h.length - 16);
  },

  // Allow only simple formatting tags from the LLM; strip every attribute (XSS protection)
  sanitizeLLMHtml(html) {
    const allowed = new Set(["STRONG", "B", "EM", "I", "BR", "UL", "OL", "LI", "P"]);
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html || "");
    const walk = (node) => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 1) {
          walk(child);
          if (!allowed.has(child.tagName) || child.tagName === "SCRIPT" || child.tagName === "STYLE") {
            if (child.tagName === "SCRIPT" || child.tagName === "STYLE") child.remove();
            else child.replaceWith(...Array.from(child.childNodes));
          } else {
            Array.from(child.attributes).forEach(a => child.removeAttribute(a.name));
          }
        } else if (child.nodeType !== 3) {
          child.remove();
        }
      });
    };
    walk(tpl.content);
    const out = document.createElement("div");
    out.appendChild(tpl.content);
    return out.innerHTML;
  },

  escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },

  // For values placed inside onclick="fn('...')": JS-escape first, then HTML-escape
  escapeInlineJs(s) {
    return this.escapeHtml(String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, " "));
  },

  resetChat() {
    const thread = document.getElementById("advisor-thread");
    if (thread) thread.innerHTML = "";
    this.activeSession.history = [];
    this.activeSession.llmHistory = [];
    this.activeSession.treesCount = null;
    this.activeSession.acresCount = null;
    this.activeSession.workersCount = null;
    this.activeSession.hasBattery = false;
    this.activeSession.hasGenerator = false;
    this.activeSession.hasNets = false;
    this.activeSession.powerPreference = null;
    this.activeSession.addedShear = false;
    this.activeSession.addedSaw = false;
    this.activeSession.lastIntent = null;
    this.activeSession.currentBundle = [];
    this.activeSession.currentBundleItems = [];
    
    // Reset bottom dock input placeholder to initial welcoming state
    const refineInput = document.getElementById("advisor-refine-input");
    if (refineInput) {
      refineInput.value = "";
      refineInput.placeholder = "Ρωτήστε τον Δημήτρη (π.χ. «έχω 400 δέντρα», «ψάχνω ραβδιστικό carbon»)...";
    }

    // Append greeting message with interactive starter cards
    this.appendBotMessage(`
      <div class="ai-msg-text">
        <strong>Γεια σου! Είμαι ο Δημήτρης, γεωπόνος και ιδιοκτήτης της DP Agron.</strong><br>
        Πες μου για το χωράφι σου (πόσα δέντρα ή στρέμματα έχεις) ή τι εξοπλισμό ψάχνεις (ελαιοραβδιστικό, ψαλίδι κλαδέματος, δίχτυα 100gr, γεννήτρια ή τιμολόγιο με άρθρο 39α χωρίς ΦΠΑ) και θα σου βρω ακριβώς τη λύση που σε συμφέρει.
      </div>
      <div class="ai-welcome-grid">
        <div class="ai-welcome-card" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω πακέτο εξοπλισμού για 400 δέντρα')">
          <div class="ai-welcome-card-icon"><svg class=ico aria-hidden=true><use href=#i-package></use></svg></div>
          <div class="ai-welcome-card-content">
            <div class="ai-welcome-card-title">Υπολογισμός Εξοπλισμού</div>
            <div class="ai-welcome-card-sub">«Πακέτο για 400 δέντρα»</div>
          </div>
        </div>
        <div class="ai-welcome-card" onclick="AIAssistant.handleAdvisorRefine(null, 'Ψάχνω ελαιοραβδιστικό carbon')">
          <div class="ai-welcome-card-icon"><svg class=ico aria-hidden=true><use href=#i-olive></use></svg></div>
          <div class="ai-welcome-card-content">
            <div class="ai-welcome-card-title">Ελαιοραβδιστικά Carbon</div>
            <div class="ai-welcome-card-sub">«Ελαφρύ χωρίς κόπωση»</div>
          </div>
        </div>
        <div class="ai-welcome-card" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω ενισχυμένα δίχτυα 100gr')">
          <div class="ai-welcome-card-icon"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg></div>
          <div class="ai-welcome-card-content">
            <div class="ai-welcome-card-title">Δίχτυα 100gr & Ελαιόπανα</div>
            <div class="ai-welcome-card-sub">«Μονόκλωνα 5ετούς αντοχής»</div>
          </div>
        </div>
        <div class="ai-welcome-card" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω τιμολόγιο χωρίς ΦΠΑ με άρθρο 39α')">
          <div class="ai-welcome-card-icon"><svg class=ico aria-hidden=true><use href=#i-landmark></use></svg></div>
          <div class="ai-welcome-card-content">
            <div class="ai-welcome-card-title">Απαλλαγή ΦΠΑ (Άρθρο 39α)</div>
            <div class="ai-welcome-card-sub">«Τιμολόγιο -24% για αγρότες»</div>
          </div>
        </div>
      </div>
    `, "Γεωπονικός Σύμβουλος &bull; Άμεση Εξυπηρέτηση 24/7");
  },

  appendUserMessage(text) {
    const thread = document.getElementById("advisor-thread");
    if (!thread) return;

    this.activeSession.history.push({ role: "user", text });

    const userRow = document.createElement("div");
    userRow.className = "ai-msg-row user";
    userRow.innerHTML = `
      <div class="ai-user-bubble">
        <div class="ai-user-header">
          <div class="ai-user-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Εσείς</span>
          </div>
          <button type="button" class="ai-user-edit-btn" onclick="AIAssistant.editUserMessage(this)" title="Διόρθωση αυτής της ερώτησης">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>Διόρθωση</span>
          </button>
        </div>
        <div class="ai-user-text">${this.escapeHTML(text)}</div>
      </div>
    `;
    thread.appendChild(userRow);
    this.scrollToBottom();
  },

  editUserMessage(btn) {
    const bubble = btn.closest(".ai-user-bubble");
    if (!bubble) return;
    const textEl = bubble.querySelector(".ai-user-text");
    const text = textEl ? textEl.textContent.trim() : "";
    if (!text) return;

    const input = document.getElementById("advisor-refine-input");
    if (input) {
      input.value = text;
      input.focus();
      input.setSelectionRange(text.length, text.length);
      input.classList.add("ai-input-editing-highlight");
      setTimeout(() => input.classList.remove("ai-input-editing-highlight"), 1400);

      App.showToast("Το κείμενο φορτώθηκε στο πεδίο. Κάντε τις διορθώσεις σας και πατήστε Αποστολή (➔)", "info");

      const bottomDock = document.querySelector(".advisor-bottom-dock");
      if (bottomDock) {
        bottomDock.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  },

  showTypingIndicator() {
    const thread = document.getElementById("advisor-thread");
    if (!thread) return;

    const row = document.createElement("div");
    row.id = "ai-typing-row";
    row.className = "advisor-report-card";
    row.innerHTML = `
      <div class="ai-msg-header" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;">
        <div class="ai-msg-avatar-wrap">
          <div class="ai-msg-avatar">
            <img src="assets/images/advisor_avatar.jpg" alt="Δημήτρης - Γεωπόνος DP Agron" class="ai-avatar-photo">
          </div>
          <span class="ai-pulse-dot"></span>
        </div>
        <div class="ai-msg-header-text">
          <div class="ai-msg-bot-title">Ο Δημήτρης υπολογίζει...</div>
        </div>
        <div class="ai-typing-indicator" style="margin-left: 8px;">
          <span class="ai-typing-dot"></span>
          <span class="ai-typing-dot"></span>
          <span class="ai-typing-dot"></span>
        </div>
      </div>
    `;
    thread.appendChild(row);
    this.scrollToBottom();
  },

  removeTypingIndicator() {
    const el = document.getElementById("ai-typing-row");
    if (el) el.remove();
  },

  scrollToBottom() {
    const thread = document.getElementById("advisor-thread");
    if (thread) {
      setTimeout(() => {
        thread.scrollTo({
          top: thread.scrollHeight,
          behavior: "smooth"
        });
      }, 50);
    }
  },

  /* --------------------------------------------------------------------------
     5. Agronomic Intelligence & Matching Engine
     -------------------------------------------------------------------------- */
  generateAgronomicAdvice(rawQuery) {
    // 1. Auto-correct raw query (Greek STT phonetic mishearings & common agricultural typos)
    const cleanedQuery = this.correctSpeechTranscript(rawQuery);
    const norm = this.normalizeGreek(cleanedQuery);

    // 2. Extract Session Context & Entities (Trees, acres, workers, battery, preferences)
    this.extractSessionEntities(cleanedQuery, norm);

    let responseHTML = "";

    // Multi-turn Intent Evaluators
    const hasOwnGen = /εχω\s+(?:ηδη\s+|δικ[ηο]\s+μου\s+)?(?:γεννητρι|δυναμο)|δικ[ηο]\s+μου\s+(?:γεννητρι|δυναμο)|διαθετω\s+(?:ηδη\s+)?(?:γεννητρι|δυναμο)|εχουμε\s+(?:ηδη\s+)?(?:γεννητρι|δυναμο)|υπαρχει\s+γεννητρι|χωρισ\s+γεννητρι|βγαλ[ετε]+\s+(?:τη[ν]?\s+)?γεννητρι|δεν\s+(?:θελω|χρειαζομαι)\s+γεννητρι|δε\s+χρειαζομαι\s+γεννητρι|μη[ν]?\s+βαλ[ειτεσ]+\s+γεννητρι/i.test(norm) ||
      norm.includes("εχω γεννητρι") || norm.includes("εχω ηδη γεννητρι") || norm.includes("δικη μου γεννητρι") || norm.includes("δικο μου δυναμο") || norm.includes("διαθετω γεννητρι") || norm.includes("εχουμε γεννητρι") || norm.includes("εχουμε ηδη γεννητρι") || norm.includes("εχω δυναμο") || norm.includes("εχω ηδη δυναμο") || norm.includes("χωρισ γεννητρι") || norm.includes("βγαλε τη γεννητρι") || norm.includes("βγαλε γεννητρι") || norm.includes("δεν θελω γεννητρι") || norm.includes("μη βαλεισ γεννητρι");

    const hasOwnBattery = /εχω\s+(?:ηδη\s+|δικ[ηο]\s+μου\s+)?μπαταρι|δικ[ηο]\s+μου\s+μπαταρι|διαθετω\s+(?:ηδη\s+)?μπαταρι|εχουμε\s+(?:ηδη\s+)?μπαταρι|υπαρχει\s+μπαταρι|χωρισ\s+μπαταρι|βγαλ[ετε]+\s+(?:τη[ν]?\s+)?μπαταρι|δεν\s+(?:θελω|χρειαζομαι)\s+μπαταρι|δε\s+χρειαζομαι\s+μπαταρι|μη[ν]?\s+βαλ[ειτεσ]+\s+μπαταρι/i.test(norm) ||
      norm.includes("εχω μπαταρι") || norm.includes("εχω ηδη μπαταρι") || norm.includes("δικη μου μπαταρι") || norm.includes("διαθετω μπαταρι") || norm.includes("εχουμε μπαταρι") || norm.includes("χωρισ μπαταρι") || norm.includes("βγαλε τη μπαταρι") || norm.includes("βγαλε μπαταρι") || norm.includes("δεν θελω μπαταρι");

    const hasOwnNets = /εχω\s+(?:ηδη\s+|δικ[αο]\s+μου\s+)?(?:διχτυ|πανι|ελαιοπαν)|δικ[αο]\s+μου\s+(?:διχτυ|πανι|ελαιοπαν)|διαθετω\s+(?:ηδη\s+)?(?:διχτυ|πανι|ελαιοπαν)|χωρισ\s+(?:διχτυ|πανι|ελαιοπαν)|βγαλ[ετε]+\s+(?:τα\s+)?(?:διχτυ|πανι|ελαιοπαν)|δεν\s+(?:θελω|χρειαζομαι)\s+(?:διχτυ|πανι|ελαιοπαν)/i.test(norm) ||
      norm.includes("εχω διχτυ") || norm.includes("εχω ηδη διχτυ") || norm.includes("δικα μου διχτυ") || norm.includes("χωρισ διχτυ") || norm.includes("βγαλε τα διχτυ") || norm.includes("βγαλε διχτυ") || norm.includes("δεν θελω διχτυ") || norm.includes("εχω πανι") || norm.includes("εχω ηδη πανι");

    // SCORING ENGINE (Solution 3)
    const scores = {
      crew: 0, adjust_bundle: 0, comparison: 0, nets: 0, pruning: 0, 
      chainsaws: 0, harvesters: 0, power: 0, b2b: 0, irrigation: 0, timing: 0, acreage: 0, search: 0
    };

    // 1. Crew
    if ((norm.includes("εργατ") || norm.includes("χειριστ") || norm.includes("ατομ") || norm.includes("συνεργει") || norm.includes("παιδι") || norm.includes("βοηθ") || norm.match(/ποσ[αο]\s+(?:ελαιο)?ραβδιστικ/i) || norm.match(/ποσ[αο]\s+μηχανηματ/i) || norm.match(/ποσ[αο]\s+εργαλει/i)) && !hasOwnGen && !hasOwnBattery && !hasOwnNets) {
      scores.crew += 50;
    }

    // 2. Adjust Bundle
    if (hasOwnGen || hasOwnBattery || hasOwnNets || ((norm.includes("θελω και") || norm.includes("βαλε και") || norm.includes("προσθεσε") || norm.includes("θελω επιπλεον")) && (norm.includes("ψαλιδ") || norm.includes("αλυσοπριον") || norm.includes("πριον")))) {
      scores.adjust_bundle += 60;
    }

    // 3. Comparison
    if (norm.includes("διαφορα") || norm.includes("συγκριση") || norm.includes("καλυτερο") || norm.includes("ποιο να διαλεξω") || (norm.includes("αχινος") && (norm.includes("χτενα") || norm.includes("carbon") || norm.includes("κουπεπε"))) || (norm.includes("vortex") && norm.includes("geotec"))) {
      scores.comparison += 50;
    }

    // 4. Nets
    if ((norm.includes("πανι") || norm.includes("διχτυ") || norm.includes("ελαιοπαν") || norm.includes("σακ") || norm.includes("τελαρ") || norm.includes("λινοτσατσ")) && !hasOwnNets) scores.nets += 40;

    // 5. Pruning
    if (norm.includes("κλαδε") || norm.includes("ψαλιδ") || norm.includes("felco") || norm.includes("volpi") || norm.includes("κοπη") || norm.includes("κλαδευτικ")) scores.pruning += 40;

    // 6. Chainsaws
    if (norm.includes("αλυσοπριον") || norm.includes("πριον") || norm.includes("κονταροπριον") || norm.includes("λαμα") || norm.includes("αλυσιδ")) scores.chainsaws += 40;

    // 7. Harvesters
    if (norm.includes("ραβδιστικ") || norm.includes("ελαιοραβδιστικ") || norm.includes("χτενα") || norm.includes("αχινοσ") || norm.includes("vortex") || norm.includes("geotec") || norm.includes("carbon") || norm.includes("παλμικ") || norm.includes("κουρουνι")) scores.harvesters += 30;

    // 8. Power
    if ((norm.includes("γεννητρι") || norm.includes("μπαταρι") || norm.includes("ρευμα") || norm.includes("δυναμο") || norm.includes("12v") || norm.includes("24v") || norm.includes("φορτιστ")) && !hasOwnGen && !hasOwnBattery) scores.power += 40;

    // 9. B2B
    if (norm.includes("39α") || norm.includes("39a") || norm.includes("φπα") || norm.includes("τιμολογ") || norm.includes("απαλλαγ") || norm.includes("b2b")) scores.b2b += 50;

    // 10. Irrigation
    if (norm.includes("ποτισ") || norm.includes("αρδευσ") || norm.includes("λαστιχ") || norm.includes("νερο") || norm.includes("σταγον")) scores.irrigation += 50;

    // Shared signals: explicit buying intent & explicit grove size
    const hasBuyIntent = /τι\s+(?:πρεπει\s+|να\s+|θα\s+)*(?:παρω|αγορασω|χρειαζομαι|χρειαστω|προτεινεισ|μου\s+προτεινεισ)|τι\s+εξοπλισμ|τι\s+χρειαζ|τι\s+να\s+παρω|τι\s+παιρνω|προτεινε|συμβουλεψ/i.test(norm);
    const hasGroveSize = /\d+\s*(?:δεντρ|δενδρ|ριζ|ελι|ελαι|στρεμμ)/i.test(norm);

    // 10.5 Timing — only dominant when the user asks purely "when", not "what to buy"
    const hasTimingWords = norm.includes("ποτε") || norm.includes("εποχη") || norm.includes("περιοδο") || norm.includes("μηνα") || norm.includes("καιρο");
    if (hasTimingWords) {
      scores.timing += (hasBuyIntent || hasGroveSize) ? 15 : 100;
    }

    // 10.6 Agronomy topics (fertilizer, spraying, planting) — these are care questions, not product
    // searches, so they go to the topic-aware calendar answer. Pruning/irrigation only when asked "when".
    const agroTopic = this.detectAgronomyTopic(norm);
    const isSprayerProductSearch = /ψεκαστικ|ψεκαστηρ|βυτιο/i.test(norm) && !hasTimingWords;
    if (["fertilize", "spraying", "planting"].includes(agroTopic) && !isSprayerProductSearch) {
      scores.timing += hasBuyIntent ? 20 : 130;
    } else if (["pruning", "irrigation"].includes(agroTopic) && hasTimingWords && !hasBuyIntent) {
      scores.timing += 60;
    }

    // 11. Acreage
    if (norm.includes("στρεμμ") || norm.includes("δεντρ") || norm.includes("δενδρ") || norm.includes("ριζ") || norm.includes("μαζεψ") || norm.includes("συγκομιδ") || norm.includes("σοδεια") || norm.includes("ελαιοσυλλογ") || norm.includes("εκτασ") || norm.includes("κτημα") || norm.includes("χωραφ")) {
      scores.acreage += 20; // Base intent, gets overridden by stronger intents
    }
    if (hasGroveSize) scores.acreage += 45;
    if (hasBuyIntent && (hasGroveSize || scores.acreage > 0)) scores.acreage += 35;

    // Resolve Intent
    let maxIntent = "search";
    let maxScore = 0;
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxIntent = intent;
      }
    }

    this.activeSession.lastIntent = maxIntent;

    switch (maxIntent) {
      case "crew": responseHTML = this.buildCrewResponse(norm, cleanedQuery); break;
      case "adjust_bundle": responseHTML = this.buildAdjustBundleResponse(norm, cleanedQuery); break;
      case "comparison": responseHTML = this.buildComparisonResponse(norm, cleanedQuery); break;
      case "nets": responseHTML = this.buildNetsResponse(norm, cleanedQuery); break;
      case "pruning": responseHTML = this.buildPruningResponse(norm, cleanedQuery); break;
      case "chainsaws": responseHTML = this.buildChainsawResponse(norm, cleanedQuery); break;
      case "harvesters": responseHTML = this.buildHarvesterResponse(norm, cleanedQuery); break;
      case "power": responseHTML = this.buildPowerResponse(norm, cleanedQuery); break;
      case "b2b": responseHTML = this.buildB2BResponse(norm, cleanedQuery); break;
      case "irrigation": responseHTML = this.buildIrrigationResponse(norm, cleanedQuery); break;
      case "timing": responseHTML = this.buildTimingResponse(norm, cleanedQuery); break;
      case "acreage": responseHTML = this.buildAcreageResponse(norm, cleanedQuery); break;
      default: responseHTML = this.buildConversationalFallback(norm, cleanedQuery); break;
    }

    this.appendBotMessage(responseHTML);
  },

  /* --------------------------------------------------------------------------
     Helper: Render 1-Click Interactive Bundle Banner
     -------------------------------------------------------------------------- */
  renderBundleBanner(titleContext = "Εξοπλισμού") {
    if (!this.activeSession.currentBundleItems || this.activeSession.currentBundleItems.length === 0) return "";

    let bundlePrice = 0;
    let bundleVatEx = 0;
    let totalItemsCount = 0;

    this.activeSession.currentBundleItems.forEach(item => {
      if (!item.product) return;
      bundlePrice += item.product.price * item.qty;
      const vatEx = item.product.vatExcludedPrice || (item.product.price / 1.24);
      bundleVatEx += vatEx * item.qty;
      totalItemsCount += item.qty;
    });

    if (totalItemsCount === 0) return "";

    return `
      <div class="ai-bundle-banner">
        <div class="ai-bundle-info">
          <span class="ai-bundle-icon"><svg class=ico aria-hidden=true><use href=#i-gift></use></svg></span>
          <div class="ai-bundle-text">
            <strong>Πλήρες Πακέτο ${titleContext}:</strong> ${totalItemsCount} τεμάχια &bull; Σύνολο: <strong>${bundlePrice.toFixed(2)} €</strong><br>
            <span style="font-size: 0.82rem; color: var(--leaf-300);">Τιμή με Απαλλαγή ΦΠΑ (Άρθρο 39α): <strong>${bundleVatEx.toFixed(2)} €</strong> (Όφελος -24%)</span>
          </div>
        </div>
        <button type="button" class="ai-bundle-btn" onclick="AIAssistant.addCurrentBundleToCart()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          <span>Προσθήκη Πακέτου (${totalItemsCount} τμχ)</span>
        </button>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     Intent Builders (Rich Agronomic Advice + Correct Products)
     -------------------------------------------------------------------------- */

  // INTENT: CREW & WORKFORCE ALLOCATION
  buildCrewResponse(norm, rawQuery) {
    const workers = this.activeSession.workersCount || 5;
    const trees = this.activeSession.treesCount;
    const acres = this.activeSession.acresCount || (trees ? Math.round(trees / 25) : null);

    // Agronomic Calculation:
    // 1 harvester operator produces olive drop that requires 1.5 - 2 support workers on nets and crates.
    let harvQty = 2;
    let supportQty = 3;

    if (workers <= 2) {
      harvQty = 1;
      supportQty = Math.max(1, workers - 1);
    } else if (workers === 3) {
      harvQty = 1;
      supportQty = 2;
    } else if (workers === 4) {
      harvQty = 2;
      supportQty = 2;
    } else if (workers === 5) {
      harvQty = 2; // Optimal 2 (max 3)
      supportQty = 3;
    } else if (workers === 6) {
      harvQty = 3;
      supportQty = 3;
    } else {
      harvQty = Math.min(4, Math.floor(workers / 2));
      supportQty = workers - harvQty;
    }

    const harv = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
    const gen = DPAgronData.products.find(p => p.id === "prod-generator-olive-12v");
    const net = DPAgronData.products.find(p => p.id === "prod-olive-net-812") || DPAgronData.products[1];
    const geotec = DPAgronData.products.find(p => p.id === "13");

    // Build or update bundle
    const excludeGen = this.activeSession.hasBattery || this.activeSession.hasGenerator;
    this.activeSession.currentBundleItems = [
      { product: harv, qty: harvQty },
      ...(!excludeGen && gen ? [{ product: gen, qty: 1 }] : []),
      ...(!this.activeSession.hasNets && net ? [{ product: net, qty: 4 }] : [])
    ];
    this.activeSession.currentBundle = this.activeSession.currentBundleItems.map(i => i.product.id);

    const productsToDisplay = [
      harv, 
      !excludeGen ? gen : geotec, 
      !this.activeSession.hasNets ? net : (DPAgronData.products.find(p => p.id === "prod-pruning-shear-40") || null)
    ].filter(Boolean);

    const treesText = trees 
      ? `και με βάση τα <strong>${trees} δέντρα</strong> (~${acres} στρέμματα) που συζητάμε` 
      : `για τη συγκομιδή του ελαιώνα σας`;

    const daysText = trees 
      ? `<br><svg class=ico aria-hidden=true><use href=#i-timer></use></svg> <strong>Εκτίμηση Ολοκλήρωσης:</strong> Με ${harvQty} ραβδιστικά Carbon και ${supportQty} άτομα στα δίχτυα, τα <strong>${trees} δέντρα</strong> σας θα ολοκληρωθούν σε περίπου <strong>${Math.max(3, Math.round(trees / (harvQty * 45)))}-${Math.max(4, Math.round(trees / (harvQty * 35)))} ημέρες</strong>!`
      : '';

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-users></use></svg> <strong>Οργάνωση Συνεργείου ${workers} Εργατών ${trees ? `(για ${trees} Δέντρα)` : ''}:</strong><br>
        Για συνεργείο <strong>${workers} ατόμων</strong> ${treesText}, ο χρυσός κανόνας της ελαιοσυλλογής είναι <strong>1 χειριστής ραβδιστικού προς 1.5 έως 2 άτομα στα δίχτυα</strong>.
      </div>
      <div class="ai-msg-text" style="color: var(--stone-200);">
        <svg class=ico aria-hidden=true><use href=#i-alert></use></svg> <strong>Γιατί ΔΕΝ παίρνουμε ${workers} ραβδιστικά για ${workers} εργάτες:</strong><br>
        Αν πάρουν και οι ${workers} ραβδιστικά, ο καρπός πέφτει στο έδαφος πριν προλάβουν να απλωθούν τα δίχτυα, ποδοπατιέται, και τα πανιά δεν προλαβαίνουν να αδειάσουν.
        <br><br>
        Η ιδανική σύνθεση για την ομάδα σας είναι:
        <br>
        • <strong>${harvQty} (το πολύ 3) Χειριστές</strong> με ελαιοραβδιστικά Carbon (απόδοση ${harvQty * 160}-${harvQty * 200} kg καρπού/ώρα).
        <br>
        • <strong>${supportQty} Εργάτες</strong> στο κυλιόμενο στρώσιμο/μάζεμα διχτυών, το καθάρισμα κλαδιών και το γέμισμα τελάρων.
        ${daysText}
      </div>

      <div class="ai-product-cards-grid">
        ${productsToDisplay.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      ${this.renderBundleBanner(`για Συνεργείο ${workers} Εργατών`)}

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-bulb></use></svg> Θέλετε να προσαρμόσουμε τον εξοπλισμό του συνεργείου;</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου γεννήτρια', 'has_generator')"><svg class=ico aria-hidden=true><use href=#i-settings></use></svg> Έχω ήδη γεννήτρια</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου μπαταρία 12V (χωρίς γεννήτρια)', 'has_battery')"><svg class=ico aria-hidden=true><use href=#i-battery></use></svg> Έχω δική μου μπαταρία 12V</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω και ένα επαγγελματικό ψαλίδι κλαδέματος')"><svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> Προσθήκη Ψαλιδιού 40mm</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Πόσα δίχτυα χρειάζομαι για κυλιόμενο στρώσιμο;')"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> Πόσα δίχτυα χρειάζομαι;</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω τιμολόγιο απαλλαγής ΦΠΑ άρθρο 39α')"><svg class=ico aria-hidden=true><use href=#i-file></use></svg> Έκδοση Τιμολογίου 39α (-24%)</button>
        </div>
      </div>
    `;
  },

  // INTENT: DYNAMIC BUNDLE ADJUSTMENT (Add/remove tools, batteries, generators, nets)
  buildAdjustBundleResponse(norm, rawQuery) {
    const isOwnGen = /εχω\s+(?:ηδη\s+|δικ[ηο]\s+μου\s+)?(?:γεννητρι|δυναμο)|δικ[ηο]\s+μου\s+(?:γεννητρι|δυναμο)|διαθετω\s+(?:ηδη\s+)?(?:γεννητρι|δυναμο)|εχουμε\s+(?:ηδη\s+)?(?:γεννητρι|δυναμο)|υπαρχει\s+γεννητρι|χωρισ\s+γεννητρι|βγαλ[ετε]+\s+(?:τη[ν]?\s+)?γεννητρι|δεν\s+(?:θελω|χρειαζομαι)\s+γεννητρι|δε\s+χρειαζομαι\s+γεννητρι|μη[ν]?\s+βαλ[ειτεσ]+\s+γεννητρι/i.test(norm) ||
      norm.includes("εχω γεννητρι") || norm.includes("εχω ηδη γεννητρι") || norm.includes("δικη μου γεννητρι") || norm.includes("δικο μου δυναμο") || norm.includes("διαθετω γεννητρι") || norm.includes("εχουμε γεννητρι") || norm.includes("εχουμε ηδη γεννητρι") || norm.includes("εχω δυναμο") || norm.includes("εχω ηδη δυναμο") || norm.includes("χωρισ γεννητρι") || norm.includes("βγαλε τη γεννητρι") || norm.includes("βγαλε γεννητρι") || norm.includes("δεν θελω γεννητρι") || norm.includes("μη βαλεισ γεννητρι");

    const isOwnBattery = /εχω\s+(?:ηδη\s+|δικ[ηο]\s+μου\s+)?μπαταρι|δικ[ηο]\s+μου\s+μπαταρι|διαθετω\s+(?:ηδη\s+)?μπαταρι|εχουμε\s+(?:ηδη\s+)?μπαταρι|υπαρχει\s+μπαταρι|χωρισ\s+μπαταρι|βγαλ[ετε]+\s+(?:τη[ν]?\s+)?μπαταρι|δεν\s+(?:θελω|χρειαζομαι)\s+μπαταρι|δε\s+χρειαζομαι\s+μπαταρι|μη[ν]?\s+βαλ[ειτεσ]+\s+μπαταρι/i.test(norm) ||
      norm.includes("εχω μπαταρι") || norm.includes("εχω ηδη μπαταρι") || norm.includes("δικη μου μπαταρι") || norm.includes("διαθετω μπαταρι") || norm.includes("εχουμε μπαταρι") || norm.includes("χωρισ μπαταρι") || norm.includes("βγαλε τη μπαταρι") || norm.includes("βγαλε μπαταρι") || norm.includes("δεν θελω μπαταρι");

    const isOwnNets = /εχω\s+(?:ηδη\s+|δικ[αο]\s+μου\s+)?(?:διχτυ|πανι|ελαιοπαν)|δικ[αο]\s+μου\s+(?:διχτυ|πανι|ελαιοπαν)|διαθετω\s+(?:ηδη\s+)?(?:διχτυ|πανι|ελαιοπαν)|χωρισ\s+(?:διχτυ|πανι|ελαιοπαν)|βγαλ[ετε]+\s+(?:τα\s+)?(?:διχτυ|πανι|ελαιοπαν)|δεν\s+(?:θελω|χρειαζομαι)\s+(?:διχτυ|πανι|ελαιοπαν)/i.test(norm) ||
      norm.includes("εχω διχτυ") || norm.includes("εχω ηδη διχτυ") || norm.includes("δικα μου διχτυ") || norm.includes("χωρισ διχτυ") || norm.includes("βγαλε τα διχτυ") || norm.includes("βγαλε διχτυ") || norm.includes("δεν θελω διχτυ") || norm.includes("εχω πανι") || norm.includes("εχω ηδη πανι");

    const isAddingShear = norm.includes("ψαλιδ");
    const isAddingSaw = norm.includes("αλυσοπριον") || (norm.includes("πριον") && !norm.includes("αποτυπωμα"));

    let msg = "";
    let highlightProducts = [];

    // Ensure we have a base bundle from session if none exists
    if (!this.activeSession.currentBundleItems || this.activeSession.currentBundleItems.length === 0) {
      const harv = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
      const gen = DPAgronData.products.find(p => p.id === "prod-generator-olive-12v");
      const net = DPAgronData.products.find(p => p.id === "prod-olive-net-812") || DPAgronData.products[1];
      const defaultHarvQty = (this.activeSession.workersCount && this.activeSession.workersCount >= 4) ? 2 : 1;
      this.activeSession.currentBundleItems = [
        { product: harv, qty: defaultHarvQty },
        { product: gen, qty: 1 },
        { product: net, qty: 4 }
      ];
    }

    if (isOwnGen) {
      this.activeSession.hasGenerator = true;
      this.activeSession.powerPreference = "generator";
      this.activeSession.currentBundleItems = this.activeSession.currentBundleItems.filter(i => i.product.id !== "prod-generator-olive-12v");

      const workers = this.activeSession.workersCount;
      const harvItem = this.activeSession.currentBundleItems.find(i => i.product.id === "prod-vortex-pro" || i.product.category === "olive-harvesters");
      const harvQty = harvItem ? harvItem.qty : (workers && workers >= 4 ? 2 : 1);

      msg += `
        <div class="ai-msg-text">
          <svg class=ico aria-hidden=true><use href=#i-settings></use></svg> <strong>Αφαιρέθηκε η γεννήτρια από το πακέτο της παραγγελίας σας!</strong><br>
          Εξαιρετικά! Αφού διαθέτετε ήδη δική σας <strong>γεννήτρια / δυναμό</strong>, αφαιρέθηκε άμεσα από την πρόταση, εξοικονομώντας σας <strong>580,00 €</strong>!
        </div>
        <div class="ai-msg-text" style="color: var(--stone-200);">
          ✓ <strong>Πλήρης Συμβατότητα:</strong> Τα επαγγελματικά ελαιοραβδιστικά Carbon που επιλέξατε λειτουργούν άψογα με οποιαδήποτε γεννήτρια 12V-24V ή δυναμό. Περιλαμβάνουν ενισχυμένο καλώδιο σιλικόνης 15m με κροκοδειλάκια βαρέως τύπου για άμεση σύνδεση.
          ${workers ? `<br>✓ Στο πακέτο σας διατηρούνται τα <strong>${harvQty} ραβδιστικά Carbon</strong> και τα <strong>4 ενισχυμένα δίχτυα 100gr</strong> για το συνεργείο των <strong>${workers} εργατών</strong> σας.` : ''}
        </div>
      `;
    } else if (isOwnBattery) {
      this.activeSession.hasBattery = true;
      this.activeSession.powerPreference = "battery";
      this.activeSession.currentBundleItems = this.activeSession.currentBundleItems.filter(i => i.product.id !== "prod-generator-olive-12v");

      msg += `
        <div class="ai-msg-text">
          <svg class=ico aria-hidden=true><use href=#i-battery></use></svg> <strong>Αφαιρέθηκε η γεννήτρια από το πακέτο σας!</strong><br>
          Εφόσον διαθέτετε ήδη δική σας <strong>μπαταρία 12V</strong> (π.χ. αυτοκινήτου ή τρακτέρ), εξοικονομείτε άμεσα <strong>580,00 €</strong>!
        </div>
        <div class="ai-msg-text" style="color: var(--stone-200);">
          ✓ Τα ελαιοραβδιστικά μας συνοδεύονται από <strong>ενισχυμένο καλώδιο σιλικόνης 15 μέτρων με κροκοδειλάκια βαρέως τύπου</strong>, έτοιμα για απευθείας σύνδεση στους πόλους της μπαταρίας σας.
        </div>
      `;
    }

    if (isOwnNets) {
      this.activeSession.hasNets = true;
      this.activeSession.currentBundleItems = this.activeSession.currentBundleItems.filter(i => i.product.id !== "prod-olive-net-812" && i.product.id !== "prod-olive-net-610");

      msg += `
        <div class="ai-msg-text">
          <svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> <strong>Αφαιρέθηκαν τα δίχτυα από το πακέτο σας!</strong><br>
          Εφόσον έχετε ήδη δικά σας ελαιόπανα/δίχτυα, αφαιρέθηκαν από την παραγγελία μειώνοντας το τελικό κόστος.
        </div>
      `;
    }

    if (isAddingShear) {
      this.activeSession.addedShear = true;
      const shear = DPAgronData.products.find(p => p.id === "prod-pruning-shear-40");
      if (shear && !this.activeSession.currentBundleItems.some(i => i.product.id === shear.id)) {
        this.activeSession.currentBundleItems.push({ product: shear, qty: 1 });
      }
      if (shear && !highlightProducts.some(p => p.id === shear.id)) highlightProducts.push(shear);

      msg += `
        <div class="ai-msg-text">
          <svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> <strong>Προστέθηκε το Ψαλίδι Κλαδέματος Μπαταρίας 40mm στο πακέτο!</strong><br>
          Ιδανική προσθήκη: Κατά τη συγκομιδή, ένα μέλος του συνεργείου μπορεί να κλαδεύει παράλληλα τα λαίμαργα και ξερά κλαδιά, αυξάνοντας τη φωτεινότητα και την απόδοση της επόμενης χρονιάς.
        </div>
      `;
    }

    if (isAddingSaw) {
      this.activeSession.addedSaw = true;
      const saw = DPAgronData.products.find(p => p.id === "prod-mini-chainsaw-8");
      if (saw && !this.activeSession.currentBundleItems.some(i => i.product.id === saw.id)) {
        this.activeSession.currentBundleItems.push({ product: saw, qty: 1 });
      }
      if (saw && !highlightProducts.some(p => p.id === saw.id)) highlightProducts.push(saw);

      msg += `
        <div class="ai-msg-text">
          <svg class=ico aria-hidden=true><use href=#i-axe></use></svg> <strong>Προστέθηκε το Mini Αλυσοπρίονο Μπαταρίας 8'' στο πακέτο!</strong><br>
          Για τα χοντρά κλαδιά και τους παλιούς κορμούς που δεν κόβονται με το ψαλίδι. Ελαφρύ (1.35kg) με αυτόματη λίπανση και 2 μπαταρίες 21V.
        </div>
      `;
    }

    // Refresh bundle IDs
    this.activeSession.currentBundle = this.activeSession.currentBundleItems.map(i => i.product.id);

    // Products to show in cards grid: only the remaining items in the bundle (never the removed generator!)
    highlightProducts = this.activeSession.currentBundleItems.map(i => i.product).slice(0, 3);

    // If highlight products is empty, show default harvester
    if (highlightProducts.length === 0) {
      const fallbackHarv = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
      if (fallbackHarv) highlightProducts.push(fallbackHarv);
    }

    const bundleContext = this.activeSession.hasGenerator
      ? "Προσαρμοσμένου Εξοπλισμού (με δική σας γεννήτρια)"
      : (this.activeSession.hasBattery ? "Προσαρμοσμένου Εξοπλισμού (με δική σας μπαταρία)" : "Προσαρμοσμένου Εξοπλισμού");

    return `
      ${msg}
      <div class="ai-product-cards-grid">
        ${highlightProducts.map(p => this.renderChatProductCard(p)).join("")}
      </div>
      ${this.renderBundleBanner(bundleContext)}
      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-bulb></use></svg> Επόμενες ενέργειες για το προσαρμοσμένο πακέτο:</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.addCurrentBundleToCart()"><svg class=ico aria-hidden=true><use href=#i-cart></use></svg> Προσθήκη Όλου του Πακέτου στο Καλάθι</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω τιμολόγιο απαλλαγής ΦΠΑ 39α')"><svg class=ico aria-hidden=true><use href=#i-file></use></svg> Τιμολόγιο χωρίς ΦΠΑ (39α)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω και ένα επαγγελματικό ψαλίδι κλαδέματος')"><svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> Προσθήκη Ψαλιδιού 40mm</button>
          <button type="button" class="ai-followup-pill" onclick="App.navigateTo('cart')">Προβολή Καλαθιού &rarr;</button>
        </div>
      </div>
    `;
  },

  // INTENT: COMPARISON (Carbon vs Hedgehog/Spike vs Comb)
  buildComparisonResponse(norm, rawQuery) {
    const harvCarbon = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
    const harvSpike = DPAgronData.products.find(p => p.id === "prod-harvester-hedgehog") || DPAgronData.products[1];
    const geotec = DPAgronData.products.find(p => p.id === "13");

    const compareList = [harvCarbon, harvSpike, geotec].filter(Boolean);

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-scale></use></svg> <strong>Γεωπονική Σύγκριση Κεφαλών Ελαιοραβδιστικών:</strong><br>
        Η επιλογή της κατάλληλης κεφαλής εξαρτάται από την ποικιλία της ελιάς και το πόσο πυκνό είναι το φύλλωμα των δέντρων σας:
      </div>
      <div class="ai-msg-text" style="color: var(--stone-200);">
        1. <svg class=ico aria-hidden=true><use href=#i-olive></use></svg> <strong>Κεφαλή Carbon (Ανθρακονήματα) - π.χ. Vortex Pro / Geotec:</strong><br>
        • <strong>Ιδανικό για:</strong> Κορωνέικη, Λιανολιά, Χονδροελιά.<br>
        • <strong>Πλεονέκτημα:</strong> Τα ανθρακονήματα διεισδύουν χωρίς αντίσταση στο εσωτερικό του δέντρου χωρίς να πληγώνουν τους νεαρούς βλαστούς και τα «μάτια» της επόμενης χρονιάς. Μηδενική φυλλόπτωση, εξαιρετικά ελαφρύ.
        <br><br>
        2. <svg class=ico aria-hidden=true><use href=#i-burst></use></svg> <strong>Κεφαλή Αχινός / Αγκινάρα (π.χ. Lisam / Spike Pro):</strong><br>
        • <strong>Ιδανικό για:</strong> Επιτραπέζια ελιά (Καλαμών), άγρια δέντρα και πολύ πυκνή βλάστηση.<br>
        • <strong>Πλεονέκτημα:</strong> Ρίχνει γρήγορα τον καρπό με περιστροφική κίνηση, αλλά απαιτεί εμπειρία στις στροφές για να μην τραυματίζει τον φλοιό.
        <br><br>
        3. <svg class=ico aria-hidden=true><use href=#i-comb></use></svg> <strong>Κλασική Χτένα (Κουπεπέ):</strong><br>
        • Παραδοσιακή οικονομική λύση, αλλά προκαλεί περισσότερη κόπωση στους ώμους και αυξημένη πτώση φύλλων σε σχέση με το Carbon.
      </div>

      <div class="ai-product-cards-grid">
        ${compareList.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-target></use></svg> Ποια ποικιλία ελιάς έχετε στο χωράφι σας;</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω Κορωνέικη λαδοελιά')"><svg class=ico aria-hidden=true><use href=#i-olive></use></svg> Κορωνέικη (Λαδοελιά)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω Καλαμών επιτραπέζια')"><svg class=ico aria-hidden=true><use href=#i-olive></use></svg> Καλαμών (Επιτραπέζια)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω Χονδροελιά / Αγρινίου')"><svg class=ico aria-hidden=true><use href=#i-tree></use></svg> Χονδροελιά / Αγρινίου</button>
        </div>
      </div>
    `;
  },

  // INTENT 1: NETS & TARPS
  buildNetsResponse(norm, rawQuery) {
    const net812 = DPAgronData.products.find(p => p.id === "prod-olive-net-812") || DPAgronData.products.find(p => p.category === "nets-storage");
    const net610 = DPAgronData.products.find(p => p.id === "prod-olive-net-610") || net812;

    const recommended = [net812, net610].filter(Boolean);
    const trees = this.activeSession.treesCount;
    const workers = this.activeSession.workersCount;

    let contextLead = "";
    if (trees) {
      contextLead = `Για τα <strong>${trees} δέντρα</strong> σας (~${this.activeSession.acresCount || Math.round(trees/25)} στρέμματα) ${workers ? `και το συνεργείο <strong>${workers} ατόμων</strong>` : ''}:`;
    } else {
      contextLead = `Για τη συγκομιδή της ελιάς:`;
    }

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> <strong>Υπολογισμός & Πρόταση για Δίχτυα 100gr/m²:</strong><br>
        ${contextLead} Συνιστούμε αποκλειστικά <strong>ενισχυμένο μονόκλωνο (monofilament) 100gr/m² με 100% παρθένο πολυαιθυλένιο (HDPE)</strong>.
      </div>
      <div class="ai-msg-text" style="color: var(--stone-200);">
        ✓ <strong>Η τεχνική του Κυλιόμενου Στρωσίματος (Rolling Harvest):</strong><br>
        Δεν χρειάζεται να απλώσετε δίχτυα σε όλο το χωράφι ταυτόχρονα! Χρειάζεστε <strong>4 έως 6 ενισχυμένα δίχτυα 8x12m</strong>:
        <br>
        • <strong>2 δίχτυα</strong> στρωμένα κάτω από τα δέντρα που ραβδίζονται αυτή τη στιγμή.
        <br>
        • <strong>2 δίχτυα</strong> στρωμένα εκ των προτέρων στα επόμενα 2 δέντρα (έτσι οι χειριστές προχωρούν χωρίς λεπτό διακοπής!).
        <br>
        • <strong>2 δίχτυα</strong> που μαζεύονται και αδειάζουν τον καρπό στα τελάρα.
        <br><br>
        ✓ <strong>Γιατί 8x12m 100gr:</strong> Καλύπτει 2 δέντρα ταυτόχρονα, δεν σκίζεται σε αγκάθια ή κοφτερές πέτρες και αντέχει τουλάχιστον 5 σεζόν με προστασία UV.
      </div>

      <div class="ai-product-cards-grid">
        ${recommended.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question">
          <svg class=ico aria-hidden=true><use href=#i-ruler></use></svg> <strong>Ποιες διαστάσεις ταιριάζουν στο δικό σας χωράφι;</strong>
        </div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι 4x δίχτυα 8x12m για κυλιόμενο στρώσιμο', 'net_812')">4x 8x12m (Κυλιόμενο Στρώσιμο)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι 6x10m για μικρότερα δέντρα', 'net_610')">6x10m (Ευέλικτο/Ελαφρύ)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι 10x14m για αιωνόβια δέντρα', 'net_1014')">10x14m (Μεγάλα δέντρα)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Πόσα ραβδιστικά χρειάζομαι;')"><svg class=ico aria-hidden=true><use href=#i-olive></use></svg> Πόσα ραβδιστικά χρειάζομαι;</button>
        </div>
      </div>
    `;
  },

  // INTENT 2: HARVESTERS (Carbon & Pulsating)
  buildHarvesterResponse(norm, rawQuery) {
    const geotec = DPAgronData.products.find(p => p.id === "13") || DPAgronData.products[0];
    const vortex = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || geotec;

    const recommended = [vortex, geotec].filter(Boolean);
    this.activeSession.currentBundle = recommended.map(p => p.id);

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-olive></use></svg> <strong>Κορυφαία Ελαιοραβδιστικά Σεζόν 2026:</strong><br>
        Το μυστικό για γρήγορο ράβδισμα χωρίς φυλλόπτωση είναι η <strong>κεφαλή με ράβδους Carbon (ανθρακόνημα)</strong> και το ισχυρό μοτέρ συνεχούς λειτουργίας.
      </div>
      <div class="ai-msg-text" style="color: var(--stone-200);">
        ✓ <strong>Πλεονέκτημα Carbon:</strong> Τα ανθρακονήματα διεισδύουν βαθιά στο φύλλωμα χωρίς να σπάνε τους νέους βλαστούς και τα «μάτια» της επόμενης χρονιάς.
      </div>

      <div class="ai-product-cards-grid">
        ${recommended.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question">
          <svg class=ico aria-hidden=true><use href=#i-zap></use></svg> <strong>Τι τροφοδοσία θα χρησιμοποιήσετε στο χωράφι;</strong>
        </div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου γεννήτρια', 'has_generator')"><svg class=ico aria-hidden=true><use href=#i-settings></use></svg> Έχω ήδη δική μου γεννήτρια</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω δική μου μπαταρία 12V αυτοκινήτου', 'has_battery')"><svg class=ico aria-hidden=true><use href=#i-battery></use></svg> Έχω δική μου μπαταρία 12V</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι γεννήτρια για 2+ ραβδιστικά', 'need_gen')"><svg class=ico aria-hidden=true><use href=#i-settings></use></svg> Χρειάζομαι γεννήτρια (για 2+ ραβδιστικά)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Προτιμώ μπαταρία πλάτης λιθίου', 'need_backpack')"><svg class=ico aria-hidden=true><use href=#i-backpack></use></svg> Μπαταρία Πλάτης Λιθίου</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Χρειάζομαι και δίχτυα για τις ελιές')"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> Προσθήκη Διχτυών</button>
        </div>
      </div>
    `;
  },

  // INTENT 3: PRUNING & SHEARS
  buildPruningResponse(norm, rawQuery) {
    const volpi = DPAgronData.products.find(p => p.id === "prod-pruning-shear-40") || DPAgronData.products.find(p => p.category === "pruning-cutting");
    const felco = DPAgronData.products.find(p => p.id === "prod-felco-822") || volpi;

    const recommended = [volpi, felco].filter(Boolean);
    this.activeSession.currentBundle = recommended.map(p => p.id);

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> <strong>Επαγγελματικά Ψαλίδια Κλαδέματος Μπαταρίας:</strong><br>
        Για το κλάδεμα της ελιάς, η <strong>καθαρή και προοδευτική κοπή</strong> είναι θεμελιώδης για να μην πληγώνεται ο κορμός και να αποτρέπονται μυκητολογικές μολύνσεις (όπως η βακτηρίωση).
      </div>
      <div class="ai-msg-text" style="color: var(--stone-200);">
        ✓ <strong>Αυτονομία 8 ωρών:</strong> Συνοδεύονται από 2 μπαταρίες λιθίου και λεπίδες τιτανίου SK5 που κόβουν κλαδιά έως 40mm-45mm σαν βούτυρο.
      </div>

      <div class="ai-product-cards-grid">
        ${recommended.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question">
          <svg class=ico aria-hidden=true><use href=#i-tree></use></svg> <strong>Έχετε ψηλά δέντρα ή δουλεύετε μόνο από το έδαφος;</strong>
        </div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ψηλά δέντρα και θέλω κοντάρι προέκτασης', 'high_trees')"><svg class=ico aria-hidden=true><use href=#i-extend></use></svg> Θέλω κοντάρι προέκτασης (1.5m - 2.1m)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι και μικρό αλυσοπρίονο για χοντρά κλαδιά', 'need_mini_saw')"><svg class=ico aria-hidden=true><use href=#i-axe></use></svg> Χρειάζομαι και Mini Αλυσοπρίονο</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Θέλω ανταλλακτικές λεπίδες Felco/Volpi', 'need_blades')"><svg class=ico aria-hidden=true><use href=#i-axe></use></svg> Ανταλλακτικές Λεπίδες SK5</button>
        </div>
      </div>
    `;
  },

  // INTENT 4: CHAINSAWS
  buildChainsawResponse(norm, rawQuery) {
    const mini = DPAgronData.products.find(p => p.id === "prod-mini-chainsaw-8") || DPAgronData.products.find(p => p.category === "pruning-cutting");
    const stihl = DPAgronData.products.find(p => p.id === "prod-stihl-ms170") || mini;

    const recommended = [mini, stihl].filter(Boolean);
    this.activeSession.currentBundle = recommended.map(p => p.id);

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-axe></use></svg> <strong>Αλυσοπρίονα Κλαδέματος & Κοπής:</strong><br>
        Για τα χοντρά λαίμαργα κλαδιά και την περιποίηση των δέντρων, το <strong>Mini Αλυσοπρίονο Μπαταρίας 8 ιντσών</strong> προσφέρει ευελιξία με το ένα χέρι και αυτόματη λίπανση.
      </div>
      <div class="ai-product-cards-grid">
        ${recommended.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-bulb></use></svg> Χρειάζεστε αναλώσιμα για το αλυσοπρίονο;</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι βιοδιασπώμενο λάδι αλυσίδας 5L', 'need_chain_oil')"><svg class=ico aria-hidden=true><use href=#i-drop></use></svg> Βιοδιασπώμενο Λάδι Αλυσίδας</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Χρειάζομαι προστατευτικά γάντια εργασίας', 'need_gloves')"><svg class=ico aria-hidden=true><use href=#i-hand></use></svg> Επαγγελματικά Γάντια Stihl</button>
        </div>
      </div>
    `;
  },

  // INTENT 5: POWER & GENERATORS
  buildPowerResponse(norm, rawQuery) {
    const gen = DPAgronData.products.find(p => p.id === "prod-generator-olive-12v") || DPAgronData.products.find(p => p.category === "power-batteries");
    const battery = DPAgronData.products.find(p => p.id === "prod-pellenc-power-ulib") || gen;

    const recommended = [gen, battery].filter(Boolean);
    this.activeSession.currentBundle = recommended.map(p => p.id);

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-zap></use></svg> <strong>Αυτόνομη Ενέργεια & Γεννήτριες Ελαιοσυλλογής:</strong><br>
        Αν δουλεύετε με 2 ή περισσότερα ραβδιστικά, η <strong>αυτόνομη γεννήτρια 7.0HP με δυναμό 70A</strong> παρέχει σταθερή τάση 12V-24V χωρίς επικίνδυνες διακυμάνσεις για την ηλεκτρονική πλακέτα των μηχανημάτων.
      </div>
      <div class="ai-product-cards-grid">
        ${recommended.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-users></use></svg> Πόσα άτομα θα δουλεύουν ταυτόχρονα στο χωράφι;</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Θα δουλεύει 1 άτομο μόνο', 'single_user')">1 άτομο (Προτιμώ μπαταρία πλάτης)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Θα δουλεύουν 2-4 άτομα ταυτόχρονα', 'team_users')">2-4 άτομα (Γεννήτρια με πολλαπλές πρίζες)</button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     Helper: Clarifying Question when grove size is unknown
     -------------------------------------------------------------------------- */
  buildGroveClarificationResponse() {
    return `
      <div class="ai-msg-text">
        <svg class="ico" aria-hidden="true"><use href="#i-tree"></use></svg> <strong>Με το καλό να ξεκινήσετε τη φετινή συγκομιδή!</strong><br>
        Είμαι ο <strong>Δημήτρης</strong> και ως γεωπόνος δεν θέλω να σας προτείνω στην τύχη μηχανήματα ούτε να κάνετε περιττά έξοδα. Για να υπολογίσουμε ακριβώς τι χρειάζεστε για άνετο, γρήγορο και ξεκούραστο λιομάζωμα:
        <ul style="margin: 8px 0 0 18px; padding: 0; line-height: 1.6;">
          <li><strong>Πόσα δέντρα</strong> ή πόσα <strong>στρέμματα</strong> υπολογίζετε να μαζέψετε φέτος;</li>
          <li><strong>Έχετε ήδη κάποια πηγή ρεύματος</strong> (π.χ. γεννήτρια 12V ή μπαταρία), ή ξεκινάτε από το μηδέν;</li>
        </ul>
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class="ico" aria-hidden="true"><use href="#i-target"></use></svg> Επιλέξτε μέγεθος ελαιώνα ή υφιστάμενο εξοπλισμό:</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω έως 50 δέντρα')"><svg class="ico" aria-hidden="true"><use href="#i-tree"></use></svg> Έως 50 δέντρα (~2 στρ.)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω 100 δέντρα')"><svg class="ico" aria-hidden="true"><use href="#i-tree"></use></svg> 100 δέντρα (~4 στρ.)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω 200 δέντρα')"><svg class="ico" aria-hidden="true"><use href="#i-tree"></use></svg> 200 δέντρα (~8 στρ.)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Έχω 400+ δέντρα')"><svg class="ico" aria-hidden="true"><use href="#i-tree"></use></svg> 400+ δέντρα (επαγγελματίας)</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου γεννήτρια', 'has_generator')"><svg class="ico" aria-hidden="true"><use href="#i-settings"></use></svg> Έχω ήδη γεννήτρια</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου μπαταρία 12V', 'has_battery')"><svg class="ico" aria-hidden="true"><use href="#i-battery"></use></svg> Έχω μπαταρία 12V</button>
        </div>
      </div>
    `;
  },

  // INTENT 6: ACREAGE & FULL HARVEST PACKAGE
  buildAcreageResponse(norm, rawQuery) {
    const hasTrees = /δεντρ|δενδρ|ριζ|\d+\s*ελι|\d+\s*ελαι/i.test(norm);
    const hasTimingWords = /ποτε|εποχη|περιοδο|μηνα|καιρο|εβδομαδ|αυριο/i.test(norm);
    const hasAcres = /στρεμμ/i.test(norm);
    const numbers = rawQuery.match(/\d+/g);
    const num = numbers ? parseInt(numbers[0], 10) : null;

    let treesCount = 0;
    let acresCount = 0;
    let titleContext = "";

    if (num !== null) {
      if (hasTrees && !hasAcres) {
        treesCount = num;
        acresCount = Math.max(1, Math.round(num / 25));
        titleContext = `για ${treesCount} Δέντρα (~${acresCount} Στρέμματα)`;
      } else if (hasAcres && !hasTrees) {
        acresCount = num;
        treesCount = acresCount * 25;
        titleContext = `για ${acresCount} Στρέμματα (~${treesCount} Δέντρα)`;
      } else if (num <= 25) {
        acresCount = num;
        treesCount = acresCount * 25;
        titleContext = `για ${acresCount} Στρέμματα (~${treesCount} Δέντρα)`;
      } else {
        treesCount = num;
        acresCount = Math.max(1, Math.round(num / 25));
        titleContext = `για ${treesCount} Δέντρα (~${acresCount} Στρέμματα)`;
      }
      this.activeSession.treesCount = treesCount;
      this.activeSession.acresCount = acresCount;
    } else if (this.activeSession.treesCount) {
      treesCount = this.activeSession.treesCount;
      acresCount = this.activeSession.acresCount || Math.max(1, Math.round(treesCount / 25));
      titleContext = `για ${treesCount} Δέντρα (~${acresCount} Στρέμματα)`;
    } else if (this.activeSession.acresCount) {
      acresCount = this.activeSession.acresCount;
      treesCount = acresCount * 25;
      this.activeSession.treesCount = treesCount;
      titleContext = `για ${acresCount} Στρέμματα (~${treesCount} Δέντρα)`;
    } else {
      // User has not stated grove size yet — ask a clarifying question!
      return this.buildGroveClarificationResponse();
    }

    const harv = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
    const net = DPAgronData.products.find(p => p.id === "prod-olive-net-812") || DPAgronData.products[1];
    const hasExistingPower = this.activeSession.hasBattery || this.activeSession.hasGenerator;
    const shear = DPAgronData.products.find(p => p.id === "prod-pruning-shear-40");
    const gen = (!hasExistingPower && (treesCount >= 80 || acresCount >= 3))
      ? DPAgronData.products.find(p => p.id === "prod-generator-olive-12v")
      : (shear || null);

    const packageProducts = [
      harv, 
      !this.activeSession.hasNets ? net : null, 
      !hasExistingPower && gen && gen.id === "prod-generator-olive-12v" ? gen : shear
    ].filter(Boolean);

    // Dynamic equipment quantities based on grove size
    let harvQty = 1;
    let netQty = 2;
    let genQty = 1;

    if (treesCount >= 200) {
      harvQty = 2;
      netQty = 4;
      genQty = 1;
    } else if (treesCount >= 80) {
      harvQty = 1;
      netQty = 3;
      genQty = 1;
    }

    this.activeSession.currentBundleItems = [
      { product: harv, qty: harvQty },
      ...(!this.activeSession.hasNets && net ? [{ product: net, qty: netQty }] : []),
      ...(!hasExistingPower && gen && gen.id === "prod-generator-olive-12v" ? [{ product: gen, qty: genQty }] : []),
      ...(hasExistingPower && shear ? [{ product: shear, qty: 1 }] : [])
    ].filter(i => i.product);

    this.activeSession.currentBundle = this.activeSession.currentBundleItems.map(i => i.product.id);

    const crewAdvice = (treesCount >= 200)
      ? `Για <strong>${treesCount} δέντρα</strong> υπολογίζουμε επαγγελματικό συνεργείο <strong>2 χειριστών</strong> ώστε η συγκομιδή να ολοκληρωθεί άνετα σε 6-8 ημέρες:`
      : `Υπολογίσαμε τις ανάγκες σας για μέγιστη ταχύτητα και άνεση στη συγκομιδή:`;

    const item1Desc = (harvQty > 1)
      ? `<strong>${harvQty}x Ελαιοραβδιστικά Carbon</strong> (απόδοση 160-200 kg/ώρα ανά χειριστή, μηδενική κόπωση)`
      : `<strong>1x Ελαιοραβδιστικό Carbon</strong> (απόδοση 160-200 kg/ώρα χωρίς κόπωση)`;

    const item2Desc = !this.activeSession.hasNets
      ? `<strong>${netQty}x Ενισχυμένα Δίχτυα 8x12m 100gr</strong> (εναλλασσόμενο στρώσιμο σε ${netQty >= 4 ? '4 δέντρα' : '2 δέντρα'} χωρίς καθυστέρηση)`
      : `<strong>Δικά σας Δίχτυα / Ελαιόπανα</strong> (χρήση του υφιστάμενου εξοπλισμού σας)`;

    const item3Desc = (!hasExistingPower && gen && gen.id === "prod-generator-olive-12v")
      ? `<strong>1x Επαγγελματική Γεννήτρια 7.0HP / 70A</strong> (ταυτόχρονη σταθερή τροφοδοσία ${harvQty > 1 ? 'και των 2 ραβδιστικών' : 'όλη μέρα'})`
      : (this.activeSession.hasGenerator 
          ? `<strong>Δική σας Γεννήτρια / Δυναμό</strong> (άμεση σύνδεση με τα περιλαμβανόμενα καλώδια σιλικόνης & κροκοδειλάκια)`
          : (this.activeSession.hasBattery 
              ? `<strong>Δική σας Μπαταρία 12V</strong> (σύνδεση με καλώδια σιλικόνης 15m)`
              : `<strong>1x Ψαλίδι Κλαδέματος Μπαταρίας 40mm</strong> (για παράλληλο καθαρισμό δέντρων)`));

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-package></use></svg> <strong>Ολοκληρωμένο Πακέτο Εξοπλισμού ${titleContext}:</strong><br>
        ${crewAdvice}
      </div>
      ${hasTimingWords ? `<div class="ai-msg-text" style="color: var(--stone-200);"><svg class=ico aria-hidden=true><use href=#i-timer></use></svg> <strong>Για το χρονοδιάγραμμα σας:</strong> Προλαβαίνετε άνετα — η παράδοση γίνεται σε 1-3 εργάσιμες. Παραγγείλετε τουλάχιστον μία εβδομάδα πριν, ώστε να φορτίσετε και να δοκιμάσετε τον εξοπλισμό.</div>` : ""}
      <div class="ai-msg-text" style="color: var(--stone-200);">
        1. ${item1Desc}<br>
        2. ${item2Desc}<br>
        3. ${item3Desc}
      </div>

      <div class="ai-product-cards-grid">
        ${packageProducts.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      ${this.renderBundleBanner(titleContext)}

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-help></use></svg> Θέλετε να προσαρμόσουμε το πακέτο;</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου γεννήτρια', 'has_generator')"><svg class=ico aria-hidden=true><use href=#i-settings></use></svg> Έχω ήδη γεννήτρια</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleFollowUpClick('Έχω ήδη δική μου μπαταρία 12V', 'has_battery')"><svg class=ico aria-hidden=true><use href=#i-battery></use></svg> Έχω ήδη μπαταρία 12V</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Πόσα δίχτυα χρειάζομαι για ' + '${treesCount}' + ' δέντρα;')">Πόσα δίχτυα χρειάζομαι;</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω τιμολόγιο απαλλαγής ΦΠΑ 39α')"><svg class=ico aria-hidden=true><use href=#i-file></use></svg> Έκδοση Τιμολογίου 39α</button>
        </div>
      </div>
    `;
  },

  // INTENT 7: B2B & ARTICLE 39a TAX EXEMPTION
  buildB2BResponse(norm, rawQuery) {
    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-landmark></use></svg> <strong>Τιμολόγιο με Απαλλαγή ΦΠΑ (Άρθρο 39α Κώδικα ΦΠΑ):</strong><br>
        Ως επαγγελματίας αγρότης ή αγροτική επιχείρηση (κανονικό καθεστώς), δικαιούστε <strong>άμεση απαλλαγή του ΦΠΑ 24%</strong> στην αγορά ελαιοραβδιστικών, ψαλιδιών και αγροτικών μηχανημάτων!
      </div>
      <div class="ai-msg-text" style="color: var(--stone-200);">
        ✓ <strong>Πώς λειτουργεί:</strong> Κατά το Checkout εισάγετε το ΑΦΜ σας. Το σύστημά μας επαληθεύει μέσω ΑΑΔΕ το δικαίωμα απαλλαγής και αφαιρεί αυτόματα το 24% από την αξία της παραγγελίας σας!
      </div>
      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-briefcase></use></svg> Επόμενα βήματα:</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="App.navigateTo('professionals')">Υπολογιστής B2B & Άρθρο 39α</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω ελαιοραβδιστικό με τιμολόγιο 39α')">Επιλογή Ελαιοραβδιστικού χωρίς ΦΠΑ</button>
          <button type="button" class="ai-followup-pill" onclick="App.navigateTo('shop')">Προβολή Όλων των Επαγγελματικών Μηχανημάτων</button>
        </div>
      </div>
    `;
  },

  // INTENT 8: IRRIGATION
  buildIrrigationResponse(norm, rawQuery) {
    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-drop></use></svg> <strong>Συστήματα Άρδευσης & Σταγόνας:</strong><br>
        Για τον ελαιώνα, η <strong>στάγδην άρδευση με αυτορυθμιζόμενους σταλάκτες</strong> εξοικονομεί 40% νερό και αποτρέπει τη δημιουργία υγρασίας στο λαιμό του δέντρου που προκαλεί μυκητολογικές προσβολές.
      </div>
      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-phone></use></svg> Χρειάζεστε μελέτη άρδευσης από γεωπόνο;</div>
        <div class="ai-followup-actions">
          <a href="tel:2108900000" class="ai-followup-pill">Τηλ. Γεωπόνου: 210 890 0000</a>
          <button type="button" class="ai-followup-pill" onclick="App.navigateTo('contact')">Φόρμα Επικοινωνίας</button>
        </div>
      </div>
    `;
  },

  // Agronomic topic detection for calendar / "is it time to..." questions
  detectAgronomyTopic(norm) {
    if (/λιπα[σνι]|λιπανσ|κοπρια|κομποστ|αζωτ|νιτρικ|θρεψ|βοριο|φωσφορ|καλιο|ουρια/i.test(norm)) return "fertilize";
    if (/ψεκα[σζσ]|ραντι[σζ]|δακο|κυκλοκονι|γλοιοσπορ|χαλκο|χαλκουχ|μυκητ|εντομοκτον|φαρμακ|βερτισιλ|καρκινωσ|ασθενει/i.test(norm)) return "spraying";
    if (/φυτε[υψ]|φυτεμα|μπολια|δενδρυλλ|νεα\s+δεντρ|καινουργια\s+δεντρ/i.test(norm)) return "planting";
    if (/κλαδε|κλαδευ|κλαδεμ/i.test(norm)) return "pruning";
    if (/ποτισ|ποτιζ|αρδευ|νερο/i.test(norm)) return "irrigation";
    if (/μαζεψ|μαζευ|μαζεμα|συγκομιδ|ελαιοσυλλογ|ραβδισ|αγουρελαι/i.test(norm)) return "harvest";
    return null;
  },

  // INTENT 8.5: TIMING — topic-aware & month-aware agronomic calendar
  buildTimingResponse(norm, rawQuery) {
    const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
    const m = new Date().getMonth(); // 0 = Ιανουάριος
    const monthName = MONTHS[m];
    const topic = this.detectAgronomyTopic(norm) || "harvest";
    const inMonths = (arr) => arr.includes(m);

    const verdictBox = (state, text) => {
      const styles = {
        yes: "background: rgba(126, 170, 90, 0.12); border: 1px solid rgba(126, 170, 90, 0.35);",
        partial: "background: rgba(214, 170, 90, 0.12); border: 1px solid rgba(214, 170, 90, 0.35);",
        no: "background: rgba(200, 120, 90, 0.10); border: 1px solid rgba(200, 120, 90, 0.30);"
      };
      const icon = state === "yes" ? "i-check" : (state === "partial" ? "i-timer" : "i-alert");
      return `<div class="ai-msg-text" style="${styles[state]} border-radius: 12px; padding: 12px 14px;"><svg class=ico aria-hidden=true><use href=#${icon}></use></svg> <strong>Τώρα (${monthName}):</strong> ${text}</div>`;
    };

    const pill = (label, query) => `<button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, '${query}')">${label}</button>`;
    const agronomistPill = `<a href="tel:2108900000" class="ai-followup-pill">Τηλ. Γεωπόνου: 210 890 0000</a>`;

    let icon = "i-olive", title = "", verdict = "", body = "", followTitle = "", pills = "";

    switch (topic) {
      case "fertilize": {
        icon = "i-leaf";
        title = "Ημερολόγιο λίπανσης ελιάς";
        if (inMonths([9, 10])) {
          verdict = verdictBox("partial", "Είναι καλή περίοδος για <strong>οργανική λίπανση</strong> (χωνεμένη κοπριά, κομπόστ) και για <strong>φώσφορο & κάλιο</strong>, ιδανικά μετά τις πρώτες βροχές. Το <strong>άζωτο αφήστε το για Φεβρουάριο–Μάρτιο</strong>, γιατί τώρα ξεπλένεται από τις βροχές χωρίς να το αξιοποιήσει το δέντρο.");
        } else if (inMonths([0, 1, 2])) {
          verdict = verdictBox("yes", "Ναι, είναι η <strong>κύρια περίοδος βασικής λίπανσης</strong> με άζωτο, πριν ξεκινήσει η βλάστηση.");
        } else if (inMonths([3, 4])) {
          verdict = verdictBox("partial", "Η βασική λίπανση έπρεπε να έχει γίνει. Τώρα ταιριάζει <strong>διαφυλλικό βόριο</strong> πριν την άνθιση και συμπληρωματικό άζωτο αν τα δέντρα δείχνουν αδύναμα.");
        } else {
          verdict = verdictBox("no", "Δεν είναι η ιδανική περίοδος για βασική λίπανση. Η επόμενη κατάλληλη περίοδος είναι το <strong>φθινόπωρο (οργανική/Φ-Κ)</strong> και ο <strong>Φεβρουάριος–Μάρτιος (άζωτο)</strong>.");
        }
        body = `
          • <strong>Οκτώβριος–Δεκέμβριος:</strong> Κοπριά/κομπόστ και φωσφοροκαλιούχα, μετά τις πρώτες βροχές.<br>
          • <strong>Φεβρουάριος–Μάρτιος:</strong> Βασική αζωτούχος λίπανση (π.χ. σύνθετο 20-10-10), περίπου 1–3 kg ανά ώριμο δέντρο ανάλογα με μέγεθος και παραγωγή.<br>
          • <strong>Απρίλιος:</strong> Διαφυλλικό βόριο πριν την άνθιση για καλύτερη καρπόδεση.<br>
          <span style="color: var(--stone-400); font-size: 0.9em;">Οι ποσότητες είναι ενδεικτικές· η ακριβής δοσολογία βγαίνει από ανάλυση εδάφους/φύλλων.</span>`;
        followTitle = "Θέλετε ακριβή δοσολογία για το χωράφι σας;";
        pills = agronomistPill + pill("Πότε ψεκάζω τις ελιές;", "Πότε ψεκάζω τις ελιές;") + pill("Πότε κλαδεύω;", "Πότε είναι η περίοδος για κλάδεμα;");
        break;
      }
      case "spraying": {
        icon = "i-drop";
        title = "Ημερολόγιο ψεκασμών ελιάς";
        if (inMonths([9, 10])) {
          verdict = verdictBox("yes", "Ναι — μετά τις πρώτες βροχές είναι η σημαντικότερη περίοδος για <strong>χαλκούχο ψεκασμό</strong> κατά του κυκλοκόνιου και του γλοιοσπορίου. Για τον <strong>δάκο</strong>, συνεχίστε την παρακολούθηση με παγίδες μέχρι τη συγκομιδή.");
        } else if (inMonths([5, 6, 7, 8])) {
          verdict = verdictBox("yes", "Ναι — είναι περίοδος <strong>δάκου</strong>. Παρακολουθήστε τις παγίδες και κάντε δολωματικούς ψεκασμούς όταν αυξηθούν οι συλλήψεις.");
        } else if (inMonths([1, 2])) {
          verdict = verdictBox("yes", "Ναι — ανοιξιάτικος <strong>χαλκούχος ψεκασμός</strong> για κυκλοκόνιο, ειδικά αμέσως μετά το κλάδεμα για να κλείσουν οι πληγές.");
        } else {
          verdict = verdictBox("partial", "Δεν είναι κρίσιμη περίοδος ψεκασμού. Ψεκάστε μόνο αν δείτε συμπτώματα ή μετά από κλάδεμα/χαλάζι.");
        }
        body = `
          • <strong>Φεβρουάριος–Μάρτιος:</strong> Χαλκούχο σκεύασμα για κυκλοκόνιο, ιδίως μετά το κλάδεμα.<br>
          • <strong>Ιούνιος–Οκτώβριος:</strong> Δάκος — παγίδες και δολωματικοί ψεκασμοί.<br>
          • <strong>Οκτώβριος–Νοέμβριος:</strong> Χαλκούχος ψεκασμός μετά τις πρώτες βροχές (κυκλοκόνιο, γλοιοσπόριο).<br>
          <span style="color: var(--stone-400); font-size: 0.9em;">Τηρείτε πάντα τις οδηγίες της ετικέτας και το διάστημα αναμονής πριν τη συγκομιδή.</span>`;
        followTitle = "Χρειάζεστε συμβουλή για σκεύασμα;";
        pills = agronomistPill + pill("Πότε λιπαίνω;", "Πότε είναι περίοδος για λίπασμα στις ελιές;") + pill("Πότε μαζεύω;", "Πότε είναι η καλύτερη περίοδος για ελαιοσυλλογή;");
        break;
      }
      case "pruning": {
        icon = "i-scissors";
        title = "Πότε κλαδεύουμε την ελιά";
        if (inMonths([0, 1, 2])) {
          verdict = verdictBox("yes", "Ναι, είναι η <strong>ιδανική περίοδος κλαδέματος</strong>. Αποφύγετε μόνο τις μέρες με παγετό και ψεκάστε με χαλκό μετά.");
        } else if (inMonths([11, 3])) {
          verdict = verdictBox("partial", "Γίνεται, με προσοχή: τον Δεκέμβριο μόνο μετά τη συγκομιδή και σε ήπιες περιοχές, τον Απρίλιο μόνο ελαφρύ κλάδεμα πριν την άνθιση.");
        } else {
          verdict = verdictBox("no", "Όχι ακόμα. Το κύριο κλάδεμα γίνεται <strong>μετά τη συγκομιδή, Ιανουάριο–Μάρτιο</strong>. Τώρα μόνο αφαίρεση λαίμαργων βλαστών.");
        }
        body = `
          • <strong>Ιανουάριος–Μάρτιος:</strong> Κύριο κλάδεμα καρποφορίας και αραίωμα.<br>
          • <strong>Καλοκαίρι:</strong> Μόνο αφαίρεση λαίμαργων/παραφυάδων.<br>
          • Μετά το κλάδεμα: χαλκούχος ψεκασμός για να προστατευτούν οι πληγές.`;
        followTitle = "Εξοπλισμός κλαδέματος:";
        pills = pill("Ψαλίδια Κλαδέματος Μπαταρίας", "Ψαλίδια Κλαδέματος Μπαταρίας") + pill("Κονταροπρίονα", "Θέλω κονταροπρίονο") + pill("Αλυσοπρίονα", "Θέλω αλυσοπρίονο");
        break;
      }
      case "irrigation": {
        icon = "i-drop";
        title = "Πότε ποτίζουμε την ελιά";
        if (inMonths([4, 5, 6, 7, 8])) {
          verdict = verdictBox("yes", "Ναι — είναι η <strong>αρδευτική περίοδος</strong>. Κρίσιμα σημεία: άνθιση/καρπόδεση και Ιούλιος–Σεπτέμβριος για το γέμισμα του καρπού.");
        } else if (inMonths([9])) {
          verdict = verdictBox("partial", "Μόνο αν δεν έχει βρέξει. Ένα πότισμα πριν τη συγκομιδή βοηθά στο γέμισμα του καρπού.");
        } else {
          verdict = verdictBox("no", "Συνήθως όχι — οι χειμερινές βροχές καλύπτουν τις ανάγκες. Ποτίστε μόνο σε παρατεταμένη ξηρασία.");
        }
        body = `
          • <strong>Μάιος–Ιούνιος:</strong> Άνθιση & καρπόδεση — αποφύγετε την έλλειψη νερού.<br>
          • <strong>Ιούλιος–Σεπτέμβριος:</strong> Γέμισμα καρπού, η μεγαλύτερη κατανάλωση νερού.<br>
          • Η στάγδην άρδευση εξοικονομεί έως 40% νερό.`;
        followTitle = "Χρειάζεστε μελέτη άρδευσης;";
        pills = agronomistPill + `<button type="button" class="ai-followup-pill" onclick="App.navigateTo('contact')">Φόρμα Επικοινωνίας</button>`;
        break;
      }
      case "planting": {
        icon = "i-tree";
        title = "Πότε φυτεύουμε ελιές";
        if (inMonths([1, 2, 3])) {
          verdict = verdictBox("yes", "Ναι, είναι η <strong>καλύτερη περίοδος φύτευσης</strong> — έχει περάσει ο κίνδυνος παγετού και το έδαφος έχει υγρασία.");
        } else if (inMonths([9, 10])) {
          verdict = verdictBox("partial", "Σε ήπιες, παραθαλάσσιες περιοχές η φθινοπωρινή φύτευση πετυχαίνει καλά. Σε ορεινές με παγετό, περιμένετε τον Φεβρουάριο.");
        } else {
          verdict = verdictBox("no", "Δεν είναι ιδανική περίοδος. Προτιμήστε <strong>Φεβρουάριο–Απρίλιο</strong> (ή φθινόπωρο σε ήπιες περιοχές).");
        }
        body = `
          • <strong>Φεβρουάριος–Απρίλιος:</strong> Η πιο ασφαλής περίοδος.<br>
          • <strong>Οκτώβριος–Νοέμβριος:</strong> Μόνο σε περιοχές χωρίς παγετό.<br>
          • Το πρώτο καλοκαίρι τα νεαρά δέντρα θέλουν τακτικό πότισμα.`;
        followTitle = "Θέλετε βοήθεια για τη νέα φυτεία;";
        pills = agronomistPill + pill("Πότε λιπαίνω;", "Πότε είναι περίοδος για λίπασμα στις ελιές;");
        break;
      }
      default: {
        icon = "i-olive";
        title = "Η καλύτερη περίοδος για ελαιοσυλλογή";
        if (inMonths([9])) {
          verdict = verdictBox("partial", "Είναι η περίοδος του <strong>αγουρέλαιου</strong> (πρώιμη συγκομιδή). Για μέγιστη απόδοση σε λάδι, περιμένετε από μέσα Νοεμβρίου.");
        } else if (inMonths([10, 11, 0])) {
          verdict = verdictBox("yes", "Ναι, είναι η <strong>κύρια περίοδος ελαιοσυλλογής</strong>.");
        } else {
          verdict = verdictBox("no", "Όχι — η ελαιοσυλλογή ξεκινά από <strong>μέσα Οκτωβρίου</strong>. Είναι όμως καλή στιγμή να οργανώσετε τον εξοπλισμό σας.");
        }
        body = `
          • <strong>Αγουρέλαιο / Πρώιμη συγκομιδή:</strong> Μέσα Οκτωβρίου έως μέσα Νοεμβρίου. Έντονα αρώματα, υψηλές πολυφαινόλες, μικρότερη απόδοση.<br>
          • <strong>Κανονική ελαιοσυλλογή:</strong> Μέσα Νοεμβρίου έως τέλος Δεκεμβρίου. Μέγιστη απόδοση σε ελαιόλαδο.`;
        followTitle = "Εξοπλιστείτε εγκαίρως:";
        pills = pill("Υπολογισμός Ελαιοραβδιστικών", "Πόσα ραβδιστικά χρειάζομαι;") + pill("Πακέτο για 400 δέντρα", "Θέλω πακέτο εξοπλισμού για 400 δέντρα") + `<button type="button" class="ai-followup-pill" onclick="App.navigateTo('shop')">Προβολή Όλων των Επαγγελματικών Μηχανημάτων</button>`;
      }
    }

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#${icon}></use></svg> <strong>${title}:</strong>
      </div>
      ${verdict}
      <div class="ai-msg-text" style="color: var(--stone-200);">
        ${body}
      </div>
      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-package></use></svg> ${followTitle}</div>
        <div class="ai-followup-actions">
          ${pills}
        </div>
      </div>
    `;
  },

  // INTENT 9: SMART CONVERSATIONAL FALLBACK (No random jackets/spare parts)
  buildConversationalFallback(norm, rawQuery) {
    const terms = norm.split(/\s+/).filter(t => t.length >= 3);
    const wantsProtection = /μπουφαν|τζακετ|φορμα|γαλοτσ|μποτ|γαντι|προστασι|ρουχ/i.test(norm);

    let pool = (DPAgronData.products || []);
    if (!wantsProtection) {
      pool = pool.filter(p => p.category !== "protection-workwear" && p.subcategory !== "workwear");
    }

    let matches = pool.filter(p => {
      const pNorm = this.normalizeGreek(p.title + " " + p.brand + " " + (p.category || "") + " " + (p.description || ""));
      return terms.some(t => pNorm.includes(t));
    });

    if (matches.length === 0) {
      // Pick top olive harvest & pruning bestsellers
      const harv = pool.find(p => p.id === "prod-vortex-pro") || pool[0];
      const shear = pool.find(p => p.id === "prod-pruning-shear-40");
      const net = pool.find(p => p.id === "prod-olive-net-812");
      matches = [harv, shear, net].filter(Boolean);
    } else {
      matches = matches.slice(0, 3);
    }

    this.activeSession.currentBundle = matches.map(p => p.id);

    const treesContext = this.activeSession.treesCount 
      ? ` (για τα <strong>${this.activeSession.treesCount} δέντρα</strong> σας)` 
      : '';
    const workersContext = this.activeSession.workersCount 
      ? ` και το συνεργείο των <strong>${this.activeSession.workersCount} ατόμων</strong>` 
      : '';

    return `
      <div class="ai-msg-text">
        <svg class=ico aria-hidden=true><use href=#i-bulb></use></svg> <strong>Σχετικά με το ερώτημά σας${treesContext}${workersContext}:</strong><br>
        Ως γεωπονικός σύμβουλος, σας προτείνω τις παρακάτω αξιόπιστες λύσεις από τον εξειδικευμένο κατάλογο της DP Agron:
      </div>

      <div class="ai-product-cards-grid">
        ${matches.map(p => this.renderChatProductCard(p)).join("")}
      </div>

      <div class="ai-followup-box">
        <div class="ai-followup-question"><svg class=ico aria-hidden=true><use href=#i-target></use></svg> Πώς μπορώ να σας βοηθήσω περαιτέρω;</div>
        <div class="ai-followup-actions">
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Πόσα ελαιοραβδιστικά χρειάζομαι;')"><svg class=ico aria-hidden=true><use href=#i-olive></use></svg> Υπολογισμός Ελαιοραβδιστικών</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Πόσα δίχτυα 100gr χρειάζομαι;')"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> Υπολογισμός Διχτυών</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Ψαλίδια Κλαδέματος Μπαταρίας')"><svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> Ψαλίδια Κλαδέματος</button>
          <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω τιμολόγιο με άρθρο 39α χωρίς ΦΠΑ')"><svg class=ico aria-hidden=true><use href=#i-landmark></use></svg> Απαλλαγή ΦΠΑ (39α)</button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     6. Product Card Rendering inside Chat
     -------------------------------------------------------------------------- */
  renderChatProductCard(p, overrideQty = null) {
    if (!p) return "";
    const imgUrl = App.getProductImage(p);
    const keyAdvantage = (p.keyFeatures && p.keyFeatures[0]) || "Επαγγελματική αντοχή & απόδοση";
    
    let qty = overrideQty || 1;
    if (!overrideQty && this.activeSession && this.activeSession.currentBundleItems) {
      const bItem = this.activeSession.currentBundleItems.find(i => i.product && i.product.id === p.id);
      if (bItem && bItem.qty > 1) {
        qty = bItem.qty;
      }
    }

    const vatEx = p.vatExcludedPrice ? (p.vatExcludedPrice * qty) : ((p.price * qty) / 1.24);
    const totalPrice = p.price * qty;
    
    const qtyBadge = qty > 1 
      ? `<span class="ai-qty-badge">${qty}x Τεμάχια</span>` 
      : (p.originalPrice && p.originalPrice > p.price 
          ? `<span class="ai-discount-badge">-${Math.round((1 - p.price / p.originalPrice) * 100)}%</span>` 
          : '');

    return `
      <div class="ai-card-item">
        ${qtyBadge}
        <div class="ai-card-media" onclick="App.navigateTo('product', '${p.id}')" title="Προβολή λεπτομερειών: ${p.title}">
          <img src="${imgUrl}" alt="${p.title}" loading="lazy">
          <div class="ai-card-media-gradient"></div>
          <span class="ai-card-badge">${p.brand}</span>
          ${p.inStock 
            ? '<span class="ai-stock-badge"><span class="ai-stock-dot"></span>Άμεσα Διαθέσιμο</span>' 
            : '<span class="ai-stock-badge out">Κατόπιν παραγγελίας</span>'}
          <button type="button" class="ai-media-quickview-btn" onclick="event.stopPropagation(); App.openQuickView('${p.id}')" title="Γρήγορη Προβολή">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>Προβολή</span>
          </button>
        </div>
        <div class="ai-card-body">
          <div class="ai-card-cat">
            <span class="ai-cat-brand">${p.brand}</span>
            <span class="ai-cat-dot">&bull;</span>
            <span class="ai-cat-level">${p.usageLevel || 'Επαγγελματική'}</span>
          </div>
          <h4 class="ai-card-title" onclick="App.navigateTo('product', '${p.id}')" title="${p.title}">${p.title}</h4>
          <div class="ai-card-benefit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${keyAdvantage}</span>
          </div>
          <div class="ai-card-pricing">
            <div class="ai-card-price-row">
              <span class="ai-card-price-main">${totalPrice.toFixed(2)} €</span>
              ${p.originalPrice && p.originalPrice > p.price ? `<span class="ai-card-price-orig">${(p.originalPrice * qty).toFixed(2)} €</span>` : ''}
            </div>
            <div class="ai-card-price-vat">
              <span class="ai-vat-badge">Χωρίς ΦΠΑ (39α)</span>
              <strong>${vatEx.toFixed(2)} €</strong>
            </div>
          </div>
          <div class="ai-card-actions">
            <button type="button" class="ai-btn-add" onclick="Store.addToCart('${p.id}', ${qty}); App.showToast('${qty > 1 ? qty + "x " : ""}Το ${this.escapeJS(p.title)} προστέθηκε στο καλάθι!');">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span>+ ${qty > 1 ? qty + ' Στο Καλάθι' : 'Στο Καλάθι'}</span>
            </button>
            <button type="button" class="ai-btn-view" title="Αναλυτικά Χαρακτηριστικά" onclick="App.navigateTo('product', '${p.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     7. Follow-up Click Handling
     -------------------------------------------------------------------------- */
  handleFollowUpClick(userText, intentKey) {
    this.appendUserMessage(userText);
    this.showTypingIndicator();

    setTimeout(() => {
      this.removeTypingIndicator();

      let replyHTML = "";
      if (intentKey === "has_generator") {
        this.activeSession.hasGenerator = true;
        this.activeSession.powerPreference = "generator";
        if (this.activeSession.currentBundleItems && this.activeSession.currentBundleItems.length > 0) {
          this.activeSession.currentBundleItems = this.activeSession.currentBundleItems.filter(i => i.product.id !== "prod-generator-olive-12v");
          this.activeSession.currentBundle = this.activeSession.currentBundleItems.map(i => i.product.id);
        }
        const harv = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
        const net = DPAgronData.products.find(p => p.id === "prod-olive-net-812") || DPAgronData.products[1];
        const displayCards = [harv, net].filter(Boolean);

        replyHTML = `
          <div class="ai-msg-text">
            <svg class=ico aria-hidden=true><use href=#i-settings></use></svg> <strong>Εξαιρετικά! Αφού διαθέτετε ήδη δική σας γεννήτρια / δυναμό:</strong><br>
            Αφαιρέθηκε η γεννήτρια από την πρόταση εξοπλισμού, εξοικονομώντας άμεσα <strong>580,00 €</strong>! Τα ελαιοραβδιστικά Carbon λειτουργούν άψογα με κάθε γεννήτρια 12V-24V ή δυναμό και περιλαμβάνουν καλώδιο 15m με κροκοδειλάκια βαρέως τύπου.
          </div>
          <div class="ai-product-cards-grid">
            ${displayCards.map(p => this.renderChatProductCard(p)).join("")}
          </div>
          ${this.renderBundleBanner("Προσαρμοσμένου Εξοπλισμού (με δική σας γεννήτρια)")}
          <div class="ai-followup-box">
            <div class="ai-followup-actions">
              <button type="button" class="ai-followup-pill" onclick="AIAssistant.addCurrentBundleToCart()"><svg class=ico aria-hidden=true><use href=#i-cart></use></svg> Προσθήκη Πακέτου στο Καλάθι</button>
              <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω τιμολόγιο απαλλαγής ΦΠΑ άρθρο 39α')"><svg class=ico aria-hidden=true><use href=#i-file></use></svg> Τιμολόγιο χωρίς ΦΠΑ (39α)</button>
              <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω και ένα επαγγελματικό ψαλίδι κλαδέματος')"><svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> Προσθήκη Ψαλιδιού 40mm</button>
              <button type="button" class="ai-followup-pill" onclick="App.navigateTo('cart')">Προβολή Καλαθιού &rarr;</button>
            </div>
          </div>
        `;
      } else if (intentKey === "has_battery") {
        this.activeSession.hasBattery = true;
        this.activeSession.powerPreference = "battery";
        if (this.activeSession.currentBundleItems && this.activeSession.currentBundleItems.length > 0) {
          this.activeSession.currentBundleItems = this.activeSession.currentBundleItems.filter(i => i.product.id !== "prod-generator-olive-12v");
          this.activeSession.currentBundle = this.activeSession.currentBundleItems.map(i => i.product.id);
        }
        const harv = DPAgronData.products.find(p => p.id === "prod-vortex-pro") || DPAgronData.products[0];
        replyHTML = `
          <div class="ai-msg-text">
            <svg class=ico aria-hidden=true><use href=#i-battery></use></svg> <strong>Τέλεια! Αφού διαθέτετε δική σας μπαταρία 12V:</strong><br>
            Γλιτώνετε άμεσα το κόστος αγοράς γεννήτριας (580,00 €)! Το ελαιοραβδιστικό συνοδεύεται ήδη από <strong>καλώδιο σιλικόνης 15 μέτρων με κροκοδειλάκια βαρέως τύπου</strong>, έτοιμο για άμεση σύνδεση.
          </div>
          <div class="ai-product-cards-grid">
            ${this.renderChatProductCard(harv)}
          </div>
          ${this.renderBundleBanner("Προσαρμοσμένου Εξοπλισμού (χωρίς γεννήτρια)")}
          <div class="ai-followup-box">
            <div class="ai-followup-actions">
              <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Θέλω και ένα ψαλίδι κλαδέματος')"><svg class=ico aria-hidden=true><use href=#i-scissors></use></svg> Προσθήκη Ψαλιδιού 40mm</button>
              <button type="button" class="ai-followup-pill" onclick="AIAssistant.handleAdvisorRefine(null, 'Πόσα δίχτυα χρειάζομαι;')"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> Πόσα δίχτυα χρειάζομαι;</button>
              <button type="button" class="ai-followup-pill" onclick="App.navigateTo('cart')">Προβολή Καλαθιού &rarr;</button>
            </div>
          </div>
        `;
      } else if (intentKey === "need_gen") {
        const gen = DPAgronData.products.find(p => p.id === "prod-generator-olive-12v");
        replyHTML = `
          <div class="ai-msg-text">
            <svg class=ico aria-hidden=true><use href=#i-settings></use></svg> <strong>Γεννήτρια 7.0HP με Δυναμό 70A:</strong><br>
            Ιδανική για 2 έως 4 ελαιοραβδιστικά ταυτόχρονα. Διαθέτει ανεξάρτητους ρυθμιστές στροφών για κάθε χειριστή και σταθεροποιητή τάσης για προστασία των μοτέρ.
          </div>
          <div class="ai-product-cards-grid">
            ${this.renderChatProductCard(gen)}
          </div>
        `;
      } else if (intentKey === "high_trees") {
        const shear = DPAgronData.products.find(p => p.id === "prod-pruning-shear-40");
        replyHTML = `
          <div class="ai-msg-text">
            <svg class=ico aria-hidden=true><use href=#i-extend></use></svg> <strong>Κλάδεμα σε Ύψος με Ασφάλεια:</strong><br>
            Το ψαλίδι VOLPI δέχεται τηλεσκοπική ράβδο προέκτασης 1.5m - 2.1m. Έτσι κλαδεύετε άνετα από το έδαφος χωρίς σκάλες και επικίνδυνες αναρριχήσεις.
          </div>
          <div class="ai-product-cards-grid">
            ${this.renderChatProductCard(shear)}
          </div>
        `;
      } else if (intentKey === "net_812" || intentKey === "net_610") {
        const net = (intentKey === "net_812")
          ? DPAgronData.products.find(p => p.id === "prod-olive-net-812")
          : DPAgronData.products.find(p => p.id === "prod-olive-net-610");
        replyHTML = `
          <div class="ai-msg-text">
            <svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> <strong>Εξαιρετική Επιλογή!</strong> Το ελαιόπανο monofilament 100gr/m² διαθέτει ενισχυμένο περιμετρικό ρέλι και ανοξείδωτα μπουντούζια σε όλες τις γωνίες για εύκολο τέντωμα.
          </div>
          <div class="ai-product-cards-grid">
            ${this.renderChatProductCard(net)}
          </div>
        `;
      } else {
        replyHTML = `
          <div class="ai-msg-text">
            <svg class=ico aria-hidden=true><use href=#i-check></use></svg> <strong>Καταχωρήθηκε η προτίμησή σας!</strong> Μπορείτε να προσθέσετε το προϊόν στο καλάθι σας ή να ζητήσετε επιπλέον εξοπλισμό.
          </div>
          <div class="ai-followup-box">
            <div class="ai-followup-actions">
              <button type="button" class="ai-followup-pill" onclick="App.navigateTo('shop')">Πλήρης Κατάλογος Εξοπλισμού &rarr;</button>
            </div>
          </div>
        `;
      }

      this.appendBotMessage(replyHTML);
    }, 550);
  },

  /* --------------------------------------------------------------------------
     8. 1-Click Bundle Addition
     -------------------------------------------------------------------------- */
  addCurrentBundleToCart() {
    if (this.activeSession.currentBundleItems && this.activeSession.currentBundleItems.length > 0) {
      let count = 0;
      this.activeSession.currentBundleItems.forEach(item => {
        Store.addToCart(item.product.id, item.qty);
        count += item.qty;
      });
      App.showToast(`Όλα τα προϊόντα του πακέτου (${count} τεμάχια) προστέθηκαν στο καλάθι σας!`, "success");
      return;
    }

    if (!this.activeSession.currentBundle || this.activeSession.currentBundle.length === 0) return;
    
    this.activeSession.currentBundle.forEach(id => {
      Store.addToCart(id, 1);
    });

    App.showToast(`Όλα τα προϊόντα του πακέτου (${this.activeSession.currentBundle.length}) προστέθηκαν στο καλάθι σας!`, "success");
  },

  /* --------------------------------------------------------------------------
     9. Bot Message Appending & DOM Insertion
     -------------------------------------------------------------------------- */
  appendBotMessage(html, badgeText = "Εξειδικευμένη Πρόταση Συγκομιδής &bull; Σεζόν '26") {
    const thread = document.getElementById("advisor-thread");
    if (!thread) return;

    this.activeSession.history.push({ role: "bot", html });

    const card = document.createElement("div");
    card.className = "advisor-report-card";
    card.innerHTML = `
      <div class="ai-msg-header">
        <div class="ai-msg-avatar-wrap">
          <div class="ai-msg-avatar">
            <img src="assets/images/advisor_avatar.jpg" alt="Δημήτρης - Γεωπόνος DP Agron" class="ai-avatar-photo">
          </div>
          <span class="ai-pulse-dot"></span>
        </div>
        <div class="ai-msg-header-text">
          <div class="ai-msg-bot-title">Δημήτρης &bull; Γεωπόνος DP Agron</div>
          <div class="ai-msg-bot-badge">${badgeText}</div>
        </div>
      </div>
      <div class="ai-msg-body">
        ${html}
      </div>
    `;
    thread.appendChild(card);
    
    // Smooth scroll inside thread container directly without displacing window
    setTimeout(() => {
      const userBubble = card.previousElementSibling;
      const target = (userBubble && userBubble.classList.contains("ai-msg-row")) ? userBubble : card;
      const threadTop = thread.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const relativeTop = targetTop - threadTop + thread.scrollTop;
      thread.scrollTo({
        top: Math.max(0, relativeTop - 8),
        behavior: "smooth"
      });
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    }, 70);
  },

  escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  escapeJS(str) {
    return String(str).replace(/'/g, "\\'");
  }
};
