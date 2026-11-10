// Временные синтезированные звуки. Заменяются на сгенерированные файлы в public/assets/audio.
let ctx: AudioContext | null = null;
let enabled = true;
let ring: { osc: OscillatorNode[]; gain: GainNode } | null = null;

function ac(): AudioContext | null {
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSound(on: boolean) { enabled = on; if (!on) stopRing(); }
export const soundOn = () => enabled;

export function stampThunk() {
  const a = ac(); if (!a || !enabled) return; const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.3);
  const buf = a.createBuffer(1, a.sampleRate * 0.08, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
  const n = a.createBufferSource(), f = a.createBiquadFilter(), ng = a.createGain();
  n.buffer = buf; f.type = 'lowpass'; f.frequency.value = 1800; ng.gain.value = 0.5;
  n.connect(f).connect(ng).connect(a.destination); n.start(t);
}

export function uiClick() {
  const a = ac(); if (!a || !enabled) return; const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = 900;
  g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.05);
}

export function startRing() {
  const a = ac(); if (!a || !enabled) return; stopRing();
  const gain = a.createGain(); gain.gain.value = 0; gain.connect(a.destination);
  const osc = [440, 480].map(fq => { const o = a.createOscillator(); o.frequency.value = fq; o.connect(gain); o.start(); return o; });
  const t = a.currentTime;
  for (let k = 0; k < 6; k++) {
    const s = t + k * 3;
    gain.gain.setValueAtTime(0, s); gain.gain.linearRampToValueAtTime(0.08, s + 0.02);
    gain.gain.setValueAtTime(0.08, s + 1.5); gain.gain.linearRampToValueAtTime(0, s + 1.55);
  }
  ring = { osc, gain };
}

export function stopRing() {
  if (!ring) return;
  ring.osc.forEach(o => { try { o.stop(); } catch { /* уже остановлен */ } });
  ring = null;
}

/** Короткая двухтональная тревога, когда на стол приходит объект с высокой важностью. */
export function alarm() {
  const a = ac(); if (!a || !enabled) return; const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth';
  [0, 0.22, 0.44].forEach((d, i) => o.frequency.setValueAtTime(i % 2 ? 620 : 880, t + d));
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02);
  g.gain.setValueAtTime(0.05, t + 0.62); g.gain.linearRampToValueAtTime(0, t + 0.7);
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
  o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t + 0.72);
}
