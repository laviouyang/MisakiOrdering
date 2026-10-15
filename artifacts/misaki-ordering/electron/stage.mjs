// Copies the finished web build (dist/public) into electron/web so the desktop
// app can bundle it. Run after `vite build`.
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', 'dist', 'public');
const target = path.join(here, 'web');

if (!existsSync(path.join(source, 'index.html'))) {
  console.error(`No web build found at ${source}. Run the build first.`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Copied web build into ${path.relative(process.cwd(), target)}`);
