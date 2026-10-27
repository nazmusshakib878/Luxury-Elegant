function isLegacyCommerceRouteBlocked(method, pathname, enabled = false) {
  if (enabled) return false;
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  const verb = String(method || 'GET').toUpperCase();
  return path === '/orders' && verb !== 'GET'
    || path.startsWith('/orders/')
    || path === '/register'
    || path === '/login';
}

module.exports = { isLegacyCommerceRouteBlocked };
