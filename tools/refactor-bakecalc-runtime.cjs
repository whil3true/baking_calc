const fs = require('node:fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceRequired(content, pattern, replacement, label) {
  const next = content.replace(pattern, replacement);
  if (next === content) throw new Error(`Migration pattern not found: ${label}`);
  return next;
}

let app = read('js/app.js');
app = replaceRequired(
  app,
  'let state = JSON.parse(JSON.stringify(DEFAULT_STATE));',
  'let state = BakeCalcState.create(DEFAULT_STATE);',
  'initial state'
);
app = replaceRequired(
  app,
  /function saveState\(\) \{ try \{ localStorage\.setItem\('bakecalc_state', JSON\.stringify\(state\)\); \} catch \(e\) \{ console\.warn\('Save error:', e\); \} \}\nfunction loadState\(\) \{[\s\S]*?\n\}\nfunction renderAll\(\) \{/,
  `function saveState() { BakeCalcState.save(localStorage, state); }\nfunction loadState() { state = BakeCalcState.load(localStorage, DEFAULT_STATE, BakeCalcMath.restoreState); }\nfunction renderAll() {`,
  'save/load state block'
);
app = app.replace(
  "function loadDemoRecipe() { state = JSON.parse(JSON.stringify(DEMO_RECIPE));",
  "function loadDemoRecipe() { state = BakeCalcState.clone(DEMO_RECIPE);"
);
app = app.replace(
  "state = JSON.parse(JSON.stringify(DEFAULT_STATE)); saveState(); renderAll();",
  "state = BakeCalcState.create(DEFAULT_STATE); saveState(); renderAll();"
);
write('js/app.js', app);

let hardening = read('js/bakecalc-hardening.js');
hardening = replaceRequired(
  hardening,
  /\n  loadState = function \(\) \{[\s\S]*?\n  \};\n/,
  '\n',
  'hardening loadState monkey patch'
);
hardening = replaceRequired(
  hardening,
  /\n    ensurePriceCalcLink\(\);\n    loadState\(\);\n    renderAll\(\);\n    window\.lucide\?\.createIcons\(\);/,
  `\n    ensurePriceCalcLink();\n    window.lucide?.createIcons();`,
  'hardening duplicate initialization'
);
write('js/bakecalc-hardening.js', hardening);

let analytics = read('js/analytics.js');
analytics = replaceRequired(
  analytics,
  /\n\/\* The legacy BakeCalc page keeps its UI in app\.js\.[\s\S]*?\n\}\n?$/,
  '\n',
  'analytics BakeCalc bootstrap'
);
write('js/analytics.js', analytics);

let html = read('bakecalc.html');
html = replaceRequired(
  html,
  '<script src="js/app.js"></script>\n<script src="js/analytics.js"></script>',
  '<script src="js/bakecalc-math.js"></script>\n<script src="js/bakecalc-state.js"></script>\n<script src="js/app.js"></script>\n<script src="js/bakecalc-hardening.js"></script>\n<script src="js/analytics.js"></script>',
  'BakeCalc script order'
);
write('bakecalc.html', html);

const reviewPath = 'docs/repository-review.md';
if (fs.existsSync(reviewPath)) {
  let review = read(reviewPath);
  review = review.replace(
    /2\. \*\*BakeCalc остаётся наиболее legacy-страницей\.\*\*[^\n]*/,
    '2. **BakeCalc остаётся наиболее legacy-страницей.** Первый этап рефакторинга уже отделил состояние/`localStorage` и сделал runtime-зависимости явными; следующая цель — вынести DOM-рендеринг и события из `js/app.js` без изменения интерфейса.'
  );
  write(reviewPath, review);
}

console.log('BakeCalc runtime migration complete.');
