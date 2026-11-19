import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
fs.mkdirSync(path.join(root,'dist/server'),{recursive:true});
await import('./embed-ui.mjs');
console.log('Cloudflare build ready');
