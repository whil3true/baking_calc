const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const analytics = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');
const base = 'https://konditercalc.ru';

const pages = [
  { file: 'index.html', url: `${base}/` },
  { file: 'pereschet-recepta/index.html', url: `${base}/pereschet-recepta/` },
  { file: 'raschet-krema-dlya-torta/index.html', url: `${base}/raschet-krema-dlya-torta/` },
  { file: 'razmer-torta-po-gostyam/index.html', url: `${base}/razmer-torta-po-gostyam/` },
  { file: 'pereschet-zhelatina-bloom/index.html', url: `${base}/pereschet-zhelatina-bloom/` },
  { file: 'konverter-ingredientov/index.html', url: `${base}/konverter-ingredientov/` },
  { file: 'raschet-ceny-torta/index.html', url: `${base}/raschet-ceny-torta/` }
];

const legacy = {
  'bakecalc.html': '/pereschet-recepta/',
  'creamcalc.html': '/raschet-krema-dlya-torta/',
  'portioncalc.html': '/razmer-torta-po-gostyam/',
  'gelatincalc.html': '/pereschet-zhelatina-bloom/',
  'convertercalc.html': '/konverter-ingredientov/',
  'pricecalc.html': '/raschet-ceny-torta/'
};

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function sitemapUrls(xml) { return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1]); }

for (const page of pages) {
  test(`${page.file} has static canonical SEO metadata`, () => {
    const html = read(page.file);
    assert.match(html, /<title>[^<]+\| KonditerCalc<\/title>|<title>Калькуляторы для кондитеров онлайн|<title>Калькуляторы для кондитеров онлайн \| KonditerCalc<\/title>/i);
    assert.match(html, /<meta name="description" content="[^"]+">/i);
    assert.ok(html.includes(`<link rel="canonical" href="${page.url}">`), `canonical must be ${page.url}`);
    assert.ok(html.includes(`<meta property="og:url" content="${page.url}">`), `og:url must be ${page.url}`);
    assert.match(html, /id="konditercalc-structured-data" type="application\/ld\+json"/);
    assert.doesNotMatch(html, /whil3true\.github\.io\/baking_calc/i);
  });
}

test('sitemap contains only canonical KonditerCalc URLs exactly once', () => {
  const urls = sitemapUrls(sitemap);
  assert.deepEqual(urls, pages.map(page => page.url));
});

test('robots points crawlers to the canonical-domain sitemap', () => {
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Sitemap:\s*https:\/\/konditercalc\.ru\/sitemap\.xml/i);
  assert.doesNotMatch(robots, /whil3true\.github\.io/i);
});

test('legacy html URLs are noindex transition pages to canonical clean routes', () => {
  for (const [file, target] of Object.entries(legacy)) {
    const html = read(file);
    assert.match(html, /meta name="robots" content="noindex,follow"/i, `${file} must be noindex`);
    assert.ok(html.includes(`url=${target}`), `${file} must meta-refresh to ${target}`);
    assert.ok(html.includes(`window.location.replace(target)`), `${file} must preserve query/hash with JS redirect`);
    assert.ok(html.includes(`<link rel="canonical" href="${base}${target}">`), `${file} canonical mismatch`);
  }
});

test('SEO is static and analytics no longer injects an SEO runtime', () => {
  assert.equal(fs.existsSync(path.join(root, 'js', 'seo.js')), false, 'js/seo.js should be removed');
  assert.doesNotMatch(analytics, /seo\.js|data-bakecalc-seo|createElement\(['"]script['"]\).*seo/i);
});

test('custom domain is committed for GitHub Pages', () => {
  assert.equal(read('CNAME').trim(), 'konditercalc.ru');
});
