const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const canonicalPages = [
  'index.html',
  'pereschet-recepta/index.html',
  'raschet-krema-dlya-torta/index.html',
  'razmer-torta-po-gostyam/index.html',
  'pereschet-zhelatina-bloom/index.html',
  'konverter-ingredientov/index.html',
  'raschet-ceny-torta/index.html'
];
const legacyNames = [
  'bakecalc.html',
  'creamcalc.html',
  'portioncalc.html',
  'gelatincalc.html',
  'convertercalc.html',
  'pricecalc.html'
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('canonical pages do not link internally to legacy calculator URLs', () => {
  for (const file of canonicalPages) {
    const html = read(file);
    for (const legacy of legacyNames) {
      assert.doesNotMatch(html, new RegExp(`href=["'][^"']*${legacy.replace('.', '\\.')}[^"']*["']`, 'i'), `${file} must not link to ${legacy}`);
    }
  }
});

test('homepage links to every clean calculator route', () => {
  const html = read('index.html');
  for (const route of [
    '/pereschet-recepta/',
    '/raschet-krema-dlya-torta/',
    '/razmer-torta-po-gostyam/',
    '/pereschet-zhelatina-bloom/',
    '/konverter-ingredientov/',
    '/raschet-ceny-torta/'
  ]) {
    assert.match(html, new RegExp(`href=["']${route}["']`), `homepage must link to ${route}`);
  }
});

test('canonical calculator pages use root home links for custom domain routing', () => {
  for (const file of canonicalPages.slice(1)) {
    assert.match(read(file), /href=["']\/["'][^>]*class=["']home-link["']|class=["']home-link["'][^>]*href=["']\/["']/, `${file} must link home with /`);
  }
});
