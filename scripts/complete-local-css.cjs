const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const file = path.join(root, 'css', 'utilities.css');
let css = fs.readFileSync(file, 'utf8');
const addition = `

/* Coverage-complete utilities discovered by CI after Tailwind removal. */
.box-border { box-sizing: border-box; }
.items-end { align-items: flex-end; }
.order-1 { order: 1; }
.order-2 { order: 2; }
.order-3 { order: 3; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
.text-dark\\/20 { color: rgba(46,40,42,.2); }

/* PortionCalc components moved into the shared local CSS layer. */
.portion-shape-card { border: 1px solid #E8E2D5; border-radius: 1rem; padding: 1rem; cursor: pointer; background: #fff; transition: border-color .2s, background .2s; }
.portion-shape-card:hover { border-color: var(--caramel); }
.portion-shape-active { border-color: var(--caramel); background: #FFF8F2; }
.portion-shape-card input { position: absolute; opacity: 0; pointer-events: none; }

@media (min-width: 768px) {
  .md\\:gap-5 { gap: 1.25rem; }
  .md\\:text-base { font-size: 1rem; line-height: 1.5rem; }
}
`;
if (!css.includes('Coverage-complete utilities discovered by CI')) css += addition;
fs.writeFileSync(file, css);

for (const temporary of [
  path.join(root, 'scripts', 'complete-local-css.cjs'),
  path.join(root, '.github', 'workflows', 'complete-local-css.yml')
]) {
  if (fs.existsSync(temporary)) fs.rmSync(temporary);
}
try { fs.rmdirSync(path.join(root, 'scripts')); } catch {}
