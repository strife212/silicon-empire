// Tiny WebAudio synth — no assets. All sfx generated from oscillators/noise.
import { G, events } from './state.js';
import { TIERS } from './balance.js';

let ctx = null;
let master = null;

function ensureCtx() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
  } catch (e) { return false; }
  return true;
}

function vol() { return (G.settings.vol ?? 0.5) * 0.6; }

function blip(freq = 440, dur = 0.08, type = 'square', gain = 0.15) {
  if (!ensureCtx() || vol() <= 0) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain * vol(), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur);
}

function sweep(f0, f1, dur = 0.3, type = 'sine', gain = 0.2) {
  if (!ensureCtx() || vol() <= 0) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(gain * vol(), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur);
}

function thunk() { sweep(180, 60, 0.12, 'triangle', 0.3); }

function noiseBurst(dur = 0.2, gain = 0.1) {
  if (!ensureCtx() || vol() <= 0) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain * vol();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1200;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

function eraSwell() {
  sweep(60, 220, 1.2, 'sawtooth', 0.12);
  setTimeout(() => sweep(120, 440, 0.9, 'sine', 0.1), 200);
}

// the hum of the Wired: mains-frequency drone + faint detune beat
let ambientGain = null;
function startAmbient() {
  if (ambientGain || !ensureCtx()) return;
  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0;
  ambientGain.connect(master);
  const o1 = ctx.createOscillator();
  o1.type = 'triangle'; o1.frequency.value = 50;
  const o2 = ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = 100.7; // slight detune against the 2nd harmonic → slow beat
  const g2 = ctx.createGain(); g2.gain.value = 0.35;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 220;
  o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(ambientGain);
  o1.start(); o2.start();
  setInterval(() => {
    if (ambientGain) ambientGain.gain.setTargetAtTime(vol() * 0.05, ctx.currentTime, 0.5);
  }, 800);
}

export function initAudio() {
  // browsers require a user gesture before audio starts
  const unlock = () => { ensureCtx(); ctx?.resume?.(); startAmbient(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  events.on('click', () => blip(520 + Math.random() * 120, 0.05, 'square', 0.08));
  events.on('buy', ({ tier }) => {
    const era = TIERS[tier].era;
    if (era <= 1) thunk();                                  // floppy chunk
    else if (era <= 3) blip(320 + tier * 40, 0.1, 'triangle', 0.18);
    else if (era <= 4) { blip(200, 0.06, 'square', 0.12); noiseBurst(0.08, 0.06); } // rack click
    else { sweep(50, 90, 0.7, 'sine', 0.25); }              // bass hum swell
  });
  events.on('upgrade', () => sweep(400, 900, 0.18, 'sine', 0.12));
  events.on('research', () => { blip(660, 0.08, 'sine', 0.12); setTimeout(() => blip(990, 0.1, 'sine', 0.1), 90); });
  events.on('era', () => eraSwell());
  events.on('prestige', () => { sweep(880, 110, 1.6, 'sine', 0.2); setTimeout(() => noiseBurst(0.5, 0.08), 300); });
  events.on('incident', () => { noiseBurst(0.3, 0.2); sweep(300, 80, 0.4, 'sawtooth', 0.15); });
  events.on('shard', () => { blip(1200, 0.12, 'sine', 0.1); setTimeout(() => blip(1600, 0.15, 'sine', 0.08), 100); });
  events.on('jobClaimed', () => { blip(700, 0.07, 'square', 0.1); setTimeout(() => blip(1050, 0.09, 'square', 0.08), 80); });
}
