const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, roundUp, restoreSettings } = require('../js/portioncalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });
const result = overrides => {
  const calculation = calculate(settings(overrides));
  assert.equal(calculation.ok, true, JSON.stringify(calculation.errors));
  return calculation.result;
};

test('standard 20 guests round cake with 10% reserve rounds diameter upward', () => {
  const r = result();
  assert.equal(r.guests, 20);
  assert.equal(r.targetPortions, 22);
  assert.equal(r.portionArea, 50);
  assert.equal(r.diameter, 38);
  assert.ok(r.capacity >= 22);
});

test('rectangular cake respects requested aspect ratio and capacity', () => {
  const r = result({ shape: 'rect', rectRatio: '2', guests: '30', reserve: '0', roundStep: '1' });
  assert.equal(r.shape, 'rect');
  assert.ok(r.length >= r.width);
  assert.ok(Math.abs((r.rawLength / r.rawWidth) - 2) < 1e-10);
  assert.ok(r.capacity >= 30);
  assert.ok(r.actualArea >= r.requiredArea);
});

test('custom portion size is used instead of preset values', () => {
  const r = result({ portionPreset: 'custom', portionWidth: '4,5', portionLength: '9', guests: '10', reserve: '0' });
  assert.equal(r.portionWidth, 4.5);
  assert.equal(r.portionLength, 9);
  assert.equal(r.portionArea, 40.5);
});

test('reserve increases target portions by ceiling', () => {
  assert.equal(result({ guests: '11', reserve: '10' }).targetPortions, 13);
  assert.equal(result({ guests: '100', reserve: '5' }).targetPortions, 105);
});

test('roundUp handles exact and fractional values without floating point over-rounding', () => {
  assert.equal(roundUp(20, 1), 20);
  assert.equal(roundUp(20.01, 1), 21);
  assert.equal(roundUp(20.000000000000004, 1), 21);
  assert.equal(roundUp(27.1, 2), 28);
});

test('comma and dot decimals parse, malformed values do not', () => {
  assert.equal(parseNumber('1,5'), 1.5);
  assert.equal(parseNumber('1.5'), 1.5);
  for (const value of ['', ' ', '-1', '1,2,3', 'abc', Infinity, NaN, null, true, [], {}]) {
    assert.ok(Number.isNaN(parseNumber(value)), String(value));
  }
});

test('invalid active settings are rejected', () => {
  for (const [key, value] of [
    ['guests', '0'], ['guests', '1.5'], ['guests', '1001'],
    ['reserve', '-1'], ['reserve', '101'], ['shape', 'triangle'],
    ['roundStep', '0'], ['rectRatio', '0.5']
  ]) {
    const calculation = calculate(settings({ shape: key === 'rectRatio' ? 'rect' : defaults.shape, [key]: value }));
    assert.equal(calculation.ok, false, `${key}: ${value}`);
    assert.ok(calculation.errors[key], key);
  }
});

test('invalid custom portion fields are rejected only when custom mode is active', () => {
  assert.equal(calculate(settings({ portionWidth: '', portionLength: 'bad' })).ok, true);
  const calculation = calculate(settings({ portionPreset: 'custom', portionWidth: '', portionLength: 'bad' }));
  assert.equal(calculation.ok, false);
  assert.ok(calculation.errors.portionWidth);
  assert.ok(calculation.errors.portionLength);
});

test('storage restoration accepts known values and rejects foreign or invalid types', () => {
  const restored = restoreSettings({ guests: 25, reserve: '15', shape: 'rect', portionPreset: 'custom', rectRatio: {}, foreign: true });
  assert.equal(restored.guests, '25');
  assert.equal(restored.reserve, '15');
  assert.equal(restored.shape, 'rect');
  assert.equal(restored.portionPreset, 'custom');
  assert.equal(restored.rectRatio, defaults.rectRatio);
  assert.equal('foreign' in restored, false);
  for (const value of [null, [], 42, 'bad']) assert.deepEqual(restoreSettings(value), defaults);
});
