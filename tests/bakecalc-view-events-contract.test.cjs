const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('BakeCalc page and view templates contain no inline JavaScript handlers', () => {
  for (const file of ['bakecalc.html', 'js/bakecalc-view.js']) {
    const text = read(file);
    assert.doesNotMatch(text, /\s(?:onclick|oninput|onchange|onsubmit)\s*=/i, `${file} must not contain inline event handlers`);
  }
});

test('BakeCalc loads view and event modules before app controller', () => {
  const html = read('bakecalc.html');
  const scripts = [
    'js/bakecalc-math.js',
    'js/bakecalc-state.js',
    'js/bakecalc-view.js',
    'js/bakecalc-events.js',
    'js/app.js',
    'js/bakecalc-hardening.js',
    'js/analytics.js'
  ];
  let previous = -1;
  for (const script of scripts) {
    const index = html.indexOf(`src="${script}"`);
    assert.ok(index >= 0, `${script} must be loaded explicitly`);
    assert.ok(index > previous, `${script} must load after previous BakeCalc runtime module`);
    previous = index;
  }
});

test('app delegates dynamic rendering to BakeCalcView', () => {
  const app = read('js/app.js');
  assert.match(app, /BakeCalcView\.renderFormTabs/);
  assert.match(app, /BakeCalcView\.renderFormFields/);
  assert.match(app, /BakeCalcView\.renderAllIngredients/);
  assert.match(app, /BakeCalcView\.renderAllExtraCosts/);
  assert.match(app, /BakeCalcView\.renderResults/);
  assert.match(app, /BakeCalcView\.syncStaticFields/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/, 'app.js must not build DOM templates directly');
  assert.doesNotMatch(app, /document\.createElement/, 'app.js must not create rendered rows directly');
});

test('event module uses delegation and app binds controller actions', () => {
  const events = read('js/bakecalc-events.js');
  const app = read('js/app.js');
  assert.match(events, /addEventListener\(['"]click['"]/);
  assert.match(events, /addEventListener\(['"]input['"]/);
  assert.match(events, /addEventListener\(['"]change['"]/);
  assert.match(events, /closest\(['"]\[data-action\]['"]\)/);
  assert.match(app, /BakeCalcEvents\.bind/);
});
