// Creates a placeholder page for every file in the route manifest that does not exist yet.
// Existing pages are never touched. Run: node scripts/make-stubs.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPageFiles } from '../src/routes/manifest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'pages');
let made = 0;
for (const file of allPageFiles()) {
  const target = join(root, `${file}.jsx`);
  if (existsSync(target)) continue;
  mkdirSync(dirname(target), { recursive: true });
  const name = basename(file);
  const label = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  writeFileSync(target, `export default function ${name}() {\n  return (\n    <div className="page">\n      <h1>${label}</h1>\n      <p className="muted">STUB: this page has not been built yet (${file}).</p>\n    </div>\n  );\n}\n`);
  made += 1;
}
console.log(`Created ${made} stub page(s).`);
