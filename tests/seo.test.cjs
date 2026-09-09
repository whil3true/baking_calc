const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const seo = fs.readFileSync(path.join(root, 'js', 'seo.js'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');

const pages = [
  'index.html',
  'bakecalc.html',
  'creamcalc.html',
  'portioncalc.html',
  'gelatincalc.html',
  'convertercalc.html',
  'pricecalc.html'
];

const publicUrl = page => page === 'index.html'
  ? 'https://whil3true.github.io/baking_calc/'
  : `https://whil3true.github.io/baking_calc/${page}`;

test('SEO configuration covers every public page', () => {
  for (const page of pages) {
    assert.ok(fs.existsSync(path.join(root, page)), `Missing page ${page}`);
    assert.match(seo, new RegExp(`['\"]${page.replace('.', '\\.')}['\"]`), `SEO config missing ${page}`);
  }
});

test('sitemap contains every public calculator exactly once', () => {
  for (const page of pages) {
    const url = publicUrl(page);
    assert.equal(sitemap.split(url).length - 1, 1, `Sitemap must contain ${url} exactly once`);
  }
});

test('robots points search crawlers to the sitemap', () => {
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Sitemap:\s*https:\/\/whil3true\.github\.io\/baking_calc\/sitemap\.xml/i);
});

test('shared analytics entrypoint loads the SEO layer', () => {
  const analytics = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');
  assert.match(analytics, /js\/seo\.js/);
});
