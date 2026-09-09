const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));

test('public pages have no Tailwind runtime dependency', () => {
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/i, file + ' must not load Tailwind CDN');
    assert.doesNotMatch(html, /tailwind\.config/i, file + ' must not configure Tailwind');
    assert.match(html, /css\/utilities\.css/, file + ' must load local utility CSS');
  }
});

test('repository contains no Tailwind package or config files', () => {
  for (const file of ['tailwind.config.js','tailwind.config.cjs','tailwind.config.mjs']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file + ' must not exist');
  }
  const packageJson = path.join(root, 'package.json');
  if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    assert.equal(Object.prototype.hasOwnProperty.call(deps, 'tailwindcss'), false, 'tailwindcss package must not be installed');
  }
});
