const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PriceCalc = require('../js/pricecalc-math.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'raschet-ceny-torta/index.html'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'pricecalc.js'), 'utf8');

function hasId(id) {
  return new RegExp(`id=["']${id}["']`).test(html);
}

test('every PriceCalc persisted setting has a matching form control', () => {
  for (const key of Object.keys(PriceCalc.defaults)) {
    assert.ok(hasId(key), `Missing form control #${key}`);
  }
});

test('controller-required DOM ids exist', () => {
  for (const id of [
    'priceForm', 'priceResults', 'priceErrors', 'priceStatus', 'targetValueLabel', 'targetHint',
    'priceSalePrice', 'priceSummary', 'priceBaseCost', 'priceLaborCost', 'priceCommission',
    'priceProfit', 'priceMargin', 'priceMarkup', 'pricePerKgRow', 'pricePerKg',
    'pricePerPortionRow', 'pricePerPortion', 'copyPrice'
  ]) assert.ok(hasId(id), `Missing controller element #${id}`);
});

test('runtime scripts use the same cache-busting version', () => {
  const math = html.match(/js\/pricecalc-math\.js\?v=(\d+)/);
  const ui = html.match(/js\/pricecalc\.js\?v=(\d+)/);
  assert.ok(math);
  assert.ok(ui);
  assert.equal(math[1], ui[1]);
});

test('controller guards missing form elements when reading settings', () => {
  assert.match(controller, /input && 'value' in input/);
});
