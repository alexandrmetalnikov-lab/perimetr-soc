// Звук игры. Файлы лежат в public/assets/audio/<id>.mp3 (исходники — art-src/audio, список — docs/audio.md).
// Пока файла нет, играет синтезированная заглушка или тишина: файлы можно добавлять по одному.
let ctx: AudioContext | null = null;
let enabled = true;
let master: GainNode | null = null;   // шина игровых звуков
let ambBus: GainNode | null = null;   // шина фона
const vol = { amb: 0.7, sfx: 0.8 };   // ползунки громкости, 0…1

export type Sfx =
  | 'sfx-stamp-1' | 'sfx-stamp-2' | 'sfx-stamp-3' | 'sfx-paper-in' | 'sfx-paper-out' | 'sfx-binder'
  | 'sfx-keys' | 'sfx-click' | 'sfx-ring' | 'sfx-pickup' | 'sfx-dial' | 'sfx-alarm' | 'sfx-warn' | 'sfx-sign'
  | 'amb-night' | 'sting-morning' | 'sting-evening' | 'sting-final';

/** Громкость каждого звука поверх выравнивания в optimize-audio. */
const VOL: Record<Sfx, number> = {
  'sfx-stamp-1': 0.9, 'sfx-stamp-2': 0.9, 'sfx-stamp-3': 0.9, 'sfx-paper-in': 0.5, 'sfx-paper-out': 0.5,
  'sfx-binder': 0.55, 'sfx-keys': 0.4, 'sfx-click': 0.3, 'sfx-ring': 0.55, 'sfx-pickup': 0.6, 'sfx-dial': 0.5,
  'sfx-alarm': 0.45, 'sfx-warn': 0.5, 'sfx-sign': 0.55, 'amb-night': 0.35, 'sting-morning': 0.6,
  'sting-evening': 0.6, 'sting-final': 0.65,
};
const ALL = Object.keys(VOL) as Sfx[];
const bufs = new Map<Sfx, AudioBuffer | null>();
const base = `${import.meta.env.BASE_URL}assets/audio/`;
let wantAmb = false;

function ac(): AudioContext | null {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
    master = ctx.createGain(); master.gain.value = vol.sfx; master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = vol.amb; ambBus.connect(ctx.destination);
    void fetch(base + 'index.json').then(r => (r.ok ? r.json() : [])).then((ids: string[]) => {
      for (const id of ALL) if (ids.includes(id)) void load(id);
    }).catch(() => { /* звуков ещё нет */ });
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
async function load(id: Sfx) {
  if (bufs.has(id) || !ctx) return;
  bufs.set(id, null);
  try {
    const r = await fetch(base + id + '.mp3');
    if (!r.ok) return;
    bufs.set(id, await ctx.decodeAudioData(await r.arrayBuffer()));
    if (id === 'amb-night' && wantAmb) startAmbient();
  } catch { /* файла нет или не декодируется — останется заглушка */ }
}
/** Сыграть файл. false — файла нет, вызывающий решает, нужна ли заглушка. */
function play(id: Sfx, opt: { vol?: number; rate?: number; loop?: boolean } = {}): AudioBufferSourceNode | false {
  const a = ac(); if (!a || !master) return false;
  const b = bufs.get(id); if (!b) return false;
  if (!enabled) return false;
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = b; src.loop = !!opt.loop; src.playbackRate.value = opt.rate ?? 1;
  g.gain.value = (opt.vol ?? 1) * VOL[id];
  src.connect(g).connect(master); src.start();
  return src;
}
/** Первый жест пользователя: создать контекст и начать загрузку файлов. */
export function unlockAudio() { ac(); }

export function setSound(on: boolean) { enabled = on; if (!on) { stopRing(); stopAmbient(); } }
export const soundOn = () => enabled;
/** Громкость фона или игровых звуков, 0…1. */
export function setVolume(kind: 'amb' | 'sfx', v: number) {
  vol[kind] = Math.max(0, Math.min(1, v));
  const bus = kind === 'amb' ? ambBus : master;
  if (bus && ctx) bus.gain.setTargetAtTime(vol[kind], ctx.currentTime, 0.05);
}

// ---------- события игры ----------
export function stampThunk() {
  const variant = (['sfx-stamp-1', 'sfx-stamp-2', 'sfx-stamp-3'] as Sfx[]).filter(id => bufs.get(id));
  if (variant.length && play(variant[Math.floor(Math.random() * variant.length)], { rate: 0.96 + Math.random() * 0.08 })) return;
  synthThunk();
}
export function uiClick() { if (!play('sfx-click')) synthClick(); }
export const paperIn = () => { play('sfx-paper-in'); };
export const paperOut = () => { play('sfx-paper-out'); };
export const binder = () => { if (!play('sfx-binder')) synthClick(); };
export const keys = () => { if (!play('sfx-keys')) synthClick(); };
export const pickup = () => { if (!play('sfx-pickup')) synthClick(); };
export const dial = () => { if (!play('sfx-dial')) synthClick(); };
export const warn = () => { play('sfx-warn'); };
export const sign = () => { play('sfx-sign'); };
export const sting = (id: 'sting-morning' | 'sting-evening' | 'sting-final') => { play(id); };

export function alarm() { if (!play('sfx-alarm')) synthAlarm(); }

// Пока звонок активен, повторяем одну трель. После загрузки файла следующая трель уже будет из него.
let stopRinging: (() => void) | null = null;
export function startRing() {
  if (!enabled || stopRinging) return;
  const a = ac();
  if (!a) return;
  let stopBurst = ringBurst(a);
  const timer = setInterval(() => {
    stopBurst();
    stopBurst = ringBurst(a);
  }, 3000);
  stopRinging = () => { clearInterval(timer); stopBurst(); };
}

function ringBurst(a: AudioContext): () => void {
  const src = play('sfx-ring');
  return src ? () => src.stop() : synthRing(a);
}

export function stopRing() {
  stopRinging?.();
  stopRinging = null;
}

// Фон смены: гул серверной и метель, по кругу. Плавно появляется и уходит.
let amb: { src: AudioBufferSourceNode; g: GainNode } | null = null;
function startAmbient() {
  const a = ac(); if (!a || !ambBus || !enabled || amb) return;
  const b = bufs.get('amb-night');
  if (!b) return; // догрузится — load() запустит сам
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = b; src.loop = true; g.gain.value = 0;
  // MP3 добавляет по краям доли секунды тишины (задержка кодека) — петлю ставим по реальному звуку, без провала на стыке.
  const [from, to] = edges(b); src.loopStart = from; src.loopEnd = to;
  g.gain.linearRampToValueAtTime(VOL['amb-night'], a.currentTime + 2);
  src.connect(g).connect(ambBus); src.start();
  amb = { src, g };
}
/** Где в буфере начинается и кончается звук, в секундах (ищем только в первых и последних 0.2 с). */
function edges(b: AudioBuffer): [number, number] {
  const ch = b.getChannelData(0), lim = Math.min(ch.length, Math.floor(b.sampleRate * 0.2)), eps = 1e-4;
  let i = 0; while (i < lim && Math.abs(ch[i]) < eps) i++;
  let j = ch.length - 1; while (j > ch.length - lim && Math.abs(ch[j]) < eps) j--;
  return [i / b.sampleRate, (j + 1) / b.sampleRate];
}
export function ambient(on: boolean) { wantAmb = on; if (on) startAmbient(); else stopAmbient(); }
function stopAmbient() {
  if (!amb || !ctx) { amb = null; return; }
  const { src, g } = amb; amb = null;
  g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  setTimeout(() => { try { src.stop(); } catch { /* уже */ } }, 900);
}

// ---------- синтезированные заглушки ----------
function synthThunk() {
  const a = ac(); if (!a || !master || !enabled) return; const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.3);
  const buf = a.createBuffer(1, a.sampleRate * 0.08, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
  const n = a.createBufferSource(), f = a.createBiquadFilter(), ng = a.createGain();
  n.buffer = buf; f.type = 'lowpass'; f.frequency.value = 1800; ng.gain.value = 0.5;
  n.connect(f).connect(ng).connect(master); n.start(t);
}
function synthClick() {
  const a = ac(); if (!a || !master || !enabled) return; const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = 900;
  g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.05);
}
function synthRing(a: AudioContext): () => void {
  const gain = a.createGain(); gain.gain.value = 0; gain.connect(master!);
  const t = a.currentTime;
  gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
  gain.gain.setValueAtTime(0.08, t + 1.5); gain.gain.linearRampToValueAtTime(0, t + 1.55);
  const osc = [440, 480].map(fq => {
    const o = a.createOscillator();
    o.frequency.value = fq; o.connect(gain); o.start(t); o.stop(t + 1.55);
    return o;
  });
  return () => osc.forEach(o => o.stop());
}
function synthAlarm() {
  const a = ac(); if (!a || !master || !enabled) return; const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth';
  [0, 0.22, 0.44].forEach((d, i) => o.frequency.setValueAtTime(i % 2 ? 620 : 880, t + d));
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02);
  g.gain.setValueAtTime(0.05, t + 0.62); g.gain.linearRampToValueAtTime(0, t + 0.7);
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
  o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.72);
}
