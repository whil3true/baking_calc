const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const expected = {
  'pereschet-recepta/index.html': ['Как пересчитать рецепт под другой диаметр или форму', '/raschet-ceny-torta/'],
  'raschet-krema-dlya-torta/index.html': ['Сколько крема нужно на торт', '/razmer-torta-po-gostyam/'],
  'razmer-torta-po-gostyam/index.html': ['Как подобрать размер торта на нужное количество гостей', '/raschet-krema-dlya-torta/'],
  'pereschet-zhelatina-bloom/index.html': ['Как пересчитать желатин одной силы Bloom на другую', '/konverter-ingredientov/'],
  'konverter-ingredientov/index.html': ['Как перевести граммы в миллилитры и обратно', '/pereschet-recepta/'],
  'raschet-ceny-torta/index.html': ['Как посчитать себестоимость и цену торта', '/pereschet-recepta/']
};

test('calculator pages keep intent-focused explanatory content and related links', () => {
  for (const [file, needles] of Object.entries(expected)) {
    const html = read(file);
    for (const needle of needles) assert.ok(html.includes(needle), `${file} must contain ${needle}`);
    assert.match(html, /Частые вопросы/);
    assert.match(html, /<details>/);
  }
});

test('homepage exposes popular task wording with canonical internal links', () => {
  const html = read('index.html');
  assert.ok(html.includes('Популярные расчёты для кондитера'));
  for (const route of ['/pereschet-recepta/', '/raschet-krema-dlya-torta/', '/razmer-torta-po-gostyam/', '/pereschet-zhelatina-bloom/', '/konverter-ingredientov/', '/raschet-ceny-torta/']) {
    assert.ok(html.includes(`href="${route}"`), `homepage must link to ${route}`);
  }
});
