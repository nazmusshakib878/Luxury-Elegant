/**
 * Luxury & Elegant — Frontend Storefront Application
 */

// Utility Selectors and LocalStorage Helpers
const $ = (selector) => document.querySelector(selector);
const app = $('#app');

const loadStorage = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

// Centralized API Client
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('tok');
  const response = await fetch('/api' + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: 'Bearer ' + token }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
};

// State Management
let cart = loadStorage('cart', []);
let wish = loadStorage('wish', []);
let user = loadStorage('user', null);
let cfg = {
  shop_name: 'Luxury & Elegant',
  whatsapp: '8801700000000',
  ship_dhaka: 60,
  ship_outside: 120,
  free_ship: 3000,
};
let cats = [];
let queryState = { search: '', cat: '', sort: '', min: '', max: '' };

// Formatting Utilities
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f5f3ef'/%3E%3Ccircle cx='200' cy='200' r='75' fill='%23e7e2d9'/%3E%3Cpath d='M200 155 L235 200 L200 245 L165 200 Z' fill='%23c8a24a' opacity='0.75'/%3E%3Ctext x='200' y='300' font-family='sans-serif' font-size='12' font-weight='600' fill='%2378716c' text-anchor='middle' letter-spacing='2'%3ELUXURY %26 ELEGANT%3C/text%3E%3C/svg%3E";
const money = (n) => '৳' + Math.round(n || 0).toLocaleString('en-IN');
const img = (product) => {
  if (!product) return FALLBACK_IMG;
  const raw = (product.image || '').split(',')[0].trim();
  if (!raw) return FALLBACK_IMG;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return raw.startsWith('images/') ? '/' + raw : '/images/' + raw;
};
const stars = (rating) => '★'.repeat(Math.round(rating || 0)) + '☆'.repeat(5 - Math.round(rating || 0));

const esc = (str) =>
  String(str ?? '').replace(/[&<>"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[c]));

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-stone-200 text-stone-600',
  refunded: 'bg-rose-100 text-rose-700',
};

// Persist Cart & Wishlist State
const save = () => {
  localStorage.setItem('cart', JSON.stringify(cart));
  localStorage.setItem('wish', JSON.stringify(wish));

  const count = cart.reduce((total, item) => total + item.qty, 0);
  const cartBadge = $('#cb');
  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.classList.toggle('hidden', count === 0);
  }

  const wishBadge = $('#wb');
  if (wishBadge) {
    wishBadge.textContent = wish.length;
    wishBadge.classList.toggle('hidden', wish.length === 0);
  }
};

// Toast Notifications
const toast = (message) => {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 2400);
};

// Slide-out Cart Drawer
function drawer(isOpen) {
  const drawerEl = $('#drawer');
  const overlayEl = $('#ov');
  if (drawerEl) drawerEl.style.transform = isOpen ? 'translateX(0)' : '';
  if (overlayEl) overlayEl.classList.toggle('hidden', !isOpen);
  if (isOpen) renderCart();
}

function renderCart() {
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const cartBody = $('#cartbody');
  const cartFoot = $('#cartfoot');

  if (!cart.length) {
    cartBody.innerHTML = `
      <div class="mt-24 text-center">
        <p class="text-4xl">🛍️</p>
        <p class="mt-3 text-stone-500 font-medium">Your cart is empty</p>
        <button onclick="drawer(0)" class="btn btn-o mt-4 !py-2 text-sm">Continue Shopping</button>
      </div>`;
    cartFoot.innerHTML = '';
    return;
  }

  cartBody.innerHTML = cart
    .map(
      (item, index) => `
      <div class="mb-4 flex gap-3 pb-3 border-b border-stone-100">
        <img src="${item.image}" class="h-20 w-20 rounded-xl object-cover" alt="${esc(item.name)}">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-stone-800 leading-tight truncate">${esc(item.name)}</p>
          <p class="text-xs text-stone-500 mt-0.5">${esc(item.variant || '')}</p>
          <p class="mt-1 text-sm font-semibold text-brand">${money(item.price)}</p>
          <div class="mt-2 inline-flex items-center rounded-full border border-stone-200 bg-white">
            <button class="px-2.5 py-0.5 text-stone-600 hover:text-black font-semibold" onclick="updateQty(${index}, -1)">−</button>
            <span class="w-7 text-center text-xs font-semibold">${item.qty}</span>
            <button class="px-2.5 py-0.5 text-stone-600 hover:text-black font-semibold" onclick="updateQty(${index}, 1)">+</button>
          </div>
        </div>
        <button onclick="cart.splice(${index}, 1); save(); renderCart();" class="self-start text-stone-400 hover:text-rose-600 p-1">
          ✕
        </button>
      </div>`
    )
    .join('');

  cartFoot.innerHTML = `
    <div class="mb-3 flex justify-between font-semibold text-stone-800">
      <span>Subtotal</span>
      <span>${money(subtotal)}</span>
    </div>
    <a href="#/checkout" onclick="drawer(0)" class="btn btn-p w-full shadow-lg">Proceed to Checkout →</a>
  `;
}

function updateQty(index, change) {
  cart[index].qty = Math.max(1, cart[index].qty + change);
  save();
  renderCart();
}

// Wishlist Handling
function toggleWish(id) {
  const exists = wish.includes(id);
  wish = exists ? wish.filter((w) => w !== id) : [...wish, id];
  save();
  toast(exists ? 'Removed from wishlist' : 'Added to wishlist ♥');
  if (/^#\/(wishlist)?$/.test(location.hash) || !location.hash) {
    route();
  }
}

// Category Metadata & Images
const categoryMeta = {
  1: { image: '/images/cat-fashion.jpg', subtitle: 'Refined Apparel & Leathercraft', icon: '👔' },
  2: { image: '/images/cat-electronics.jpg', subtitle: 'High-Fidelity Audio & Tech', icon: '🎧' },
  3: { image: '/images/cat-home.jpg', subtitle: 'Artisanal Decor & Living', icon: '🕯️' },
  4: { image: '/images/cat-beauty.jpg', subtitle: 'Radiance Formulas & Skincare', icon: '✨' },
};

function selectCategoryAndScroll(catId) {
  queryState.cat = catId;
  executeFilter();
  setTimeout(() => {
    const el = document.getElementById('shop');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function quickAddToCart(productId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const product = (window.allLoadedProducts || []).find((p) => p.id == productId);
  if (!product) {
    location.hash = `#/p/${productId}`;
    return;
  }
  const variants = product.variants || {};
  const hasVariants =
    (variants.sizes && variants.sizes.length > 0) ||
    (variants.colors && variants.colors.length > 0);

  if (hasVariants) {
    location.hash = `#/p/${productId}`;
    return;
  }

  const existing = cart.find((i) => i.id == product.id && i.variant === '');
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      image: img(product),
      price: product.price_now,
      qty: 1,
      variant: '',
    });
  }

  save();
  toast('Added to cart ✓');
}

// Product Card Component
const productCard = (product) => `
  <div class="group fade relative flex flex-col justify-between rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-200/70 hover:border-brand/30">
    <div>
      <a href="#/p/${product.id}" class="relative block aspect-square w-full overflow-hidden rounded-xl bg-stone-100">
        <img loading="lazy" src="${img(product)}" onerror="this.onerror=null;this.src=FALLBACK_IMG;" alt="${esc(product.name)}" class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105">
        
        <!-- Sale Discount Badge -->
        ${product.on_sale ? `
          <span class="absolute left-2.5 top-2.5 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide shadow-md">
            -${Math.round(100 - (product.price_now / product.price) * 100)}%
          </span>
        ` : ''}

        <!-- Sold Out Badge -->
        ${product.stock < 1 ? `
          <span class="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-xs font-semibold text-white text-xs uppercase tracking-wider">
            Sold Out
          </span>
        ` : ''}

        <!-- Wishlist Button -->
        <button onclick="event.preventDefault(); event.stopPropagation(); toggleWish(${product.id});" class="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 ${wish.includes(product.id) ? 'text-rose-600' : 'text-stone-600 hover:text-stone-900'}">
          ${wish.includes(product.id) ? '♥' : '♡'}
        </button>
      </a>

      <!-- Category & Title -->
      <div class="mt-3.5">
        <p class="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">${esc(product.cat || 'Curated')}</p>
        <a href="#/p/${product.id}" class="mt-1 block font-medium text-stone-900 hover:text-brand transition leading-snug line-clamp-1 text-sm sm:text-base font-sans">
          ${esc(product.name)}
        </a>
      </div>

      <!-- Verified Ratings / Heritage Badge -->
      ${product.reviews && product.reviews > 0 ? `
        <div class="mt-1.5 flex items-center gap-1.5 text-xs text-gold">
          <span>${stars(product.rating)}</span>
          <span class="text-[11px] text-stone-400">(${product.reviews})</span>
        </div>
      ` : `
        <div class="mt-1.5 flex items-center gap-1 text-[11px] text-stone-400 font-medium">
          <span class="text-gold">✦</span>
          <span>Verified Craftsmanship</span>
        </div>
      `}
    </div>

    <!-- Pricing & Action Row -->
    <div class="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
      <div>
        <span class="text-base sm:text-lg font-bold text-stone-900">${money(product.price_now)}</span>
        ${product.on_sale ? `<s class="block text-xs text-stone-400 font-normal">${money(product.price)}</s>` : ''}
      </div>

      <button onclick="quickAddToCart(${product.id}, event);" ${product.stock < 1 ? 'disabled' : ''} class="btn btn-p !py-1.5 !px-3.5 text-xs rounded-xl shadow-sm transition hover:shadow-md disabled:opacity-40" title="Quick Add">
        <span>+ Add</span>
      </button>
    </div>
  </div>
`;

// Views: Home Page
async function renderHome() {
  if (typeof disposeWatch3DExperience === 'function') {
    disposeWatch3DExperience();
  }
  const queryParams = new URLSearchParams(Object.entries(queryState).filter(([, v]) => v));
  let products = [];
  let flashSale = [];
  try {
    const [pRes, fRes] = await Promise.all([
      api('/products?' + queryParams.toString()),
      api('/products?sale=1'),
    ]);
    products = Array.isArray(pRes) ? pRes : [];
    flashSale = Array.isArray(fRes) ? fRes : [];
  } catch (err) {
    console.warn('Products API notice:', err.message);
  }

  window.allLoadedProducts = products;

  // Curate Best Sellers (top 4 products by rating/reviews or price)
  const bestSellers = (Array.isArray(products) ? [...products] : [])
    .sort((a, b) => (b.reviews || 0) * (b.rating || 4) - (a.reviews || 0) * (a.rating || 4) || b.price - a.price)
    .slice(0, 4);

  const isFiltered = queryState.search || queryState.cat || queryState.min || queryState.max;

  app.innerHTML = `
    ${!isFiltered ? `
      <!-- 1. Large Elegant Hero Section -->
      <section class="fade relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0c3125] via-brand to-[#08231a] p-6 sm:p-10 lg:p-14 text-white shadow-2xl border border-emerald-900/40">
        <!-- Ambient Background Glow Accents -->
        <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/15 blur-[120px]"></div>
        <div class="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-[100px]"></div>

        <div class="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
          <!-- Left Text & Actions -->
          <div class="lg:col-span-7">
            <!-- Exclusive Curation Pill -->
            <div class="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold tracking-widest uppercase backdrop-blur-md mb-6">
              <span class="inline-block h-2 w-2 rounded-full bg-gold animate-pulse"></span>
              Exclusive 2026 Collection
            </div>

            <!-- Bold Luxury Headline -->
            <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              Timeless Elegance, <br class="hidden sm:inline">
              <span class="italic font-normal text-gold shimmer-text">Curated</span> for Everyday Luxury.
            </h1>

            <!-- Subtitle -->
            <p class="mt-5 max-w-xl text-stone-200 text-base sm:text-lg leading-relaxed font-light">
              Discover handpicked designer apparel, high-fidelity acoustics, artisanal living decor, and radiance skincare — tailored for discerning lifestyles across Bangladesh.
            </p>

            <!-- 2 CTA Buttons: "Shop Now" and "Explore Collection" -->
            <div class="mt-8 flex flex-wrap items-center gap-4">
              <a href="#shop" onclick="document.getElementById('shop').scrollIntoView({behavior:'smooth'}); return false;" class="btn btn-gold text-base !py-3.5 !px-8 shadow-xl">
                Shop Now
                <span class="text-lg">→</span>
              </a>
              <a href="#featured-categories" onclick="document.getElementById('featured-categories').scrollIntoView({behavior:'smooth'}); return false;" class="btn btn-outline-white text-base !py-3.5 !px-7">
                Explore Collection
              </a>
            </div>

            <!-- Verified Service Guarantees (Transparent & Authentic) -->
            <div class="mt-10 pt-8 border-t border-white/10 grid grid-cols-3 gap-4 max-w-lg text-left">
              <div>
                <p class="text-xl sm:text-2xl font-bold font-serif text-white">64 Districts</p>
                <p class="text-xs text-stone-300 mt-0.5">Nationwide Dispatch</p>
              </div>
              <div>
                <p class="text-xl sm:text-2xl font-bold font-serif text-gold">Doorstep</p>
                <p class="text-xs text-stone-300 mt-0.5">Inspection & COD</p>
              </div>
              <div>
                <p class="text-xl sm:text-2xl font-bold font-serif text-white">100% Genuine</p>
                <p class="text-xs text-stone-300 mt-0.5">Direct Sourcing</p>
              </div>
            </div>
          </div>

          <!-- Right: High-Quality Static Visual Showcase Banner (Inspired by Reference) -->
          <div class="lg:col-span-5 relative">
            <div class="relative mx-auto w-full max-w-lg group">
              <!-- Cinematic Ambient Backlight Glow -->
              <div class="absolute -inset-1.5 rounded-[2.5rem] bg-gradient-to-r from-gold/30 via-emerald-400/20 to-gold/25 opacity-70 blur-xl transition-all duration-700 group-hover:opacity-100 group-hover:blur-2xl pointer-events-none"></div>

              <!-- Main Showcase Frame -->
              <div class="relative aspect-video sm:aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 border-white/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65)] ring-1 ring-white/10 bg-black/40">
                <img 
                  src="/images/hero.jpg" 
                  alt="Curated Luxury Masterpieces" 
                  class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="eager"
                  onerror="this.onerror=null;this.src='/images/cat-fashion.jpg';"
                >
                <!-- Soft Vignette & Contrast Gradients -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20 pointer-events-none rounded-3xl"></div>

                <!-- Floating Luxury Tag -->
                <div class="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1 border border-white/15 text-[10px] font-semibold uppercase tracking-widest text-gold shadow-md pointer-events-none">
                  <span class="h-2 w-2 rounded-full bg-gold animate-pulse"></span>
                  <span>✦ 2026 EDITORIAL</span>
                </div>

                <!-- Floating Caption Banner -->
                <div class="absolute bottom-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between p-3.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 text-white">
                  <div>
                    <p class="text-[10px] font-medium uppercase tracking-wider text-gold">Featured Heritage</p>
                    <h4 class="font-serif text-sm sm:text-base font-bold text-white leading-tight">Geneva Chronometers & Apparel</h4>
                  </div>
                  <button onclick="selectCategoryAndScroll(1);" class="btn btn-gold !py-1.5 !px-3.5 text-xs font-semibold shadow">
                    Explore →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Trust Badges Strip -->
      <section class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div class="trust-card rounded-2xl bg-white p-5 border border-stone-100 shadow-sm flex items-start gap-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-brand">🚚</span>
          <div>
            <h4 class="text-sm font-bold text-stone-900">Express Delivery</h4>
            <p class="text-xs text-stone-500 mt-0.5 leading-snug">Fast & secure shipping across all 64 districts</p>
          </div>
        </div>

        <div class="trust-card rounded-2xl bg-white p-5 border border-stone-100 shadow-sm flex items-start gap-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700">🛡️</span>
          <div>
            <h4 class="text-sm font-bold text-stone-900">100% Authentic</h4>
            <p class="text-xs text-stone-500 mt-0.5 leading-snug">Directly sourced premium craftsmanship</p>
          </div>
        </div>

        <div class="trust-card rounded-2xl bg-white p-5 border border-stone-100 shadow-sm flex items-start gap-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">💵</span>
          <div>
            <h4 class="text-sm font-bold text-stone-900">Cash on Delivery</h4>
            <p class="text-xs text-stone-500 mt-0.5 leading-snug">Inspect package before paying at doorstep</p>
          </div>
        </div>

        <div class="trust-card rounded-2xl bg-white p-5 border border-stone-100 shadow-sm flex items-start gap-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-700">🔄</span>
          <div>
            <h4 class="text-sm font-bold text-stone-900">7-Day Easy Returns</h4>
            <p class="text-xs text-stone-500 mt-0.5 leading-snug">Hassle-free exchanges & dedicated support</p>
          </div>
        </div>
      </section>

      <!-- 3. Interactive 3D Product Atelier Experience (Three.js & GSAP) -->
      <section id="interactive-atelier-3d" class="atelier-3d-container mt-16 sm:mt-24 p-6 sm:p-10 lg:p-12 text-white">
        
        <!-- Header & Model Selector Tabs -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold mb-2">
              <span class="h-2 w-2 rounded-full bg-gold animate-pulse"></span>
              <span>Interactive 3D Engineering Showcase</span>
            </div>
            <h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              The Atelier of Precision
            </h2>
            <p class="text-stone-300 text-sm sm:text-base mt-2 max-w-xl font-light leading-relaxed">
              Rotate in 360°, inspect exploded component architecture, and experience the physical craftsmanship of our flagship horology, acoustics, and elixir formulations.
            </p>
          </div>

          <!-- Switcher for 3 Real Database Products -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button onclick="if(window.Product3DExperience)Product3DExperience.switchModel('watch');" data-model="watch" class="atelier-tab-btn !bg-gold !text-stone-900 !border-gold">
              <span>⌚</span>
              <span>01 · Luxury Watch</span>
            </button>
            <button onclick="if(window.Product3DExperience)Product3DExperience.switchModel('headphones');" data-model="headphones" class="atelier-tab-btn text-stone-300">
              <span>🎧</span>
              <span>02 · Studio Headphones</span>
            </button>
            <button onclick="if(window.Product3DExperience)Product3DExperience.switchModel('perfume');" data-model="perfume" class="atelier-tab-btn text-stone-300">
              <span>✨</span>
              <span>03 · Radiance Elixir Bottle</span>
            </button>
          </div>
        </div>

        <!-- 3D Interactive Stage Layout: 3D Stage (Left) & Real Specs Card (Right) -->
        <div class="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <!-- 3D Stage Canvas Container (lg:col-span-7) -->
          <div class="lg:col-span-7 relative rounded-3xl bg-black/40 border border-white/10 p-2 sm:p-4 overflow-hidden backdrop-blur-md">
            
            <!-- Canvas Target Wrapper -->
            <div id="atelier-canvas-wrapper" class="atelier-canvas-wrapper"></div>

            <!-- Floating 3D Interaction Control Overlay -->
            <div class="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              
              <!-- Explode Components Toggle Button -->
              <button id="atelier-explode-btn" onclick="if(window.Product3DExperience)Product3DExperience.toggleExplode();" class="pointer-events-auto atelier-tab-btn shadow-xl text-xs font-bold !py-2.5 !px-4">
                <span class="text-gold">✦</span>
                <span>Explode 3D Components</span>
              </button>

              <!-- Zoom & Reset Tools -->
              <div class="pointer-events-auto flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15">
                <button onclick="if(window.Product3DExperience)Product3DExperience.zoom('in');" class="atelier-control-btn !w-8 !h-8 !text-sm" title="Zoom In">+</button>
                <button onclick="if(window.Product3DExperience)Product3DExperience.zoom('out');" class="atelier-control-btn !w-8 !h-8 !text-sm" title="Zoom Out">−</button>
                <button onclick="if(window.Product3DExperience)Product3DExperience.resetView();" class="atelier-control-btn !w-8 !h-8 !text-xs" title="Reset View">⟲</button>
              </div>
            </div>

            <!-- Interaction Guidance Hint -->
            <div class="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-[11px] text-stone-300 border border-white/10">
              <span class="text-gold">↻</span>
              <span>Drag to Rotate · Scroll to Scrub</span>
            </div>
          </div>

          <!-- Dynamic Product Specifications & Direct Cart Actions (lg:col-span-5) -->
          <div class="lg:col-span-5 rounded-3xl bg-black/30 border border-white/10 p-6 sm:p-8 backdrop-blur-md" id="atelier-specs-card">
            <!-- Populated dynamically by Product3DExperience.renderProductSpecsCard() -->
          </div>

        </div>

      </section>

      <!-- 4. Featured Collections (Category Cards) -->
      <section id="featured-categories" class="mt-16 sm:mt-24">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand mb-1">
              <span>✦</span> Curated Departments
            </div>
            <h2 class="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Featured Collections</h2>
            <p class="text-stone-500 text-sm mt-1 max-w-lg">Explore timeless essentials tailored for elevated daily living</p>
          </div>
          <button onclick="selectCategoryAndScroll('');" class="text-sm font-semibold text-brand hover:underline self-start sm:self-auto flex items-center gap-1">
            View All Departments →
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          ${cats.map((c) => {
            const meta = categoryMeta[c.id] || {
              image: '/images/hero.jpg',
              subtitle: 'Exclusive curation',
              icon: '🛍️',
            };
            return `
              <div onclick="selectCategoryAndScroll(${c.id});" class="category-card group cursor-pointer aspect-[3/4] bg-stone-900 shadow-sm">
                <img loading="lazy" src="${meta.image}" onerror="this.onerror=null;this.src='/images/hero.jpg';" alt="${esc(c.name)}" class="h-full w-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                
                <div class="absolute inset-0 p-5 flex flex-col justify-between text-white">
                  <span class="self-end rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-medium">
                    ${meta.icon}
                  </span>
                  <div>
                    <h3 class="font-serif text-xl sm:text-2xl font-bold leading-tight group-hover:text-gold transition">
                      ${esc(c.name)}
                    </h3>
                    <p class="text-xs text-stone-300 mt-1 line-clamp-1">
                      ${meta.subtitle}
                    </p>
                    <span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold group-hover:translate-x-1 transition-transform">
                      Explore Collection →
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- 5. Best Selling Products Section -->
      ${bestSellers.length ? `
        <section id="best-sellers" class="mt-16 sm:mt-20">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold mb-1">
                <span>✦</span> Most Coveted
              </div>
              <h2 class="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Best Selling Products</h2>
              <p class="text-stone-500 text-sm mt-1 max-w-lg">Patron-favorite essentials celebrated for craftsmanship and design</p>
            </div>
            <a href="#shop" onclick="document.getElementById('shop').scrollIntoView({behavior:'smooth'}); return false;" class="text-sm font-semibold text-brand hover:underline self-start sm:self-auto flex items-center gap-1">
              Browse Full Catalog →
            </a>
          </div>

          <div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            ${bestSellers.map(productCard).join('')}
          </div>
        </section>
      ` : ''}

      <!-- 5. Flash Sale Section (if active) -->
      ${flashSale.length ? `
        <section class="mt-16 sm:mt-20 rounded-[2rem] bg-gradient-to-br from-brand via-[#134937] to-[#0c3125] p-6 sm:p-10 text-white shadow-xl border border-emerald-800/60">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <span class="text-xs uppercase font-bold tracking-widest text-gold">Limited Window</span>
              <h2 class="font-serif text-2xl sm:text-3xl font-bold text-white mt-0.5">⚡ Exclusive Flash Sale</h2>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-stone-300 hidden sm:inline">Offer concludes in:</span>
              <span id="countdown" class="rounded-full bg-rose-600 px-4 py-1.5 text-xs sm:text-sm font-bold text-white tracking-wide shadow-md"></span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            ${flashSale.slice(0, 4).map(productCard).join('')}
          </div>
        </section>
      ` : ''}
    ` : ''}

    <!-- 6. All Products / Catalog Explorer Section -->
    <section id="shop" class="mt-16 sm:mt-20">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
        <div>
          <div class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand mb-1">
            <span>✦</span> Complete Showcase
          </div>
          <h2 class="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            ${queryState.search ? `Search Results for “${esc(queryState.search)}”` : 'Explore All Products'}
          </h2>
        </div>
        ${queryState.search || queryState.cat || queryState.min || queryState.max ? `
          <button onclick="queryState={search:'',cat:'',sort:'',min:'',max:''}; executeFilter();" class="text-xs font-semibold text-rose-600 hover:underline">
            ✕ Clear all filters
          </button>
        ` : ''}
      </div>

      <!-- Filters & Sorting Bar -->
      <div class="my-6 flex flex-wrap items-center gap-2.5 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-stone-200/60">
        <button class="pill ${queryState.cat ? '' : 'on'}" onclick="queryState.cat=''; executeFilter();">All Items</button>
        ${cats.map((c) => `<button class="pill ${queryState.cat == c.id ? 'on' : ''}" onclick="queryState.cat=${c.id}; executeFilter();">${esc(c.name)}</button>`).join('')}

        <div class="ml-auto flex flex-wrap items-center gap-2">
          <input class="inp !w-24 !py-1.5 text-xs" type="number" placeholder="Min ৳" value="${queryState.min}" onchange="queryState.min=this.value; executeFilter();">
          <input class="inp !w-24 !py-1.5 text-xs" type="number" placeholder="Max ৳" value="${queryState.max}" onchange="queryState.max=this.value; executeFilter();">
          <select class="inp !w-auto !py-1.5 text-xs font-medium" onchange="queryState.sort=this.value; executeFilter();">
            <option value="">Sort: Featured</option>
            ${[
              ['new', 'Newest Arrivals'],
              ['low', 'Price: Low → High'],
              ['high', 'Price: High → Low'],
            ].map((o) => `<option value="${o[0]}" ${queryState.sort == o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Product Catalog Grid -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        ${products.map(productCard).join('') || '<p class="col-span-full py-24 text-center text-stone-500 font-medium">No products match your current selection.</p>'}
      </div>
    </section>
  `;

  // Flash Sale Timer Logic
  const flashEnd = flashSale[0]?.flash_end;
  const cdEl = $('#countdown');
  if (flashEnd && cdEl) {
    clearInterval(renderHome.timer);
    const updateCountdown = () => {
      const diff = new Date(flashEnd) - Date.now();
      if (diff > 0) {
        const days = Math.floor(diff / 864e5);
        const hours = Math.floor(diff / 36e5) % 24;
        const minutes = Math.floor(diff / 6e4) % 60;
        const seconds = Math.floor(diff / 1e3) % 60;
        cdEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else {
        cdEl.textContent = 'Offer ended';
      }
    };
    updateCountdown();
    renderHome.timer = setInterval(updateCountdown, 1000);
  }

  // Initialize Interactive 3D Product Atelier Experience
  if (window.Product3DExperience && !isFiltered) {
    setTimeout(() => {
      window.Product3DExperience.init('#atelier-canvas-wrapper');
    }, 60);
  }
}

window.quickAddToCart = quickAddToCart;



const executeFilter = () => {
  if (location.hash === '#/' || !location.hash) {
    route();
  } else {
    location.hash = '#/';
  }
};

// View: Single Product Details
async function renderProduct(id) {
  const p = await api('/products/' + id);
  document.title = `${p.name} — ${cfg.shop_name}`;

  const variants = p.variants || {};
  const currentSelection = {
    size: variants.sizes?.[0] || '',
    color: variants.colors?.[0] || '',
  };
  const images = (p.image || '').split(',');

  window._currentProduct = p;
  window._currentSelection = currentSelection;

  app.innerHTML = `
    <div class="fade grid gap-8 md:grid-cols-2">
      <div>
        <img id="mainImage" src="${img(p)}" onerror="this.onerror=null;this.src=FALLBACK_IMG;" class="aspect-square w-full rounded-3xl object-cover shadow-sm" alt="${esc(p.name)}">
        ${images.length > 1 ? `
          <div class="mt-3 flex gap-2">
            ${images.map((url) => `<img src="${url}" onclick="mainImage.src=this.src" class="h-20 w-20 cursor-pointer rounded-xl object-cover ring-1 ring-stone-200 hover:ring-brand transition">`).join('')}
          </div>
        ` : ''}
      </div>

      <div>
        <p class="text-xs uppercase tracking-wider text-stone-500 font-semibold">${esc(p.cat || '')}</p>
        <h1 class="font-serif text-3xl md:text-4xl font-bold text-stone-900 mt-1">${esc(p.name)}</h1>
        <p class="mt-2 text-gold">${stars(p.rating)} <span class="text-sm text-stone-500">(${p.reviews || 0} customer reviews)</span></p>

        <p class="mt-4 text-3xl font-bold text-stone-900">
          ${money(p.price_now)}
          ${p.on_sale ? `<s class="text-lg font-normal text-stone-400 ml-2">${money(p.price)}</s>` : ''}
        </p>

        <p class="mt-4 text-stone-600 leading-relaxed">${esc(p.description)}</p>

        ${variants.sizes ? `
          <p class="mt-6 text-sm font-semibold text-stone-800">Size</p>
          <div class="mt-2 flex flex-wrap gap-2">
            ${variants.sizes.map((s, i) => `<button class="pill sz ${i ? '' : 'on'}" onclick="selectVariant('size', '${s}', this)">${s}</button>`).join('')}
          </div>
        ` : ''}

        ${variants.colors ? `
          <p class="mt-5 text-sm font-semibold text-stone-800">Color</p>
          <div class="mt-2 flex flex-wrap gap-2">
            ${variants.colors.map((c, i) => `<button class="pill cl ${i ? '' : 'on'}" onclick="selectVariant('color', '${c}', this)">${c}</button>`).join('')}
          </div>
        ` : ''}

        <p class="mt-5 text-sm font-medium ${p.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}">
          ${p.stock > 0 ? `✓ In stock (${p.stock} available)` : '✕ Currently out of stock'}
        </p>

        <div class="mt-7 flex gap-3">
          <button ${p.stock < 1 ? 'disabled' : ''} onclick="addToCart(false)" class="btn btn-o flex-1 disabled:opacity-40">Add to cart</button>
          <button ${p.stock < 1 ? 'disabled' : ''} onclick="addToCart(true)" class="btn btn-p flex-1 disabled:opacity-40 shadow-lg">Buy it now</button>
          <button onclick="toggleWish(${p.id}); this.textContent=wish.includes(${p.id}) ? '♥' : '♡';" class="btn btn-o !px-4 text-xl">
            ${wish.includes(p.id) ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </div>

    <section class="mt-16 border-t border-stone-200 pt-10">
      <h2 class="font-serif text-2xl font-bold text-stone-900">Customer Reviews</h2>
      <div class="mt-6 grid gap-6 md:grid-cols-2">
        <div class="space-y-3">
          ${(p.reviewList || []).map((r) => `
            <div class="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
              <p class="text-gold">${stars(r.rating)} <b class="ml-2 text-stone-900">${esc(r.user_name)}</b></p>
              <p class="mt-1 text-sm text-stone-600">${esc(r.comment)}</p>
            </div>
          `).join('') || '<p class="text-stone-500">No reviews yet. Be the first to review this product!</p>'}
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 h-fit">
          ${user ? `
            <p class="mb-3 font-semibold text-stone-800">Write a review</p>
            <select id="revRating" class="inp mb-3">
              ${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${'★'.repeat(n)} (${n} Star)</option>`).join('')}
            </select>
            <textarea id="revComment" class="inp mb-3" rows="3" placeholder="Share your experience with this item..."></textarea>
            <button class="btn btn-p" onclick="submitReview(${p.id})">Submit Review</button>
          ` : `
            <p class="text-stone-600">Please <a class="font-semibold text-brand underline" href="#/account">login</a> to write a review.</p>
          `}
        </div>
      </div>
    </section>
  `;
}

function selectVariant(key, value, element) {
  _currentSelection[key] = value;
  element.parentElement.querySelectorAll('.pill').forEach((btn) => btn.classList.remove('on'));
  element.classList.add('on');
}

function addToCart(buyNow = false) {
  const p = _currentProduct;
  const variantStr = [_currentSelection.size, _currentSelection.color].filter(Boolean).join(' / ');
  const existing = cart.find((i) => i.id == p.id && i.variant === variantStr);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      image: img(p),
      price: p.price_now,
      qty: 1,
      variant: variantStr,
    });
  }

  save();
  if (buyNow) {
    location.hash = '#/checkout';
  } else {
    toast('Added to your cart ✓');
    drawer(1);
  }
}

async function submitReview(productId) {
  const rating = +$('#revRating').value;
  const comment = $('#revComment').value;
  try {
    await api(`/products/${productId}/reviews`, {
      method: 'POST',
      body: { rating, comment },
    });
    toast('Review submitted! Thank you.');
    renderProduct(productId);
  } catch (err) {
    toast(err.message);
  }
}

// View: Checkout Page
async function renderCheckout() {
  if (!cart.length) {
    app.innerHTML = `
      <div class="py-24 text-center">
        <p class="text-4xl">🛍️</p>
        <p class="mt-3 text-lg font-semibold text-stone-700">Your cart is empty</p>
        <a class="btn btn-p mt-4 inline-block" href="#/">Start Shopping</a>
      </div>`;
    return;
  }

  window.appliedCoupon = { code: '', percent: 0 };
  const userProfile = user || {};

  app.innerHTML = `
    <h1 class="font-serif text-3xl font-bold text-stone-900">Checkout</h1>
    <p class="text-sm text-stone-500 mt-1">Instant Guest Checkout — no account creation required.</p>

    <div class="mt-8 grid gap-8 md:grid-cols-5">
      <form id="checkoutForm" class="space-y-4 md:col-span-3" onsubmit="handlePlaceOrder(event)">
        <div>
          <label class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Full Name *</label>
          <input name="name" class="inp mt-1" placeholder="Enter recipient full name" required value="${esc(userProfile.name || '')}">
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Mobile Phone Number *</label>
          <input name="phone" class="inp mt-1" placeholder="01XXXXXXXXX" pattern="01[0-9]{9}" required value="${esc(userProfile.phone || '')}" onblur="captureAbandonedCart(this.value)">
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Delivery Address *</label>
          <textarea name="address" class="inp mt-1" rows="2" placeholder="House, Road, Area, Thana / District" required></textarea>
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Shipping Area</label>
          <select name="area" class="inp mt-1" onchange="updateCheckoutSummary()">
            <option value="dhaka">Inside Dhaka (৳${cfg.ship_dhaka})</option>
            <option value="outside">Outside Dhaka (৳${cfg.ship_outside})</option>
          </select>
        </div>

        <div class="pt-3">
          <label class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Payment Method</label>
          <div class="mt-2 space-y-2">
            ${[
              ['cod', '💵 Cash on Delivery', 'Pay with cash upon delivery'],
              ['sslcommerz', '💳 SSLCOMMERZ Gateway', 'Cards, bKash, Nagad, Rocket, Internet Banking'],
              ['aamarpay', '📱 aamarPay Gateway', 'Cards & Mobile Banking'],
            ].map(([val, title, subtitle], idx) => `
              <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-200 bg-white p-3.5 has-[:checked]:border-brand has-[:checked]:bg-emerald-50/20 transition">
                <input type="radio" name="method" value="${val}" ${idx === 0 ? 'checked' : ''}>
                <span>
                  <b class="text-stone-900">${title}</b><br>
                  <small class="text-stone-500">${subtitle}</small>
                </span>
              </label>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-p w-full !py-4 text-base shadow-xl mt-4" id="placeOrderBtn">
          Confirm Order
        </button>
      </form>

      <aside class="h-fit rounded-3xl bg-white p-6 shadow-sm border border-stone-100 md:col-span-2" id="checkoutSummary"></aside>
    </div>
  `;

  updateCheckoutSummary();
}

function captureAbandonedCart(phone) {
  if (phone && cart.length) {
    api('/cart-capture', {
      method: 'POST',
      body: { phone, items: cart },
    }).catch(() => {});
  }
}

function updateCheckoutSummary() {
  const form = $('#checkoutForm');
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discount = Math.round((subtotal * appliedCoupon.percent) / 100);
  const isOutside = form?.area?.value === 'outside';
  const shipping = subtotal >= cfg.free_ship ? 0 : isOutside ? cfg.ship_outside : cfg.ship_dhaka;
  const total = subtotal - discount + shipping;

  $('#checkoutSummary').innerHTML = `
    <h3 class="font-serif text-lg font-bold text-stone-900 mb-4 pb-2 border-b">Order Summary</h3>
    
    <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
      ${cart.map((item) => `
        <div class="flex justify-between text-sm text-stone-700">
          <span class="truncate pr-2">${esc(item.name)} <small class="text-stone-400">×${item.qty}</small></span>
          <span class="font-medium">${money(item.price * item.qty)}</span>
        </div>
      `).join('')}
    </div>

    <div class="mt-4 flex gap-2">
      <input id="couponInput" class="inp !py-2 text-sm uppercase" placeholder="PROMO CODE" value="${appliedCoupon.code}">
      <button type="button" class="btn btn-o !py-2 text-sm" onclick="applyPromoCoupon()">Apply</button>
    </div>

    <hr class="my-4 border-stone-200">

    <div class="space-y-1.5 text-sm text-stone-600">
      <div class="flex justify-between"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      ${discount ? `<div class="flex justify-between text-emerald-700 font-medium"><span>Promo Discount</span><span>−${money(discount)}</span></div>` : ''}
      <div class="flex justify-between">
        <span>Delivery Fee</span>
        <span>${shipping ? money(shipping) : '<span class="text-emerald-700 font-semibold">FREE</span>'}</span>
      </div>
      <div class="mt-3 flex justify-between text-lg font-bold text-stone-900 border-t pt-2">
        <span>Total Payable</span>
        <span class="text-brand">${money(total)}</span>
      </div>
    </div>
  `;
}

async function applyPromoCoupon() {
  const input = $('#couponInput');
  const code = (input?.value || '').trim();
  if (!code) return;

  try {
    const coupon = await api('/coupon?code=' + encodeURIComponent(code));
    appliedCoupon = { code: coupon.code, percent: coupon.percent };
    toast(`${coupon.percent}% discount applied 🎉`);
  } catch (err) {
    appliedCoupon = { code: '', percent: 0 };
    toast(err.message);
  }
  updateCheckoutSummary();
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  const form = $('#checkoutForm');
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData);

  payload.items = cart.map((item) => ({
    id: item.id,
    qty: item.qty,
    variant: item.variant,
  }));
  payload.coupon = appliedCoupon.code;

  const btn = $('#placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Processing your order...';

  try {
    const res = await api('/orders', { method: 'POST', body: payload });
    localStorage.setItem('lastOrder', JSON.stringify({ id: res.id, phone: payload.phone }));

    cart = [];
    save();

    if (res.payment_url) {
      location.href = res.payment_url;
      return;
    }
    if (res.pay_error) {
      toast(res.pay_error);
    }
    location.hash = `#/track/${res.id}?new=1`;
  } catch (err) {
    toast(err.message);
    btn.disabled = false;
    btn.textContent = 'Confirm Order';
  }
}

// Order Tracking Card Component
function renderOrderCard(order) {
  return `
    <div class="fade rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <b class="text-lg text-stone-900">Order #${order.id}</b>
          <p class="text-xs text-stone-500">${order.created} · ${order.method.toUpperCase()} (${order.payment_status})</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[order.status] || 'bg-stone-100'}">
          ${order.status}
        </span>
      </div>

      <div class="my-5 flex items-center gap-1 text-[11px] text-stone-500">
        ${['pending', 'confirmed', 'shipped', 'delivered'].map((step, idx, arr) => {
          const isDone = arr.indexOf(order.status) >= idx;
          return `
            <div class="flex-1 text-center">
              <div class="h-1.5 rounded-full ${isDone ? 'bg-brand' : 'bg-stone-200'}"></div>
              <p class="mt-1.5 capitalize ${isDone ? 'text-brand font-bold' : ''}">${step}</p>
            </div>`;
        }).join('')}
      </div>

      <div class="divide-y divide-stone-100">
        ${order.items.map((item) => `
          <div class="flex items-center gap-3 py-2 text-sm">
            <img src="${item.image}" class="h-12 w-12 rounded-lg object-cover" alt="${esc(item.name)}">
            <span class="flex-1 truncate">${esc(item.name)} ${item.variant ? `<small class="text-stone-400">(${esc(item.variant)})</small>` : ''} ×${item.qty}</span>
            <b class="text-stone-800">${money(item.price * item.qty)}</b>
          </div>
        `).join('')}
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
        <span class="text-base font-bold text-stone-900">Total: ${money(order.total)}</span>
        <div class="space-x-2">
          <a class="btn btn-o !py-1.5 text-xs" target="_blank" href="/invoice/${order.id}?phone=${order.phone}">
            View Invoice
          </a>
          ${order.status === 'delivered' && !order.return_status ? `
            <button class="btn btn-o !py-1.5 text-xs text-rose-700 hover:border-rose-700" onclick="submitReturnRequest(${order.id}, '${order.phone}')">
              Request Return
            </button>
          ` : ''}
          ${order.return_status ? `<span class="text-xs font-medium text-stone-500">Return: ${order.return_status}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

async function submitReturnRequest(orderId, phone) {
  const reason = prompt('Please specify the reason for your return request:');
  if (!reason) return;

  try {
    await api(`/orders/${orderId}/return`, {
      method: 'POST',
      body: { reason, phone },
    });
    toast('Return request submitted successfully');
    route();
  } catch (err) {
    toast(err.message);
  }
}

// View: Order Tracking
async function renderTrack(orderId, queryParams = {}) {
  const last = loadStorage('lastOrder', {});
  let order = null;
  const phone = last.id == orderId ? last.phone : '';

  if (orderId && phone) {
    order = await api(`/track?id=${orderId}&phone=${encodeURIComponent(phone)}`).catch(() => null);
  }

  app.innerHTML = `
    <div class="mx-auto max-w-2xl">
      ${queryParams.new ? `
        <div class="mb-6 rounded-3xl bg-brand p-8 text-center text-white shadow-lg">
          <p class="text-5xl">🎉</p>
          <h1 class="font-serif text-3xl font-bold mt-2">Thank you! Your order is placed.</h1>
          <p class="mt-2 text-stone-200">We will call you shortly to confirm your delivery address.</p>
        </div>
      ` : ''}

      ${queryParams.paid === '1' ? `
        <div class="mb-4 rounded-xl bg-emerald-100 p-4 text-emerald-900 font-medium">✓ Payment successful! Your order has been marked as paid.</div>
      ` : queryParams.paid === '0' ? `
        <div class="mb-4 rounded-xl bg-rose-100 p-4 text-rose-900 font-medium">Payment was not completed. You can re-try or pay via Cash on Delivery.</div>
      ` : ''}

      <div class="rounded-3xl bg-white p-6 shadow-sm border border-stone-100 mb-6">
        <h2 class="font-serif text-2xl font-bold text-stone-900 mb-2">Track an Order</h2>
        <form class="flex flex-wrap gap-2" onsubmit="event.preventDefault(); localStorage.setItem('lastOrder', JSON.stringify({id: this.orderId.value, phone: this.orderPhone.value})); location.hash='#/track/' + this.orderId.value + '?t=' + Date.now();">
          <input name="orderId" class="inp !w-32" placeholder="Order ID" value="${orderId || ''}" required>
          <input name="orderPhone" class="inp flex-1" placeholder="Mobile Phone (01XXXXXXXXX)" value="${phone}" required>
          <button class="btn btn-p">Search</button>
        </form>
      </div>

      ${order ? renderOrderCard(order) : orderId ? '<p class="text-center py-10 text-stone-500">Order not found. Please verify your Order ID and phone number.</p>' : ''}
    </div>
  `;
}

// View: Customer Account
async function renderAccount() {
  if (!user) {
    app.innerHTML = `
      <div class="fade mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm border border-stone-100">
        <div class="mb-6 flex gap-2">
          <button class="pill on flex-1 text-center" id="tabLogin" onclick="switchAuthMode(false)">Sign in</button>
          <button class="pill flex-1 text-center" id="tabRegister" onclick="switchAuthMode(true)">Register</button>
        </div>

        <form id="authForm" class="space-y-3" onsubmit="handleAuthSubmit(event)">
          <input name="name" class="inp hidden" placeholder="Full Name">
          <input name="phone" class="inp hidden" placeholder="Mobile Phone">
          <input name="email" type="email" class="inp" placeholder="Email Address" required>
          <input name="password" type="password" class="inp" placeholder="Password (min 6 chars)" required>
          <button class="btn btn-p w-full !py-3 font-semibold mt-2">Continue</button>
        </form>
      </div>
    `;
    window.isRegisterMode = false;
    return;
  }

  const orders = await api('/my/orders');

  app.innerHTML = `
    <div class="mx-auto max-w-3xl">
      <div class="mb-8 flex items-center justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 class="font-serif text-3xl font-bold text-stone-900">Welcome, ${esc(user.name)}</h1>
          <p class="text-sm text-stone-500">${esc(user.email)}</p>
        </div>
        <div class="space-x-2">
          ${user.role !== 'customer' ? '<a class="btn btn-o !py-2 text-sm" href="/admin.html">Admin Panel</a>' : ''}
          <button class="btn btn-o !py-2 text-sm" onclick="handleLogout()">Sign out</button>
        </div>
      </div>

      <h2 class="mb-4 font-serif text-xl font-bold text-stone-900">Order History</h2>
      <div class="space-y-4">
        ${orders.map(renderOrderCard).join('') || '<p class="text-stone-500 py-10 text-center">You have not placed any orders yet.</p>'}
      </div>
    </div>
  `;
}

function switchAuthMode(isRegister) {
  window.isRegisterMode = isRegister;
  $('#tabLogin').classList.toggle('on', !isRegister);
  $('#tabRegister').classList.toggle('on', isRegister);
  document.querySelectorAll('#authForm [name=name], #authForm [name=phone]').forEach((input) => {
    input.classList.toggle('hidden', !isRegister);
    input.required = isRegister && input.name === 'name';
  });
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = Object.fromEntries(formData);

  try {
    const res = await api(isRegisterMode ? '/register' : '/login', {
      method: 'POST',
      body: payload,
    });

    localStorage.setItem('tok', res.token);
    user = res.user;
    localStorage.setItem('user', JSON.stringify(user));
    route();
  } catch (err) {
    toast(err.message);
  }
}

function handleLogout() {
  localStorage.removeItem('tok');
  localStorage.removeItem('user');
  user = null;
  route();
}

// View: Wishlist
async function renderWishlist() {
  const products = (await api('/products')).filter((p) => wish.includes(p.id));

  app.innerHTML = `
    <h1 class="mb-6 font-serif text-3xl font-bold text-stone-900">My Wishlist</h1>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      ${products.map(productCard).join('') || '<p class="col-span-full py-20 text-center text-stone-500">Your wishlist is empty ♡</p>'}
    </div>
  `;
}

// Hash-based Client Router
async function route() {
  const [hashPath, queryString] = (location.hash || '#/').slice(2).split('?');
  const pathSegments = hashPath.split('/');
  const queryParams = Object.fromEntries(new URLSearchParams(queryString || ''));

  clearInterval(renderHome.timer);
  if (typeof disposeWatch3DExperience === 'function') {
    disposeWatch3DExperience();
  }
  if (window.Product3DExperience) {
    window.Product3DExperience.destroy();
  }
  window.scrollTo(0, 0);
  document.title = `${cfg.shop_name} — Premium Online Shop`;

  try {
    switch (pathSegments[0]) {
      case 'p':
        await renderProduct(pathSegments[1]);
        break;
      case 'checkout':
        await renderCheckout();
        break;
      case 'track':
        await renderTrack(pathSegments[1], queryParams);
        break;
      case 'account':
        await renderAccount();
        break;
      case 'wishlist':
        await renderWishlist();
        break;
      default:
        await renderHome();
        break;
    }
  } catch (err) {
    app.innerHTML = `<div class="py-24 text-center text-stone-500 font-medium">${esc(err.message)}</div>`;
  }
}

// App Initialization
(async () => {
  try {
    const [fetchedCfg, fetchedCats] = await Promise.all([
      api('/settings').catch(() => null),
      api('/categories').catch(() => null),
    ]);
    if (fetchedCfg && typeof fetchedCfg === 'object') Object.assign(cfg, fetchedCfg);
    if (Array.isArray(fetchedCats) && fetchedCats.length > 0) cats = fetchedCats;

    const logo = $('#logo');
    const footerLogo = $('#flogo');
    if (logo) logo.innerHTML = `<span class="text-gold text-xl group-hover:rotate-12 transition-transform duration-300">✦</span> <span>${esc(cfg.shop_name)}</span>`;
    if (footerLogo) footerLogo.innerHTML = `<span class="text-gold">✦</span> <span>${esc(cfg.shop_name)}</span>`;

    const wa = $('#wa');
    if (wa) {
      wa.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent('Hello, I have an inquiry about a product.')}`;
    }

    const bar = $('#bar');
    if (bar) {
      bar.textContent = `Free delivery on orders above ${money(cfg.free_ship)} · Cash on Delivery available across Bangladesh`;
    }
  } catch (err) {
    console.warn('Initialization notice:', err);
  } finally {
    save();
    window.addEventListener('hashchange', route);
    route();
  }
})();
