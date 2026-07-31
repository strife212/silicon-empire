// Shared geometry/material/canvas-texture helpers for procedural models.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- cached materials ----------
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.75,
    metalness: opts.metal ?? 0.1,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.eInt ?? 1;
  }
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.5; }
  if (opts.side) m.side = opts.side;
  matCache.set(key, m);
  return m;
}

// physical material for translucent plastic (iMac shells)
export function physMat(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.rough ?? 0.35,
    metalness: 0,
    transmission: opts.transmission ?? 0.45,
    thickness: 0.4,
    transparent: true,
    opacity: opts.opacity ?? 0.92,
  });
}

// ---------- cached geometries ----------
const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
export const boxGeo = (w, h, d) => cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const rboxGeo = (w, h, d, r = 0.02, s = 2) =>
  cached(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, s, r));
export const cylGeo = (rt, rb, h, seg = 16) => cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const planeGeo = (w, h) => cached(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
export const sphereGeo = (r, seg = 20) => cached(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.7)));

// ---------- mesh builders (position = center) ----------
export function B(parent, geo, material, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  parent.add(m);
  return m;
}
export function box(parent, w, h, d, material, x = 0, y = 0, z = 0, ry = 0) {
  return B(parent, boxGeo(w, h, d), material, x, y, z, ry);
}
export function rbox(parent, w, h, d, r, material, x = 0, y = 0, z = 0, ry = 0) {
  return B(parent, rboxGeo(w, h, d, r), material, x, y, z, ry);
}
export function cyl(parent, rt, rb, h, material, x = 0, y = 0, z = 0, seg = 16) {
  return B(parent, cylGeo(rt, rb, h, seg), material, x, y, z);
}
// a plane facing +z (screens, decals)
export function plate(parent, w, h, material, x = 0, y = 0, z = 0, ry = 0) {
  const m = B(parent, planeGeo(w, h), material, x, y, z, ry);
  return m;
}

// ---------- animated canvas textures ----------
export const animatedScreens = []; // {tex, canvas, ctx, draw, fps, next}

export function screenTex(w, h, draw, fps = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const entry = { tex, canvas, ctx, draw, fps, next: 0, frame: 0 };
  draw(ctx, w, h, 0);
  tex.needsUpdate = true;
  if (fps > 0) animatedScreens.push(entry);
  return tex;
}

export function screenMat(tex, glow = 1.2) {
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: glow,
    roughness: 0.4,
    metalness: 0,
  });
  return m;
}

export function updateScreens(t) {
  for (const s of animatedScreens) {
    if (t >= s.next) {
      s.next = t + 1 / s.fps;
      s.frame++;
      s.draw(s.ctx, s.canvas.width, s.canvas.height, s.frame);
      s.tex.needsUpdate = true;
    }
  }
}

// ---------- blink / pulse material registry ----------
export const blinkMats = []; // {mat, speed, phase, min, max, wave}
export function blinkMat(color, { speed = 4, min = 0.4, max = 1.6, phase = Math.random() * 6.28 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: max, roughness: 0.5 });
  blinkMats.push({ mat: m, speed, phase, min, max });
  return m;
}
export function updateBlinks(t) {
  for (const b of blinkMats) {
    b.mat.emissiveIntensity = b.min + (b.max - b.min) * (0.5 + 0.5 * Math.sin(t * b.speed + b.phase));
  }
}
