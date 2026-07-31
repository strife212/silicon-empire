// Tweens, spins, particles, and per-frame animation updates.
import * as THREE from 'three';
import { updateScreens, updateBlinks } from './helpers.js';

// ---------- easing ----------
export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
export const easeOutBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const easeInOut = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

// ---------- tweens ----------
const tweens = [];
export function tween(fn, dur, ease = easeOutCubic, onDone = null) {
  tweens.push({ fn, dur, ease, onDone, t: 0 });
}
// jump all pending tweens to their end state (used on instant camera snaps)
export function finishTweens() {
  for (const tw of tweens) { tw.fn(1, 1); tw.onDone?.(); }
  tweens.length = 0;
}

// ---------- spinning parts (fans, chandelier) ----------
const spins = [];
export function registerSpins(root) {
  root.traverse((o) => { if (o.userData.spin) spins.push(o); });
}
export function unregisterSpins(root) {
  root.traverse((o) => {
    if (o.userData.spin) {
      const i = spins.indexOf(o);
      if (i >= 0) spins.splice(i, 1);
    }
  });
}

// ---------- particles ----------
let particleScene = null;
const bursts = [];
export function setParticleScene(s) { particleScene = s; }

export function burst(pos, color = 0x4ade80, count = 24, size = 0.05, speed = 1.2) {
  if (!particleScene) return;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const vels = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y + 0.2; positions[i * 3 + 2] = pos.z;
    const a = Math.random() * Math.PI * 2;
    const up = 0.5 + Math.random() * 1.2;
    vels.push(new THREE.Vector3(Math.cos(a) * Math.random() * speed, up * speed, Math.sin(a) * Math.random() * speed));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  particleScene.add(pts);
  bursts.push({ pts, vels, life: 0, max: 0.9 });
}

// ---------- master update ----------
export function updateFX(dt, t) {
  // tweens
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.ease(k), k);
    if (k >= 1) { tweens.splice(i, 1); tw.onDone?.(); }
  }
  // spins
  for (const o of spins) {
    const s = o.userData.spin;
    o.rotation[s.axis] += s.speed * dt;
  }
  // particles
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life += dt;
    const p = b.pts.geometry.attributes.position;
    for (let j = 0; j < b.vels.length; j++) {
      p.array[j * 3] += b.vels[j].x * dt;
      p.array[j * 3 + 1] += b.vels[j].y * dt;
      p.array[j * 3 + 2] += b.vels[j].z * dt;
      b.vels[j].y -= 1.5 * dt;
    }
    p.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 0.95 * (1 - b.life / b.max));
    if (b.life >= b.max) {
      particleScene.remove(b.pts);
      b.pts.geometry.dispose();
      b.pts.material.dispose();
      bursts.splice(i, 1);
    }
  }
  // animated textures + blinking LEDs
  updateScreens(t);
  updateBlinks(t);
}
