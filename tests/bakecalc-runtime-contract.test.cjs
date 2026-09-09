const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('BakeCalc runtime dependencies are explicit and ordered in HTML', () => {
  const html = read('bakecalc.html');
  const scripts = [
    'js/bakecalc-math.js',
    'js/bakecalc-state.js',
    'js/app.js',
    'js/bakecalc-hardening.js',
    'js/analytics.js'
  ];
  let previous = -1;
  for (const script of scripts) {
    const index = html.indexOf(`src="${script}"`);
    assert.ok(index >= 0, `${script} must be loaded explicitly by bakecalc.html`);
    assert.ok(index > previous, `${script} must load after the previous BakeCalc runtime dependency`);
    previous = index;
  }
});

test('shared analytics no longer bootstraps BakeCalc business logic', () => {
  const analytics = read('js/analytics.js');
  assert.doesNotMatch(analytics, /bakecalc-math\.js/);
  assert.doesNotMatch(analytics, /bakecalc-hardening\.js/);
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

test('hardening layer does not replace persistence anymore', () => {
  const hardening = read('js/bakecalc-hardening.js');
  assert.doesNotMatch(hardening, /loadState\s*=\s*function/);
  assert.doesNotMatch(hardening, /BakeCalcMath\.restoreState/);
});
