const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, requiresDensity, restoreSettings } = require('../js/convertercalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });
const result = overrides => {
  const calculation = calculate(settings(overrides));
  assert.equal(calculation.ok, true, JSON.stringify(calculation.errors));
  return calculation.result;
};

test('grams and kilograms convert directly without density', () => {
  const toKg = result({ amount: '1500', fromUnit: 'g', toUnit: 'kg', density: '' });
  assert.equal(toKg.converted, 1.5);
  assert.equal(toKg.densityNeeded, false);
  assert.equal(toKg.density, null);

  const toG = result({ amount: '2.5', fromUnit: 'kg', toUnit: 'g', density: 'bad' });
  assert.equal(toG.converted, 2500);
});

test('millilitres and litres convert directly without density', () => {
  assert.equal(result({ amount: '1250', fromUnit: 'ml', toUnit: 'l' }).converted, 1.25);
  assert.equal(result({ amount: '1,5', fromUnit: 'l', toUnit: 'ml' }).converted, 1500);
});

test('mass to volume uses density in g/ml', () => {
  const r = result({ amount: '200', fromUnit: 'g', toUnit: 'ml', density: '0.8' });
  assert.equal(r.densityNeeded, true);
  assert.equal(r.converted, 250);
});

test('volume to mass uses density in g/ml', () => {
  const r = result({ amount: '250', fromUnit: 'ml', toUnit: 'g', density: '1.2' });
  assert.equal(r.converted, 300);
});

test('cross-dimension conversion works across kilo and litre factors', () => {
  assert.equal(result({ amount: '2', fromUnit: 'kg', toUnit: 'l', density: '0.8' }).converted, 2.5);
  assert.equal(result({ amount: '1.5', fromUnit: 'l', toUnit: 'kg', density: '1.2' }).converted, 1.8);
});

test('density requirement is derived from dimensions', () => {
  assert.equal(requiresDensity('g', 'kg'), false);
  assert.equal(requiresDensity('ml', 'l'), false);
  assert.equal(requiresDensity('g', 'ml'), true);
  assert.equal(requiresDensity('l', 'kg'), true);
  assert.equal(requiresDensity('unknown', 'g'), false);
});

test('comma and dot decimals parse while malformed values do not', () => {
  assert.equal(parseNumber('1,25'), 1.25);
  assert.equal(parseNumber('1.25'), 1.25);
  for (const value of ['', ' ', '-1', '1,2,3', 'abc', Infinity, NaN, null, true, [], {}]) {
    assert.ok(Number.isNaN(parseNumber(value)), String(value));
  }
});

test('invalid amount, unit and required density are rejected', () => {
  for (const [overrides, key] of [
    [{ amount: '0' }, 'amount'],
    [{ amount: '-1' }, 'amount'],
    [{ amount: '1000000001' }, 'amount'],
    [{ fromUnit: 'cup' }, 'fromUnit'],
    [{ toUnit: 'oz' }, 'toUnit'],
    [{ fromUnit: 'g', toUnit: 'ml', density: '0' }, 'density'],
    [{ fromUnit: 'ml', toUnit: 'g', density: 'bad' }, 'density']
  ]) {
    const calculation = calculate(settings(overrides));
    assert.equal(calculation.ok, false);
    assert.ok(calculation.errors[key], key);
  }
});

test('density is ignored when conversion stays in one dimension', () => {
  const calculation = calculate(settings({ fromUnit: 'g', toUnit: 'kg', density: 'not-a-number' }));
  assert.equal(calculation.ok, true);
});

test('storage restoration accepts known values and rejects foreign data', () => {
  const restored = restoreSettings({ amount: 250, fromUnit: 'kg', toUnit: 'l', density: '0,9', foreign: true });
  assert.equal(restored.amount, '250');
  assert.equal(restored.fromUnit, 'kg');
  assert.equal(restored.toUnit, 'l');
  assert.equal(restored.density, '0,9');
  assert.equal('foreign' in restored, false);

  const invalidUnits = restoreSettings({ fromUnit: 'cup', toUnit: {}, amount: [], density: Infinity });
  assert.deepEqual(invalidUnits, defaults);
});
