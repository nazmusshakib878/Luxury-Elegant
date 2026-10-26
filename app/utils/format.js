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
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return num.toLocaleString('en-IN');
}

/**
 * Format a generic number safely (default fallback "0").
 * @param {any} val - The numeric value to format.
 * @param {string} fallback - Fallback string if value is null, undefined, NaN, or non-finite.
 * @returns {string} Formatted number string.
 */
export function formatNumber(val, fallback = '0') {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return num.toLocaleString('en-IN');
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
      savings: 0,
      formattedSavings: '',
    };
  }

  const hasValidPrice = p.price !== null && p.price !== undefined && p.price !== '' && !isNaN(Number(p.price));
  const hasValidSale = p.sale_price !== null && p.sale_price !== undefined && p.sale_price !== '' && !isNaN(Number(p.sale_price));
  const hasValidPriceNow = p.price_now !== null && p.price_now !== undefined && p.price_now !== '' && !isNaN(Number(p.price_now));

  const regularPrice = hasValidPrice ? Number(p.price) : null;
  const salePrice = hasValidSale ? Number(p.sale_price) : null;
  const currentPrice = hasValidPriceNow
    ? Number(p.price_now)
    : (salePrice !== null ? salePrice : regularPrice);

  const onSale = Boolean(regularPrice !== null && currentPrice !== null && currentPrice < regularPrice);
  const savings = onSale ? regularPrice - currentPrice : 0;

  return {
    price: regularPrice,
    priceNow: currentPrice,
    formattedCurrent: currentPrice !== null ? currentPrice.toLocaleString('en-IN') : '—',
    formattedRegular: regularPrice !== null ? regularPrice.toLocaleString('en-IN') : '',
    onSale,
    savings,
    formattedSavings: savings > 0 ? savings.toLocaleString('en-IN') : '',
  };
}
