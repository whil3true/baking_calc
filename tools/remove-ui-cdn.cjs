const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));

for (const file of htmlFiles) {
  const full = path.join(root, file);
  let html = fs.readFileSync(full, 'utf8');
  html = html.replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@fontsource\/inter@[^\"]+">\s*/i, '');
  html = html.replace(/<script src="https:\/\/unpkg\.com\/lucide@latest\/dist\/umd\/lucide\.min\.js"><\/script>/i, '<script src="js/icons.js" defer></script>');
  fs.writeFileSync(full, html);
}

const utilitiesPath = path.join(root, 'css', 'utilities.css');
let css = fs.readFileSync(utilitiesPath, 'utf8');
css = css.replace(".font-sans { font-family: 'Inter', system-ui, sans-serif; }", ".font-sans { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }");
fs.writeFileSync(utilitiesPath, css);

for (const doc of ['README.md', 'docs/repository-review.md']) {
  const full = path.join(root, doc);
  if (!fs.existsSync(full)) continue;
  let text = fs.readFileSync(full, 'utf8');
  text = text.replace(/Inter и Lucide[^\n]*/gi, 'Inter CDN и Lucide CDN удалены; интерфейс использует системный шрифт и локальный SVG-рендерер иконок.');
  text = text.replace(/Tailwind, Inter и Lucide загружаются с внешних CDN\. При сетевом сбое оформление может деградировать\./gi, 'Внешние UI-CDN удалены: стили, шрифт и иконки больше не зависят от Tailwind, jsDelivr или unpkg.');
  text = text.replace(/следующим инфраструктурным шагом остаётся локализация Inter и Lucide/gi, 'следующим техническим шагом остаётся рефакторинг legacy BakeCalc');
  fs.writeFileSync(full, text);
}
