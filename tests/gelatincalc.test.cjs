const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, restoreSettings } = require('../js/gelatincalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });
const result = overrides => {
  const calculation = calculate(settings(overrides));
  assert.equal(calculation.ok, true, JSON.stringify(calculation.errors));
  return calculation.result;
};

const close = (actual, expected, epsilon = 1e-10) => {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
};

test('same Bloom keeps gelatin weight unchanged', () => {
  const r = result({ recipeWeight: '10', recipeBloom: '200', availableBloom: '200', waterRatio: '5' });
  assert.equal(r.convertedWeight, 10);
  assert.equal(r.waterWeight, 50);
  assert.equal(r.gelatinMass, 60);
});

test('weaker gelatin requires more mass', () => {
  const r = result({ recipeWeight: '10', recipeBloom: '200', availableBloom: '125', waterRatio: '0' });
  close(r.convertedWeight, 10 * Math.sqrt(200 / 125));
  assert.ok(r.convertedWeight > 10);
});

test('stronger gelatin requires less mass', () => {
  const r = result({ recipeWeight: '5', recipeBloom: '160', availableBloom: '220', waterRatio: '6' });
  close(r.convertedWeight, 5 * Math.sqrt(160 / 220));
  assert.ok(r.convertedWeight < 5);
  close(r.waterWeight, r.convertedWeight * 6);
  close(r.gelatinMass, r.convertedWeight * 7);
});

test('comma decimals are accepted', () => {
  const r = result({ recipeWeight: '7,5', recipeBloom: '180', availableBloom: '200', waterRatio: '5,5' });
  assert.equal(r.recipeWeight, 7.5);
  assert.equal(r.waterRatio, 5.5);
});

test('invalid values are rejected', () => {
  for (const [key, value] of [
    ['recipeWeight', '0'], ['recipeWeight', '-1'], ['recipeWeight', 'bad'],
    ['recipeBloom', '49'], ['recipeBloom', '351'],
    ['availableBloom', '0'], ['availableBloom', '500'],
    ['waterRatio', '-1'], ['waterRatio', '21']
  ]) {
    const calculation = calculate(settings({ [key]: value }));
    assert.equal(calculation.ok, false, `${key}: ${value}`);
    assert.ok(calculation.errors[key], key);
  }
});

test('parseNumber rejects malformed and non numeric values', () => {
  assert.equal(parseNumber(' 1,25 '), 1.25);
  for (const value of ['', ' ', '1,2,3', '-2', Infinity, NaN, null, true, [], {}]) {
    assert.ok(Number.isNaN(parseNumber(value)), String(value));
  }
});

test('storage restoration only accepts known primitive values', () => {
  const restored = restoreSettings({ recipeWeight: 12, recipeBloom: '210', availableBloom: {}, waterRatio: '6', foreign: true });
  assert.equal(restored.recipeWeight, '12');
  assert.equal(restored.recipeBloom, '210');
  assert.equal(restored.availableBloom, defaults.availableBloom);
  assert.equal(restored.waterRatio, '6');
  assert.equal('foreign' in restored, false);
  for (const value of [null, [], 42, 'bad']) assert.deepEqual(restoreSettings(value), defaults);
});
