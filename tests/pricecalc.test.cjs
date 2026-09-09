const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, restoreSettings } = require('../js/pricecalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });

test('margin mode solves sale price including commission', () => {
  const r = calculate(settings()).result;
  assert.ok(r.salePrice > r.baseCost);
  assert.ok(Math.abs(r.marginPercent - 30) < 1e-9);
  assert.equal(r.commissionPercent, 5);
});

test('profit mode preserves requested profit after commission', () => {
  const calculation = calculate(settings({ targetMode: 'profit', targetValue: '1000', commissionPercent: '10' }));
  assert.equal(calculation.ok, true);
  assert.ok(Math.abs(calculation.result.profit - 1000) < 1e-9);
});

test('labor cost is hours times hourly rate', () => {
  const r = calculate(settings({ hours: '2.5', hourlyRate: '400' })).result;
  assert.equal(r.laborCost, 1000);
});

test('optional price per kg and portion are calculated', () => {
  const r = calculate(settings({ productWeightKg: '2.5', portions: '20' })).result;
  assert.ok(r.pricePerKg > 0);
  assert.ok(r.pricePerPortion > 0);
  assert.ok(Math.abs(r.pricePerKg * 2.5 - r.salePrice) < 1e-9);
});

test('margin plus commission cannot reach 100 percent', () => {
  const calculation = calculate(settings({ targetMode: 'margin', targetValue: '95', commissionPercent: '5' }));
  assert.equal(calculation.ok, false);
  assert.ok(calculation.errors.targetValue);
});

test('invalid values are rejected', () => {
  for (const [key, value] of [
    ['ingredientsCost', '-1'], ['packagingCost', 'bad'], ['hours', '-1'],
    ['hourlyRate', '-1'], ['commissionPercent', '100'], ['targetValue', '-1'],
    ['productWeightKg', '0'], ['portions', '1.5']
  ]) {
    const calculation = calculate(settings({ [key]: value }));
    assert.equal(calculation.ok, false, `${key}: ${value}`);
  }
});

test('comma decimals are supported', () => {
  assert.equal(parseNumber('2,5'), 2.5);
});

test('storage restoration keeps only known valid-shape settings', () => {
  const restored = restoreSettings({ targetMode: 'profit', targetValue: 500, foreign: true });
  assert.equal(restored.targetMode, 'profit');
  assert.equal(restored.targetValue, '500');
  assert.equal('foreign' in restored, false);
  assert.deepEqual(restoreSettings(null), defaults);
});
