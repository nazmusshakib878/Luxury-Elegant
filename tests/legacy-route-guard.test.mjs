import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { isLegacyCommerceRouteBlocked } = require('../src/utils/legacy-route-guard.js');

test('legacy Express order, auth, and return endpoints are disabled by default', () => {
  for (const [method, path] of [
    ['POST', '/orders'], ['GET', '/orders/4/return'], ['POST', '/register'], ['POST', '/login'],
  ]) assert.equal(isLegacyCommerceRouteBlocked(method, path), true);
  assert.equal(isLegacyCommerceRouteBlocked('GET', '/products'), false);
});

test('legacy commerce opt-in only applies when explicitly enabled', () => {
  assert.equal(isLegacyCommerceRouteBlocked('POST', '/orders', true), false);
});
