// Copies the finished app (the dist folder) into electron/web so the
// Mac/Windows app can include it. Runs automatically as part of
// `npm run desktop`, `npm run desktop:mac` and `npm run desktop:win`.
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', 'dist');
const target = path.join(here, 'web');

if (!existsSync(path.join(source, 'index.html'))) {
  console.error('No built app found in the dist folder. Run `npm run build` first.');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log('Copied the built app into electron/web');
