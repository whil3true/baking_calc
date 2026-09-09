const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'));

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('public pages do not depend on external font or icon CDNs', () => {
  for (const file of htmlFiles) {
    const html = read(file);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/@fontsource\/inter/i, `${file} must not load Inter from jsDelivr`);
    assert.doesNotMatch(html, /unpkg\.com\/lucide/i, `${file} must not load Lucide from unpkg`);
    assert.match(html, /<script src="js\/icons\.js" defer><\/script>/, `${file} must load local icons.js`);
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

test('font utility uses only local system fonts', () => {
  const css = read('css/utilities.css');
  assert.doesNotMatch(css, /font-family:\s*['"]Inter['"]/i);
  assert.match(css, /\.font-sans\s*\{[^}]*font-family:\s*system-ui/i);
});
