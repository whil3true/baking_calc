const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const htmlFiles = ["index.html", "pereschet-recepta/index.html", "raschet-krema-dlya-torta/index.html", "razmer-torta-po-gostyam/index.html", "pereschet-zhelatina-bloom/index.html", "konverter-ingredientov/index.html", "raschet-ceny-torta/index.html"];
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

test('canonical public pages have no Tailwind runtime dependency', () => {
  for (const file of htmlFiles) {
    const html = read(file);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/i, file + ' must not load Tailwind CDN');
    assert.doesNotMatch(html, /tailwind\.config/i, file + ' must not configure Tailwind');
    assert.match(html, /\/css\/utilities\.css/, file + ' must load local utility CSS');
    const stylesIndex = html.indexOf('/css/styles.css');
    const utilitiesIndex = html.indexOf('/css/utilities.css');
    assert.ok(stylesIndex >= 0, file + ' must load component styles.css');
    assert.ok(utilitiesIndex > stylesIndex, file + ' must load utilities.css after styles.css');
  }
});

test('repository contains no Tailwind package or config files', () => {
  for (const file of ['tailwind.config.js','tailwind.config.cjs','tailwind.config.mjs']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file + ' must not exist');
  }
  const packageJson = path.join(root, 'package.json');
  if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    assert.equal(Object.prototype.hasOwnProperty.call(deps, 'tailwindcss'), false, 'tailwindcss package must not be installed');
  }
});
