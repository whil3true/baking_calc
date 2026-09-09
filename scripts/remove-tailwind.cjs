const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));

for (const file of htmlFiles) {
  const full = path.join(root, file);
  let html = fs.readFileSync(full, 'utf8');

  html = html.replace(/\s*<script\s+src=["']https:\/\/cdn\.tailwindcss\.com["']><\/script>\s*/g, '\n');
  html = html.replace(/\s*<script>\s*(?:if \(window\.tailwind\) )?tailwind\.config\s*=\s*\{[\s\S]*?\};?\s*<\/script>\s*/g, '\n');

  if (!html.includes('css/utilities.css')) {
    html = html.replace(
      /(<link\s+rel=["']stylesheet["']\s+href=["']css\/styles\.css["']>)/,
      '$1\n<link rel="stylesheet" href="css/utilities.css">'
    );
  }

  fs.writeFileSync(full, html);
}

const noTailwindTest = `const test = require('node:test');\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\nconst path = require('node:path');\n\nconst root = path.join(__dirname, '..');\nconst htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));\n\ntest('public pages have no Tailwind runtime dependency', () => {\n  for (const file of htmlFiles) {\n    const html = fs.readFileSync(path.join(root, file), 'utf8');\n    assert.doesNotMatch(html, /cdn\\.tailwindcss\\.com/i, file + ' must not load Tailwind CDN');\n    assert.doesNotMatch(html, /tailwind\\.config/i, file + ' must not configure Tailwind');\n    assert.match(html, /css\\/utilities\\.css/, file + ' must load local utility CSS');\n  }\n});\n\ntest('repository contains no Tailwind package or config files', () => {\n  for (const file of ['tailwind.config.js','tailwind.config.cjs','tailwind.config.mjs']) {\n    assert.equal(fs.existsSync(path.join(root, file)), false, file + ' must not exist');\n  }\n  const packageJson = path.join(root, 'package.json');\n  if (fs.existsSync(packageJson)) {\n    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));\n    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };\n    assert.equal(Object.prototype.hasOwnProperty.call(deps, 'tailwindcss'), false, 'tailwindcss package must not be installed');\n  }\n});\n`;
fs.writeFileSync(path.join(root, 'tests', 'no-tailwind.test.cjs'), noTailwindTest);

const readmePath = path.join(root, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(
  /Tailwind, Inter и Lucide пока подключаются с CDN, поэтому исходное оформление зависит от сети\./,
  'Tailwind полностью удалён из runtime и зависимостей. Используемые utility-классы обслуживаются локальным `css/utilities.css`; основной компонентный CSS остаётся в `css/styles.css`. Inter и Lucide пока подключаются с CDN.'
);
if (!readme.includes('## CSS без Tailwind')) {
  readme += `\n\n## CSS без Tailwind\n\nСайт не использует Tailwind CDN, Tailwind CLI или пакет \`tailwindcss\`. Исторические utility-подобные имена классов сохранены в разметке ради безопасной миграции и реализованы обычными локальными правилами в \`css/utilities.css\`. Это позволяет постепенно переводить разметку на семантические классы без runtime-компиляции и без сборки для GitHub Pages.\n`;
}
fs.writeFileSync(readmePath, readme);

const reviewPath = path.join(root, 'docs', 'repository-review.md');
let review = fs.readFileSync(reviewPath, 'utf8');
review = review.replace(
  '1. **CDN-зависимости.** Tailwind, Inter и Lucide загружаются с внешних CDN. При сетевом сбое оформление может деградировать.',
  '1. **Оставшиеся CDN-зависимости.** Tailwind удалён полностью; Inter и Lucide пока загружаются с внешних CDN. При сетевом сбое шрифт/иконки могут деградировать.'
);
review = review.replace(
  /1\. отказаться от runtime Tailwind CDN и зафиксировать внешние зависимости;\n2\. затем рефакторить legacy BakeCalc без изменения пользовательского поведения;\n3\. добавить продуктовые события аналитики;\n4\. подготовить стабильные рекламные места без layout shift;\n5\. после появления данных использования улучшать SEO-контент и внутренние связи по реальному спросу, а не по гаданию\./,
  '1. локализовать оставшиеся внешние зависимости Inter и Lucide;\n2. затем рефакторить legacy BakeCalc без изменения пользовательского поведения;\n3. добавить продуктовые события аналитики;\n4. подготовить стабильные рекламные места без layout shift;\n5. после появления данных использования улучшать SEO-контент и внутренние связи по реальному спросу, а не по гаданию.'
);
if (!review.includes('## Миграция с Tailwind')) {
  review += `\n\n## Миграция с Tailwind\n\nRuntime Tailwind CDN и конфигурационные блоки удалены со всех публичных страниц. Пакет Tailwind и сборка Tailwind не используются. Текущие utility-подобные классы обслуживаются локальным \`css/utilities.css\`, поэтому GitHub Pages по-прежнему публикует обычный статический сайт без этапа сборки. CI проверяет отсутствие Tailwind CDN/config/package.\n`;
}
fs.writeFileSync(reviewPath, review);

// Remove the one-shot migration machinery from the final branch state.
for (const temporary of [
  path.join(root, 'scripts', 'remove-tailwind.cjs'),
  path.join(root, '.github', 'workflows', 'remove-tailwind-codemod.yml')
]) {
  if (fs.existsSync(temporary)) fs.rmSync(temporary);
}
try { fs.rmdirSync(path.join(root, 'scripts')); } catch {}
