/**
 * Luxury & Elegant — Safe Numeric & Price Formatting Utilities
 * Prevents "Cannot read properties of null (reading 'toLocaleString')" crashes.
 * Validates numeric types and provides graceful fallbacks without silently masking invalid prices.
 */

/**
 * Format a price or numeric value safely.
 * @param {any} val - The numeric value to format.
 * @param {string} fallback - Fallback string if value is null, undefined, NaN, or non-finite.
 * @returns {string} Formatted number string (e.g. "2,490") or fallback.
 */
export function formatPrice(val, fallback = '—') {
  const num = toFiniteNumber(val);
  if (num === null) return fallback;
  return num.toLocaleString('en-IN');
}

/**
 * Format a generic number safely (default fallback "0").
 * @param {any} val - The numeric value to format.
 * @param {string} fallback - Fallback string if value is null, undefined, NaN, or non-finite.
 * @returns {string} Formatted number string.
 */
export function formatNumber(val, fallback = '0') {
  const num = toFiniteNumber(val);
  if (num === null) return fallback;
  return num.toLocaleString('en-IN');
}

export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeProduct(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return null;
  const parsedPrice = toFiniteNumber(product.price);
  const price = parsedPrice !== null && parsedPrice > 0 ? parsedPrice : null;
  const parsedSalePrice = toFiniteNumber(product.sale_price);
  const salePrice = parsedSalePrice !== null && parsedSalePrice > 0 && price !== null && parsedSalePrice < price ? parsedSalePrice : null;
  const suppliedPriceNow = toFiniteNumber(product.price_now);
  const rating = toFiniteNumber(product.rating);
  const reviews = toFiniteNumber(product.reviews);
  const stock = toFiniteNumber(product.stock);
  const quantity = toFiniteNumber(product.quantity);

  return {
    ...product,
    price,
    sale_price: salePrice,
    price_now: suppliedPriceNow ?? salePrice ?? price,
    rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
    reviews: reviews !== null && reviews >= 0 ? reviews : 0,
    stock: stock !== null && stock >= 0 ? stock : null,
    quantity: quantity !== null && quantity > 0 ? quantity : 1,
    on_sale: price !== null && (suppliedPriceNow ?? salePrice ?? price) !== null && (suppliedPriceNow ?? salePrice ?? price) < price,
  };
}

export function normalizeProducts(products) {
  return Array.isArray(products) ? products.map(normalizeProduct).filter(Boolean) : [];
}

/**
 * Sanitize and extract safe pricing details for a product.
 * Ensures that one corrupted or incomplete product object cannot crash the page.
 * @param {object} p - Product object
 * @returns {object} Normalized pricing object with validated numbers and pre-formatted strings.
 */
export function getProductPricing(p) {
  if (!p || typeof p !== 'object') {
    return {
      price: null,
      priceNow: null,
      formattedCurrent: '—',
      formattedRegular: '',
      onSale: false,
      savings: null,
      formattedSavings: '',
    };
  }

  const regularPrice = toFiniteNumber(p.price);
  const salePrice = toFiniteNumber(p.sale_price);
  const suppliedPriceNow = toFiniteNumber(p.price_now);
  const currentPrice = suppliedPriceNow !== null
    ? suppliedPriceNow
    : (salePrice !== null ? salePrice : regularPrice);

  const onSale = Boolean(regularPrice !== null && currentPrice !== null && currentPrice < regularPrice);
  const savings = onSale ? regularPrice - currentPrice : null;

  return {
    price: regularPrice,
    priceNow: currentPrice,
    formattedCurrent: formatPrice(currentPrice),
    formattedRegular: regularPrice !== null ? formatPrice(regularPrice, '') : '',
    onSale,
    savings,
    formattedSavings: savings > 0 ? formatPrice(savings, '') : '',
  };
}
