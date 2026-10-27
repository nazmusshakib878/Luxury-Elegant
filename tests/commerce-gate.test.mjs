import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isProductionOrderIntakeEnabled } = require('../src/utils/commerce-gate.js');

test('production order intake stays disabled unless explicitly enabled after readiness checks', () => {
  assert.equal(isProductionOrderIntakeEnabled(true, 'production', false), false);
  assert.equal(isProductionOrderIntakeEnabled(true, 'production', true), true);
  assert.equal(isProductionOrderIntakeEnabled(true, 'preview', false), true);
  assert.equal(isProductionOrderIntakeEnabled(false, 'production', false), true, 'local development keeps its existing checkout behavior');
});
