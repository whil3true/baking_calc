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

function hasName(name) {
  return new RegExp(`name=["']${name}["']`).test(html);
}

test('every PortionCalc persisted setting has a matching form control', () => {
  for (const key of Object.keys(PortionCalc.defaults)) {
    assert.ok(hasId(key) || hasName(key), `Missing form control for ${key}`);
  }
});

test('controller-required DOM ids exist in page markup', () => {
  for (const id of [
    'portionForm', 'portionResults', 'portionErrors', 'portionStatus',
    'roundShapeCard', 'rectShapeCard', 'roundPiecePreview', 'rectPiecePreview',
    'portionPieceTitle', 'portionPieceText', 'portionLengthLabel', 'portionWidthLabel',
    'portionRecommendedSize', 'portionTarget', 'portionCapacity', 'portionExtra',
    'portionSlice', 'portionCut', 'portionArea', 'portionSummary', 'copyPortion'
  ]) {
    assert.ok(hasId(id), `Missing controller element #${id}`);
  }
});

test('obsolete PortionCalc controls are absent', () => {
  for (const id of ['portionPreset', 'rectRatio', 'roundStep']) {
    assert.equal(hasId(id), false, `Obsolete control #${id} must stay removed`);
    assert.equal(id in PortionCalc.defaults, false, `Obsolete default ${id} must stay removed`);
  }
});

test('shape is the first numbered calculator block', () => {
  const shapeIndex = html.indexOf('id="portion-form-title"');
  const pieceIndex = html.indexOf('id="portion-size-title"');
  const guestsIndex = html.indexOf('id="portion-people-title"');
  assert.ok(shapeIndex >= 0 && pieceIndex > shapeIndex && guestsIndex > pieceIndex);
});

test('portion page cache-busts both local runtime scripts with the same version', () => {
  const math = html.match(/js\/portioncalc-math\.js\?v=(\d+)/);
  const ui = html.match(/js\/portioncalc\.js\?v=(\d+)/);
  assert.ok(math, 'Missing versioned portioncalc-math.js URL');
  assert.ok(ui, 'Missing versioned portioncalc.js URL');
  assert.equal(math[1], ui[1]);
  assert.equal(math[1], '4');
});

test('controller supports radio shape control and tolerant field lookup', () => {
  assert.match(controller, /RadioNodeList/);
  assert.match(controller, /if \(!input\)/);
});
