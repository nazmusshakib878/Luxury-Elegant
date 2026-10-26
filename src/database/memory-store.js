const fs = require('fs');
const path = require('path');

class MemoryStore {
  constructor() {
    this.categories = [];
    this.products = [];
    this.settings = [];
    this.coupons = [];
    this.reviews = [];
    this.orders = [];
    this.users = [];
    this.abandoned = [];
    this.initialized = false;
    this.loadSeed();
  }

  loadSeed() {
    if (this.initialized) return;
    try {
      const seedPath = path.resolve(__dirname, 'seed-data.json');
      if (fs.existsSync(seedPath)) {
        const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        this.categories = (data.categories || []).map((c) => ({ ...c }));
        this.products = (data.products || []).map((p) => ({ ...p }));
        this.settings = (data.settings || []).map((s) => ({ ...s }));
        this.coupons = (data.coupons || []).map((cp) => ({ ...cp }));
        this.reviews = (data.reviews || []).map((r) => ({ ...r }));
      }
      this.initialized = true;
    } catch (e) {
      console.warn('MemoryStore loadSeed error:', e.message);
    }
  }

  queryProducts(sql, params = []) {
    let list = this.products.map((p) => {
      const cat = this.categories.find((c) => c.id === p.cat_id);
      const prodReviews = this.reviews.filter((r) => r.product_id === p.id);
      const rating =
        prodReviews.length > 0
          ? +(prodReviews.reduce((sum, r) => sum + (+r.rating || 0), 0) / prodReviews.length).toFixed(1)
          : null;
      return {
        ...p,
        cat: cat ? cat.name : null,
        rating,
        reviews: prodReviews.length,
      };
    });

    if (/active\s*=\s*1/i.test(sql)) {
      list = list.filter((p) => p.active === 1 || p.active === undefined);
    }

    // Specific product ID
    const idMatch = sql.match(/(?:p\.)?id\s*=\s*\?/i);
    if (idMatch && params.length > 0) {
      const idVal = Number(params[params.length - 1]);
      list = list.filter((p) => p.id === idVal);
    }

    // ID IN (...)
    const inMatch = sql.match(/id\s+IN\s*\(([^)]+)\)/i);
    if (inMatch && params.length > 0) {
      const ids = params.map(Number);
      list = list.filter((p) => ids.includes(p.id));
    }

    // Search: LIKE ?
    if (sql.includes('LIKE ?')) {
      const searchTerms = params.filter((p) => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
      if (searchTerms.length > 0) {
        const raw = searchTerms[0].replace(/^%|%$/g, '').toLowerCase();
        list = list.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(raw)) ||
            (p.description && p.description.toLowerCase().includes(raw))
        );
      }
    }

    // Category filter: cat_id = ? or LOWER(c.name) = LOWER(?)
    if (sql.includes('cat_id = ?')) {
      const catParam = params.find((p) => typeof p === 'number' || /^\d+$/.test(p));
      if (catParam !== undefined) {
        list = list.filter((p) => p.cat_id === Number(catParam));
      }
    } else if (sql.includes('LOWER(c.name) = LOWER(?)')) {
      const catParam = params.find((p) => typeof p === 'string' && !p.startsWith('%'));
      if (catParam) {
        list = list.filter((p) => (p.cat || '').toLowerCase() === catParam.toLowerCase());
      }
    }

    // Min price / max price
    if (sql.includes('COALESCE(p.sale_price, p.price) >= ?')) {
      const minParam = params.find((p) => typeof p === 'number');
      if (minParam !== undefined) {
        list = list.filter((p) => (p.sale_price || p.price) >= minParam);
      }
    }
    if (sql.includes('COALESCE(p.sale_price, p.price) <= ?')) {
      const maxParam = params.find((p) => typeof p === 'number');
      if (maxParam !== undefined) {
        list = list.filter((p) => (p.sale_price || p.price) <= maxParam);
      }
    }

    // Sale filter
    if (sql.includes('sale_price IS NOT NULL AND p.sale_price < p.price')) {
      list = list.filter((p) => p.sale_price && p.sale_price < p.price);
    }

    // Low stock filter (for admin stats)
    if (sql.includes('stock <= 5')) {
      list = list.filter((p) => p.stock <= 5);
    }

    // Sorting
    if (sql.includes('COALESCE(p.sale_price, p.price) ASC')) {
      list.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
    } else if (sql.includes('COALESCE(p.sale_price, p.price) DESC')) {
      list.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
    } else if (sql.includes('rating DESC')) {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.id - a.id);
    } else {
      list.sort((a, b) => b.id - a.id);
    }

    if (sql.includes('LIMIT 10')) {
      list = list.slice(0, 10);
    }

    return list;
  }

  all(sql, params = []) {
    this.loadSeed();
    const cleanSql = sql.trim();

    // 1. Categories
    if (/FROM\s+categories/i.test(cleanSql)) {
      if (/COUNT\(\*\)/i.test(cleanSql)) {
        return [{ count: this.categories.length, c: this.categories.length }];
      }
      return [...this.categories].sort((a, b) => a.id - b.id);
    }

    // 2. Settings
    if (/FROM\s+settings/i.test(cleanSql)) {
      if (/WHERE\s+k\s*=\s*\?/i.test(cleanSql)) {
        const found = this.settings.find((s) => s.k === params[0]);
        return found ? [found] : [];
      }
      return [...this.settings];
    }

    // 3. Coupons
    if (/FROM\s+coupons/i.test(cleanSql)) {
      if (/WHERE\s+code\s*=\s*\?/i.test(cleanSql)) {
        const target = String(params[0] || '').toUpperCase().trim();
        const found = this.coupons.find(
          (c) => c.code.toUpperCase() === target && (c.active === 1 || c.active === true)
        );
        return found ? [found] : [];
      }
      return [...this.coupons].sort((a, b) => a.code.localeCompare(b.code));
    }

    // 4. Products
    if (/FROM\s+products/i.test(cleanSql)) {
      if (/COUNT\(\*\)/i.test(cleanSql)) {
        const filtered = this.queryProducts(cleanSql, params);
        return [{ count: filtered.length, c: filtered.length }];
      }
      return this.queryProducts(cleanSql, params);
    }

    // 5. Reviews
    if (/FROM\s+reviews/i.test(cleanSql)) {
      if (/WHERE\s+product_id\s*=\s*\?/i.test(cleanSql)) {
        const pid = Number(params[0]);
        return this.reviews
          .filter((r) => r.product_id === pid)
          .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
      }
      return [...this.reviews];
    }

    // 6. Orders
    if (/FROM\s+orders/i.test(cleanSql)) {
      if (/COUNT\(\*\)/i.test(cleanSql)) {
        return [{ total_orders: this.orders.length, count: this.orders.length, c: this.orders.length }];
      }
      if (/SUM\(total\)/i.test(cleanSql)) {
        const rev = this.orders
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (+o.total || 0), 0);
        return [{ total_revenue: rev }];
      }
      if (/WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
        const ord = this.orders.find((o) => o.id === Number(params[0]));
        return ord ? [ord] : [];
      }
      if (/WHERE\s+phone\s*=\s*\?/i.test(cleanSql)) {
        const phone = String(params[0] || '').trim();
        return this.orders
          .filter((o) => String(o.phone).includes(phone))
          .sort((a, b) => b.id - a.id);
      }
      let ords = [...this.orders].sort((a, b) => b.id - a.id);
      if (cleanSql.includes('LIMIT 8')) ords = ords.slice(0, 8);
      return ords;
    }

    // 7. Users
    if (/FROM\s+users/i.test(cleanSql)) {
      if (/COUNT\(\*\)/i.test(cleanSql)) {
        return [{ count: this.users.length, c: this.users.length }];
      }
      if (/role\s*=\s*'admin'/i.test(cleanSql)) {
        const admin = this.users.find((u) => u.role === 'admin') || {
          id: 1,
          email: 'admin@luxury-elegant.com',
          role: 'admin',
        };
        return [admin];
      }
      if (/email/i.test(cleanSql)) {
        const target = String(params[0] || '').toLowerCase().trim();
        const found = this.users.find((u) => (u.email || '').toLowerCase() === target);
        return found ? [found] : [];
      }
      return [...this.users];
    }

    // 8. Abandoned
    if (/FROM\s+abandoned/i.test(cleanSql)) {
      return [...this.abandoned].sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
    }

    return [];
  }

  get(sql, params = []) {
    const rows = this.all(sql, params);
    return rows[0] || null;
  }

  run(sql, params = []) {
    this.loadSeed();
    const cleanSql = sql.trim();

    // INSERT INTO orders
    if (/INSERT\s+INTO\s+orders/i.test(cleanSql)) {
      const newId = this.orders.length > 0 ? Math.max(...this.orders.map((o) => o.id)) + 1 : 1001;
      const order = {
        id: newId,
        user_id: params[0] || null,
        name: params[1] || '',
        phone: params[2] || '',
        address: params[3] || '',
        area: params[4] || 'inside_dhaka',
        items: params[5] || '[]',
        subtotal: +params[6] || 0,
        discount: +params[7] || 0,
        shipping: +params[8] || 0,
        total: +params[9] || 0,
        coupon: params[10] || '',
        method: params[11] || 'cod',
        payment_status: params[12] || 'unpaid',
        status: params[13] || 'pending',
        created: new Date().toISOString(),
      };
      this.orders.unshift(order);
      return { changes: 1, lastInsertRowid: newId };
    }

    // INSERT INTO reviews
    if (/INSERT\s+INTO\s+reviews/i.test(cleanSql)) {
      const newId = this.reviews.length > 0 ? Math.max(...this.reviews.map((r) => r.id)) + 1 : 1;
      const review = {
        id: newId,
        product_id: Number(params[0]),
        user_name: params[1] || 'Verified Client',
        rating: Number(params[2]) || 5,
        comment: params[3] || '',
        created: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      this.reviews.push(review);
      return { changes: 1, lastInsertRowid: newId };
    }

    // INSERT INTO products
    if (/INSERT\s+INTO\s+products/i.test(cleanSql)) {
      const newId = this.products.length > 0 ? Math.max(...this.products.map((p) => p.id)) + 1 : 1;
      const product = {
        id: newId,
        name: params[0] || '',
        cat_id: params[1] ? Number(params[1]) : 1,
        price: +params[2] || 0,
        sale_price: params[3] ? +params[3] : null,
        stock: +params[4] || 0,
        image: params[5] || '',
        description: params[6] || '',
        variants: params[7] || '{}',
        flash_end: null,
        active: 1,
      };
      this.products.push(product);
      return { changes: 1, lastInsertRowid: newId };
    }

    // INSERT INTO settings
    if (/INSERT\s+INTO\s+settings|INSERT\s+OR\s+REPLACE\s+INTO\s+settings/i.test(cleanSql)) {
      const k = params[0];
      const v = String(params[1] ?? '');
      const existing = this.settings.find((s) => s.k === k);
      if (existing) {
        existing.v = v;
      } else {
        this.settings.push({ k, v });
      }
      return { changes: 1 };
    }

    // INSERT INTO coupons
    if (/INSERT\s+INTO\s+coupons/i.test(cleanSql)) {
      const code = String(params[0] || '').toUpperCase().trim();
      const percent = +params[1] || 10;
      const active = params[2] !== undefined ? +params[2] : 1;
      const existing = this.coupons.find((c) => c.code === code);
      if (existing) {
        existing.percent = percent;
        existing.active = active;
      } else {
        this.coupons.push({ code, percent, active });
      }
      return { changes: 1 };
    }

    // UPDATE products SET stock
    if (/UPDATE\s+products\s+SET\s+stock/i.test(cleanSql)) {
      const qty = +params[0] || 0;
      const pid = Number(params[1]);
      const prod = this.products.find((p) => p.id === pid);
      if (prod) {
        prod.stock = Math.max(0, (prod.stock || 0) - qty);
      }
      return { changes: 1 };
    }

    // UPDATE orders SET status
    if (/UPDATE\s+orders\s+SET/i.test(cleanSql)) {
      const orderId = Number(params[params.length - 1]);
      const ord = this.orders.find((o) => o.id === orderId);
      if (ord) {
        if (/status\s*=\s*\?/i.test(cleanSql)) ord.status = params[0];
        if (/payment_status\s*=\s*\?/i.test(cleanSql)) ord.payment_status = params[0];
      }
      return { changes: 1 };
    }

    // DELETE FROM products
    if (/DELETE\s+FROM\s+products/i.test(cleanSql)) {
      const pid = Number(params[0]);
      this.products = this.products.filter((p) => p.id !== pid);
      return { changes: 1 };
    }

    // DELETE FROM coupons
    if (/DELETE\s+FROM\s+coupons/i.test(cleanSql)) {
      const code = String(params[0] || '').toUpperCase().trim();
      this.coupons = this.coupons.filter((c) => c.code !== code);
      return { changes: 1 };
    }

    return { changes: 1 };
  }

  exec(sql) {
    return { changes: 0 };
  }
}

module.exports = MemoryStore;
