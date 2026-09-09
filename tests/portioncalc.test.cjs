const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, roundUpCentimeter, restoreSettings } = require('../js/portioncalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });
const result = overrides => {
  const calculation = calculate(settings(overrides));
  assert.equal(calculation.ok, true, JSON.stringify(calculation.errors));
  return calculation.result;
};

test('standard 20 guests round cake uses wedge cut and rounds diameter upward', () => {
  const r = result();
  assert.equal(r.guests, 20);
  assert.equal(r.targetPortions, 22);
  assert.equal(r.portionArea, 50);
  assert.equal(r.cutType, 'wedge');
  assert.equal(r.diameter, 38);
  assert.ok(r.capacity >= 22);
});

test('rectangular cake uses grid cut and respects requested aspect ratio', () => {
  const r = result({ shape: 'rect', rectRatio: '2', guests: '30', reserve: '0' });
  assert.equal(r.shape, 'rect');
  assert.equal(r.cutType, 'grid');
  assert.ok(r.length >= r.width);
  assert.ok(Math.abs((r.rawLength / r.rawWidth) - 2) < 1e-10);
  assert.ok(r.capacity >= 30);
  assert.ok(r.actualArea >= r.requiredArea);
});

test('custom portion size is used as area reference', () => {
  const r = result({ portionPreset: 'custom', portionWidth: '4,5', portionLength: '9', guests: '10', reserve: '0' });
  assert.equal(r.portionWidth, 4.5);
  assert.equal(r.portionLength, 9);
  assert.equal(r.portionArea, 40.5);
});

test('reserve increases target portions by ceiling', () => {
  assert.equal(result({ guests: '11', reserve: '10' }).targetPortions, 13);
  assert.equal(result({ guests: '100', reserve: '5' }).targetPortions, 105);
});

test('dimensions always round upward to whole centimeters', () => {
  assert.equal(roundUpCentimeter(20), 20);
  assert.equal(roundUpCentimeter(20.01), 21);
  assert.equal(roundUpCentimeter(20.000000000000004), 21);
  assert.equal(roundUpCentimeter(27.1), 28);
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
    ['rectRatio', '0.5']
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

test('storage restoration drops removed roundStep and foreign keys', () => {
  const restored = restoreSettings({ guests: 25, reserve: '15', shape: 'rect', portionPreset: 'custom', rectRatio: {}, roundStep: '2', foreign: true });
  assert.equal(restored.guests, '25');
  assert.equal(restored.reserve, '15');
  assert.equal(restored.shape, 'rect');
  assert.equal(restored.portionPreset, 'custom');
  assert.equal(restored.rectRatio, defaults.rectRatio);
  assert.equal('roundStep' in restored, false);
  assert.equal('foreign' in restored, false);
  for (const value of [null, [], 42, 'bad']) assert.deepEqual(restoreSettings(value), defaults);
});
