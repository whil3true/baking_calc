const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pages = [
  'index.html',
  'pereschet-recepta/index.html',
  'raschet-krema-dlya-torta/index.html',
  'razmer-torta-po-gostyam/index.html',
  'pereschet-zhelatina-bloom/index.html',
  'konverter-ingredientov/index.html',
  'raschet-ceny-torta/index.html',
];

test('favicon exists and canonical pages reference it', () => {
  const faviconPath = path.join(root, 'favicon.svg');
  assert.equal(fs.existsSync(faviconPath), true, 'favicon.svg must exist at site root');

  const favicon = fs.readFileSync(faviconPath, 'utf8');
  const viewBox = favicon.match(/<svg[^>]+viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  assert.ok(viewBox, 'favicon.svg must define an explicit viewBox');
  assert.equal(viewBox[1], viewBox[2], 'favicon viewBox must stay square');
  assert.ok(Number(viewBox[1]) >= 16, 'favicon viewBox must be large enough for a readable icon');
  assert.match(favicon, /#D97736/i, 'favicon must keep the KonditerCalc caramel brand color');

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/, `${page} must reference /favicon.svg`);
  }
});
