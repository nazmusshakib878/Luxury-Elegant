'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('luxury_shop_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedWishlist = localStorage.getItem('luxury_shop_wishlist');
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch {}
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('luxury_shop_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Save wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('luxury_shop_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const addToCart = (product, qty = 1, variant = null) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === product.id && JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      const price = product.price_now || product.sale_price || product.price;

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += qty;
        return updated;
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: +price,
          regularPrice: +product.price,
          image: product.image,
          stock: +product.stock,
          variant,
          qty,
        },
      ];
    });

    showToast(`Added "${product.name}" to cart`);
    setIsDrawerOpen(true);
  };

  const updateQty = (id, delta, variant = null) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id && JSON.stringify(item.variant) === JSON.stringify(variant)) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id, variant = null) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === id && JSON.stringify(item.variant) === JSON.stringify(variant)))
    );
    showToast('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        showToast(`Removed from wishlist`);
        return prev.filter((p) => p.id !== product.id);
      } else {
        showToast(`Added "${product.name}" to wishlist`);
        return [...prev, product];
      }
    });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        isDrawerOpen,
        setIsDrawerOpen,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        showToast,
        wishlist,
        toggleWishlist,
      }}
    >
      {children}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1c1917',
            color: '#ffffff',
            padding: '0.75rem 1.75rem',
            borderRadius: '9999px',
            fontSize: '0.9rem',
            fontWeight: '500',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid rgba(200, 162, 74, 0.4)',
          }}
        >
          <span style={{ color: '#c8a24a' }}>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
