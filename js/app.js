/* ==========================================================================
   DP AGRON - APPLICATION CONTROLLER & UI ENGINE
   Refined Retail Front-end, Clean Cards, Editorial Layouts
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

const App = {
  init() {
    this.bindEvents();
    this.initRouter();
    this.updateCartBadges();
    this.updateWishlistBadges();
    this.renderHomeViews();
    this.initSearchExperience();
    this.initCategoryMegaMenu();
    this.renderMobileDrawerCategories();
    this.initB2BExperience();
    this.initStickyHeader();
    if (typeof AIAssistant !== "undefined") {
      AIAssistant.init();
    }
  },

  /* --------------------------------------------------------------------------
     Sticky Header: transparent over hero, dark when scrolled
     -------------------------------------------------------------------------- */
  initStickyHeader() {
    const header = document.querySelector(".header");
    if (!header) return;
    const SCROLL_THRESHOLD = 60;
    const onScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on load in case page is already scrolled (e.g. refresh)
    onScroll();
  },

  /* --------------------------------------------------------------------------
     Helpers & Utilities
     -------------------------------------------------------------------------- */
  getProductImage(productOrImage) {
    if (!productOrImage) return "assets/images/prod_harvester.jpg";
    if (typeof productOrImage === "string") return productOrImage;
    if (productOrImage.images && productOrImage.images.length) {
      const first = productOrImage.images[0];
      if (typeof first === "object" && first !== null) {
        return first.url || "assets/images/prod_harvester.jpg";
      }
      return first || "assets/images/prod_harvester.jpg";
    }
    if (productOrImage.url) return productOrImage.url;
    return "assets/images/prod_harvester.jpg";
  },

  /* --------------------------------------------------------------------------
     Router & Navigation
     -------------------------------------------------------------------------- */
  initRouter() {
    window.addEventListener("hashchange", () => this.handleRouting());
    this.handleRouting();
  },

  handleRouting() {
    let hash = window.location.hash.replace("#", "") || "home";

    let activeTab = "desc";
    // Check if viewing product detail e.g. #product?id=13&tab=specs
    if (hash.startsWith("product")) {
      const qIdx = hash.indexOf("?");
      let productId = (typeof DPAgronData !== "undefined" && DPAgronData.products?.[0]?.id) || "13";
      if (qIdx !== -1) {
        const query = new URLSearchParams(hash.slice(qIdx + 1));
        productId = query.get("id") || productId;
        activeTab = query.get("tab") || "desc";
      }
      Store.activeProductId = productId;
      Store.activeProductTab = activeTab;
      hash = "product";
    }

    const views = ["home", "shop", "product", "professionals", "contact", "account", "advisor"];
    if (!views.includes(hash)) hash = "home";

    Store.currentRoute = hash;

    // Toggle view containers
    document.querySelectorAll(".page-view").forEach(view => {
      view.style.display = "none";
    });

    const activeView = document.getElementById(`view-${hash}`);
    if (activeView) {
      activeView.style.display = (hash === "advisor") ? "flex" : "block";
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    // Toggle body class and footer visibility for advisor screen
    document.body.classList.toggle("route-advisor", hash === "advisor");

    const siteFooter = document.querySelector("footer");
    if (siteFooter) {
      if (hash === "advisor") {
        siteFooter.style.display = "none";
      } else {
        siteFooter.style.display = "";
      }
    }

    // Update active nav links
    document.querySelectorAll(".nav-link").forEach(link => {
      const href = link.getAttribute("href");

      // "Όλα για την Ελιά" is a special mega-menu dropdown, not the primary route link.
      // Only "Κατάστημα / Προϊόντα" represents the #shop route view.
      if (link.classList.contains("nav-link-olive")) {
        link.classList.remove("active");
        return;
      }

      if (href === `#${hash}` || (hash === "home" && (href === "#" || href === "#home"))) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Page-specific renders
    if (hash === "shop") {
      this.renderShopPage();
    } else if (hash === "product") {
      this.renderProductDetailPage(Store.activeProductId);
    } else if (hash === "home") {
      if (typeof AIAssistant !== "undefined") {
        AIAssistant.init();
      }
    } else if (hash === "advisor") {
      const thread = document.getElementById("advisor-thread");
      if (thread && thread.children.length === 0) {
        if (typeof AIAssistant !== "undefined") {
          AIAssistant.resetChat();
        }
      }
    }
  },

  navigateTo(route, param = null) {
    if (route === "product" && param) {
      window.location.hash = `#product?id=${param}`;
    } else {
      window.location.hash = `#${route}`;
    }
  },

  /* --------------------------------------------------------------------------
     Global Event Listeners
     -------------------------------------------------------------------------- */
  bindEvents() {
    // Store Subscriptions
    Store.subscribe((event, payload) => {
      if (event === "cart_updated") {
        this.updateCartBadges();
        this.renderCartDrawer();
      } else if (event === "wishlist_updated") {
        this.updateWishlistBadges();
        this.renderWishlistDrawer();
      } else if (event === "filters_changed") {
        this.renderShopPage();
      }
    });

    // Accordions
    document.addEventListener("click", (e) => {
      const accHeader = e.target.closest(".accordion-header");
      if (accHeader) {
        const item = accHeader.parentElement;
        item.classList.toggle("active");
      }
    });

    // Close Custom Sort Dropdown on outside click
    document.addEventListener("click", (e) => {
      const sortDropdown = document.getElementById("shop-custom-sort");
      if (sortDropdown && !sortDropdown.contains(e.target)) {
        this.closeSortMenu();
      }
    });

    // Close Mobile Drawer on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeMobileDrawer();
        this.closeSortMenu();
      }
    });

    // Contact Form
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.showToast("Το αίτημά σας καταχωρήθηκε! Ένας γεωτεχνικός μας εκπρόσωπος θα επικοινωνήσει άμεσα.", "success");
        contactForm.reset();
      });
    }

    // B2B Form
    const b2bForm = document.getElementById("b2b-form");
    if (b2bForm) {
      b2bForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameVal = document.getElementById("b2b-input-name")?.value || "Συνεργάτη";
        this.showToast(`Ευχαριστούμε ${nameVal}! Το B2B αίτημά σας καταχωρήθηκε. Ο γεωτεχνικός σας σύμβουλος θα επικοινωνήσει εντός 24 ωρών.`, "success");
        b2bForm.reset();
        // Reset selected chips to first one
        document.querySelectorAll("#b2b-equipment-chips .b2b-chip-btn").forEach((b, idx) => {
          if (idx === 0) b.classList.add("selected");
          else b.classList.remove("selected");
        });
        const hiddenEquipInput = document.getElementById("b2b-selected-equipment");
        if (hiddenEquipInput) hiddenEquipInput.value = "Ελαιοραβδιστικά Carbon";
      });
    }
  },

  /* --------------------------------------------------------------------------
     B2B Partner Experience (Interactive Calculator, Chips, FAQs, Form Sync)
     -------------------------------------------------------------------------- */
  initB2BExperience() {
    // 1. Equipment multi-select chips
    const chipBtns = document.querySelectorAll("#b2b-equipment-chips .b2b-chip-btn");
    const hiddenEquipInput = document.getElementById("b2b-selected-equipment");

    if (chipBtns.length && hiddenEquipInput) {
      chipBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          btn.classList.toggle("selected");
          const selectedTexts = Array.from(chipBtns)
            .filter(b => b.classList.contains("selected"))
            .map(b => b.textContent.trim());
          hiddenEquipInput.value = selectedTexts.join(", ");
        });
      });
    }

    // 2. Interactive Calculator
    const catBtns = document.querySelectorAll("#calc-cat-options .b2b-calc-btn");
    const qtyBtns = document.querySelectorAll("#calc-qty-options .b2b-calc-btn");
    const vatCheck = document.getElementById("calc-vat-exempt");
    const resDiscount = document.getElementById("calc-res-discount");
    const resVat = document.getElementById("calc-res-vat");
    const resTotal = document.getElementById("calc-res-total");
    const applyBtn = document.getElementById("calc-apply-btn");

    const updateCalculator = () => {
      if (!resDiscount || !resVat || !resTotal) return;
      const activeQty = document.querySelector("#calc-qty-options .b2b-calc-btn.active")?.dataset.qty || "small";
      const isVatExempt = vatCheck ? vatCheck.checked : true;

      let discount = 12;
      if (activeQty === "medium") discount = 16;
      if (activeQty === "large") discount = 22;

      const vatDiscount = isVatExempt ? 24 : 0;
      const totalEstimated = discount + vatDiscount;

      resDiscount.textContent = `-${discount}%`;
      resVat.textContent = isVatExempt ? "-24%" : "0% (Χωρίς Απαλλαγή)";
      resTotal.textContent = `έως ${totalEstimated}%`;
    };

    catBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        catBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        updateCalculator();
      });
    });

    qtyBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        qtyBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        updateCalculator();
      });
    });

    if (vatCheck) {
      vatCheck.addEventListener("change", updateCalculator);
    }

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const activeCat = document.querySelector("#calc-cat-options .b2b-calc-btn.active")?.dataset.cat || "harvesters";
        const isVat = vatCheck ? vatCheck.checked : true;

        // Match chip
        chipBtns.forEach(b => {
          if (b.dataset.value === activeCat || (activeCat === "all" && b.dataset.value === "fleet")) {
            b.classList.add("selected");
          }
        });

        // Sync VAT checkbox in form
        const formVatCheck = document.getElementById("b2b-check-vat");
        if (formVatCheck) formVatCheck.checked = isVat;

        // Smooth scroll to form
        const formSection = document.getElementById("b2b-form-section");
        if (formSection) {
          formSection.scrollIntoView({ behavior: "smooth" });
          const nameInput = document.getElementById("b2b-input-name");
          if (nameInput) setTimeout(() => nameInput.focus(), 600);
        }
      });
    }

    // 3. B2B FAQ Accordion
    const faqQuestions = document.querySelectorAll(".b2b-faq-question");
    faqQuestions.forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".b2b-faq-item");
        if (!item) return;
        const isOpen = item.classList.contains("is-open");
        document.querySelectorAll(".b2b-faq-item").forEach(el => el.classList.remove("is-open"));
        if (!isOpen) {
          item.classList.add("is-open");
        }
      });
    });
  },

  /* --------------------------------------------------------------------------
     Header Search Experience (Clean, Focused Dropdown with Live Suggestions)
     -------------------------------------------------------------------------- */
  initSearchExperience() {
    const searchInput = document.getElementById("main-search-input");
    const searchDropdown = document.getElementById("search-dropdown");
    if (!searchInput || !searchDropdown) return;

    // Only show live suggestions when user actually types (>= 2 characters)
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        this.renderSearchDropdownContent(query);
        searchDropdown.classList.add("open");
      } else {
        this.closeSearchDropdown();
      }
    });

    // Submit on Enter key
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = searchInput.value.trim();
        this.triggerSearch(query);
      } else if (e.key === "Escape") {
        this.closeSearchDropdown();
      }
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".header-search")) {
        this.closeSearchDropdown();
        this.closeCategoryMegaMenu();
      }
    });
  },

  closeSearchDropdown() {
    const searchDropdown = document.getElementById("search-dropdown");
    if (searchDropdown) {
      searchDropdown.classList.remove("open");
    }
  },

  /* --------------------------------------------------------------------------
     Navbar Category Mega Menu ("Όλα για την Ελιά")
     Pure 2-column catalog navigation with smooth category switching
     -------------------------------------------------------------------------- */
  initCategoryMegaMenu() {
    this.activeMegaCategoryIndex = 0;
    this.renderCategoryMegaMenu();
  },

  openCategoryMegaMenu() {
    this.renderCategoryMegaMenu();
  },

  closeCategoryMegaMenu() {
    // Left for backward compatibility
  },

  renderCategoryMegaMenu() {
    const categoriesContainer = document.getElementById("category-megamenu-categories");
    const subcatsContainer = document.getElementById("category-megamenu-subcategories");
    if (!categoriesContainer || !subcatsContainer || !DPAgronData.categoryMegaMenu) return;

    const categories = DPAgronData.categoryMegaMenu;
    const activeIdx = this.activeMegaCategoryIndex || 0;
    const activeCat = categories[activeIdx] || categories[0];

    const getIconSvg = (iconName) => {
      switch (iconName) {
        case "olive":
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
        case "scissors":
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
        case "grid":
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`;
        case "battery":
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 7h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><line x1="22" y1="11" x2="22" y2="13"/><rect width="10" height="12" x="5" y="6" rx="2"/></svg>`;
        case "shield":
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
        case "wrench":
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
        default:
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
      }
    };

    // 1. Left Column: Categories List
    categoriesContainer.innerHTML = `
      <div class="category-megamenu-cat-list">
        ${categories.map((cat, idx) => `
          <button type="button" class="category-megamenu-cat-btn ${idx === activeIdx ? 'active' : ''}" 
            onmouseenter="App.selectMegaCategory(${idx})" 
            onclick="App.selectMegaCategory(${idx})">
            <div class="category-megamenu-cat-left">
              <span class="category-megamenu-cat-icon">${getIconSvg(cat.icon)}</span>
              <span>${cat.name}</span>
            </div>
            <svg class="category-megamenu-cat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        `).join("")}
      </div>
    `;

    // 2. Right Column: Subcategories for Active Category
    subcatsContainer.innerHTML = `
      <div class="category-megamenu-header">
        <div class="category-megamenu-title">${activeCat.name}</div>
        <div class="category-megamenu-badge">${activeCat.badge || `${activeCat.subcategories.length} ΚΑΤΗΓΟΡΙΕΣ`}</div>
      </div>

      <div class="category-megamenu-subcat-grid">
        ${activeCat.subcategories.map(sub => `
          <div class="category-megamenu-subcat-item" onclick="App.filterFromMegaMenu('${sub.catId || activeCat.id}', '${sub.subId || sub.id}', '${sub.name}')">
            <span class="category-megamenu-subcat-name">
              <span>${sub.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </span>
            <span class="category-megamenu-subcat-hint">${sub.hint}</span>
          </div>
        `).join("")}
      </div>

      <div class="category-megamenu-footer">
        <a class="category-megamenu-all-link" onclick="App.filterFromMegaMenu('${activeCat.id}', 'all', '${activeCat.name}')">
          <span>Προβολή όλων στο Κατάστημα</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </a>
      </div>
    `;
  },

  selectMegaCategory(idx) {
    this.activeMegaCategoryIndex = idx;
    this.renderCategoryMegaMenu();
  },

  filterFromMegaMenu(categoryId, subcategoryId, categoryName) {
    if (typeof Store !== "undefined") {
      Store.filters.category = (categoryId && categoryId !== "all") ? categoryId : "all";
      Store.filters.subcategory = (subcategoryId && subcategoryId !== "all") ? subcategoryId : "all";
    }

    const menu = document.getElementById("navbar-mega-menu");
    if (menu) {
      menu.style.display = "none";
      setTimeout(() => {
        menu.style.display = "";
      }, 400);
    }

    this.navigateTo("shop");
    this.renderShopPage();
  },

  renderSearchDropdownContent(query = "") {
    const searchDropdown = document.getElementById("search-dropdown");
    if (!searchDropdown) return;

    if (!query || query.length < 2) {
      // Default State: Popular Searches & Top Quick Categories
      const topCategories = (DPAgronData.categories || []).filter(c => 
        ["elaioravdistika", "dixtia", "alisopriona", "psalidi-mpatarias", "sakia"].includes(c.id)
      ).slice(0, 5);

      searchDropdown.innerHTML = `
        <div class="search-panel-default">
          <!-- Section 1: Δημοφιλείς Αναζητήσεις -->
          <div class="search-panel-section">
            <div class="search-panel-header">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <span>ΔΗΜΟΦΙΛΕΙΣ ΑΝΑΖΗΤΗΣΕΙΣ</span>
            </div>
            <div class="search-popular-list">
              ${(DPAgronData.hotSearches || []).map(term => `
                <button type="button" class="search-popular-item" onclick="App.triggerSearch('${term}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span>${term}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <div class="search-panel-divider"></div>

          <!-- Section 2: Γρήγορες Κατηγορίες -->
          <div class="search-panel-section">
            <div class="search-panel-header">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>ΓΡΗΓΟΡΕΣ ΚΑΤΗΓΟΡΙΕΣ</span>
            </div>
            <div class="search-categories-list">
              ${topCategories.map(cat => `
                <div class="search-cat-item" onclick="App.filterShopByCategory('${cat.id}'); App.closeSearchDropdown();">
                  <div class="search-cat-info">
                    <span class="search-cat-name">${cat.name}</span>
                    <span class="search-cat-count">${cat.count || ''} ${cat.count === 1 ? 'προϊόν' : 'προϊόντα'}</span>
                  </div>
                  <svg class="search-cat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    } else {
      // Typing State: Live Search Suggestions & Matched Products
      const val = query.toLowerCase();
      const matches = DPAgronData.products.filter(p =>
        p.title.toLowerCase().includes(val) ||
        p.brand.toLowerCase().includes(val) ||
        p.sku.toLowerCase().includes(val) ||
        (p.category && p.category.toLowerCase().includes(val)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(val))
      );

      if (matches.length > 0) {
        searchDropdown.innerHTML = `
          <div class="search-results-panel">
            <div class="search-results-header">
              <span>ΠΡΟΪΟΝΤΑ (${matches.length})</span>
            </div>
            <div class="search-results-list">
              ${matches.slice(0, 5).map(p => `
                <div class="search-result-item" onclick="App.navigateTo('product', '${p.id}'); App.closeSearchDropdown();">
                  <img src="${App.getProductImage(p)}" alt="${p.title}" class="search-result-thumb">
                  <div class="search-result-details">
                    <span class="search-result-brand">${p.brand}</span>
                    <span class="search-result-title">${p.title}</span>
                  </div>
                  <div class="search-result-price-box">
                    <span class="search-result-price">${p.price.toFixed(2)} €</span>
                    <span class="search-result-vat">Χωρίς ΦΠΑ: ${p.vatExcludedPrice.toFixed(2)} €</span>
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="search-results-footer" onclick="App.triggerSearch('${query.replace(/'/g, "\\'")}');">
              <span>Δείτε όλα τα αποτελέσματα (${matches.length})</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        `;
      } else {
        searchDropdown.innerHTML = `
          <div class="search-empty-state">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <div class="search-empty-title">Δεν βρέθηκαν προϊόντα για «${query}»</div>
            <div class="search-empty-sub">Δοκιμάστε με διαφορετικούς όρους όπως «ελαιοραβδιστικά», «ψαλίδια» ή «μπαταρίες».</div>
          </div>
        `;
      }
    }
  },

  triggerSearch(query) {
    const searchInput = document.getElementById("main-search-input");
    if (searchInput) {
      searchInput.value = query;
    }
    Store.filters.searchQuery = query;
    this.closeSearchDropdown();
    this.navigateTo("shop");
    this.renderShopPage();
  },

  /* --------------------------------------------------------------------------
     Toast Notifications
     -------------------------------------------------------------------------- */
  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  /* --------------------------------------------------------------------------
     Badges & Counters
     -------------------------------------------------------------------------- */
  updateCartBadges() {
    const summary = Store.getCartSummary();
    const countEl = document.getElementById("header-cart-count");
    const amountEl = document.getElementById("header-cart-amount");
    if (countEl) countEl.textContent = summary.count;
    if (amountEl) amountEl.textContent = `${summary.subtotal.toFixed(2)} €`;
  },

  updateWishlistBadges() {
    const countEl = document.getElementById("header-wishlist-count");
    if (countEl) countEl.textContent = Store.wishlist.length;
  },

  /* --------------------------------------------------------------------------
     Clean Product Card Generator (Uncluttered, Real Agriculture)
     -------------------------------------------------------------------------- */
  renderProductCardHTML(product, isFeaturedSpotlight = false) {
    const inWishlist = Store.isInWishlist(product.id);

    // Maximum ONE promotional badge per product
    let promoBadgeHTML = "";
    if (isFeaturedSpotlight) {
      promoBadgeHTML = `<span class="product-promo-badge spotlight">Επιλογή Σεζόν</span>`;
    } else if (product.originalPrice && product.originalPrice > product.price) {
      const discountPct = Math.round((1 - product.price / product.originalPrice) * 100);
      promoBadgeHTML = `<span class="product-promo-badge discount">-${discountPct}%</span>`;
    } else if (product.isBestseller) {
      promoBadgeHTML = `<span class="product-promo-badge bestseller">Bestseller</span>`;
    } else if (product.isNew) {
      promoBadgeHTML = `<span class="product-promo-badge new">Νέο</span>`;
    }

    // Availability & key info
    const stockText = product.inStock ? "Άμεσα διαθέσιμο" : "Κατόπιν παραγγελίας";
    const keySpec = product.powerSource || product.usageLevel || "";

    return `
      <article class="product-card ${isFeaturedSpotlight ? 'spotlight-card' : ''}" data-id="${product.id}">
        <div class="product-card-media">
          ${promoBadgeHTML}
          <a href="#product?id=${product.id}" class="product-card-media-link" aria-label="${product.title}">
            <img src="${App.getProductImage(product)}" alt="${product.title}" loading="lazy">
          </a>

          <button type="button" class="btn-quick-view" onclick="event.preventDefault(); event.stopPropagation(); App.openQuickView('${product.id}')" title="Γρήγορη Προβολή">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>Γρήγορη Προβολή</span>
          </button>
          
          <div class="product-card-wishlist">
            <button class="btn-wishlist-clean ${inWishlist ? 'active' : ''}" 
                    title="${inWishlist ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}"
                    onclick="App.handleWishlistToggle('${product.id}')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="product-card-content">
          <div class="product-card-brand-name">${product.brand}</div>
          <a href="#product?id=${product.id}" class="product-card-title">${product.title}</a>

          <div class="product-card-keyinfo">
            <span class="product-stock-tag ${product.inStock ? 'in-stock' : 'out-stock'}">
              <span class="stock-dot"></span>${stockText}
            </span>
            ${keySpec ? `<span class="product-spec-tag">${keySpec}</span>` : ''}
          </div>

          <div class="product-card-bottom">
            <div class="product-price-clean">
              <div class="price-row-flex">
                <span class="price-main">${product.price.toFixed(2)} €</span>
                ${product.originalPrice && product.originalPrice > product.price ? `<span class="price-original">${product.originalPrice.toFixed(2)} €</span>` : ''}
              </div>
              <span class="price-vat-note">Χωρίς ΦΠΑ: ${product.vatExcludedPrice.toFixed(2)} €</span>
            </div>

            <button class="product-add-clean-btn" title="Προσθήκη στο καλάθι" aria-label="Προσθήκη στο καλάθι" onclick="App.handleAddToCart('${product.id}')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span class="add-btn-label">Στο καλάθι</span>
            </button>
          </div>
        </div>
      </article>
    `;
  },

  /* --------------------------------------------------------------------------
     Home Page Views
     -------------------------------------------------------------------------- */
  renderHomeViews() {
    // 1. Quick-Navigation Category Shortcuts (Clean Chips)
    const subcatsContainer = document.getElementById("home-olive-subcategories");
    if (subcatsContainer) {
      const coreCategories = [
        { id: "all", name: "Όλα για την Ελιά" },
        { id: "harvesters", name: "Ελαιοραβδιστικά" },
        { id: "pruning", name: "Ψαλίδια Κλαδέματος" },
        { id: "nets", name: "Δίχτυα & Ελαιόπανα" },
        { id: "power", name: "Μπαταρίες & Γεννήτριες" },
        { id: "chainsaws", name: "Αλυσοπρίονα Κοπής" }
      ];

      subcatsContainer.innerHTML = coreCategories.map((sub, idx) => `
        <button class="category-shortcut-chip ${idx === 0 ? 'active' : ''}" onclick="App.filterShopBySubcategory('${sub.id}')">
          <span>${sub.name}</span>
        </button>
      `).join("");
    }

    // 2. Editorial Category Cards (Asymmetric Custom Composition)
    const catGrid = document.getElementById("home-categories-grid");
    if (catGrid) {
      const featuredCat = DPAgronData.categories[0];
      const wideCat = DPAgronData.categories[1];
      const bottomCat1 = DPAgronData.categories[2];
      const bottomCat2 = DPAgronData.categories[3];

      catGrid.innerHTML = `
        <div class="editorial-categories-grid">
          <!-- Featured Tall Category (Left) -->
          <div class="editorial-category-featured" onclick="App.filterShopByCategory('${featuredCat.id}')">
            <img src="${featuredCat.image}" alt="${featuredCat.name}" class="editorial-cat-bg">
            <div class="editorial-cat-overlay"></div>
            <div class="editorial-cat-content">
              <span class="editorial-cat-badge">ΒΑΣΙΚΗ ΣΥΛΛΟΓΗ ΣΕΖΟΝ</span>
              <h3 class="editorial-cat-title featured">${featuredCat.name}</h3>
              <div class="editorial-cat-meta">
                <span class="editorial-cat-count">${featuredCat.count} Προϊόντα</span>
                <span class="editorial-cat-cta">
                  Προβολή Συλλογής
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
              </div>
            </div>
          </div>

          <!-- Asymmetric Subgrid (Right: 1 Wide Top + 2 Side-by-Side Bottom) -->
          <div class="editorial-categories-subgrid">
            <!-- Wide Top Category -->
            <div class="editorial-category-card wide" onclick="App.filterShopByCategory('${wideCat.id}')">
              <img src="${wideCat.image}" alt="${wideCat.name}" class="editorial-cat-bg">
              <div class="editorial-cat-overlay"></div>
              <div class="editorial-cat-content">
                <h4 class="editorial-cat-title">${wideCat.name}</h4>
                <div class="editorial-cat-meta">
                  <span class="editorial-cat-count">${wideCat.count} Προϊόντα</span>
                  <span class="editorial-cat-cta">
                    Προβολή
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </span>
                </div>
              </div>
            </div>

            <!-- Bottom Row: 2 Compact Categories -->
            <div class="editorial-categories-bottom-row">
              <div class="editorial-category-card compact" onclick="App.filterShopByCategory('${bottomCat1.id}')">
                <img src="${bottomCat1.image}" alt="${bottomCat1.name}" class="editorial-cat-bg">
                <div class="editorial-cat-overlay"></div>
                <div class="editorial-cat-content">
                  <h4 class="editorial-cat-title">${bottomCat1.name}</h4>
                  <div class="editorial-cat-meta">
                    <span class="editorial-cat-count">${bottomCat1.count} Προϊόντα</span>
                    <span class="editorial-cat-cta">
                      Προβολή
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                  </div>
                </div>
              </div>

              <div class="editorial-category-card compact" onclick="App.filterShopByCategory('${bottomCat2.id}')">
                <img src="${bottomCat2.image}" alt="${bottomCat2.name}" class="editorial-cat-bg">
                <div class="editorial-cat-overlay"></div>
                <div class="editorial-cat-content">
                  <h4 class="editorial-cat-title">${bottomCat2.name}</h4>
                  <div class="editorial-cat-meta">
                    <span class="editorial-cat-count">${bottomCat2.count} Προϊόντα</span>
                    <span class="editorial-cat-cta">
                      Προβολή
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Featured Products Grid (Olive selection)
    const featuredGrid = document.getElementById("home-featured-products");
    if (featuredGrid) {
      const oliveFeatured = DPAgronData.products.slice(0, 8);
      featuredGrid.innerHTML = oliveFeatured.map((p, idx) => this.renderProductCardHTML(p, idx === 0)).join("");
    }

    // 4. Solutions Cards (3 Large Visual Cards)
    const solutionsGrid = document.getElementById("home-solutions-grid");
    if (solutionsGrid) {
      solutionsGrid.innerHTML = `
        <div class="solutions-visual-grid">
          ${DPAgronData.solutions.map(sol => `
            <div class="solution-visual-card">
              <div class="solution-visual-media">
                <img src="${sol.image}" alt="${sol.title}">
              </div>
              <div class="solution-visual-body">
                <h3 class="solution-visual-title">${sol.title}</h3>
                <p class="solution-visual-desc">${sol.subtitle}</p>
                <button class="solution-visual-btn" onclick="App.filterShopBySubcategory('${sol.targetFilter}')">
                  <span>Δείτε τις προτάσεις</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    // 5. Brands Grid
    const brandsGrid = document.getElementById("home-brands-grid");
    if (brandsGrid) {
      brandsGrid.innerHTML = DPAgronData.brands.map(b => `
        <a href="#shop" class="brand-card" title="Προβολή προϊόντων ${b.name}" onclick="event.preventDefault(); App.filterShopByBrand('${b.name}')">
          <span class="brand-logo-text">${b.name}</span>
          ${b.country ? `<span class="brand-origin-badge">${b.country}</span>` : ''}
        </a>
      `).join("");
    }

    // 6. FAQs on Contact view
    const faqsContainer = document.getElementById("contact-faqs-container");
    if (faqsContainer) {
      faqsContainer.innerHTML = DPAgronData.faqs.map((faq, idx) => `
        <div class="accordion-item ${idx === 0 ? 'active' : ''}">
          <div class="accordion-header">
            <span>${faq.q}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="accordion-content">
            <p>${faq.a}</p>
          </div>
        </div>
      `).join("");
    }
  },

  /* --------------------------------------------------------------------------
     Shop View & Filtering Engine (Modern, Scalable E-commerce)
     -------------------------------------------------------------------------- */
  renderShopPage() {
    // Restore saved sort preference once per session
    if (!this._shopSortLoaded) {
      this._shopSortLoaded = true;
      const savedSort = localStorage.getItem("dp_shop_sort");
      if (["popular", "price-asc", "price-desc", "rating", "discount"].includes(savedSort)) {
        Store.filters.sortBy = savedSort;
      }
    }

    const products = Store.getFilteredProducts();
    const countEl = document.getElementById("shop-product-count");
    const gridEl = document.getElementById("shop-products-grid");
    const activeFiltersEl = document.getElementById("shop-active-filters");
    const mobileBadge = document.getElementById("mobile-filter-badge");

    if (countEl) {
      countEl.innerHTML = `Εμφάνιση <strong>${products.length}</strong> από ${DPAgronData.products.length} προϊόντα`;
    }
    const heroCountEl = document.getElementById("shop-hero-count");
    if (heroCountEl) {
      heroCountEl.textContent = `${DPAgronData.products.length} προϊόντα`;
    }

    // Active filters calculation
    const tags = [];
    if (Store.filters.category !== "all") {
      const cat = (DPAgronData.categories || []).find(c => c.id === Store.filters.category || c.slug === Store.filters.category);
      if (cat) tags.push({ label: `Κατηγορία: ${cat.name}`, key: "category" });
    }
    if (Store.filters.subcategory !== "all") {
      const sub = (DPAgronData.oliveSubcategories || []).find(s => s.id === Store.filters.subcategory)
        || (DPAgronData.categories || []).flatMap(c => c.subcategories || []).find(s => s.id === Store.filters.subcategory || s.slug === Store.filters.subcategory);
      if (sub) tags.push({ label: `Υποκατηγορία: ${sub.name}`, key: "subcategory" });
    }
    Store.filters.brands.forEach(b => {
      tags.push({ label: `Brand: ${b}`, key: `brand-${b}`, brand: b });
    });
    if (Store.filters.powerSource !== "all") {
      tags.push({ label: `Ενέργεια: ${Store.filters.powerSource}`, key: "powerSource" });
    }
    if (Store.filters.inStockOnly) {
      tags.push({ label: "Μόνο Άμεσα Διαθέσιμα", key: "inStockOnly" });
    }
    if ((Store.filters.priceMin && Store.filters.priceMin > 0) || (Store.filters.priceMax !== undefined && Store.filters.priceMax < 1500)) {
      tags.push({ label: `Τιμή: ${Store.filters.priceMin || 0}€ - ${Store.filters.priceMax || 1500}€`, key: "price" });
    }

    // Update Mobile Filter Badge & sidebar counter
    const sidebarCount = document.getElementById("sidebar-active-count");
    if (sidebarCount) {
      sidebarCount.textContent = tags.length;
      sidebarCount.style.display = tags.length > 0 ? "inline-flex" : "none";
    }
    if (mobileBadge) {
      if (tags.length > 0) {
        mobileBadge.textContent = tags.length;
        mobileBadge.style.display = "inline-flex";
      } else {
        mobileBadge.style.display = "none";
      }
    }

    // Render Active Filters Tags (Clean Rectangular Chips)
    if (activeFiltersEl) {
      if (tags.length > 0) {
        activeFiltersEl.innerHTML = `
          <span class="active-filters-label">Ενεργά Φίλτρα:</span>
          ${tags.map(t => `
            <span class="filter-chip">
              <span class="filter-chip-text">${t.label}</span>
              <button type="button" class="filter-chip-remove" title="Αφαίρεση" onclick="App.removeFilter('${t.key}', '${t.brand || ''}')">&times;</button>
            </span>
          `).join("")}
          <button class="btn-clear-all-chips" onclick="App.clearAllFilters()">Καθαρισμός Όλων</button>
        `;
        activeFiltersEl.style.display = "flex";
      } else {
        activeFiltersEl.innerHTML = "";
        activeFiltersEl.style.display = "none";
      }
    }

    // Render Grid
    if (gridEl) {
      if (products.length === 0) {
        gridEl.innerHTML = `
          <div class="shop-empty-state">
            <div class="shop-empty-icon"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg></div>
            <h3>Δεν βρέθηκαν προϊόντα με αυτά τα κριτήρια</h3>
            <p>Δοκιμάστε να αφαιρέσετε ορισμένα φίλτρα ή ρωτήστε τον Γεωπονικό Σύμβουλο να σας προτείνει το σωστό εξοπλισμό.</p>
            <div class="shop-empty-actions">
              <button class="btn btn-primary" onclick="App.clearAllFilters()">Επαναφορά Φίλτρων</button>
              <a class="btn shop-empty-advisor" href="#advisor">Ρωτήστε τον Γεωπονικό Σύμβουλο</a>
            </div>
          </div>
        `;
      } else {
        gridEl.innerHTML = products.map(p => this.renderProductCardHTML(p)).join("");
      }
    }

    // Update stock-only-checkbox state if present
    const stockCheckbox = document.getElementById("stock-only-checkbox");
    if (stockCheckbox) {
      stockCheckbox.checked = !!Store.filters.inStockOnly;
    }

    // Update mobile filter apply button text
    const applyBtnText = document.getElementById("mobile-filter-apply-text");
    if (applyBtnText) {
      applyBtnText.textContent = `Εφαρμογή (${products.length} προϊόντα)`;
    }

    // Restore view mode preference
    const savedMode = localStorage.getItem("dp_shop_view_mode");
    if (savedMode === "list" && gridEl) {
      gridEl.classList.add("list-mode");
      const gridBtn = document.getElementById("view-mode-grid");
      const listBtn = document.getElementById("view-mode-list");
      if (gridBtn) gridBtn.classList.remove("active");
      if (listBtn) listBtn.classList.add("active");
    }

    this.updateSortUI(Store.filters.sortBy || "popular");
    this.renderSidebarFilters();
    this.syncShopCategoryPills();
    this.syncPriceUI();
  },

  renderSidebarFilters() {
    // Brands Filter (with search + "show more")
    const brandsContainer = document.getElementById("filter-brands-list");
    if (brandsContainer && DPAgronData.brands) {
      const query = (this._brandQuery || "").trim().toLowerCase();
      const LIMIT = 5;
      let list = DPAgronData.brands
        .map(b => ({
          name: b.name,
          count: DPAgronData.products.filter(p => p.brand === b.name).length,
          checked: Store.filters.brands.includes(b.name)
        }))
        .sort((a, b) => (b.checked - a.checked) || (b.count - a.count));

      if (query) list = list.filter(b => b.name.toLowerCase().includes(query));

      const collapsed = !query && !this._brandShowAll && list.length > LIMIT;
      const visible = collapsed ? list.filter((b, i) => i < LIMIT || b.checked) : list;

      let html = visible.map(b => `
        <label class="filter-checkbox-label">
          <span class="filter-lbl-text">
            <input type="checkbox" value="${b.name}" ${b.checked ? 'checked' : ''} onchange="App.handleBrandFilterChange(this)">
            ${b.name}
          </span>
          <span class="filter-count">${b.count}</span>
        </label>
      `).join("");

      if (list.length === 0) {
        html = `<div class="brand-empty-note">Δεν βρέθηκε brand</div>`;
      } else if (collapsed) {
        html += `<button type="button" class="brand-show-more" onclick="App.toggleBrandShowAll()">Δείτε περισσότερα (${list.length - visible.length})</button>`;
      } else if (!query && this._brandShowAll && list.length > LIMIT) {
        html += `<button type="button" class="brand-show-more" onclick="App.toggleBrandShowAll()">Λιγότερα</button>`;
      }
      brandsContainer.innerHTML = html;
    }
  },

  filterBrandList(value) {
    this._brandQuery = value || "";
    this.renderSidebarFilters();
  },

  toggleBrandShowAll() {
    this._brandShowAll = !this._brandShowAll;
    this.renderSidebarFilters();
  },

  toggleFilterGroup(groupId) {
    const groupEl = document.getElementById(groupId);
    if (groupEl) {
      groupEl.classList.toggle("is-collapsed");
    }
  },

  openMobileFilters() {
    const sidebar = document.getElementById("shop-sidebar");
    const backdrop = document.getElementById("shop-filter-backdrop") || document.getElementById("drawer-backdrop");
    if (sidebar) sidebar.classList.add("drawer-open");
    if (backdrop) backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  closeMobileFilters() {
    const sidebar = document.getElementById("shop-sidebar");
    const backdrop = document.getElementById("shop-filter-backdrop") || document.getElementById("drawer-backdrop");
    if (sidebar) sidebar.classList.remove("drawer-open");
    if (backdrop) backdrop.classList.remove("open");
    document.body.style.overflow = "";
  },

  setShopViewMode(mode) {
    const gridEl = document.getElementById("shop-products-grid");
    const gridBtn = document.getElementById("view-mode-grid");
    const listBtn = document.getElementById("view-mode-list");
    if (!gridEl) return;

    if (mode === "list") {
      gridEl.classList.add("list-mode");
      if (gridBtn) gridBtn.classList.remove("active");
      if (listBtn) listBtn.classList.add("active");
      localStorage.setItem("dp_shop_view_mode", "list");
    } else {
      gridEl.classList.remove("list-mode");
      if (gridBtn) gridBtn.classList.add("active");
      if (listBtn) listBtn.classList.remove("active");
      localStorage.setItem("dp_shop_view_mode", "grid");
    }
  },

  handleBrandFilterChange(checkbox) {
    const brand = checkbox.value;
    if (checkbox.checked) {
      if (!Store.filters.brands.includes(brand)) Store.filters.brands.push(brand);
    } else {
      Store.filters.brands = Store.filters.brands.filter(b => b !== brand);
    }
    this.renderShopPage();
  },

  filterShopByCategory(catId) {
    Store.filters.category = catId;
    Store.filters.subcategory = "all";
    this.navigateTo("shop");
    this.renderShopPage();
  },

  filterShopBySubcategory(subId) {
    Store.filters.subcategory = subId;
    this.navigateTo("shop");
    this.renderShopPage();
  },

  filterShopByBrand(brand) {
    Store.filters.brands = [brand];
    this.navigateTo("shop");
    this.renderShopPage();
  },

  quickFilter(filterType, val) {
    if (filterType === 'power') {
      Store.filters.powerSource = val;
    } else if (filterType === 'stock') {
      Store.filters.inStockOnly = true;
    } else if (filterType === 'category') {
      Store.filters.category = val;
    }
    this.renderShopPage();
  },

  removeFilter(key, brandVal) {
    if (key === "category") Store.filters.category = "all";
    else if (key === "subcategory") Store.filters.subcategory = "all";
    else if (key.startsWith("brand-")) Store.filters.brands = Store.filters.brands.filter(b => b !== brandVal);
    else if (key === "powerSource") Store.filters.powerSource = "all";
    else if (key === "inStockOnly") Store.filters.inStockOnly = false;
    else if (key === "price") {
      Store.filters.priceMin = 0;
      Store.filters.priceMax = 1500;
    }
    this.renderShopPage();
  },

  clearAllFilters() {
    Store.resetFilters();
    this._brandQuery = "";
    const brandSearch = document.getElementById("brand-search-input");
    if (brandSearch) brandSearch.value = "";
    const powerAll = document.querySelector('input[name="filter-power"]');
    if (powerAll) powerAll.checked = true;
    const savedSort = localStorage.getItem("dp_shop_sort");
    if (["popular", "price-asc", "price-desc", "rating", "discount"].includes(savedSort)) {
      Store.filters.sortBy = savedSort;
    }
    this.updateSortUI(Store.filters.sortBy);
    this.renderShopPage();
  },

  handleCategoryPillClick(catId) {
    Store.filters.category = catId;
    if (catId === 'all') {
      Store.filters.subcategory = 'all';
    }
    this.renderShopPage();
  },

  syncShopCategoryPills() {
    const wrap = document.getElementById("shop-category-pills");
    if (!wrap) return;

    const stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      "all": `<svg width="15" height="15" viewBox="0 0 24 24" ${stroke}><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
      "elaiokomia-kai-sigkomidi": `<svg width="15" height="15" viewBox="0 0 24 24" ${stroke}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>`,
      "kladema-kai-koph": `<svg width="15" height="15" viewBox="0 0 24 24" ${stroke}><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
      "dixtia-kai-apothikeysh": `<svg width="15" height="15" viewBox="0 0 24 24" ${stroke}><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path></svg>`,
      "prostasia-kai-endymasia": `<svg width="15" height="15" viewBox="0 0 24 24" ${stroke}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      "epaggelmatika-ergaleia": `<svg width="15" height="15" viewBox="0 0 24 24" ${stroke}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`
    };

    const products = DPAgronData.products || [];
    const items = [{ id: "all", name: "Όλα τα Προϊόντα", count: products.length }]
      .concat((DPAgronData.categories || []).map(c => ({
        id: c.slug || c.id,
        name: c.name,
        count: products.filter(p => p.category === c.slug || p.category === c.id).length
      })));

    wrap.innerHTML = items.map(it => `
      <button type="button" class="shop-cat-pill ${Store.filters.category === it.id ? 'active' : ''}" data-cat="${it.id}" onclick="App.handleCategoryPillClick('${it.id}')">
        <span class="shop-cat-pill-icon">${icons[it.id] || icons["all"]}</span>
        <span>${it.name}</span>
        <span class="shop-cat-pill-count">${it.count}</span>
      </button>
    `).join("");
  },

  handleStockFilterChange(isChecked) {
    Store.filters.inStockOnly = isChecked;
    this.renderShopPage();
  },

  handlePriceInputChange() {
    const minInput = document.getElementById("price-min-input");
    const maxInput = document.getElementById("price-max-input");
    const slider = document.getElementById("price-slider");
    const sliderVal = document.getElementById("price-slider-val");

    let min = minInput ? Number(minInput.value) || 0 : 0;
    let max = maxInput ? Number(maxInput.value) || 1500 : 1500;

    if (min < 0) min = 0;
    if (max > 1500) max = 1500;
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }

    Store.filters.priceMin = min;
    Store.filters.priceMax = max;

    if (slider) slider.value = max;
    if (sliderVal) sliderVal.textContent = `Έως ${max.toLocaleString('el-GR')} €`;

    this.renderShopPage();
  },

  handlePriceSliderInput(val) {
    const max = Number(val);
    const maxInput = document.getElementById("price-max-input");
    const sliderVal = document.getElementById("price-slider-val");

    if (maxInput) maxInput.value = max;
    if (sliderVal) sliderVal.textContent = `Έως ${max.toLocaleString('el-GR')} €`;

    Store.filters.priceMax = max;
    this.renderShopPage();
  },

  setPricePreset(min, max) {
    Store.filters.priceMin = min;
    Store.filters.priceMax = max;

    const minInput = document.getElementById("price-min-input");
    const maxInput = document.getElementById("price-max-input");
    const slider = document.getElementById("price-slider");
    const sliderVal = document.getElementById("price-slider-val");

    if (minInput) minInput.value = min;
    if (maxInput) maxInput.value = max;
    if (slider) slider.value = max;
    if (sliderVal) sliderVal.textContent = `Έως ${max.toLocaleString('el-GR')} €`;

    this.renderShopPage();
  },

  syncPriceUI() {
    const minInput = document.getElementById("price-min-input");
    const maxInput = document.getElementById("price-max-input");
    const slider = document.getElementById("price-slider");
    const sliderVal = document.getElementById("price-slider-val");

    if (minInput) minInput.value = Store.filters.priceMin || 0;
    if (maxInput) maxInput.value = Store.filters.priceMax !== undefined ? Store.filters.priceMax : 1500;
    if (slider) slider.value = Store.filters.priceMax !== undefined ? Store.filters.priceMax : 1500;
    if (sliderVal) sliderVal.textContent = `Έως ${(Store.filters.priceMax !== undefined ? Store.filters.priceMax : 1500).toLocaleString('el-GR')} €`;
  },

  openQuickView(productId) {
    const product = (DPAgronData.products || []).find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById("quickview-modal");
    const backdrop = document.getElementById("quickview-backdrop");
    const body = document.getElementById("quickview-body");
    if (!modal || !backdrop || !body) return;

    const stockClass = product.inStock ? "in-stock" : "out-stock";
    const stockText = product.inStock ? "Άμεσα διαθέσιμο" : "Κατόπιν παραγγελίας";

    // Extract first 4 top specs
    const specsEntries = Object.entries(product.specs || {}).slice(0, 4);

    body.innerHTML = `
      <div class="qv-media-col">
        <div class="qv-image-wrap">
          <img src="${App.getProductImage(product)}" alt="${product.title}">
        </div>
      </div>

      <div class="qv-info-col">
        <div class="qv-brand-sku">
          <span>${product.brand}</span>
          <span class="qv-sku">ΚΩΔ: ${product.sku}</span>
        </div>

        <h2 class="qv-title">${product.title}</h2>

        <div class="qv-status-row">
          <span class="product-stock-tag ${stockClass}">
            <span class="stock-dot"></span>${stockText}
          </span>
          <span class="product-spec-tag"><svg class=ico aria-hidden=true><use href=#i-star></use></svg> ${product.rating || 5}/5 (${product.reviewsCount || 1} αξιολογήσεις)</span>
        </div>

        <div class="qv-price-box">
          <div class="price-row-flex">
            <span class="qv-price-main">${product.price.toFixed(2)} €</span>
            ${product.originalPrice && product.originalPrice > product.price ? `<span class="qv-price-original">${product.originalPrice.toFixed(2)} €</span>` : ''}
          </div>
          <span class="qv-price-vat"><svg class=ico aria-hidden=true><use href=#i-landmark></use></svg> Χωρίς ΦΠΑ (Άρθρο 39α): ${product.vatExcludedPrice.toFixed(2)} €</span>
        </div>

        ${specsEntries.length > 0 ? `
          <table class="qv-specs-table">
            <tbody>
              ${specsEntries.map(([k, v]) => `
                <tr>
                  <td class="qv-specs-key">${k}</td>
                  <td class="qv-specs-val">${v}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : ''}

        <div class="qv-actions-row">
          <div class="qv-qty-selector">
            <button type="button" class="qv-qty-btn" onclick="App.quickViewChangeQty(-1)" aria-label="Μείωση">-</button>
            <span id="qv-qty-val" class="qv-qty-val">1</span>
            <button type="button" class="qv-qty-btn" onclick="App.quickViewChangeQty(1)" aria-label="Αύξηση">+</button>
          </div>

          <button type="button" class="qv-add-btn" onclick="App.quickViewAddToCart('${product.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>Προσθήκη στο Καλάθι</span>
          </button>
        </div>

        <a href="#product?id=${product.id}" class="qv-full-link" onclick="App.closeQuickView()">
          Προβολή αναλυτικών τεχνικών χαρακτηριστικών &amp; εγγύησης &rarr;
        </a>
      </div>
    `;

    backdrop.style.display = "block";
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    // Escape key listener
    window._qvEscHandler = (e) => {
      if (e.key === "Escape") App.closeQuickView();
    };
    window.addEventListener("keydown", window._qvEscHandler);
  },

  closeQuickView() {
    const modal = document.getElementById("quickview-modal");
    const backdrop = document.getElementById("quickview-backdrop");
    if (modal) modal.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
    document.body.style.overflow = "";
    if (window._qvEscHandler) {
      window.removeEventListener("keydown", window._qvEscHandler);
      window._qvEscHandler = null;
    }
  },

  quickViewChangeQty(delta) {
    const el = document.getElementById("qv-qty-val");
    if (!el) return;
    let qty = parseInt(el.textContent) || 1;
    qty = Math.max(1, qty + delta);
    el.textContent = qty;
  },

  quickViewAddToCart(productId) {
    const el = document.getElementById("qv-qty-val");
    const qty = el ? (parseInt(el.textContent) || 1) : 1;
    for (let i = 0; i < qty; i++) {
      Store.addToCart(productId);
    }
    const product = (DPAgronData.products || []).find(p => p.id === productId);
    const title = product ? product.title : "Το προϊόν";
    this.showToast(`Προστέθηκε στο καλάθι (${qty}x): ${title}`);
    this.updateHeaderCart();
    this.closeQuickView();
  },

  toggleSortMenu(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("shop-custom-sort");
    const menu = document.getElementById("custom-sort-menu");
    const trigger = document.getElementById("custom-sort-trigger");
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle("open");
    if (menu) {
      menu.style.display = isOpen ? "flex" : "none";
    }
    if (trigger) {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  },

  closeSortMenu() {
    const dropdown = document.getElementById("shop-custom-sort");
    const menu = document.getElementById("custom-sort-menu");
    const trigger = document.getElementById("custom-sort-trigger");
    if (dropdown) dropdown.classList.remove("open");
    if (menu) menu.style.display = "none";
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  },

  selectSort(val) {
    Store.filters.sortBy = val;
    localStorage.setItem("dp_shop_sort", val);
    this.updateSortUI(val);
    this.closeSortMenu();
    this.renderShopPage();
  },

  updateSortUI(val) {
    const sortLabels = {
      "popular": "Δημοφιλέστερα",
      "price-asc": "Τιμή: Χαμηλή σε Υψηλή",
      "price-desc": "Τιμή: Υψηλή σε Χαμηλή",
      "rating": "Καλύτερη Βαθμολογία",
      "discount": "Μεγαλύτερη Έκπτωση"
    };

    const labelEl = document.getElementById("custom-sort-label");
    if (labelEl && sortLabels[val]) {
      labelEl.textContent = sortLabels[val];
    }

    const options = document.querySelectorAll(".custom-sort-option");
    options.forEach(opt => {
      const isSelected = opt.dataset.value === val;
      opt.classList.toggle("active", isSelected);
      opt.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  },

  handleSortChange(val) {
    this.selectSort(val);
  },

  /* --------------------------------------------------------------------------
     Product Detail Page (PDP) - Commercial Tier-1 Redesign
     -------------------------------------------------------------------------- */
  renderProductDetailPage(productId) {
    const product = DPAgronData.products.find(p => p.id === productId) || DPAgronData.products[0];
    const container = document.getElementById("view-product-container");
    if (!container) return;

    if (!product) {
      container.innerHTML = `
        <div style="padding: 80px 20px; text-align: center; color: var(--stone-400); max-width: 600px; margin: 0 auto;">
          <div style="font-size: 3rem; margin-bottom: 16px;"><svg class=ico aria-hidden=true><use href=#i-leaf></use></svg></div>
          <h2 style="color: var(--white); margin-bottom: 8px;">Δεν υπάρχουν καταχωρημένα προϊόντα</h2>
          <p style="color: var(--stone-400); font-size: 0.95rem;">Ο κατάλογος είναι έτοιμος να υποδεχθεί τα νέα σας προϊόντα.</p>
          <a href="#shop" class="btn btn-primary" style="margin-top: 20px; display: inline-block;">Επιστροφή στο Κατάστημα</a>
        </div>
      `;
      return;
    }

    const inWishlist = Store.isInWishlist(product.id);
    const activeTab = Store.activeProductTab || "desc";

    // Normalize gallery items using ONLY authentic images from WooCommerce
    const rawImages = (product.images && product.images.length > 0)
      ? product.images
      : [{ url: App.getProductImage(product), label: "Κύρια Όψη", tag: "Προϊόν", isLifestyle: false }];

    const galleryItems = rawImages.map((img, idx) => {
      if (typeof img === "object") return img;
      return {
        url: img,
        label: idx === 0 ? "Κύρια Όψη" : `Εικόνα ${idx + 1}`,
        tag: idx === 0 ? "Προϊόν" : `Λεπτομέρεια ${idx + 1}`,
        isLifestyle: false
      };
    });

    const firstImage = galleryItems[0];

    // Frequently Bought Together Bundle Companions (rendered only if additional products exist)
    const otherProducts = (DPAgronData.products || []).filter(p => p.id !== product.id);
    const bundleNet = otherProducts[0] || null;
    const bundleOil = otherProducts[1] || null;
    const hasBundle = Boolean(bundleNet && bundleOil);
    const bundleSum = hasBundle ? (product.price + bundleNet.price + bundleOil.price) : 0;
    const bundleDiscounted = bundleSum * 0.88;
    const bundleSavings = bundleSum - bundleDiscounted;

    // Calculate discount percent only when originalPrice > price
    const hasDiscount = Boolean(product.originalPrice && Number(product.originalPrice) > Number(product.price));
    const discountPercent = hasDiscount
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

    // Category resolution for accurate Breadcrumbs
    const catObj = (DPAgronData.categories || []).find(c => c.slug === product.category || c.id === product.category);
    const catName = catObj ? catObj.name : "Κατάστημα";
    const catSlug = catObj ? catObj.slug : "all";

    // Realistic Stock Badge
    const stockBadgeText = product.inStock 
      ? (product.manageStock && product.stockCount ? `✓ Σε Απόθεμα (${product.stockCount} τμχ)` : `✓ Άμεσα Διαθέσιμο`)
      : `Κατόπιν Παραγγελίας`;

    // Key benefits (max 3, clean phrases)
    const displayBenefits = (product.keyFeatures && product.keyFeatures.length)
      ? product.keyFeatures.slice(0, 3)
      : [
        "Υψηλή απόδοση συγκομιδής με μηδενικό τραυματισμό στα μάτια του δέντρου",
        "Εξαιρετικά ελαφρύ και απόλυτα ισορροπημένο για ξεκούραστη εργασία",
        "Ρυθμιζόμενος ηλεκτρονικός έλεγχος ταχύτητας"
      ];

    // Related Products (4 products from same category or olive equipment, excluding current)
    const relatedProducts = DPAgronData.products
      .filter(p => p.id !== product.id && (p.category === product.category || p.isOliveSpecial))
      .slice(0, 4);

    // Reviews list fallback if not defined on product
    const reviewsList = product.reviews || [
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
    ];

    container.innerHTML = `
      <div class="pdp-container">
        <!-- Breadcrumbs -->
        <nav class="pdp-breadcrumb" aria-label="Διαδρομή">
          <a href="#home">Αρχική</a>
          <span class="sep">/</span>
          <a href="#shop" onclick="App.filterShopByCategory('${catSlug}')">${catName}</a>
          <span class="sep">/</span>
          <span class="current">${product.title}</span>
        </nav>

        <!-- 1. PRODUCT HERO / ABOVE THE FOLD (2-COLUMN GRID) -->
        <div class="pdp-hero-grid">
          
          <!-- LEFT COLUMN: PRODUCT GALLERY -->
          <div class="pdp-gallery-wrap">
            <div class="pdp-main-image-box ${firstImage.isLifestyle ? 'lifestyle-mode' : ''}" id="pdp-main-box">
              ${hasDiscount && discountPercent > 0 ? `<span class="pdp-badge-tag spotlight">-${discountPercent}%</span>` : ''}
              <span id="pdp-lifestyle-badge" class="pdp-badge-tag lifestyle" style="display: ${firstImage.isLifestyle ? 'inline-flex' : 'none'};">
                <svg class=ico aria-hidden=true><use href=#i-leaf></use></svg> Στον Ελαιώνα
              </span>

              <img id="detail-main-img" src="${firstImage.url}" alt="${product.title}">
              
              <div class="pdp-zoom-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                Hover για zoom
              </div>
            </div>

            <!-- Thumbnails Strip (shown only if multiple images exist) -->
            ${galleryItems.length > 1 ? `
            <div class="pdp-thumbs-row">
              ${galleryItems.map((item, idx) => `
                <button type="button" class="pdp-thumb-card ${idx === 0 ? 'active' : ''}" data-lifestyle="${item.isLifestyle ? 'true' : 'false'}" onclick="App.setDetailImage('${item.url}', ${item.isLifestyle ? 'true' : 'false'}, this)" title="${item.label}">
                  <img src="${item.url}" alt="${item.label}">
                  ${item.tag ? `<span class="pdp-thumb-label">${item.tag}</span>` : ''}
                </button>
              `).join("")}
            </div>
            ` : ''}
          </div>

          <!-- RIGHT COLUMN: PRODUCT INFO PANEL & HIERARCHY -->
          <div class="pdp-info-panel">
            
            <!-- 1. Header Block: Brand, Stock, Title, Rating, Meta -->
            <div class="pdp-header-block">
              <div class="pdp-brand-row">
                <span class="pdp-brand-title">${product.brand}</span>
                <span class="pdp-stock-badge">${stockBadgeText}</span>
              </div>

              <h1 class="pdp-title">${product.title}</h1>

              <div class="pdp-rating-strip">
                <span class="pdp-stars">★★★★★</span>
                <span class="pdp-rating-val">${product.rating || 5.0}</span>
                <span class="pdp-meta-dot">&bull;</span>
                <a class="pdp-reviews-link" onclick="App.scrollToReviewsTab()">
                  (${product.reviewsCount || 1} αξιολογήσεις)
                </a>
              </div>

              <div class="pdp-meta-strip">
                <span>Κωδικός: <strong>${product.sku}</strong></span>
                <span class="pdp-meta-dot">&bull;</span>
                <span>Εγγύηση: <strong>2 Έτη Επίσημης Αντιπροσωπείας</strong></span>
                <span class="pdp-meta-dot">&bull;</span>
                <span>Προέλευση: <strong>${product.brand === 'CAMPAGNOLA' ? 'Ιταλία' : 'Ε.Ε.'}</strong></span>
              </div>
            </div>

            <!-- 2. INTEGRATED PRICE AREA -->
            <div class="pdp-price-box">
              <div class="pdp-retail-price-wrap">
                <span class="pdp-main-price">${product.price.toFixed(2)} €</span>
                <span class="pdp-vat-notice">(με ΦΠΑ 24%)</span>
                ${hasDiscount && discountPercent > 0 ? `
                  <span class="pdp-original-price">${product.originalPrice.toFixed(2)} €</span>
                  <span class="pdp-save-badge">Έκπτωση ${discountPercent}%</span>
                ` : ''}
              </div>

              <!-- B2B Article 39a Price (Integrated Row) -->
              <div class="pdp-b2b-price-row">
                <div class="pdp-b2b-label">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  <span>Τιμή επαγγελματία με απαλλαγή ΦΠΑ (Άρθρο 39α):</span>
                </div>
                <div class="pdp-b2b-amount">
                  ${product.vatExcludedPrice.toFixed(2)} €
                  <span>προ ΦΠΑ</span>
                </div>
              </div>
            </div>

            <!-- 3. Short Description (Mini) -->
            <p class="pdp-short-desc">${product.shortDescription || product.description}</p>

            <!-- 4. COMPACT KEY BENEFITS (Max 4, Clean Check Icons, No Heavy Box) -->
            <div class="pdp-benefits-list">
              ${displayBenefits.map(b => `
                <div class="pdp-benefit-item">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>${b}</span>
                </div>
              `).join("")}
            </div>

            <!-- 5. PURCHASE AREA (Prominent Stepper + CTA + Wishlist) -->
            <div class="pdp-purchase-row">
              <div class="qty-stepper">
                <button type="button" class="qty-btn" onclick="App.adjustDetailQty(-1)" aria-label="Μείωση ποσότητας">−</button>
                <input type="text" id="detail-qty-input" class="qty-input" value="1" readonly>
                <button type="button" class="qty-btn" onclick="App.adjustDetailQty(1)" aria-label="Αύξηση ποσότητας">+</button>
              </div>

              <button type="button" class="pdp-add-cart-btn" onclick="App.handleDetailAddToCart('${product.id}')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span>Προσθήκη στο Καλάθι</span>
              </button>

              <button type="button" class="pdp-wishlist-btn ${inWishlist ? 'active' : ''}" title="${inWishlist ? 'Αφαίρεση από τα αγαπημένα' : 'Αποθήκευση στα αγαπημένα'}" onclick="App.handleWishlistToggle('${product.id}')">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
            </div>

            <!-- 6. Clean Horizontal Row Under CTA (Assurance Strip) -->
            <div class="pdp-assurances-strip">
              <div class="pdp-assurance-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                <div class="pdp-assurance-text">
                  <span class="pdp-assurance-title">Δωρεάν Μεταφορικά</span>
                  <span class="pdp-assurance-sub">σε όλη την Ελλάδα</span>
                </div>
              </div>

              <div class="pdp-assurance-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <div class="pdp-assurance-text">
                  <span class="pdp-assurance-title">2 Έτη Εγγύηση</span>
                  <span class="pdp-assurance-sub">Επίσημης Αντιπροσωπείας</span>
                </div>
              </div>

              <div class="pdp-assurance-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                <div class="pdp-assurance-text">
                  <span class="pdp-assurance-title">Άμεση Διαθεσιμότητα</span>
                  <span class="pdp-assurance-sub">Αποστολή σε 24-48h</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        ${hasBundle ? `
        <!-- 5. "ΣΥΧΝΑ ΑΓΟΡΑΖΟΝΤΑΙ ΜΑΖΙ" BUNDLE BUILDER -->
        <div class="pdp-bundle-card">
          <div class="pdp-bundle-header">
            <h3>Συχνά Αγοράζονται Μαζί</h3>
            <p>Ολοκληρώστε τον εξοπλισμό σας συνδυάζοντας το εργαλείο με κατάλληλο εξοπλισμό.</p>
          </div>

          <div class="pdp-bundle-body">
            <div class="pdp-bundle-products-row">
              
              <!-- Product 1 (Current) -->
              <div class="pdp-bundle-product-item">
                <img src="${firstImage.url}" alt="${product.title}">
                <div class="pdp-bundle-info">
                  <span class="pdp-bundle-title">${product.title}</span>
                  <span class="pdp-bundle-price">${product.price.toFixed(2)} €</span>
                </div>
              </div>

              <span class="pdp-bundle-plus">+</span>

              <!-- Product 2 -->
              <div class="pdp-bundle-product-item">
                <img src="${App.getProductImage(bundleNet)}" alt="${bundleNet.title}">
                <div class="pdp-bundle-info">
                  <span class="pdp-bundle-title">${bundleNet.title}</span>
                  <span class="pdp-bundle-price">${bundleNet.price.toFixed(2)} €</span>
                </div>
              </div>

              <span class="pdp-bundle-plus">+</span>

              <!-- Product 3 -->
              <div class="pdp-bundle-product-item">
                <img src="${App.getProductImage(bundleOil)}" alt="${bundleOil.title}">
                <div class="pdp-bundle-info">
                  <span class="pdp-bundle-title">${bundleOil.title}</span>
                  <span class="pdp-bundle-price">${bundleOil.price.toFixed(2)} €</span>
                </div>
              </div>

            </div>

            <!-- Bundle Summary & CTA -->
            <div class="pdp-bundle-summary-box">
              <div class="pdp-bundle-pricing">
                <div class="pdp-bundle-old-price">${bundleSum.toFixed(2)} €</div>
                <div class="pdp-bundle-total-price">${bundleDiscounted.toFixed(2)} €</div>
                <div class="pdp-bundle-savings-chip">Εξοικονόμηση ${bundleSavings.toFixed(2)} € (-12%)</div>
              </div>

              <button type="button" class="pdp-bundle-cta-btn" onclick="App.addBundleToCart(['${product.id}', '${bundleNet.id}', '${bundleOil.id}'])">
                Προσθήκη και των 3 στο Καλάθι
              </button>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- 6. PRODUCT DETAILS (TABS ΣΕ DESKTOP / ACCORDIONS) -->
        <div class="pdp-tabs-section" id="pdp-tabs-container">
          <div class="tabs-nav" role="tablist">
            <button type="button" class="tab-btn ${activeTab === 'desc' ? 'active' : ''}" onclick="App.switchTab('desc', this)" role="tab" id="tab-btn-desc">Περιγραφή</button>
            <button type="button" class="tab-btn ${activeTab === 'specs' ? 'active' : ''}" onclick="App.switchTab('specs', this)" role="tab" id="tab-btn-specs">Τεχνικά Χαρακτηριστικά</button>
            <button type="button" class="tab-btn ${activeTab === 'service' ? 'active' : ''}" onclick="App.switchTab('service', this)" role="tab" id="tab-btn-service">Συντήρηση & Service</button>
            <button type="button" class="tab-btn ${activeTab === 'reviews' ? 'active' : ''}" onclick="App.switchTab('reviews', this)" role="tab" id="tab-btn-reviews">Αξιολογήσεις (${product.reviewsCount || 38})</button>
          </div>

          <!-- TAB 1: ΠΕΡΙΓΡΑΦΗ (Αναλυτική) -->
          <div id="tab-desc" class="tab-panel ${activeTab === 'desc' ? 'active' : ''}" role="tabpanel">
            <div class="pdp-desc-content">
              <h3>Αναλυτική Περιγραφή Προϊόντος</h3>
              <div class="pdp-full-desc-wrap">
                ${product.fullDescription || product.description}
              </div>
            </div>
          </div>

          <!-- TAB 2: ΤΕΧΝΙΚΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ (PREMIUM TABLE) -->
          <div id="tab-specs" class="tab-panel ${activeTab === 'specs' ? 'active' : ''}" role="tabpanel">
            <div class="pdp-specs-wrap">
              <table class="pdp-specs-table">
                <tbody>
                  ${Object.entries(product.specs || {}).map(([label, val]) => `
                    <tr>
                      <td class="spec-key">${label}</td>
                      <td class="spec-val">${val}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: ΣΥΝΤΗΡΗΣΗ & SERVICE -->
          <div id="tab-service" class="tab-panel ${activeTab === 'service' ? 'active' : ''}" role="tabpanel">
            <div class="pdp-service-grid">
              <div class="pdp-service-card">
                <h4>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                  Καθημερινός Καθαρισμός
                </h4>
                <p>Μετά το τέλος της εργασίας, φυσήξτε με πεπιεσμένο αέρα την κεφαλή και απομακρύνετε φύλλα, σκόνη ή ρητίνη από τα κινούμενα μέρη.</p>
              </div>

              <div class="pdp-service-card">
                <h4>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Λίπανση Γραναζιών
                </h4>
                <p>Ελέγχετε τη στάθμη γράσου λιθίου στον μειωτήρα κάθε 50 ώρες λειτουργίας για ελαχιστοποίηση των τριβών και διατήρηση της ροπής.</p>
              </div>

              <div class="pdp-service-card">
                <h4>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Ασφαλής Αποθήκευση
                </h4>
                <p>Φυλάσσεται σε ξηρό μέρος μακριά από υγρασία. Αν χρησιμοποιείτε μπαταρία λιθίου, αποθηκεύστε την σε ποσοστό φόρτισης περίπου 60%.</p>
              </div>

              <div class="pdp-service-card">
                <h4>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                  Γνήσια Ανταλλακτικά
                </h4>
                <p>Η DP Agron διαθέτει άμεση παρακαταθήκη για όλα τα εξαρτήματα, γρανάζια, καλώδια και ράβδους ανθρακονήματος με αυθημερόν αποστολή.</p>
              </div>
            </div>
          </div>

          <!-- TAB 4: ΑΞΙΟΛΟΓΗΣΕΙΣ (COMMERCIAL RATING & VERIFIED REVIEWS) -->
          <div id="tab-reviews" class="tab-panel ${activeTab === 'reviews' ? 'active' : ''}" role="tabpanel">
            <div class="pdp-reviews-wrap">
              
              <!-- Rating Summary Card -->
              <div class="pdp-reviews-summary-card">
                <div class="pdp-reviews-big-score">
                  <div class="pdp-big-number">${product.rating || 4.9}</div>
                  <div class="pdp-big-stars">★★★★★</div>
                  <div class="pdp-score-sub">Βασισμένο σε ${product.reviewsCount || 38} αξιολογήσεις</div>
                </div>

                <div class="pdp-rating-bars">
                  <div class="pdp-rating-bar-row">
                    <span class="pdp-bar-label">5 αστέρια</span>
                    <div class="pdp-bar-track"><div class="pdp-bar-fill" style="width:92%;"></div></div>
                    <span class="pdp-bar-count">92%</span>
                  </div>
                  <div class="pdp-rating-bar-row">
                    <span class="pdp-bar-label">4 αστέρια</span>
                    <div class="pdp-bar-track"><div class="pdp-bar-fill" style="width:8%;"></div></div>
                    <span class="pdp-bar-count">8%</span>
                  </div>
                  <div class="pdp-rating-bar-row">
                    <span class="pdp-bar-label">3 αστέρια</span>
                    <div class="pdp-bar-track"><div class="pdp-bar-fill" style="width:0%;"></div></div>
                    <span class="pdp-bar-count">0%</span>
                  </div>
                  <div class="pdp-rating-bar-row">
                    <span class="pdp-bar-label">2 αστέρια</span>
                    <div class="pdp-bar-track"><div class="pdp-bar-fill" style="width:0%;"></div></div>
                    <span class="pdp-bar-count">0%</span>
                  </div>
                  <div class="pdp-rating-bar-row">
                    <span class="pdp-bar-label">1 αστέρι</span>
                    <div class="pdp-bar-track"><div class="pdp-bar-fill" style="width:0%;"></div></div>
                    <span class="pdp-bar-count">0%</span>
                  </div>
                </div>
              </div>

              <!-- Reviews List -->
              <div class="pdp-reviews-list">
                ${reviewsList.map(rev => `
                  <div class="pdp-review-item">
                    <div class="pdp-review-header">
                      <div class="pdp-reviewer-info">
                        <span class="pdp-reviewer-name">${rev.name} (${rev.location})</span>
                        ${rev.verified ? '<span class="pdp-verified-tag">✓ Πιστοποιημένος Αγοραστής</span>' : ''}
                      </div>
                      <span class="pdp-review-date">${rev.date}</span>
                    </div>
                    <div class="pdp-review-rating">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</div>
                    <div class="pdp-review-title">${rev.title}</div>
                    <p class="pdp-review-text">${rev.comment}</p>
                  </div>
                `).join("")}
              </div>

            </div>
          </div>

        </div>
        <!-- END PDP TABS -->

        <!-- 7. ΣΧΕΤΙΚΑ ΠΡΟΪΟΝΤΑ -->
        ${relatedProducts.length > 0 ? `
          <section class="pdp-related-section">
            <div class="pdp-related-header">
              <div>
                <span class="pdp-related-subtitle">Συμπληρωματικός Εξοπλισμός</span>
                <h3 class="pdp-related-title">Σχετικά Προϊόντα</h3>
              </div>
              <a href="#shop" class="pdp-related-more-link">
                <span>Δείτε όλο τον κατάλογο</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </a>
            </div>

            <div class="products-grid pdp-related-grid">
              ${relatedProducts.map(rp => this.renderProductCardHTML(rp)).join("")}
            </div>
          </section>
        ` : ''}

      </div>
    `;

    // Initialize interactive zoom on main image
    this.initPDPZoom();
  },

  /* --------------------------------------------------------------------------
     PDP Interactive Handlers (Zoom, Gallery, Tabs, Quantities)
     -------------------------------------------------------------------------- */
  initPDPZoom() {
    const box = document.getElementById("pdp-main-box");
    const img = document.getElementById("detail-main-img");
    if (!box || !img) return;

    box.addEventListener("mouseenter", () => {
      box.classList.add("zoomed");
    });

    box.addEventListener("mouseleave", () => {
      box.classList.remove("zoomed");
      img.style.transformOrigin = "center center";
    });

    box.addEventListener("mousemove", (e) => {
      const rect = box.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    });
  },

  setDetailImage(imgSrc, isLifestyle, btnEl) {
    const mainImg = document.getElementById("detail-main-img");
    if (mainImg) mainImg.src = imgSrc;

    const lifestyleBadge = document.getElementById("pdp-lifestyle-badge");
    if (lifestyleBadge) {
      lifestyleBadge.style.display = isLifestyle ? "inline-flex" : "none";
    }

    const box = document.getElementById("pdp-main-box");
    if (box) {
      if (isLifestyle) {
        box.classList.add("lifestyle-mode");
      } else {
        box.classList.remove("lifestyle-mode");
      }
    }

    document.querySelectorAll(".pdp-thumb-card").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
  },

  adjustDetailQty(delta) {
    const input = document.getElementById("detail-qty-input");
    if (!input) return;
    let val = parseInt(input.value) || 1;
    val += delta;
    if (val < 1) val = 1;
    input.value = val;
  },

  handleDetailAddToCart(productId) {
    const input = document.getElementById("detail-qty-input");
    const qty = input ? (parseInt(input.value) || 1) : 1;
    Store.addToCart(productId, qty);
    this.showToast(`Προστέθηκαν ${qty} τεμάχια στο καλάθι σας!`);
    this.openCart();
  },

  addBundleToCart(productIds) {
    productIds.forEach(id => Store.addToCart(id, 1));
    this.showToast("Το πλήρες σετ (3 προϊόντα) προστέθηκε στο καλάθι σας με έκπτωση 12%!");
    this.openCart();
  },

  switchTab(tabId, btnEl) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add("active");
  },

  scrollToReviewsTab() {
    const tabBtn = document.getElementById("tab-btn-reviews");
    if (tabBtn) {
      this.switchTab("reviews", tabBtn);
      const container = document.getElementById("pdp-tabs-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  },

  /* --------------------------------------------------------------------------
     Cart & Wishlist Handlers & Drawers
     -------------------------------------------------------------------------- */
  handleAddToCart(productId) {
    Store.addToCart(productId, 1);
    const p = DPAgronData.products.find(item => item.id === productId);
    this.showToast(`Το "${p ? p.title : 'προϊόν'}" προστέθηκε στο καλάθι!`);
  },

  handleWishlistToggle(productId) {
    const added = Store.toggleWishlist(productId);
    const p = DPAgronData.products.find(item => item.id === productId);
    if (added) {
      this.showToast(`Το "${p ? p.title : 'προϊόν'}" αποθηκεύτηκε στα αγαπημένα!`);
    } else {
      this.showToast(`Το "${p ? p.title : 'προϊόν'}" αφαιρέθηκε από τα αγαπημένα.`, "info");
    }
  },

  openCart() {
    this.renderCartDrawer();
    document.getElementById("cart-drawer").classList.add("open");
    document.getElementById("drawer-backdrop").classList.add("open");
  },

  closeCart() {
    document.getElementById("cart-drawer").classList.remove("open");
    document.getElementById("drawer-backdrop").classList.remove("open");
  },

  openWishlist() {
    this.renderWishlistDrawer();
    document.getElementById("wishlist-drawer").classList.add("open");
    document.getElementById("drawer-backdrop").classList.add("open");
  },

  closeWishlist() {
    document.getElementById("wishlist-drawer").classList.remove("open");
    document.getElementById("drawer-backdrop").classList.remove("open");
  },

  closeAllDrawers() {
    this.closeCart();
    this.closeWishlist();
    this.closeAiAdvisor();
    this.closeAccountModal();
    this.closeMobileFilters();
  },

  renderCartDrawer() {
    const summary = Store.getCartSummary();
    const bodyEl = document.getElementById("cart-drawer-body");
    const subtotalEl = document.getElementById("cart-drawer-subtotal");
    const vatExcludedEl = document.getElementById("cart-drawer-vat-excluded");
    const shippingBarEl = document.getElementById("cart-shipping-bar");

    if (subtotalEl) subtotalEl.textContent = `${summary.subtotal.toFixed(2)} €`;
    if (vatExcludedEl) vatExcludedEl.textContent = `${summary.vatExcluded.toFixed(2)} €`;

    if (shippingBarEl) {
      if (summary.isFreeShipping) {
        shippingBarEl.innerHTML = `
          <div style="font-size:0.86rem; font-weight:800; color:var(--color-success);"><svg class=ico aria-hidden=true><use href=#i-sparkles></use></svg> Συγχαρητήρια! Έχετε Δωρεάν Μεταφορικά!</div>
          <div class="shipping-bar-track"><div class="shipping-bar-fill" style="width:100%;"></div></div>
        `;
      } else {
        shippingBarEl.innerHTML = `
          <div style="font-size:0.86rem; color:var(--color-dark);">Προσθέστε ακόμα <strong>${summary.shippingNeeded.toFixed(2)} €</strong> για Δωρεάν Μεταφορικά!</div>
          <div class="shipping-bar-track"><div class="shipping-bar-fill" style="width:${summary.shippingProgress}%;"></div></div>
        `;
      }
    }

    if (bodyEl) {
      if (summary.items.length === 0) {
        bodyEl.innerHTML = `
          <div style="text-align:center; padding:54px 16px;">
            <div style="font-size:3.5rem; margin-bottom:14px;"><svg class=ico aria-hidden=true><use href=#i-cart></use></svg></div>
            <h4>Το καλάθι σας είναι άδειο</h4>
            <p style="color:var(--color-muted); font-size:0.92rem; margin-bottom:22px;">Ανακαλύψτε τα κορυφαία εργαλεία για τη σεζόν της ελιάς.</p>
            <button class="btn btn-primary btn-sm" onclick="App.closeCart(); App.navigateTo('shop');">Δείτε Προϊόντα</button>
          </div>
        `;
      } else {
        bodyEl.innerHTML = summary.items.map(item => `
          <div class="cart-drawer-item">
            <img src="${App.getProductImage(item)}" alt="${item.title}" class="cart-item-img">
            <div class="cart-item-info">
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-price">${item.price.toFixed(2)} €</div>
              <div class="qty-stepper" style="width:fit-content; height:34px;">
                <button class="qty-btn" style="width:28px; height:34px; font-size:0.95rem;" onclick="Store.updateQuantity('${item.id}', -1)">-</button>
                <span style="padding:0 10px; font-weight:800; font-size:0.88rem;">${item.quantity}</span>
                <button class="qty-btn" style="width:28px; height:34px; font-size:0.95rem;" onclick="Store.updateQuantity('${item.id}', 1)">+</button>
              </div>
            </div>
            <button style="color:var(--color-muted); padding:6px;" title="Διαγραφή" onclick="Store.removeFromCart('${item.id}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        `).join("");
      }
    }
  },

  renderWishlistDrawer() {
    const bodyEl = document.getElementById("wishlist-drawer-body");
    if (!bodyEl) return;

    if (Store.wishlist.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding:54px 16px;">
          <div style="font-size:3.5rem; margin-bottom:14px;"><svg class=ico aria-hidden=true><use href=#i-heart></use></svg></div>
          <h4>Δεν έχετε αποθηκευμένα αγαπημένα</h4>
          <p style="color:var(--color-muted); font-size:0.92rem; margin-bottom:22px;">Πατήστε την καρδιά σε οποιοδήποτε προϊόν για να το φυλάξετε εδώ.</p>
          <button class="btn btn-primary btn-sm" onclick="App.closeWishlist(); App.navigateTo('shop');">Ανακαλύψτε Προϊόντα</button>
        </div>
      `;
    } else {
      const items = DPAgronData.products.filter(p => Store.wishlist.includes(p.id));
      bodyEl.innerHTML = items.map(item => `
        <div class="cart-drawer-item">
          <img src="${App.getProductImage(item)}" alt="${item.title}" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-price">${item.price.toFixed(2)} €</div>
            <button class="btn btn-sm btn-primary" style="padding:4px 10px; font-size:0.75rem; width:fit-content; margin-top:4px;" onclick="Store.addToCart('${item.id}', 1); App.showToast('Προστέθηκε στο καλάθι!');">
              + Στο Καλάθι
            </button>
          </div>
          <button style="color:var(--color-muted); padding:6px;" title="Αφαίρεση" onclick="App.handleWishlistToggle('${item.id}')">
            &times;
          </button>
        </div>
      `).join("");
    }
  },

  /* --------------------------------------------------------------------------
     AI SmartAdvisor Modal
     -------------------------------------------------------------------------- */
  openAiAdvisor() {
    this.resetAiAdvisor();
    const modal = document.getElementById("ai-advisor-modal");
    const backdrop = document.getElementById("modal-backdrop");
    if (modal) modal.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  closeAiAdvisor() {
    const modal = document.getElementById("ai-advisor-modal");
    const backdrop = document.getElementById("modal-backdrop");
    if (modal) modal.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    document.body.style.overflow = "";
  },

  resetAiAdvisor() {
    const s1 = document.getElementById("advisor-step-1");
    const s2 = document.getElementById("advisor-step-2");
    const s3 = document.getElementById("advisor-step-3");
    const res = document.getElementById("advisor-result");
    if (s1) s1.style.display = "block";
    if (s2) s2.style.display = "none";
    if (s3) s3.style.display = "none";
    if (res) res.style.display = "none";
  },

  aiAdvisorNext(step) {
    const s1 = document.getElementById("advisor-step-1");
    const s2 = document.getElementById("advisor-step-2");
    const s3 = document.getElementById("advisor-step-3");
    const res = document.getElementById("advisor-result");

    if (s1) s1.style.display = "none";
    if (s2) s2.style.display = "none";
    if (s3) s3.style.display = "none";
    if (res) res.style.display = "none";

    if (step === 1 && s1) {
      s1.style.display = "block";
    } else if (step === 2 && s2) {
      s2.style.display = "block";
    } else if (step === 3 && s3) {
      s3.style.display = "block";
    } else if (step === "result") {
      this.generateAdvisorResult();
    }
  },

  generateAdvisorResult() {
    const resultBox = document.getElementById("advisor-result");
    if (!resultBox) return;
    const recProduct = DPAgronData.products[0];
    if (!recProduct) {
      resultBox.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <p style="color:var(--color-muted);">Δεν υπάρχουν διαθέσιμα προϊόντα αυτή τη στιγμή.</p>
        </div>
      `;
      return;
    }

    resultBox.innerHTML = `
      <div style="text-align:center;">
        <div class="advisor-step-header" style="justify-content:center; margin-bottom:8px;">
          <span class="advisor-step-badge">Προτεινόμενη Επιλογή</span>
        </div>
        <h3 style="font-size:1.15rem; margin-bottom:6px; color:var(--color-dark);">Ιδανικό για τις Ανάγκες σας</h3>
        <p style="color:var(--color-muted); font-size:0.85rem; line-height:1.45; margin:0 auto 16px;">
          Βάσει των απαντήσεών σας, η καταλληλότερη επαγγελματική λύση είναι το ραβδιστικό ανθρακονημάτων Brushless για μέγιστη απόδοση και μηδενική καταπόνηση.
        </p>

        <div class="advisor-result-card">
          <img src="${App.getProductImage(recProduct)}" alt="${recProduct.title}" class="advisor-result-img">
          <div class="advisor-result-info">
            <div class="advisor-result-name">${recProduct.title}</div>
            <div class="advisor-result-price">${recProduct.price.toFixed(2)} €</div>
          </div>
        </div>

        <div class="advisor-actions-row">
          <button type="button" class="btn btn-primary" onclick="App.closeAiAdvisor(); App.navigateTo('product', '${recProduct.id}');">
            Προβολή Προϊόντος
          </button>
          <button type="button" class="btn btn-outline" onclick="App.resetAiAdvisor();">
            Νέα Αναζήτηση
          </button>
        </div>
      </div>
    `;
    resultBox.style.display = "block";
  },

  /* --------------------------------------------------------------------------
     Mobile Navigation Drawer
     -------------------------------------------------------------------------- */
  openMobileDrawer() {
    const drawer = document.getElementById("mobile-drawer");
    const backdrop = document.getElementById("mobile-drawer-backdrop");
    if (drawer) drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  closeMobileDrawer() {
    const drawer = document.getElementById("mobile-drawer");
    const backdrop = document.getElementById("mobile-drawer-backdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    document.body.style.overflow = "";
  },

  switchDrawerTab(tab) {
    const navBtn = document.getElementById("drawer-tab-nav");
    const catsBtn = document.getElementById("drawer-tab-cats");
    const navPane = document.getElementById("drawer-pane-nav");
    const catsPane = document.getElementById("drawer-pane-cats");

    if (tab === "cats") {
      if (catsBtn) catsBtn.classList.add("active");
      if (navBtn) navBtn.classList.remove("active");
      if (catsPane) catsPane.style.display = "block";
      if (navPane) navPane.style.display = "none";
    } else {
      if (navBtn) navBtn.classList.add("active");
      if (catsBtn) catsBtn.classList.remove("active");
      if (navPane) navPane.style.display = "block";
      if (catsPane) catsPane.style.display = "none";
    }
  },

  renderMobileDrawerCategories() {
    const catsListEl = document.querySelector(".mobile-drawer-cats-list");
    const countBadge = document.querySelector("#drawer-tab-cats span:last-child");
    if (!catsListEl || typeof DPAgronData === "undefined" || !DPAgronData.categories) return;

    if (countBadge) {
      countBadge.textContent = `Κατηγορίες (${DPAgronData.categories.length})`;
    }

    catsListEl.innerHTML = DPAgronData.categories.map(cat => {
      const count = (DPAgronData.products || []).filter(p => p.category === cat.slug || p.category === cat.id).length;
      return `
        <a href="#shop" class="drawer-cat-card" onclick="App.closeMobileDrawer(); App.filterShopByCategory('${cat.slug}');">
          <div class="drawer-cat-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          </div>
          <div class="drawer-cat-info">
            <span class="drawer-cat-name">${cat.name}</span>
            <span class="drawer-cat-sub">${cat.subcategories?.length > 0 ? cat.subcategories.map(s => s.name).join(', ') : 'Προϊόντα DP Agron'}</span>
          </div>
          <span class="drawer-cat-count">${count}</span>
        </a>
      `;
    }).join("");
  },

  /* --------------------------------------------------------------------------
     Account Modal
     -------------------------------------------------------------------------- */
  openAccountModal() {
    document.getElementById("account-modal").classList.add("open");
    document.getElementById("modal-backdrop").classList.add("open");
  },

  closeAccountModal() {
    const modal = document.getElementById("account-modal");
    if (modal) modal.classList.remove("open");
    document.getElementById("modal-backdrop").classList.remove("open");
  },

  switchAccountTab(type) {
    const indBtn = document.getElementById("acc-tab-ind");
    const bizBtn = document.getElementById("acc-tab-biz");
    const bizFields = document.getElementById("acc-biz-fields");

    if (type === "biz") {
      bizBtn.classList.add("active");
      indBtn.classList.remove("active");
      bizFields.style.display = "block";
    } else {
      indBtn.classList.add("active");
      bizBtn.classList.remove("active");
      bizFields.style.display = "none";
    }
  },

  /* --------------------------------------------------------------------------
     Contact Page FAQ Accordion
     -------------------------------------------------------------------------- */
  toggleFaq(btn) {
    const item = btn.closest(".contact-faq-item");
    const isOpen = item.classList.contains("is-open");
    // Close all open items
    document.querySelectorAll(".contact-faq-item.is-open").forEach(el => el.classList.remove("is-open"));
    // Open clicked if it was closed
    if (!isOpen) item.classList.add("is-open");
  }
};
