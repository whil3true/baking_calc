const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, restoreSettings } = require('../js/creamcalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });
const result = overrides => {
  const calculation = calculate(settings(overrides));
  assert.equal(calculation.ok, true, JSON.stringify(calculation.errors));
  return calculation.result;
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('20 cm round cake: independent volumes and 10% reserve', () => {
  const r = result();
  close(r.filling, 200 * Math.PI);
  close(r.sides, 102.5 * Math.PI);
  close(r.top, 55.125 * Math.PI);
  close(r.total, 1235.8632800140547);
  assert.equal(r.prepare, 1240);
});

test('rectangular shell includes corners and its top rim exactly once', () => {
  // 20 × 30 × 10 cm cake; 1 cm sides -> 22 × 32 cm outer rectangle.
  const r = result({ shape: 'rect', length: '20', width: '30', sideThickness: '10', topThickness: '10', reserve: '0' });
  assert.equal(r.filling, 1200);
  assert.equal(r.sides, 1040);
  assert.equal(r.top, 704);
  assert.equal(r.total, 2944);
  assert.equal(r.prepare, 2950);
});

test('filling-only mode ignores disabled coating values', () => {
  const r = result({ shape: 'rect', length: '10', width: '10', layers: '1', fillingThickness: '10', fillingDensity: '0,8', coverTop: false, coverSides: false, coatingDensity: '', topThickness: '', sideThickness: 'invalid', reserve: '0' });
  assert.equal(r.total, 80);
  assert.equal(r.prepare, 80);
  assert.equal(r.sides, 0);
  assert.equal(r.top, 0);
});

test('top-only mode uses the bare cake area, no bottom or side shell', () => {
  const r = result({ shape: 'rect', length: '10', width: '20', layers: '0', fillingDensity: '', fillingThickness: '', coverSides: false, sideThickness: '', topThickness: '10', reserve: '0' });
  assert.equal(r.total, 200);
  assert.equal(r.filling, 0);
  assert.equal(r.sides, 0);
});

test('sides-only mode does not include the top', () => {
  const r = result({ layers: '0', coverTop: false, topThickness: '', reserve: '0' });
  close(r.total, 102.5 * Math.PI);
  assert.equal(r.top, 0);
});

test('filling and coating use their own density', () => {
  const original = result({ reserve: '0' });
  const r = result({ fillingDensity: '0.5', coatingDensity: '1.2', reserve: '0' });
  close(r.filling, original.filling / 2);
  close(r.sides, original.sides * 1.2);
  close(r.top, original.top * 1.2);
});

test('reserve is applied once to the complete cream weight', () => {
  const original = result({ reserve: '0' });
  const r = result({ reserve: '100' });
  close(r.total, original.total * 2);
  close(r.reserve, original.subtotal);
});

test('rounding avoids floating-point noise but rounds real fractions upward', () => {
  const input = { shape: 'rect', length: '10', width: '10', layers: '1', fillingThickness: '10', fillingDensity: '1.1', coverTop: false, coverSides: false, reserve: '0' };
  assert.equal(result(input).prepare, 110);
  assert.equal(result({ ...input, fillingDensity: '1.100001' }).prepare, 120);
  assert.equal(result({ ...input, fillingDensity: '0.00000000000000001' }).prepare, 10);
});

test('doubling cake height doubles only the side coating', () => {
  const original = result();
  const r = result({ height: '20' });
  close(r.sides, original.sides * 2);
  close(r.filling, original.filling);
  close(r.top, original.top);
});

test('inactive dimensions do not block switching between shapes', () => {
  assert.equal(calculate(settings({ length: '', width: 'invalid' })).ok, true);
  assert.equal(calculate(settings({ shape: 'rect', diameter: '' })).ok, true);
});

test('comma and dot decimals both work without accepting partial numbers', () => {
  assert.equal(parseNumber(' 0,85 '), 0.85);
  assert.equal(parseNumber('0.85'), 0.85);
  for (const value of ['', ' ', '2abc', '1,2,3', '-2', 'Infinity', Infinity, NaN, null, true, [], {}]) {
    assert.ok(Number.isNaN(parseNumber(value)), String(value));
  }
});

test('missing, zero, negative, fractional and excessive active fields fail validation', () => {
  for (const [key, value] of [
    ['diameter', ''], ['diameter', '0'], ['diameter', '-2'], ['height', Infinity],
    ['layers', '1.5'], ['layers', '101'], ['fillingDensity', '0'],
    ['coatingDensity', ''], ['topThickness', '0'], ['sideThickness', 'oops'],
    ['reserve', '-1'], ['reserve', '101'], ['shape', 'triangle']
  ]) {
    const calculation = calculate(settings({ [key]: value }));
    assert.equal(calculation.ok, false, `${key}: ${value}`);
    assert.ok(calculation.errors[key], key);
  }
});

test('fillings cannot occupy all or more than the assembled cake height', () => {
  for (const height of ['2', '1']) {
    const calculation = calculate(settings({ height }));
    assert.equal(calculation.ok, false);
    assert.ok(calculation.errors.fillingThickness);
  }
});

test('no selected cream use is a validation error', () => {
  const calculation = calculate(settings({ layers: '0', coverTop: false, coverSides: false }));
  assert.equal(calculation.ok, false);
  assert.ok(calculation.errors.form);
});

test('overflow is reported instead of rendering Infinity', () => {
  const calculation = calculate(settings({ diameter: Number.MAX_VALUE }));
  assert.equal(calculation.ok, false);
  assert.ok(calculation.errors.form);
});

test('storage restoration retains valid raw input and rejects foreign types and keys', () => {
  const restored = restoreSettings({ diameter: '18,5', layers: 3, reserve: '', coverTop: false, shape: 'rect', width: {}, coverSides: 'false', result: { total: 999 }, foreign: true });
  assert.equal(restored.diameter, '18,5');
  assert.equal(restored.layers, '3');
  assert.equal(restored.reserve, '');
  assert.equal(restored.coverTop, false);
  assert.equal(restored.coverSides, true);
  assert.equal(restored.width, defaults.width);
  assert.equal(restored.shape, 'rect');
  assert.equal('result' in restored, false);
  assert.equal('foreign' in restored, false);
  for (const value of [null, [], 42, 'broken']) assert.deepEqual(restoreSettings(value), defaults);
  assert.deepEqual(restoreSettings({ shape: 'triangle', diameter: Infinity }), defaults);
});
