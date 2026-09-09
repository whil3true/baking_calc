const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PortionCalc = require('../js/portioncalc-math.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'portioncalc.html'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'portioncalc.js'), 'utf8');

function hasId(id) {
  return new RegExp(`id=["']${id}["']`).test(html);
}

test('every PortionCalc persisted setting has a matching form control', () => {
  for (const key of Object.keys(PortionCalc.defaults)) {
    assert.ok(hasId(key), `Missing form control #${key}`);
  }
});

test('controller-required DOM ids exist in page markup', () => {
  for (const id of [
    'portionForm', 'portionResults', 'portionErrors', 'portionStatus',
    'customPortionFields', 'rectRatioField', 'roundCutPreview', 'rectCutPreview',
    'portionRecommendedSize', 'portionTarget', 'portionCapacity', 'portionExtra',
    'portionSlice', 'portionCut', 'portionArea', 'portionSummary', 'copyPortion'
  ]) {
    assert.ok(hasId(id), `Missing controller element #${id}`);
  }
});

test('removed roundStep setting is absent from current markup and defaults', () => {
  assert.equal('roundStep' in PortionCalc.defaults, false);
  assert.equal(hasId('roundStep'), false);
});

test('portion page cache-busts both local runtime scripts with the same version', () => {
  const math = html.match(/js\/portioncalc-math\.js\?v=(\d+)/);
  const ui = html.match(/js\/portioncalc\.js\?v=(\d+)/);
  assert.ok(math, 'Missing versioned portioncalc-math.js URL');
  assert.ok(ui, 'Missing versioned portioncalc.js URL');
  assert.equal(math[1], ui[1]);
});

test('controller uses tolerant lookup for persisted settings', () => {
  assert.match(controller, /if \(input && 'value' in input\)/);
});
