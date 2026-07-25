// tsc が扱わない静的ファイル（HTML/CSS）を dist へコピーする。

import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'src', 'renderer');
const to = path.join(root, 'dist', 'renderer');

await mkdir(to, { recursive: true });

for (const file of ['index.html', 'styles.css']) {
  await cp(path.join(from, file), path.join(to, file));
}

console.log('copied renderer assets -> dist/renderer');
