import fs from 'node:fs';

const file = relative => new URL(relative, import.meta.url);
const source = fs.readFileSync(file('../worker/index.js'), 'utf8');
const assets = Object.fromEntries(['style.css', 'customer.js', 'staff.js', 'employee.js','customer.html','admin.html','employee.html'].map(name => [
  name,
  fs.readFileSync(file('../' + (name.endsWith('.html') ? '' : 'ui/') + name), 'utf8'),
]));
const buildMarker = '/* UI_BUILD_INSERT */ {}';
if (!source.includes(buildMarker)) throw new Error('UI build marker missing');
fs.writeFileSync(file('../dist/server/index.js'), source.replace(buildMarker, () => JSON.stringify(assets)));
