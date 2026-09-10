const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const htmlFiles = ["index.html", "pereschet-recepta/index.html", "raschet-krema-dlya-torta/index.html", "razmer-torta-po-gostyam/index.html", "pereschet-zhelatina-bloom/index.html", "konverter-ingredientov/index.html", "raschet-ceny-torta/index.html"];
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'));
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

test('canonical public pages do not depend on external font or icon CDNs', () => {
  for (const file of htmlFiles) {
    const html = read(file);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/@fontsource\/inter/i, `${file} must not load Inter from jsDelivr`);
    assert.doesNotMatch(html, /unpkg\.com\/lucide/i, `${file} must not load Lucide from unpkg`);
    assert.match(html, /<script src="\/js\/icons\.js" defer><\/script>/, `${file} must load local icons.js`);
  }
});

test('every used icon has a local definition', () => {
  const used = new Set();
  for (const file of [...htmlFiles, ...jsFiles.map(name => `js/${name}`)]) {
    const text = read(file);
    for (const match of text.matchAll(/data-lucide=["']([^"']+)["']/g)) used.add(match[1]);
  }
  const icons = read('js/icons.js');
  const missing = [...used].filter(name => !new RegExp(`['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*:`).test(icons));
  assert.deepEqual(missing, [], `Missing local icon definitions: ${missing.join(', ')}`);
});

test('local icon runtime keeps the existing compatibility contract', () => {
  const icons = read('js/icons.js');
  assert.match(icons, /window\.lucide\s*=\s*\{\s*createIcons\s*\}/, 'icons.js must expose window.lucide.createIcons');
  assert.match(icons, /const fallback\s*=/, 'icons.js must keep a safe fallback for unknown icons');
  assert.match(icons, /querySelectorAll\?\.\('\[data-lucide\]'\)/, 'icons.js must render dynamic data-lucide nodes');
});

test('font utility uses only local system fonts', () => {
  const css = read('css/utilities.css');
  assert.doesNotMatch(css, /font-family:\s*['"]Inter['"]/i);
  assert.match(css, /\.font-sans\s*\{[^}]*font-family:\s*system-ui/i);
});
