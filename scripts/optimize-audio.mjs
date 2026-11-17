// Звуки: art-src/audio/<id>.(wav|mp3|ogg|flac) → public/assets/audio/<id>.mp3
// Выравнивает громкость (loudnorm), обрезает тишину по краям у коротких звуков (sfx-*, sting-*),
// фон (amb-*) оставляет как есть, чтобы петля не порвалась. Нужен ffmpeg. Запуск: npm run assets
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC = 'art-src/audio', OUT = 'public/assets/audio';
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { console.log('Звук: ffmpeg не найден, пропускаю'); process.exit(0); }
let files = [];
try { files = (await readdir(SRC)).filter(f => /\.(wav|mp3|ogg|flac)$/i.test(f)); } catch { /* папки ещё нет */ }
await mkdir(OUT, { recursive: true });
let n = 0;
for (const f of files) {
  const id = basename(f, extname(f)), src = join(SRC, f), out = join(OUT, id + '.mp3');
  try { if ((await stat(out)).mtimeMs >= (await stat(src)).mtimeMs) continue; } catch {}
  const amb = id.startsWith('amb-');
  const target = amb ? -26 : id.startsWith('sting-') ? -18 : -16;   // фон тише, удары громче
  const trim = amb ? [] : ['silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'];
  const filters = [...trim, `loudnorm=I=${target}:TP=-1.5:LRA=11`].join(',');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', filters, '-ar', '44100', '-ac', amb ? '2' : '1', '-b:a', amb ? '128k' : '96k', out]);
  console.log(`audio/${f} → ${out} · ${Math.round((await stat(out)).size / 1024)} КБ`);
  n++;
}
// Список готовых файлов: игра запрашивает только их, без лишних 404.
const ready = (await readdir(OUT)).filter(f => f.endsWith('.mp3')).map(f => basename(f, '.mp3')).sort();
await writeFile(join(OUT, 'index.json'), JSON.stringify(ready) + '\n');
console.log(n ? `Звук готов: ${n}` : 'Звук: всё уже актуально');
