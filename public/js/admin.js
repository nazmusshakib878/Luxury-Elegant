/**
 * Luxury & Elegant — Admin Dashboard Application
 */

const $ = (selector) => document.querySelector(selector);
const mainContainer = $('#m');

const money = (num) => '৳' + Math.round(num || 0).toLocaleString('en-IN');

const esc = (str) =>
  String(str ?? '').replace(/[&<>"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[c]));

// Admin API client with Bearer token authentication
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('atok');
  const response = await fetch('/api/admin' + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

// Navigation Tabs
const TABS = [
  ['dash', '📊 Dashboard'],
  ['orders', '📦 Orders'],
  ['products', '🛍 Products'],
  ['cats', '🗂 Categories'],
  ['customers', '👥 Customers'],
  ['coupons', '🏷 Coupons'],
  ['videoad', '🎬 3D Video Ad'],
  ['returns', '↩ Returns'],
  ['abandoned', '🛒 Abandoned Carts'],
  ['settings', '⚙ Settings & Roles'],
];

const statusBadgeClasses = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-stone-200 text-stone-600',
  refunded: 'bg-rose-100 text-rose-700',
};

let currentRole = '';
let currentTab = 'dash';
let cachedCategories = [];

// UI Helper Components
const card = (title, value, subtitle = '') => `
  <div class="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
    <p class="text-xs uppercase font-semibold text-stone-500 tracking-wider">${title}</p>
    <p class="mt-2 text-2xl font-bold text-stone-900">${value}</p>
    ${subtitle ? `<p class="mt-1 text-xs text-stone-400">${subtitle}</p>` : ''}
  </div>
`;

const table = (headers, rows) => `
  <div class="overflow-x-auto rounded-2xl bg-white shadow-sm border border-stone-100">
    <table class="w-full text-sm">
      <thead>
        <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.join('') || `<tr><td colspan="${headers.length}" class="py-12 text-center text-stone-400">No records found</td></tr>`}
      </tbody>
    </table>
  </div>
`;

const header = (title, actionButton = '') => `
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold text-stone-900">${title}</h1>
    ${actionButton}
  </div>
`;

const toast = (htmlContent) => {
  const el = $('#toast');
  if (!el) return;
  el.innerHTML = htmlContent;
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 5000);
};

const executeAction = (promise, onSuccess) => {
  return promise
    .then(() => {
      if (onSuccess) onSuccess();
    })
    .catch((err) => alert(err.message));
};

// Admin Login
async function login(e) {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok || data.user.role === 'customer') {
      $('#le').textContent = data.error || 'Access denied: Staff or Admin credentials required';
      return;
    }

    localStorage.setItem('atok', data.token);
    localStorage.setItem('arole', data.user.role);
    init();
  } catch (err) {
    $('#le').textContent = err.message;
  }
}

// Admin App Initialization
function init() {
  const token = localStorage.getItem('atok');
  if (!token) return;

  currentRole = localStorage.getItem('arole') || 'staff';
  $('#login').classList.add('hidden');
  $('#dash').classList.remove('hidden');

  // Render navigation
  $('#nav').innerHTML = TABS.map(
    ([tabKey, tabLabel]) => `
      <button class="nav ${tabKey === currentTab ? 'on' : ''}" onclick="currentTab='${tabKey}'; init();">
        ${tabLabel}
      </button>
    `
  ).join('');

  // Validate session token
  api('/products').catch(() => {
    localStorage.removeItem('atok');
    location.reload();
  });

  // Real-time Order SSE Stream
  if (!init.eventSource) {
    init.eventSource = new EventSource('/api/admin/events?t=' + token);
    init.eventSource.onmessage = (e) => {
      const order = JSON.parse(e.data);
      toast(`🔔 <b>New Order #${order.id}</b><br>${esc(order.name)} · ${money(order.total)}`);

      // Gentle alert audio
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.connect(audioCtx.destination);
        osc.frequency.value = 880;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch {}

      if (currentTab === 'orders' || currentTab === 'dash') {
        init();
      }
    };
  }

  // Route to current tab
  const tabHandlers = {
    dash: renderDashboard,
    orders: renderOrders,
    products: renderProducts,
    cats: renderCategories,
    customers: renderCustomers,
    coupons: renderCoupons,
    videoad: renderVideoAd,
    returns: renderReturns,
    abandoned: renderAbandonedCarts,
    settings: renderSettings,
  };

  if (tabHandlers[currentTab]) {
    tabHandlers[currentTab]();
  }
}

// 1. Dashboard View
async function renderDashboard() {
  const stats = await api('/stats');
  const maxDayVal = Math.max(1, ...stats.days.map((d) => d.v));

  mainContainer.innerHTML = `
    ${header('Store Overview')}
    
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      ${card('Total Revenue', money(stats.revenue), 'From paid & delivered orders')}
      ${card('Today Revenue', money(stats.today), 'Sales recorded today')}
      ${card('Total Orders', stats.orders, 'All recorded orders')}
      ${card('Customers', stats.customers, 'Registered customer accounts')}
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 lg:col-span-2">
        <p class="mb-4 font-semibold text-stone-900">Last 7 Days Revenue</p>
        <div class="flex h-44 items-end gap-3 pt-6">
          ${stats.days.map((d) => `
            <div class="flex flex-1 flex-col items-center justify-end gap-1.5 h-full">
              <span class="text-[10px] text-stone-600 font-medium">${money(d.v)}</span>
              <div class="w-full rounded-t-lg bg-brand transition-all hover:opacity-85" style="height: ${(d.v / maxDayVal) * 100}%;"></div>
              <span class="text-[10px] text-stone-400">${d.d.slice(5)}</span>
            </div>
          `).join('') || '<p class="m-auto text-stone-400">No revenue data available</p>'}
        </div>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
        <p class="mb-4 font-semibold text-stone-900">Orders by Status</p>
        <div class="space-y-2">
          ${stats.byStatus.map((s) => `
            <div class="flex items-center justify-between text-sm py-1">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClasses[s.status] || 'bg-stone-100'}">
                ${s.status}
              </span>
              <b class="text-stone-800">${s.n}</b>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
        <p class="mb-3 font-semibold text-stone-900">Top Selling Products</p>
        <div class="divide-y divide-stone-100">
          ${stats.top.map(([prodName, qtySold]) => `
            <div class="flex justify-between py-2 text-sm">
              <span class="truncate pr-2 text-stone-700">${esc(prodName)}</span>
              <b class="text-stone-900 font-semibold">${qtySold} sold</b>
            </div>
          `).join('') || '<p class="text-stone-400 py-4 text-center">No sales yet</p>'}
        </div>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 lg:col-span-2">
        <p class="mb-3 font-semibold text-stone-900">⚠️ Low Stock Alert (≤ 5 items remaining)</p>
        <div class="divide-y divide-stone-100">
          ${stats.low.map((item) => `
            <div class="flex justify-between py-2 text-sm items-center">
              <span class="text-stone-800 font-medium">${esc(item.name)}</span>
              <span class="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                ${item.stock} in stock
              </span>
            </div>
          `).join('') || '<p class="text-stone-400 py-3">All items have healthy inventory levels.</p>'}
        </div>
      </div>
    </div>
  `;
}

// 2. Orders View
async function renderOrders() {
  const orders = await api('/orders');
  window.cachedOrders = orders;

  mainContainer.innerHTML =
    header('Orders Management') +
    table(
      ['Order #', 'Customer Details', 'Items', 'Total', 'Payment', 'Order Status', 'Actions'],
      orders.map((o) => `
        <tr>
          <td>
            <b>#${o.id}</b><br>
            <small class="text-stone-400">${o.created.slice(0, 16)}</small>
          </td>
          <td>
            <b>${esc(o.name)}</b><br>
            <small class="text-stone-600">${esc(o.phone)}</small><br>
            <small class="text-stone-400 line-clamp-1">${esc(o.address)}</small>
          </td>
          <td>
            ${o.items.map((i) => `<div class="text-xs py-0.5">${esc(i.name)} ×<b>${i.qty}</b></div>`).join('')}
          </td>
          <td><b>${money(o.total)}</b></td>
          <td>
            <small class="font-semibold text-stone-500">${o.method.toUpperCase()}</small><br>
            <select class="inp !w-28 !py-1 text-xs mt-1" onchange="updateOrderField(${o.id}, { payment_status: this.value })">
              ${['unpaid', 'paid', 'failed', 'refunded'].map((st) => `<option ${o.payment_status === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </td>
          <td>
            <select class="inp !w-32 !py-1 text-xs capitalize font-semibold ${statusBadgeClasses[o.status] || ''}" onchange="updateOrderField(${o.id}, { status: this.value })">
              ${Object.keys(statusBadgeClasses).map((st) => `<option ${o.status === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </td>
          <td class="whitespace-nowrap">
            <a class="btn o !py-1 !px-2.5 text-xs" target="_blank" href="/invoice/${o.id}?t=${localStorage.getItem('atok')}">Invoice</a>
            <a class="btn o !py-1 !px-2.5 text-xs text-emerald-700" target="_blank" href="https://wa.me/88${o.phone}">WhatsApp</a>
          </td>
        </tr>
      `)
    );
}

const updateOrderField = (orderId, body) => {
  executeAction(api('/orders/' + orderId, { method: 'PUT', body }), init);
};

// 3. Products View
async function renderProducts() {
  const [products, categories] = await Promise.all([
    api('/products'),
    fetch('/api/categories').then((r) => r.json()),
  ]);

  cachedCategories = categories;
  window.cachedProducts = products;

  mainContainer.innerHTML =
    header(
      'Products Catalog',
      '<button class="btn" onclick="openProductModal()">+ Add New Product</button>'
    ) +
    table(
      ['Image', 'Product Name', 'Category', 'Price', 'Sale Price', 'Stock', 'Status', 'Actions'],
      products.map((p) => `
        <tr>
          <td><img src="${esc(p.image.split(',')[0])}" class="h-12 w-12 rounded-lg object-cover border" alt="${esc(p.name)}"></td>
          <td><b>${esc(p.name)}</b></td>
          <td>${esc(p.cat || '—')}</td>
          <td>${money(p.price)}</td>
          <td>${p.sale_price ? money(p.sale_price) : '—'}</td>
          <td>
            <span class="${p.stock <= 5 ? 'font-bold text-rose-600' : 'text-stone-700'}">${p.stock}</span>
          </td>
          <td>
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold ${p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}">
              ${p.active ? 'Active' : 'Hidden'}
            </span>
          </td>
          <td class="whitespace-nowrap">
            <button class="btn o !py-1 !px-2.5 text-xs" onclick="openProductModal(${p.id})">Edit</button>
            ${currentRole === 'admin' ? `
              <button class="btn d !py-1 !px-2.5 text-xs" onclick="confirm('Delete product permanent?') && executeAction(api('/products/${p.id}', {method: 'DELETE'}), init)">
                Delete
              </button>
            ` : ''}
          </td>
        </tr>
      `)
    );
}

function openProductModal(productId) {
  const p = productId
    ? cachedProducts.find((x) => x.id == productId)
    : { variants: {}, active: 1 };
  const variants = p.variants || {};
  const dialog = $('#dg');

  dialog.innerHTML = `
    <form onsubmit="handleProductSave(event, ${productId || 0})" class="space-y-3">
      <h2 class="text-xl font-bold text-stone-900">${productId ? 'Edit Product' : 'Add New Product'}</h2>
      
      <div>
        <label class="text-xs font-semibold text-stone-500">Product Title *</label>
        <input name="name" class="inp mt-1" placeholder="Product name" required value="${esc(p.name || '')}">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-stone-500">Category</label>
          <select name="cat_id" class="inp mt-1">
            ${cachedCategories.map((c) => `<option value="${c.id}" ${p.cat_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-500">Stock Units</label>
          <input name="stock" type="number" class="inp mt-1" placeholder="0" value="${p.stock ?? 0}">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-stone-500">Regular Price (৳) *</label>
          <input name="price" type="number" class="inp mt-1" placeholder="Regular price" required value="${p.price ?? ''}">
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-500">Sale Price (৳)</label>
          <input name="sale_price" type="number" class="inp mt-1" placeholder="Optional" value="${p.sale_price ?? ''}">
        </div>
      </div>

      <div>
        <label class="text-xs font-semibold text-stone-500">Flash Sale Ending Date & Time</label>
        <input name="flash_end" type="datetime-local" class="inp mt-1" value="${(p.flash_end || '').slice(0, 16)}">
      </div>

      <div>
        <label class="text-xs font-semibold text-stone-500">Image URLs (comma-separated)</label>
        <input name="image" class="inp mt-1" placeholder="https://.../img1.jpg, https://.../img2.jpg" value="${esc(p.image || '')}">
      </div>

      <div>
        <label class="text-xs font-semibold text-stone-500">Product Description</label>
        <textarea name="description" class="inp mt-1" rows="3" placeholder="Description...">${esc(p.description || '')}</textarea>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-stone-500">Sizes (comma-separated)</label>
          <input name="sizes" class="inp mt-1" placeholder="S, M, L, XL" value="${(variants.sizes || []).join(', ')}">
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-500">Colors (comma-separated)</label>
          <input name="colors" class="inp mt-1" placeholder="Black, White, Blue" value="${(variants.colors || []).join(', ')}">
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm text-stone-700 cursor-pointer pt-1">
        <input type="checkbox" name="active" ${p.active ? 'checked' : ''}>
        <b>Visible in store</b>
      </label>

      <div class="flex justify-end gap-2 pt-3 border-t">
        <button type="button" class="btn o" onclick="document.getElementById('dg').close()">Cancel</button>
        <button class="btn">Save Product</button>
      </div>
    </form>
  `;

  dialog.showModal();
}

function handleProductSave(e, productId) {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  const splitClean = (key) =>
    form[key] ? form[key].split(',').map((x) => x.trim()).filter(Boolean) : undefined;

  form.variants = JSON.stringify({
    sizes: splitClean('sizes'),
    colors: splitClean('colors'),
  });
  form.active = form.active ? 1 : 0;
  form.flash_end = form.flash_end ? new Date(form.flash_end).toISOString() : null;

  executeAction(
    api('/products' + (productId ? '/' + productId : ''), {
      method: productId ? 'PUT' : 'POST',
      body: form,
    }),
    () => {
      $('#dg').close();
      init();
    }
  );
}

// 4. Categories View
async function renderCategories() {
  const cats = await fetch('/api/categories').then((r) => r.json());

  mainContainer.innerHTML =
    header('Categories') +
    `
    <form class="mb-6 flex gap-2" onsubmit="event.preventDefault(); executeAction(api('/categories', {method:'POST', body:{name: this.categoryName.value}}), init);">
      <input name="categoryName" class="inp max-w-xs" placeholder="New category name" required>
      <button class="btn">Add Category</button>
    </form>
    ` +
    table(
      ['Category Name', 'Actions'],
      cats.map((c) => `
        <tr>
          <td><b>${esc(c.name)}</b></td>
          <td class="text-right">
            ${currentRole === 'admin' ? `
              <button class="btn d !py-1 !px-2.5 text-xs" onclick="executeAction(api('/categories/${c.id}', {method: 'DELETE'}), init)">Delete</button>
            ` : ''}
          </td>
        </tr>
      `)
    );
}

// 5. Customers View
async function renderCustomers() {
  const customers = await api('/customers');

  mainContainer.innerHTML =
    header('Customer Directory') +
    table(
      ['Customer Name', 'Email', 'Phone', 'Orders Count', 'Total Spent', 'Registered Date'],
      customers.map((c) => `
        <tr>
          <td><b>${esc(c.name)}</b></td>
          <td>${esc(c.email)}</td>
          <td>${esc(c.phone || '—')}</td>
          <td>${c.orders}</td>
          <td><b>${money(c.spent)}</b></td>
          <td>${c.created.slice(0, 10)}</td>
        </tr>
      `)
    );
}

// 6. Coupons View
async function renderCoupons() {
  const coupons = await api('/coupons');

  mainContainer.innerHTML =
    header('Coupons & Discounts') +
    `
    <form class="mb-6 flex flex-wrap gap-2" onsubmit="event.preventDefault(); executeAction(api('/coupons', {method: 'POST', body: {code: this.couponCode.value, percent: this.couponPercent.value}}), init);">
      <input name="couponCode" class="inp max-w-[10rem] uppercase" placeholder="COUPON CODE" required>
      <input name="couponPercent" type="number" min="1" max="99" class="inp max-w-[8rem]" placeholder="% discount" required>
      <button class="btn">Create Coupon</button>
    </form>
    ` +
    table(
      ['Coupon Code', 'Discount', 'Actions'],
      coupons.map((c) => `
        <tr>
          <td><b>${esc(c.code)}</b></td>
          <td>${c.percent}% OFF</td>
          <td class="text-right">
            <button class="btn d !py-1 !px-2.5 text-xs" onclick="executeAction(api('/coupons/${c.code}', {method: 'DELETE'}), init)">Delete</button>
          </td>
        </tr>
      `)
    );
}

// 7. Returns View
async function renderReturns() {
  const allOrders = await api('/orders');
  const returns = allOrders.filter((o) => o.return_status);

  mainContainer.innerHTML =
    header('Refund & Return Requests') +
    table(
      ['Order #', 'Customer', 'Return Reason', 'Refund Amount', 'Return Status'],
      returns.map((o) => `
        <tr>
          <td><b>#${o.id}</b></td>
          <td>${esc(o.name)}<br><small>${esc(o.phone)}</small></td>
          <td>${esc(o.return_reason)}</td>
          <td><b>${money(o.total)}</b></td>
          <td>
            <select class="inp !w-36 !py-1 text-xs" onchange="const val = this.value; updateOrderField(${o.id}, val === 'refunded' ? { return_status: val, status: 'refunded', payment_status: 'refunded' } : { return_status: val });">
              ${['requested', 'approved', 'rejected', 'refunded'].map((st) => `<option ${o.return_status === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </td>
        </tr>
      `)
    );
}

// 8. Abandoned Carts View
async function renderAbandonedCarts() {
  const abandoned = await api('/abandoned');

  mainContainer.innerHTML =
    header('Abandoned Carts (Lead Recovery)') +
    table(
      ['Phone Number', 'Left in Cart', 'Last Seen', 'Recovery Action'],
      abandoned.map((a) => `
        <tr>
          <td><b>${esc(a.phone)}</b></td>
          <td>${a.items.map((i) => `${esc(i.name)} ×${i.qty}`).join(', ')}</td>
          <td><small class="text-stone-500">${a.updated.slice(0, 16)}</small></td>
          <td>
            <a class="btn !py-1 !px-3 text-xs bg-emerald-600 hover:bg-emerald-700" target="_blank" href="https://wa.me/88${a.phone}?text=${encodeURIComponent('Hello! Apnar Luxury & Elegant cart e kichu product rekhe gechen. Order ti complete korte apnake kono sahajjo lagbe?')}">
              Send WhatsApp Reminder
            </a>
          </td>
        </tr>
      `)
    );
}

// 9. Settings View
async function renderSettings() {
  const settings = await api('/settings');
  const staffList = currentRole === 'admin' ? await api('/staff') : [];

  const settingFields = [
    ['shop_name', 'Store Name'],
    ['whatsapp', 'Support WhatsApp Number (format: 8801XXXXXXXXX)'],
    ['ship_dhaka', 'Delivery Charge — Inside Dhaka (৳)'],
    ['ship_outside', 'Delivery Charge — Outside Dhaka (৳)'],
    ['free_ship', 'Free Shipping Threshold Amount (৳)'],
  ];

  mainContainer.innerHTML = `
    ${header('Store Configuration')}

    <form class="grid max-w-xl gap-4 rounded-2xl bg-white p-6 shadow-sm border border-stone-100" onsubmit="event.preventDefault(); executeAction(api('/settings', {method: 'PUT', body: Object.fromEntries(new FormData(this))}), () => toast('Settings saved successfully!'));">
      ${settingFields.map(([key, label]) => `
        <label class="text-xs font-semibold text-stone-500">
          ${label}
          <input name="${key}" class="inp mt-1 text-sm text-stone-900 font-medium" value="${esc(settings[key] || '')}" ${currentRole !== 'admin' ? 'disabled' : ''}>
        </label>
      `).join('')}

      ${currentRole === 'admin' ? `
        <button class="btn mt-2">Save Settings</button>
      ` : `
        <p class="text-xs text-stone-400">Only Administrator accounts can edit store settings.</p>
      `}
    </form>

    ${currentRole === 'admin' ? `
      <div class="mt-12">
        <h2 class="text-xl font-bold text-stone-900 mb-2">Admin Roles & Permissions</h2>
        <p class="text-xs text-stone-500 mb-4">Admin = full access · Staff = product & order handling (cannot change settings or delete records)</p>

        <form class="mb-6 flex flex-wrap gap-2" onsubmit="event.preventDefault(); executeAction(api('/staff', {method: 'POST', body: Object.fromEntries(new FormData(this))}), init);">
          <input name="name" class="inp max-w-[10rem]" placeholder="Full Name" required>
          <input name="email" type="email" class="inp max-w-[14rem]" placeholder="Email Address" required>
          <input name="password" type="password" class="inp max-w-[10rem]" placeholder="Password" required>
          <select name="role" class="inp max-w-[8rem]">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button class="btn">Add Staff</button>
        </form>

        ${table(
          ['Name', 'Email', 'Role'],
          staffList.map((s) => `
            <tr>
              <td><b>${esc(s.name)}</b></td>
              <td>${esc(s.email)}</td>
              <td><span class="capitalize font-semibold text-xs">${s.role}</span></td>
            </tr>
          `)
        )}

        <div class="mt-8 border-t pt-6">
          <button class="btn o" onclick="downloadBackup()">⬇ Download Database Backup (.db)</button>
        </div>
      </div>
    ` : ''}
  `;
}

function downloadBackup() {
  fetch('/api/admin/backup', {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('atok') },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shop-backup.db';
      a.click();
    })
    .catch((err) => alert(err.message));
}

// Video Advertisement Management
async function renderVideoAd() {
  const settings = await api('/settings');

  mainContainer.innerHTML = `
    ${header('Homepage 3D Video Advertisement')}
    
    <div class="grid gap-8 lg:grid-cols-12">
      <!-- Left Configuration Form -->
      <form class="space-y-5 rounded-2xl bg-white p-6 shadow-sm border border-stone-100 lg:col-span-7" onsubmit="handleSaveVideoAd(event)">
        <div class="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 class="font-bold text-stone-900 text-base">Advertisement Status</h3>
            <p class="text-xs text-stone-500">Show or hide the cinematic 3D advertisement on homepage</p>
          </div>
          <select name="video_ad_active" class="inp !w-36 text-sm font-semibold ${settings.video_ad_active !== '0' ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500'}">
            <option value="1" ${settings.video_ad_active !== '0' ? 'selected' : ''}>● Active (Live)</option>
            <option value="0" ${settings.video_ad_active === '0' ? 'selected' : ''}>○ Deactivated</option>
          </select>
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">Video File / URL</label>
          <input name="video_ad_url" id="adVideoUrlInput" class="inp mt-1 text-sm font-mono" placeholder="/videos/promo.mp4 or https://cdn.../video.mp4" value="${esc(settings.video_ad_url || '/videos/promo.mp4')}">
          <p class="text-[11px] text-stone-400 mt-1">Accepts local path (e.g. <code>/videos/promo.mp4</code>) or any external MP4/WebM URL.</p>
        </div>

        <!-- File Upload Section -->
        <div class="rounded-xl border-2 border-dashed border-stone-200 p-5 bg-stone-50/80 text-center">
          <p class="text-xs font-bold text-stone-800">Upload New Promotional 3D Video to Server</p>
          <p class="text-[11px] text-stone-500 mb-3">Supported formats: MP4, WebM (Saved into <code>public/videos/</code>)</p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <input type="file" id="videoFileInput" accept="video/mp4,video/webm,video/ogg" class="text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:bg-brand/90 cursor-pointer">
            <button type="button" class="btn !py-1.5 !px-4 text-xs shadow-sm" onclick="handleUploadVideoFile()">Upload & Activate</button>
          </div>
          <p id="uploadProgressText" class="text-xs text-emerald-700 font-semibold mt-2.5 hidden"></p>
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">Fallback Poster Image URL</label>
          <input name="video_ad_poster" class="inp mt-1 text-sm" placeholder="/images/video-poster.jpg" value="${esc(settings.video_ad_poster || '/images/video-poster.jpg')}">
          <p class="text-[11px] text-stone-400 mt-1">Displayed during video load, on slow connections, or for reduced-motion visitors.</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">Kicker / Badge Tag</label>
            <input name="video_ad_tag" class="inp mt-1 text-sm" placeholder="✦ 3D CRAFTSMANSHIP CINEMATIC" value="${esc(settings.video_ad_tag || '✦ 3D CRAFTSMANSHIP CINEMATIC')}">
          </div>
          <div>
            <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">CTA Button Text</label>
            <input name="video_ad_cta_text" class="inp mt-1 text-sm" placeholder="Shop The Collection" value="${esc(settings.video_ad_cta_text || 'Shop The Collection')}">
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">Promotional Headline</label>
          <input name="video_ad_title" class="inp mt-1 text-sm font-semibold" placeholder="Headline title" value="${esc(settings.video_ad_title || 'Precision in Motion. Sound in Perfection.')}">
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">Promotional Subtitle</label>
          <textarea name="video_ad_subtitle" rows="3" class="inp mt-1 text-sm leading-relaxed">${esc(settings.video_ad_subtitle || 'Experience our 2026 flagship curation — forged from surgical-grade gold alloy, scratchproof sapphire crystal, and acoustic titanium.')}</textarea>
        </div>

        <div>
          <label class="text-xs font-semibold text-stone-600 uppercase tracking-wide">CTA Button Link</label>
          <input name="video_ad_cta_link" class="inp mt-1 text-sm" placeholder="#shop" value="${esc(settings.video_ad_cta_link || '#shop')}">
        </div>

        <div class="pt-2">
          <button class="btn w-full !py-3 shadow-md">Save Advertisement Settings</button>
        </div>
      </form>

      <!-- Right Live Preview Card -->
      <div class="space-y-4 lg:col-span-5">
        <h3 class="font-bold text-stone-900 text-base">Live Component Preview</h3>
        <div class="relative overflow-hidden rounded-2xl bg-black shadow-xl aspect-[16/10] border border-stone-800">
          <video 
            id="adPreviewVideo" 
            class="absolute inset-0 w-full h-full object-cover" 
            autoplay 
            muted 
            loop 
            playsinline 
            poster="${esc(settings.video_ad_poster || '/images/video-poster.jpg')}"
          >
            <source src="${esc(settings.video_ad_url || '/videos/promo.webm')}" type="${(settings.video_ad_url || '').endsWith('.mp4') ? 'video/mp4' : 'video/webm'}">
            <source src="${(settings.video_ad_url || '/videos/promo.webm').endsWith('.webm') ? (settings.video_ad_url || '/videos/promo.webm').replace(/\.webm$/, '.mp4') : (settings.video_ad_url || '/videos/promo.mp4').replace(/\.mp4$/, '.webm')}" type="${(settings.video_ad_url || '').endsWith('.mp4') ? 'video/webm' : 'video/mp4'}">
            <img src="${esc(settings.video_ad_poster || '/images/video-poster.jpg')}" class="w-full h-full object-cover">
          </video>
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 flex flex-col justify-end text-white pointer-events-none">
            <span class="text-[10px] uppercase font-bold text-gold tracking-widest">${esc(settings.video_ad_tag || '✦ 3D CRAFTSMANSHIP CINEMATIC')}</span>
            <h4 class="font-serif text-lg font-bold leading-tight mt-1">${esc(settings.video_ad_title || 'Precision in Motion.')}</h4>
            <p class="text-xs text-stone-300 mt-1 line-clamp-2">${esc(settings.video_ad_subtitle || 'Sculpted from gold alloy & sapphire crystal.')}</p>
            <span class="mt-3 inline-block rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-stone-900 w-fit">
              ${esc(settings.video_ad_cta_text || 'Shop The Collection')} →
            </span>
          </div>
        </div>

        <div class="rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs text-stone-600 space-y-1.5">
          <p class="font-bold text-stone-900">💡 Video Guidelines for Best Results:</p>
          <p>• <b>Format:</b> H.264 MP4 or WebM (standard web video)</p>
          <p>• <b>Dimensions:</b> 1920×1080 (16:9) or 1280×720</p>
          <p>• <b>Size:</b> Under 25MB recommended for instant mobile loading</p>
          <p>• <b>Autoplay Notice:</b> Modern browsers require autoplaying promotional videos to be muted.</p>
        </div>
      </div>
    </div>
  `;
}

async function handleSaveVideoAd(e) {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  try {
    await api('/settings', { method: 'PUT', body: form });
    toast('Advertisement settings saved successfully! ✓');
    init();
  } catch (err) {
    alert(err.message);
  }
}

async function handleUploadVideoFile() {
  const fileInput = $('#videoFileInput');
  const file = fileInput?.files?.[0];
  if (!file) {
    alert('Please select an MP4 or WebM video file to upload.');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    alert('Video file is too large. Maximum allowed size is 50MB.');
    return;
  }

  const progressText = $('#uploadProgressText');
  if (progressText) {
    progressText.textContent = `Uploading "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)... Please wait.`;
    progressText.classList.remove('hidden');
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await api('/upload-video', {
        method: 'POST',
        body: { filename: file.name, base64: reader.result },
      });
      if (progressText) {
        progressText.textContent = `Uploaded successfully as "${res.url}"!`;
      }
      toast('Video uploaded and set as active advertisement! 🎉');
      const urlInput = $('#adVideoUrlInput');
      if (urlInput) urlInput.value = res.url;
      renderVideoAd();
    } catch (err) {
      alert('Upload failed: ' + err.message);
      if (progressText) progressText.classList.add('hidden');
    }
  };
  reader.readAsDataURL(file);
}

window.handleSaveVideoAd = handleSaveVideoAd;
window.handleUploadVideoFile = handleUploadVideoFile;

// Start Admin Application
init();

