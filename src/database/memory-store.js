const seedData = require('./seed-data.json');

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
      this.categories = (seedData.categories || []).map((c) => ({ ...c }));
      this.products = (seedData.products || []).map((p) => ({ ...p }));
      this.settings = (seedData.settings || []).map((s) => ({ ...s }));
      this.coupons = (seedData.coupons || []).map((cp) => ({ ...cp }));
      this.reviews = (seedData.reviews || []).map((r) => ({ ...r }));
      this.initialized = true;
    } catch (e) {
      console.warn('MemoryStore loadSeed error:', e.message);
    }
  }

  queryProducts(sql, params = []) {
    let list = this.products.map((p) => {
      const cat = this.categories.find((c) => c.id === p.cat_id);
      const prodReviews = this.reviews.filter((r) => r.product_id === p.id);
      const validRatings = prodReviews.map((review) => Number(review.rating)).filter((value) => Number.isFinite(value) && value >= 0 && value <= 5);
      const rating = validRatings.length > 0
        ? +(validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length).toFixed(1)
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
      if (/^SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(cleanSql)) {
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
      if (/^SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(cleanSql)) {
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
      if (/^SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(cleanSql)) {
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
      if (/^SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(cleanSql)) {
        return [{ count: this.users.length, c: this.users.length }];
      }
      if (/role\s*=\s*'admin'/i.test(cleanSql)) {
        const admin = this.users.find((u) => u.role === 'admin');
        return admin ? [admin] : [];
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

    // CRITICAL SAFETY CONSTRAINT: Never allow in-memory fallback to accept real orders, payments, inventory updates, or admin changes.
    if (/INSERT\s+INTO\s+orders/i.test(cleanSql)) {
      throw new Error('Order placement and payment processing are strictly disabled in read-only catalog fallback mode. A connected PostgreSQL database (DATABASE_URL) is required for transactions.');
    }

    if (/UPDATE\s+products\s+SET\s+stock/i.test(cleanSql)) {
      throw new Error('Inventory mutation is strictly disabled in read-only catalog fallback mode.');
    }

    if (/UPDATE\s+orders/i.test(cleanSql)) {
      throw new Error('Order status update is strictly disabled in read-only catalog fallback mode.');
    }

    if (/INSERT\s+INTO\s+(?:products|settings|coupons|users|abandoned)/i.test(cleanSql)) {
      throw new Error('Data mutation is strictly disabled in read-only catalog fallback mode. Production database required.');
    }

    if (/DELETE\s+FROM/i.test(cleanSql)) {
      throw new Error('Deletion is strictly disabled in read-only catalog fallback mode.');
    }

    return { changes: 0, lastInsertRowid: null };
  }

  exec(sql) {
    return { changes: 0 };
  }
}

module.exports = MemoryStore;
