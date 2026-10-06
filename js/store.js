/* ==========================================================================
   DP AGRON - CLIENT STATE STORE
   Cart, Wishlist, Filter Engine, Router State
   ========================================================================== */

class DPStore {
  constructor() {
    this.cart = this.loadState("dp_agron_cart", []);
    this.wishlist = this.loadState("dp_agron_wishlist", []);
    
    this.filters = {
      category: "all",
      subcategory: "all",
      brands: [],
      priceMin: 0,
      priceMax: 1500,
      powerSource: "all",
      usageLevel: "all",
      inStockOnly: false,
      searchQuery: "",
      sortBy: "popular"
    };

    this.currentRoute = "home";
    this.activeProductId = (typeof DPAgronData !== "undefined" && DPAgronData.products?.[0]?.id) || "13";
    this.freeShippingThreshold = 150.00;

    this.listeners = [];
  }

  loadState(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Filter out old mockup IDs starting with "prod-"
        const cleaned = parsed.filter(item => {
          const id = typeof item === "string" ? item : item?.id;
          return id && !String(id).startsWith("prod-");
        });
        return cleaned;
      }
      return parsed;
    } catch (e) {
      return fallback;
    }
  }

  saveState(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage write failed", e);
    }
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  }

  /* Cart Methods */
  addToCart(productId, qty = 1) {
    const existing = this.cart.find(item => item.id === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.cart.push({ id: productId, quantity: qty });
    }
    this.saveState("dp_agron_cart", this.cart);
    this.notify("cart_updated", this.getCartSummary());
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    this.saveState("dp_agron_cart", this.cart);
    this.notify("cart_updated", this.getCartSummary());
  }

  updateQuantity(productId, delta) {
    const item = this.cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(productId);
    } else {
      this.saveState("dp_agron_cart", this.cart);
      this.notify("cart_updated", this.getCartSummary());
    }
  }

  getCartSummary() {
    let count = 0;
    let subtotal = 0;
    const detailedItems = [];

    this.cart.forEach(cItem => {
      const product = DPAgronData.products.find(p => p.id === cItem.id);
      if (product) {
        count += cItem.quantity;
        const lineTotal = product.price * cItem.quantity;
        subtotal += lineTotal;
        detailedItems.push({
          ...product,
          quantity: cItem.quantity,
          lineTotal
        });
      }
    });

    const isFreeShipping = subtotal >= this.freeShippingThreshold;
    const shippingNeeded = isFreeShipping ? 0 : (this.freeShippingThreshold - subtotal);
    const shippingProgress = Math.min(100, (subtotal / this.freeShippingThreshold) * 100);

    return {
      items: detailedItems,
      count,
      subtotal,
      vatExcluded: subtotal / 1.24,
      isFreeShipping,
      shippingNeeded,
      shippingProgress
    };
  }

  /* Wishlist Methods */
  toggleWishlist(productId) {
    const index = this.wishlist.indexOf(productId);
    let added = false;
    if (index > -1) {
      this.wishlist.splice(index, 1);
    } else {
      this.wishlist.push(productId);
      added = true;
    }
    this.saveState("dp_agron_wishlist", this.wishlist);
    this.notify("wishlist_updated", { list: this.wishlist, added, productId });
    return added;
  }

  isInWishlist(productId) {
    return this.wishlist.includes(productId);
  }

  /* Product Filtering */
  getFilteredProducts() {
    let list = [...DPAgronData.products];

    // Category
    if (this.filters.category && this.filters.category !== "all") {
      list = list.filter(p => p.category === this.filters.category);
    }

    // Subcategory
    if (this.filters.subcategory && this.filters.subcategory !== "all") {
      list = list.filter(p => p.subcategory === this.filters.subcategory);
    }

    // Brands
    if (this.filters.brands.length > 0) {
      list = list.filter(p => this.filters.brands.includes(p.brand));
    }

    // Price
    list = list.filter(p => p.price >= this.filters.priceMin && p.price <= this.filters.priceMax);

    // Power source
    if (this.filters.powerSource && this.filters.powerSource !== "all") {
      list = list.filter(p => p.powerSource.toLowerCase().includes(this.filters.powerSource.toLowerCase()));
    }

    // Usage level
    if (this.filters.usageLevel && this.filters.usageLevel !== "all") {
      list = list.filter(p => p.usageLevel === this.filters.usageLevel);
    }

    // In stock
    if (this.filters.inStockOnly) {
      list = list.filter(p => p.inStock);
    }

    // Search query
    if (this.filters.searchQuery.trim()) {
      const q = this.filters.searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (this.filters.sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (this.filters.sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (this.filters.sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (this.filters.sortBy === "discount") {
      list.sort((a, b) => {
        const discA = a.originalPrice ? (a.originalPrice - a.price) : 0;
        const discB = b.originalPrice ? (b.originalPrice - b.price) : 0;
        return discB - discA;
      });
    }

    return list;
  }

  resetFilters() {
    this.filters = {
      category: "all",
      subcategory: "all",
      brands: [],
      priceMin: 0,
      priceMax: 1500,
      powerSource: "all",
      usageLevel: "all",
      inStockOnly: false,
      searchQuery: "",
      sortBy: "popular"
    };
    this.notify("filters_changed");
  }
}

const Store = new DPStore();
