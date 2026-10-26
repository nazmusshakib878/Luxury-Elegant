'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

// Authenticated admin API client (sends the stored admin token)
async function apiAdmin(endpoint, options = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('luxury_admin_token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    };
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      let msg = 'Admin request failed';
      try {
        const d = await res.json();
        if (d && d.error) msg = d.error;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

export default function AdminDashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('admin@shop.com');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Tabs: 'stats' | 'orders' | 'products' | 'coupons' | 'abandoned' | 'settings'
  const [activeTab, setActiveTab] = useState('stats');

  // Data states
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [abandoned, setAbandoned] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdCat, setNewProdCat] = useState('1');
  const [newProdDesc, setNewProdDesc] = useState('');

  // New coupon form state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState('15');

  // Check login on mount
  useEffect(() => {
    const token = localStorage.getItem('luxury_admin_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
    }
  }, [isLoggedIn, activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        setStats(await apiAdmin('/api/admin/stats'));
      } else if (activeTab === 'orders') {
        setOrders(await apiAdmin('/api/orders'));
      } else if (activeTab === 'products') {
        setProducts(await apiAdmin('/api/products'));
      } else if (activeTab === 'coupons') {
        setCoupons(await apiAdmin('/api/admin/coupons'));
      } else if (activeTab === 'abandoned') {
        setAbandoned(await apiAdmin('/api/admin/abandoned'));
      } else if (activeTab === 'settings') {
        setSettings(await apiAdmin('/api/admin/settings'));
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

    // Authenticated admin API client (sends the stored admin token)
  async function apiAdmin(endpoint, options = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('luxury_admin_token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    };
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      let msg = 'Admin request failed';
      try {
        const d = await res.json();
        if (d && d.error) msg = d.error;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      localStorage.setItem('luxury_admin_token', data.token);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('luxury_admin_token');
    setIsLoggedIn(false);
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const data = await apiAdmin(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const data = await apiAdmin('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          price: +newProdPrice,
          stock: +newProdStock,
          cat_id: +newProdCat,
          description: newProdDesc,
          image: '/images/default.jpg',
        }),
      });
      if (data?.success) {
        alert('Product created successfully!');
        setNewProdName('');
        setNewProdPrice('');
        setNewProdDesc('');
        loadDashboardData();
      }
    } catch (err) {
      alert('Error creating product');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      const data = await apiAdmin('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCouponCode.trim(), percent: +newCouponPercent }),
      });
      if (data?.success) {
        alert('Coupon created!');
        setNewCouponCode('');
        loadDashboardData();
      }
    } catch (err) {
      alert('Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (code) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    try {
      const data = await apiAdmin(`/api/admin/coupons?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      if (data?.success) {
        setCoupons((prev) => prev.filter((c) => c.code !== code));
      }
    } catch {
      alert('Failed to delete coupon');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const data = await apiAdmin('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (data?.success) {
        alert('Settings updated successfully!');
      }
    } catch {
      alert('Failed to save settings');
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: '28rem', margin: '4rem auto', padding: '0 1.25rem' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '2rem',
              padding: '2.5rem',
              border: '1px solid #e7e5e4',
              boxShadow: '0 20px 45px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
            <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f3d2e', margin: '0 0 0.5rem' }}>
              Management Atelier
            </h1>
            <p style={{ color: '#78716c', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Sign in with authorized credentials to access metrics, inventory, and order fulfillment.
            </p>

            {loginError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="inp"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="inp"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="btn btn-p"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
              >
                {isLoggingIn ? 'Authenticating…' : 'Access Portal →'}
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: '80rem', margin: '2rem auto', padding: '0 1.25rem' }}>
        {/* Top Bar with Logout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ color: '#c8a24a', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ✦ Concierge Control Panel
            </span>
            <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: '#0f3d2e', margin: 0 }}>
              Store Administration
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/" target="_blank" className="btn btn-o" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              View Live Storefront ↗
            </Link>
            <button onClick={handleLogout} className="btn btn-o" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', color: '#ef4444', borderColor: '#fca5a5' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
          {[
            { id: 'stats', label: '📊 Overview' },
            { id: 'orders', label: '📦 Orders' },
            { id: 'products', label: '💎 Catalog' },
            { id: 'coupons', label: '🎟️ Coupons' },
            { id: 'abandoned', label: '💬 Abandoned Carts' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pill ${activeTab === tab.id ? 'on' : ''}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Stats Overview */}
        {activeTab === 'stats' && (
          <div>
            {stats ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e7e5e4' }}>
                    <div style={{ fontSize: '0.8rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>Gross Revenue</div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f3d2e', marginTop: '0.4rem' }}>
                      ৳{stats.revenue.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e7e5e4' }}>
                    <div style={{ fontSize: '0.8rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>Total Orders</div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1c1917', marginTop: '0.4rem' }}>
                      {stats.orders}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e7e5e4' }}>
                    <div style={{ fontSize: '0.8rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>Active Products</div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#c8a24a', marginTop: '0.4rem' }}>
                      {stats.products}
                    </div>
                  </div>
                </div>

                {/* Recent Orders Overview */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
                  <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Recent Order Activity</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #e7e5e4', color: '#78716c' }}>
                          <th style={{ padding: '0.75rem' }}>ID</th>
                          <th style={{ padding: '0.75rem' }}>Client</th>
                          <th style={{ padding: '0.75rem' }}>Phone</th>
                          <th style={{ padding: '0.75rem' }}>Total</th>
                          <th style={{ padding: '0.75rem' }}>Status</th>
                          <th style={{ padding: '0.75rem' }}>Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentOrders.map((ro) => (
                          <tr key={ro.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f3d2e' }}>#{ro.id}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{ro.name}</td>
                            <td style={{ padding: '0.75rem', color: '#44403c' }}>{ro.phone}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>৳{(+ro.total).toLocaleString()}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(15, 61, 46, 0.1)', color: '#0f3d2e' }}>
                                {ro.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <Link href={`/invoice/${ro.id}?phone=${ro.phone}`} target="_blank" style={{ color: '#c8a24a', textDecoration: 'none', fontWeight: 600 }}>
                                📄 View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div>Loading metrics…</div>
            )}
          </div>
        )}

        {/* Tab 2: Orders List & Status Updates */}
        {activeTab === 'orders' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
            <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Client Order Fulfillment</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e7e5e4', color: '#78716c' }}>
                    <th style={{ padding: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.75rem' }}>Client & Phone</th>
                    <th style={{ padding: '0.75rem' }}>Address</th>
                    <th style={{ padding: '0.75rem' }}>Items</th>
                    <th style={{ padding: '0.75rem' }}>Total</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f3d2e' }}>#{o.id}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <div style={{ color: '#78716c', fontSize: '0.8rem' }}>{o.phone}</div>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#44403c', maxWidth: '14rem' }}>{o.address}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {Array.isArray(o.items) ? o.items.length : 0} items
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f3d2e' }}>৳{o.total?.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #d6d3d1',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: '#faf7f2',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Link href={`/invoice/${o.id}?phone=${o.phone}`} target="_blank" className="btn btn-gold" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                          Invoice
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Products Management */}
        {activeTab === 'products' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* Left: Product List */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Product Catalog ({products.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '35rem', overflowY: 'auto' }}>
                {products.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: '#faf7f2', border: '1px solid #e7e5e4' }}>
                    <img src={p.image || '/images/default.jpg'} alt={p.name} style={{ width: '3rem', height: '3rem', objectFit: 'cover', borderRadius: '0.5rem' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#0f3d2e', fontWeight: 700 }}>৳{(p.price_now || p.price).toLocaleString()} · Stock: {p.stock}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Add New Product Form */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Add New Luxury Item</h3>
              <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Item Name *</label>
                  <input required type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} placeholder="e.g. Royal Tourbillon Rose Gold" className="inp" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Price (৳) *</label>
                    <input required type="number" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} placeholder="4500" className="inp" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Initial Stock *</label>
                    <input required type="number" value={newProdStock} onChange={(e) => setNewProdStock(e.target.value)} className="inp" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Category</label>
                  <select value={newProdCat} onChange={(e) => setNewProdCat(e.target.value)} className="inp">
                    <option value="1">Fashion & Horology</option>
                    <option value="2">Electronics & Sound</option>
                    <option value="3">Home & Living</option>
                    <option value="4">Artisanal Beauty</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Description</label>
                  <textarea rows={2} value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} placeholder="Craftsmanship details…" className="inp" />
                </div>
                <button type="submit" className="btn btn-p" style={{ marginTop: '0.5rem' }}>
                  + Add to Catalog
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Coupons Management */}
        {activeTab === 'coupons' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Active Promo Coupons</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {coupons.map((c) => (
                  <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f3d2e', fontSize: '1rem', letterSpacing: '0.05em' }}>{c.code}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#c8a24a', fontWeight: 600 }}>({c.percent}% OFF)</span>
                    </div>
                    <button onClick={() => handleDeleteCoupon(c.code)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Create New Coupon</h3>
              <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Coupon Code *</label>
                  <input required type="text" placeholder="e.g. VIP25, SUMMER15" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} className="inp" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Discount Percentage (%) *</label>
                  <input required type="number" min="1" max="90" value={newCouponPercent} onChange={(e) => setNewCouponPercent(e.target.value)} className="inp" />
                </div>
                <button type="submit" className="btn btn-gold">
                  Activate Coupon
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 5: Abandoned Carts */}
        {activeTab === 'abandoned' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid #e7e5e4' }}>
            <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Abandoned Cart Recovery</h3>
            <p style={{ color: '#78716c', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Directly contact visitors who added items to their cart but left before checkout via WhatsApp.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e7e5e4', color: '#78716c' }}>
                    <th style={{ padding: '0.75rem' }}>Phone Number</th>
                    <th style={{ padding: '0.75rem' }}>Items in Cart</th>
                    <th style={{ padding: '0.75rem' }}>Last Updated</th>
                    <th style={{ padding: '0.75rem' }}>WhatsApp Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {abandoned.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{a.phone}</td>
                      <td style={{ padding: '0.75rem' }}>{Array.isArray(a.items) ? a.items.length : 0} items</td>
                      <td style={{ padding: '0.75rem', color: '#78716c' }}>{new Date(a.updated).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <a
                          href={`https://wa.me/88${a.phone.replace(/^0/, '')}?text=${encodeURIComponent('Hello! We noticed you left exclusive items in your cart at Luxury & Elegant. Can we offer you a complimentary privilege discount code?')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-p"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#25D366' }}
                        >
                          💬 Send WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Settings */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '36rem', backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #e7e5e4' }}>
            <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Store Settings & Rules</h3>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Store Name</label>
                <input type="text" value={settings.shop_name || ''} onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })} className="inp" />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>WhatsApp Helpline</label>
                <input type="text" value={settings.whatsapp || ''} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} className="inp" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Inside Dhaka Shipping (৳)</label>
                  <input type="number" value={settings.ship_dhaka || 60} onChange={(e) => setSettings({ ...settings, ship_dhaka: e.target.value })} className="inp" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Outside Dhaka Shipping (৳)</label>
                  <input type="number" value={settings.ship_outside || 120} onChange={(e) => setSettings({ ...settings, ship_outside: e.target.value })} className="inp" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Free Shipping Threshold (৳)</label>
                <input type="number" value={settings.free_ship || 3000} onChange={(e) => setSettings({ ...settings, free_ship: e.target.value })} className="inp" />
              </div>
              <button type="submit" className="btn btn-p" style={{ marginTop: '0.5rem' }}>
                Save Store Configuration
              </button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
