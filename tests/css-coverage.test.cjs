const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = [fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8'), fs.readFileSync(path.join(root, 'css', 'utilities.css'), 'utf8')].join('\n');
const htmlFiles = ["index.html", "pereschet-recepta/index.html", "raschet-krema-dlya-torta/index.html", "razmer-torta-po-gostyam/index.html", "pereschet-zhelatina-bloom/index.html", "konverter-ingredientov/index.html", "raschet-ceny-torta/index.html"];
function escapeSelectorToken(token) { return token.replace(/([^a-zA-Z0-9_-])/g, '\\$1'); }
function collectClassTokens(source) {
  const tokens = new Set();
  const patterns = [/class\s*=\s*["']([^"']+)["']/g, /className\s*=\s*["']([^"']+)["']/g, /className\s*=\s*`([^`]+)`/g];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) for (const token of match[1].split(/\s+/)) {
    if (!token || token.includes('${')) continue;
    if (!/^[!A-Za-z0-9_:\/%.\[\]-]+$/.test(token)) continue;
    tokens.add(token);
  }
  return tokens;
}
test('all canonical markup classes have local CSS definitions', () => {
  const sourceFiles = [...htmlFiles.map(name => path.join(root, name)), ...fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js')).map(name => path.join(root, 'js', name))];
  const missing = new Set();
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const token of collectClassTokens(source)) {
      const selector = `.${escapeSelectorToken(token)}`;
      if (!css.includes(selector)) missing.add(token);
    }
  }
  assert.deepEqual([...missing].sort(), [], `Missing local CSS for: ${[...missing].sort().join(', ')}`);
});
