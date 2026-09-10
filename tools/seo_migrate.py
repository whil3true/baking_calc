from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://konditercalc.ru'

PAGES = {
    'bakecalc.html': {
        'route': 'pereschet-recepta',
        'title': 'Пересчёт рецепта под другую форму онлайн | KonditerCalc',
        'description': 'Пересчитайте рецепт под круглую или прямоугольную форму, учтите высоту и рассчитайте себестоимость ингредиентов онлайн.',
        'h1': 'Пересчёт рецепта под другую форму',
        'name': 'Пересчёт рецепта под другую форму'
    },
    'creamcalc.html': {
        'route': 'raschet-krema-dlya-torta',
        'title': 'Калькулятор крема для торта онлайн | KonditerCalc',
        'description': 'Рассчитайте количество крема для прослоек, верха и боков круглого или прямоугольного торта с учётом запаса.',
        'h1': 'Калькулятор крема для торта',
        'name': 'Калькулятор крема для торта'
    },
    'portioncalc.html': {
        'route': 'razmer-torta-po-gostyam',
        'title': 'Размер торта по количеству гостей | KonditerCalc',
        'description': 'Рассчитайте размер круглого или прямоугольного торта по количеству гостей, размеру порции и запасу.',
        'h1': 'Размер торта по количеству гостей',
        'name': 'Размер торта по количеству гостей'
    },
    'gelatincalc.html': {
        'route': 'pereschet-zhelatina-bloom',
        'title': 'Пересчёт желатина по Bloom онлайн | KonditerCalc',
        'description': 'Пересчитайте количество желатина между разной силой Bloom и рассчитайте воду для гидратации.',
        'h1': 'Пересчёт желатина по Bloom',
        'name': 'Пересчёт желатина по Bloom'
    },
    'convertercalc.html': {
        'route': 'konverter-ingredientov',
        'title': 'Конвертер ингредиентов: граммы, мл, кг и литры | KonditerCalc',
        'description': 'Переводите граммы, килограммы, миллилитры и литры. Для перевода массы в объём используйте плотность ингредиента.',
        'h1': 'Конвертер ингредиентов',
        'name': 'Конвертер ингредиентов'
    },
    'pricecalc.html': {
        'route': 'raschet-ceny-torta',
        'title': 'Калькулятор цены торта и десерта | KonditerCalc',
        'description': 'Рассчитайте цену торта или десерта с учётом себестоимости, работы, комиссии, прибыли, маржи и наценки.',
        'h1': 'Калькулятор цены торта и десерта',
        'name': 'Калькулятор цены торта и десерта'
    }
}

INDEX_META = {
    'title': 'Калькуляторы для кондитеров онлайн | KonditerCalc',
    'description': 'Бесплатные онлайн-калькуляторы для кондитеров: пересчёт рецепта, крем для торта, размер по гостям, желатин Bloom, конвертер ингредиентов и цена продажи.'
}


def strip_dynamic_seo(html: str) -> str:
    html = re.sub(r'\n?<meta\s+name=["\']description["\'][^>]*>', '', html, flags=re.I)
    html = re.sub(r'\n?<link\s+rel=["\']canonical["\'][^>]*>', '', html, flags=re.I)
    html = re.sub(r'\n?<meta\s+(?:name|property)=["\'](?:og:[^"\']+|twitter:[^"\']+)["\'][^>]*>', '', html, flags=re.I)
    html = re.sub(r'\n?<script[^>]+id=["\'](?:bakecalc|konditercalc)-structured-data["\'][^>]*>.*?</script>', '', html, flags=re.I | re.S)
    html = re.sub(r'<title>.*?</title>', '', html, count=1, flags=re.I | re.S)
    return html


def seo_block(title: str, description: str, canonical: str, schema: dict) -> str:
    schema_text = json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return f'''<title>{title}</title>\n<meta name="description" content="{description}">\n<link rel="canonical" href="{canonical}">\n<meta property="og:locale" content="ru_RU">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="KonditerCalc">\n<meta property="og:title" content="{title}">\n<meta property="og:description" content="{description}">\n<meta property="og:url" content="{canonical}">\n<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="{title}">\n<meta name="twitter:description" content="{description}">\n<script id="konditercalc-structured-data" type="application/ld+json">{schema_text}</script>'''


def inject_seo(html: str, block: str) -> str:
    html = strip_dynamic_seo(html)
    marker = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    if marker not in html:
        raise RuntimeError('viewport marker missing')
    return html.replace(marker, marker + '\n' + block, 1)


def absolutize_assets(html: str) -> str:
    html = re.sub(r'(?P<attr>href|src)="css/', r'\g<attr>="/css/', html)
    html = re.sub(r'(?P<attr>href|src)="js/', r'\g<attr>="/js/', html)
    html = html.replace('href="index.html"', 'href="/"')
    return html


def replace_first_h1(html: str, value: str) -> str:
    updated, count = re.subn(r'(<h1\b[^>]*>).*?(</h1>)', lambda m: m.group(1) + value + m.group(2), html, count=1, flags=re.I | re.S)
    if count != 1:
        raise RuntimeError(f'expected one H1, got {count}')
    return updated


def tool_schema(meta: dict, canonical: str) -> dict:
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': meta['name'],
        'url': canonical,
        'description': meta['description'],
        'applicationCategory': 'UtilityApplication',
        'operatingSystem': 'Any',
        'inLanguage': 'ru',
        'isAccessibleForFree': True,
        'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'RUB'}
    }


def legacy_redirect(target: str, title: str) -> str:
    canonical = f'{BASE}/{target}/'
    return f'''<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Страница переехала | KonditerCalc</title>\n<meta name="robots" content="noindex,follow">\n<link rel="canonical" href="{canonical}">\n<meta http-equiv="refresh" content="0; url=/{target}/">\n<script>\n(function () {{\n  var target = '/{target}/' + window.location.search + window.location.hash;\n  window.location.replace(target);\n}})();\n</script>\n</head>\n<body>\n<p>Страница переехала: <a href="/{target}/">{title}</a>.</p>\n</body>\n</html>\n'''


# Build canonical tool pages from current working pages.
for source_name, meta in PAGES.items():
    source_path = ROOT / source_name
    html = source_path.read_text(encoding='utf-8')
    canonical = f"{BASE}/{meta['route']}/"
    html = absolutize_assets(html)
    html = html.replace('BakeCalc', 'KonditerCalc')
    html = replace_first_h1(html, meta['h1'])
    html = inject_seo(html, seo_block(meta['title'], meta['description'], canonical, tool_schema(meta, canonical)))
    target = ROOT / meta['route'] / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    source_path.write_text(legacy_redirect(meta['route'], meta['h1']), encoding='utf-8')

# Homepage branding, links and static SEO.
index_path = ROOT / 'index.html'
index = index_path.read_text(encoding='utf-8')
index = absolutize_assets(index)
index = index.replace('BakeCalc', 'KonditerCalc')
index = index.replace('href="bakecalc.html"', 'href="/pereschet-recepta/"')
index = index.replace('href="creamcalc.html"', 'href="/raschet-krema-dlya-torta/"')
index = index.replace('href="portioncalc.html"', 'href="/razmer-torta-po-gostyam/"')
index = index.replace('href="gelatincalc.html"', 'href="/pereschet-zhelatina-bloom/"')
index = index.replace('href="convertercalc.html"', 'href="/konverter-ingredientov/"')
index = index.replace('href="pricecalc.html"', 'href="/raschet-ceny-torta/"')
index = index.replace('>Что будем считать?</h2>', '>Бесплатные калькуляторы для кондитеров</h2>')
index = index.replace('Шесть практичных калькуляторов для повседневной работы кондитера.', 'Пересчитывайте рецепты и крем, подбирайте размер торта, работайте с желатином и ингредиентами, считайте себестоимость и цену продажи.')
index = index.replace('<h3 class="tool-title">KonditerCalc</h3>', '<h3 class="tool-title">Пересчёт рецепта</h3>', 1)
index = index.replace('<h3 class="tool-title">CreamCalc</h3>', '<h3 class="tool-title">Крем для торта</h3>')
index = index.replace('<h3 class="tool-title">Порции</h3>', '<h3 class="tool-title">Размер торта</h3>')
index = index.replace('aria-label="KonditerCalc — пересчет рецепта и себестоимость"', 'aria-label="Пересчёт рецепта под другую форму и себестоимость"')
index = index.replace('aria-label="CreamCalc — расчёт крема для торта"', 'aria-label="Калькулятор крема для торта"')
extra = '''\n  <section class="card p-5 md:p-6 mt-8 md:mt-10" aria-labelledby="about-calculators-title">\n    <h2 id="about-calculators-title" class="text-xl md:text-2xl font-bold mb-3">Кондитерские расчёты без таблиц и ручных формул</h2>\n    <p class="text-sm md:text-base text-dark/70 mb-3">KonditerCalc — бесплатный набор онлайн-инструментов для домашних кондитеров и тех, кто готовит десерты на заказ. Каждый калькулятор решает отдельную практическую задачу и работает прямо в браузере.</p>\n    <p class="text-sm md:text-base text-dark/70">Начните с пересчёта рецепта под форму, а затем при необходимости передайте рассчитанную себестоимость в калькулятор цены продажи. Для крема, порций, желатина и перевода единиц есть отдельные инструменты.</p>\n  </section>\n'''
needle = '  <section class="mt-8 md:mt-10 text-center">'
if needle not in index:
    raise RuntimeError('homepage footer section marker missing')
index = index.replace(needle, extra + '\n' + needle, 1)
index_schema = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebSite',
            'name': 'KonditerCalc',
            'url': f'{BASE}/',
            'description': INDEX_META['description'],
            'inLanguage': 'ru'
        },
        {
            '@type': 'ItemList',
            'name': 'Калькуляторы для кондитеров',
            'itemListElement': [
                {'@type': 'ListItem', 'position': i + 1, 'name': m['name'], 'url': f"{BASE}/{m['route']}/"}
                for i, m in enumerate(PAGES.values())
            ]
        }
    ]
}
index = inject_seo(index, seo_block(INDEX_META['title'], INDEX_META['description'], f'{BASE}/', index_schema))
index_path.write_text(index, encoding='utf-8')

# Runtime integration uses the canonical PriceCalc route.
app_path = ROOT / 'js' / 'app.js'
app = app_path.read_text(encoding='utf-8')
app = app.replace("return `/pricecalc.html?${params.toString()}`;", "return `/raschet-ceny-torta/?${params.toString()}`;")
app = app.replace("return `pricecalc.html?${params.toString()}`;", "return `/raschet-ceny-torta/?${params.toString()}`;")
app_path.write_text(app, encoding='utf-8')

# SEO is static now; analytics must not inject metadata after page load.
analytics_path = ROOT / 'js' / 'analytics.js'
analytics = analytics_path.read_text(encoding='utf-8')
analytics = re.sub(
    r'/\* SEO metadata is centralized.*?document\.head\.appendChild\(seoScript\);\n}\n\n',
    '', analytics, flags=re.S
)
analytics = analytics.replace('/* Shared site behavior + Yandex.Metrika. */', '/* Shared site behavior + Yandex.Metrika. SEO metadata is static in HTML. */')
analytics_path.write_text(analytics, encoding='utf-8')
seo_path = ROOT / 'js' / 'seo.js'
if seo_path.exists():
    seo_path.unlink()

# Search engine discovery files use only canonical URLs.
(ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://konditercalc.ru/sitemap.xml\n', encoding='utf-8')
urls = [f'{BASE}/'] + [f"{BASE}/{meta['route']}/" for meta in PAGES.values()]
sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for url in urls:
    sitemap.append(f'  <url><loc>{url}</loc><lastmod>2026-09-10</lastmod></url>')
sitemap.append('</urlset>')
(ROOT / 'sitemap.xml').write_text('\n'.join(sitemap) + '\n', encoding='utf-8')

# Existing DOM-contract tests must read canonical page files.
replacements = {name: f"{meta['route']}/index.html" for name, meta in PAGES.items()}
for test_path in (ROOT / 'tests').glob('*.test.cjs'):
    text = test_path.read_text(encoding='utf-8')
    for old, new in replacements.items():
        text = text.replace(old, new)
    test_path.write_text(text, encoding='utf-8')

# Replace tests that intentionally need awareness of canonical vs legacy pages.
(ROOT / 'tests' / 'seo.test.cjs').write_text(r'''const test = require('node:test');
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
    assert.match(html, /<title>[^<]+\| KonditerCalc<\/title>|<title>Калькуляторы для кондитеров online|<title>Калькуляторы для кондитеров онлайн \| KonditerCalc<\/title>/i);
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
'''.replace('online', 'онлайн'), encoding='utf-8')

canonical_files = ['index.html'] + [f"{m['route']}/index.html" for m in PAGES.values()]
canonical_js = json.dumps(canonical_files, ensure_ascii=False)
(ROOT / 'tests' / 'no-tailwind.test.cjs').write_text(f'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const htmlFiles = {canonical_js};
function read(file) {{ return fs.readFileSync(path.join(root, file), 'utf8'); }}

test('canonical public pages have no Tailwind runtime dependency', () => {{
  for (const file of htmlFiles) {{
    const html = read(file);
    assert.doesNotMatch(html, /cdn\\.tailwindcss\\.com/i, file + ' must not load Tailwind CDN');
    assert.doesNotMatch(html, /tailwind\\.config/i, file + ' must not configure Tailwind');
    assert.match(html, /\\/css\\/utilities\\.css/, file + ' must load local utility CSS');
    const stylesIndex = html.indexOf('/css/styles.css');
    const utilitiesIndex = html.indexOf('/css/utilities.css');
    assert.ok(stylesIndex >= 0, file + ' must load component styles.css');
    assert.ok(utilitiesIndex > stylesIndex, file + ' must load utilities.css after styles.css');
  }}
}});

test('repository contains no Tailwind package or config files', () => {{
  for (const file of ['tailwind.config.js','tailwind.config.cjs','tailwind.config.mjs']) {{
    assert.equal(fs.existsSync(path.join(root, file)), false, file + ' must not exist');
  }}
  const packageJson = path.join(root, 'package.json');
  if (fs.existsSync(packageJson)) {{
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    const deps = {{ ...(pkg.dependencies || {{}}), ...(pkg.devDependencies || {{}}) }};
    assert.equal(Object.prototype.hasOwnProperty.call(deps, 'tailwindcss'), false, 'tailwindcss package must not be installed');
  }}
}});
''', encoding='utf-8')

(ROOT / 'tests' / 'no-ui-cdn.test.cjs').write_text(f'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const htmlFiles = {canonical_js};
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'));
function read(file) {{ return fs.readFileSync(path.join(root, file), 'utf8'); }}

test('canonical public pages do not depend on external font or icon CDNs', () => {{
  for (const file of htmlFiles) {{
    const html = read(file);
    assert.doesNotMatch(html, /cdn\\.jsdelivr\\.net\\/npm\\/@fontsource\\/inter/i, `${{file}} must not load Inter from jsDelivr`);
    assert.doesNotMatch(html, /unpkg\\.com\\/lucide/i, `${{file}} must not load Lucide from unpkg`);
    assert.match(html, /<script src="\\/js\\/icons\\.js" defer><\\/script>/, `${{file}} must load local icons.js`);
  }}
}});

test('every used icon has a local definition', () => {{
  const used = new Set();
  for (const file of [...htmlFiles, ...jsFiles.map(name => `js/${{name}}`)]) {{
    const text = read(file);
    for (const match of text.matchAll(/data-lucide=["']([^"']+)["']/g)) used.add(match[1]);
  }}
  const icons = read('js/icons.js');
  const missing = [...used].filter(name => !new RegExp(`['"]${{name.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&')}}['"]\\\\s*:`).test(icons));
  assert.deepEqual(missing, [], `Missing local icon definitions: ${{missing.join(', ')}}`);
}});

test('local icon runtime keeps the existing compatibility contract', () => {{
  const icons = read('js/icons.js');
  assert.match(icons, /window\\.lucide\\s*=\\s*\\{{\\s*createIcons\\s*\\}}/, 'icons.js must expose window.lucide.createIcons');
  assert.match(icons, /const fallback\\s*=/, 'icons.js must keep a safe fallback for unknown icons');
  assert.match(icons, /querySelectorAll\\?\\.\\('\\[data-lucide\\]'\\)/, 'icons.js must render dynamic data-lucide nodes');
}});

test('font utility uses only local system fonts', () => {{
  const css = read('css/utilities.css');
  assert.doesNotMatch(css, /font-family:\\s*['"]Inter['"]/i);
  assert.match(css, /\\.font-sans\\s*\\{{[^}}]*font-family:\\s*system-ui/i);
}});
''', encoding='utf-8')

(ROOT / 'tests' / 'css-coverage.test.cjs').write_text(f'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = [fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8'), fs.readFileSync(path.join(root, 'css', 'utilities.css'), 'utf8')].join('\\n');
const htmlFiles = {canonical_js};
function escapeSelectorToken(token) {{ return token.replace(/([^a-zA-Z0-9_-])/g, '\\\\$1'); }}
function collectClassTokens(source) {{
  const tokens = new Set();
  const patterns = [/class\\s*=\\s*["']([^"']+)["']/g, /className\\s*=\\s*["']([^"']+)["']/g, /className\\s*=\\s*`([^`]+)`/g];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) for (const token of match[1].split(/\\s+/)) {{
    if (!token || token.includes('${{')) continue;
    if (!/^[!A-Za-z0-9_:\\/%.\\[\\]-]+$/.test(token)) continue;
    tokens.add(token);
  }}
  return tokens;
}}
test('all canonical markup classes have local CSS definitions', () => {{
  const sourceFiles = [...htmlFiles.map(name => path.join(root, name)), ...fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js')).map(name => path.join(root, 'js', name))];
  const missing = new Set();
  for (const file of sourceFiles) {{
    const source = fs.readFileSync(file, 'utf8');
    for (const token of collectClassTokens(source)) {{
      const selector = `.${{escapeSelectorToken(token)}}`;
      if (!css.includes(selector)) missing.add(token);
    }}
  }}
  assert.deepEqual([...missing].sort(), [], `Missing local CSS for: ${{[...missing].sort().join(', ')}}`);
}});
''', encoding='utf-8')

# Browser smoke uses clean routes and asserts static SEO already exists at DOMContentLoaded.
smoke_path = ROOT / 'tests' / 'browser-smoke.mjs'
smoke = smoke_path.read_text(encoding='utf-8')
smoke = smoke.replace("href?.startsWith('https://whil3true.github.io/baking_calc/')", "href?.startsWith('https://konditercalc.ru/')")
smoke = smoke.replace("#bakecalc-structured-data", "#konditercalc-structured-data")
smoke = smoke.replace("'bakecalc.html'", "'pereschet-recepta/'")
smoke = smoke.replace("'creamcalc.html'", "'raschet-krema-dlya-torta/'")
smoke = smoke.replace("'portioncalc.html'", "'razmer-torta-po-gostyam/'")
smoke = smoke.replace("'gelatincalc.html'", "'pereschet-zhelatina-bloom/'")
smoke = smoke.replace("'convertercalc.html'", "'konverter-ingredientov/'")
smoke = smoke.replace("'pricecalc.html'", "'raschet-ceny-torta/'")
smoke = smoke.replace("/^pricecalc\\.html\\?/", "/^\\/raschet-ceny-torta\\/\\?/")
smoke = smoke.replace("url.pathname.endsWith('/pricecalc.html')", "url.pathname.endsWith('/raschet-ceny-torta/')")
smoke_path.write_text(smoke, encoding='utf-8')

# Documentation: public routes/domain are now canonical, technical module names stay unchanged.
readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
for old, new in replacements.items():
    readme = readme.replace(f'`{old}`', f'`/{new.removesuffix("index.html")}`')
readme = readme.replace('https://whil3true.github.io/baking_calc/', 'https://konditercalc.ru/')
readme_path.write_text(readme, encoding='utf-8')

doc_path = ROOT / 'docs' / 'repository-review.md'
doc = doc_path.read_text(encoding='utf-8')
for old, new in replacements.items():
    doc = doc.replace(f'`{old}`', f'`/{new.removesuffix("index.html")}`')
doc = doc.replace('Публичная база canonical URL: `https://whil3true.github.io/baking_calc/`.', 'Публичная база canonical URL: `https://konditercalc.ru/`.')
doc = doc.replace('В репозитории нет `CNAME`, поэтому SEO-файлы ориентированы на стандартный адрес GitHub Pages. При подключении собственного домена этот базовый URL нужно заменить централизованно в `js/seo.js`, `robots.txt`, `sitemap.xml` и соответствующем SEO-тесте.', 'В репозитории есть `CNAME` для `konditercalc.ru`; критические SEO-метаданные находятся непосредственно в HTML, а `robots.txt` и `sitemap.xml` используют тот же основной домен.')
doc = doc.replace('3. **SEO metadata добавляются общим JavaScript-слоем.** Это удобно для текущего статического проекта, но после появления сборки лучше генерировать critical meta/canonical/JSON-LD непосредственно в HTML.', '3. **SEO-метаданные статические.** Title, description, canonical, Open Graph и JSON-LD доступны в исходном HTML до выполнения JavaScript.')
doc_path.write_text(doc, encoding='utf-8')

# Guard against accidental old-domain references in public discovery files and canonical pages.
for file in [ROOT / 'index.html', ROOT / 'robots.txt', ROOT / 'sitemap.xml'] + [ROOT / m['route'] / 'index.html' for m in PAGES.values()]:
    text = file.read_text(encoding='utf-8')
    if 'whil3true.github.io/baking_calc' in text:
        raise RuntimeError(f'old canonical domain remains in {file.relative_to(ROOT)}')

print('SEO migration prepared successfully')
