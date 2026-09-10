const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ConverterCalc = require('../js/convertercalc-math.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'konverter-ingredientov/index.html'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'convertercalc.js'), 'utf8');

function hasId(id) {
  return new RegExp(`id=["']${id}["']`).test(html);
}

test('every ConverterCalc persisted setting has a matching form control', () => {
  for (const key of Object.keys(ConverterCalc.defaults)) {
    assert.ok(hasId(key), `Missing form control #${key}`);
  }
});

test('controller-required DOM ids exist in page markup', () => {
  for (const id of [
    'converterForm', 'converterResults', 'converterErrors', 'converterStatus',
    'densityBlock', 'converterModeNote', 'swapUnits', 'converterResultValue',
    'converterSource', 'converterTarget', 'converterDensity', 'converterSummary',
    'copyConverter'
  ]) {
    assert.ok(hasId(id), `Missing controller element #${id}`);
  }
});

test('runtime scripts use the same cache-busting version', () => {
  const math = html.match(/js\/convertercalc-math\.js\?v=(\d+)/);
  const ui = html.match(/js\/convertercalc\.js\?v=(\d+)/);
  assert.ok(math, 'Missing versioned convertercalc-math.js URL');
  assert.ok(ui, 'Missing versioned convertercalc.js URL');
  assert.equal(math[1], ui[1]);
});

test('controller keeps density conditional instead of always requiring it', () => {
  assert.match(controller, /requiresDensity/);
  assert.match(controller, /densityInput\.disabled = !needed/);
});
