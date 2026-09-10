from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path, old, new, count=None):
    file = ROOT / path
    text = file.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual == 0:
        raise RuntimeError(f'{path}: expected text not found: {old[:80]!r}')
    if count is not None and actual != count:
        raise RuntimeError(f'{path}: expected {count} matches, found {actual}: {old[:80]!r}')
    file.write_text(text.replace(old, new), encoding='utf-8')

# Keep the controller/view contract intact after the route migration.
replace(
    'js/app.js',
    """  const anyPricing = state.ingredients.some(ingredient => Number(ingredient.price) > 0) || extraCostsTotal > 0;\n  BakeCalcView.renderResults({\n    state,\n    totalWeight: calculateTotalWeight(),\n    ingredientsCost: costDetails.total,\n    extraCostsTotal,\n    costComplete: costDetails.complete,\n    costIssues: costDetails.issues,\n    anyPricing,\n    priceCalcUrl: buildPriceCalcUrl(costDetails)\n  });""",
    """  BakeCalcView.renderResults({\n    state,\n    totalWeight: calculateTotalWeight(),\n    ingredientsCost: costDetails.total,\n    extraCostsTotal,\n    costDetails,\n    priceCalcHref: buildPriceCalcUrl(costDetails)\n  });""",
    1
)

# Exercise canonical URLs directly, not their legacy transition pages.
replace('tests/browser-smoke.mjs', "`${baseURL}/bakecalc.html`", "`${baseURL}/pereschet-recepta/`", 2)
replace('tests/browser-smoke.mjs', '/перенесена из BakeCalc/i', '/перенесена из KonditerCalc/i', 1)

# Public-facing copy/export branding follows the new brand; internal module/source tokens remain stable.
for path in ['js/pricecalc.js', 'js/convertercalc.js', 'js/portioncalc.js']:
    file = ROOT / path
    text = file.read_text(encoding='utf-8')
    text = text.replace("'BakeCalc —", "'KonditerCalc —")
    text = text.replace('перенесена из BakeCalc', 'перенесена из KonditerCalc')
    file.write_text(text, encoding='utf-8')

# Repository documentation should describe the deployed custom-domain site, not the old project URL.
readme = ROOT / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# BakeCalc\n', '# KonditerCalc\n', 1)
text = text.replace(
    'Статические бесплатные инструменты для кондитеров. Серверная часть и сборка для самого сайта не нужны; страницы совместимы с GitHub Pages в подпапке `/baking_calc/`.',
    'Статические бесплатные инструменты для кондитеров на `https://konditercalc.ru/`. Серверная часть и обязательная сборка не нужны; сайт публикуется через GitHub Pages с собственным доменом.'
)
text = text.replace(
    'Для новых страниц используйте `<a href="index.html" class="home-link">← На главную</a>`.',
    'Для новых страниц используйте `<a href="/" class="home-link">← На главную</a>`.'
)
readme.write_text(text, encoding='utf-8')

# Minor remaining visible legacy naming on the catalog card.
replace('index.html', 'aria-label="GelatinCalc — пересчёт желатина по силе Bloom"', 'aria-label="Пересчёт желатина по силе Bloom"', 1)

print('SEO finalization complete')
