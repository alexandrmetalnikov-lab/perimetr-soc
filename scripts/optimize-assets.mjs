// Сжимает исходники из art-src/ в WebP для игры: art-src/<папка>/<id>.png → public/assets/<папка>/<id>.webp
// probes/ и inbox/ пропускаются. Запуск: npm run assets
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, extname, basename, relative } from 'node:path';
import sharp from 'sharp';

const SRC = 'art-src';
const OUT = 'public/assets';
const SKIP = new Set(['probes', 'inbox']);
const MAX = { bg: 1920, obj: 768, portraits: 900 };

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) yield* walk(p); }
    else if (/\.(png|jpe?g)$/i.test(e.name)) yield p;
  }
}

let n = 0;
for await (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const group = rel.split(/[\\/]/)[0];
  const outDir = join(OUT, group);
  const out = join(outDir, basename(file, extname(file)) + '.webp');
  await mkdir(outDir, { recursive: true });
  try { if ((await stat(out)).mtimeMs >= (await stat(file)).mtimeMs) continue; } catch {}
  const max = MAX[group] ?? 1600;
  const info = await sharp(file).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(out);
  console.log(`${rel} → ${out} · ${info.width}×${info.height} · ${Math.round(info.size / 1024)} КБ`);
  n++;
}
console.log(n ? `Готово: ${n}` : 'Всё уже актуально');
