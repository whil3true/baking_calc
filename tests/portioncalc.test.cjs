const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults, parseNumber, roundUpCentimeter, compactRectangle, restoreSettings } = require('../js/portioncalc-math.js');

const settings = overrides => ({ ...defaults, ...overrides });
const result = overrides => {
  const calculation = calculate(settings(overrides));
  assert.equal(calculation.ok, true, JSON.stringify(calculation.errors));
  return calculation.result;
};

test('round cake uses triangular wedge area', () => {
  const r = result({ shape: 'circle', portionLength: '10', portionWidth: '5', guests: '20', reserve: '10' });
  assert.equal(r.cutType, 'wedge');
  assert.equal(r.portionArea, 25);
  assert.equal(r.targetPortions, 22);
  assert.ok(r.capacity >= 22);
  assert.equal(r.diameter, 27);
});

test('rectangular cake uses rectangular piece area', () => {
  const r = result({ shape: 'rect', portionLength: '10', portionWidth: '5', guests: '20', reserve: '0' });
  assert.equal(r.cutType, 'grid');
  assert.equal(r.portionArea, 50);
  assert.equal(r.requiredArea, 1000);
  assert.ok(r.actualArea >= 1000);
  assert.ok(r.capacity >= 20);
});

test('compact rectangle prefers smallest area then closest-to-square dimensions', () => {
  assert.deepEqual(compactRectangle(1000), { width: 25, length: 40, area: 1000, difference: 15 });
  const r = compactRectangle(1001);
  assert.ok(r.area >= 1001);
  assert.ok(r.width <= r.length);
});

test('reserve increases target portions by ceiling', () => {
  assert.equal(result({ guests: '11', reserve: '10' }).targetPortions, 13);
  assert.equal(result({ guests: '100', reserve: '5' }).targetPortions, 105);
});

test('round dimensions always round upward to whole centimeters', () => {
  assert.equal(roundUpCentimeter(20), 20);
  assert.equal(roundUpCentimeter(20.01), 21);
  assert.equal(roundUpCentimeter(20.000000000000004), 21);
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
    ['portionLength', '0'], ['portionWidth', '31']
  ]) {
    const calculation = calculate(settings({ [key]: value }));
    assert.equal(calculation.ok, false, `${key}: ${value}`);
    assert.ok(calculation.errors[key], key);
  }
});

test('storage restoration keeps only current fields', () => {
  const restored = restoreSettings({
    shape: 'rect', portionLength: 9, portionWidth: '4,5', guests: 25, reserve: '15',
    portionPreset: 'standard', rectRatio: '2', roundStep: '2', foreign: true
  });
  assert.equal(restored.shape, 'rect');
  assert.equal(restored.portionLength, '9');
  assert.equal(restored.portionWidth, '4,5');
  assert.equal(restored.guests, '25');
  assert.equal(restored.reserve, '15');
  assert.equal('portionPreset' in restored, false);
  assert.equal('rectRatio' in restored, false);
  assert.equal('roundStep' in restored, false);
  assert.equal('foreign' in restored, false);
});
