const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('BakeCalc runtime dependencies are explicit and ordered in HTML', () => {
  const html = read('pereschet-recepta/index.html');
  const scripts = [
    'js/bakecalc-math.js',
    'js/bakecalc-state.js',
    'js/bakecalc-view.js',
    'js/bakecalc-events.js',
    'js/app.js',
    'js/analytics.js'
  ];
  let previous = -1;
  for (const script of scripts) {
    const index = html.indexOf(`src="${script}"`);
    assert.ok(index >= 0, `${script} must be loaded explicitly by pereschet-recepta/index.html`);
    assert.ok(index > previous, `${script} must load after the previous BakeCalc runtime dependency`);
    previous = index;
  }
  assert.doesNotMatch(html, /bakecalc-hardening\.js/);
});

test('obsolete BakeCalc hardening layer is removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'js', 'bakecalc-hardening.js')), false);
});

test('shared analytics does not bootstrap BakeCalc business logic', () => {
  const analytics = read('js/analytics.js');
  assert.doesNotMatch(analytics, /bakecalc-(?:math|state|view|events|hardening)\.js/);
  assert.doesNotMatch(analytics, /recipeNameInput/);
});

test('app delegates persistence to BakeCalcState', () => {
  const app = read('js/app.js');
  assert.match(app, /BakeCalcState\.create\(DEFAULT_STATE\)/);
  assert.match(app, /BakeCalcState\.save\(localStorage, state\)/);
  assert.match(app, /BakeCalcState\.load\(localStorage, DEFAULT_STATE, BakeCalcMath\.restoreState\)/);
  assert.doesNotMatch(app, /localStorage\.setItem\(['"]bakecalc_state/);
  assert.doesNotMatch(app, /localStorage\.getItem\(['"]bakecalc_state/);
});

test('state module stays independent from DOM and browser globals', () => {
  const stateModule = read('js/bakecalc-state.js');
  assert.doesNotMatch(stateModule, /\bdocument\b/);
  assert.doesNotMatch(stateModule, /\bwindow\b/);
  assert.doesNotMatch(stateModule, /\blocalStorage\b/);
  assert.match(stateModule, /storage\.getItem/);
  assert.match(stateModule, /storage\.setItem/);
});

test('controller uses BakeCalcMath directly instead of redefining calculation functions', () => {
  const app = read('js/app.js');
  assert.match(app, /BakeCalcMath\.coefficient\(state\)/);
  assert.match(app, /BakeCalcMath\.ingredientCostDetails/);
  assert.doesNotMatch(app, /function calculateArea\s*\(/);
  assert.doesNotMatch(app, /function calculateCoefficient\s*\(/);
  assert.doesNotMatch(app, /\b(?:setFormType|updateForm|toggleHeight|renderResults|calculateRecipe|copyRecipe)\s*=\s*function\b/);
});
