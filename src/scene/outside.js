// The world outside the rooms: one zone per era, revealed with its room.
// Zones line up along x and share a continuous road at z = ROAD_Z.
import * as THREE from 'three';
import { ROOMS } from './rooms.js';
import { mat, box, cyl, plate, B, screenTex, screenMat, blinkMat, sphereGeo } from './helpers.js';

const ROAD_Z = 12;
const ROAD_W = 3.4;
const GROUND_DEPTH = 100; // z from -50 to +50

const rnd = (i) => { const x = Math.sin(i * 91.7 + 47.3) * 43758.5453; return x - Math.floor(x); };

// ---------- lit-window textures (shared, occasional flicker) ----------
function windowTex(cols, rows, palette) {
  return screenTex(cols * 8, rows * 8, (c, w, h, f) => {
    c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = rnd(x * 13 + y * 7 + Math.floor(f / 3)) > 0.55;
        c.fillStyle = lit ? palette[Math.floor(rnd(x + y * 31) * palette.length)] : '#0a0d12';
        c.fillRect(x * 8 + 1, y * 8 + 1, 5, 5);
      }
    }
  }, 0.4);
}
const warmWin = windowTex(6, 12, ['#ffd9a0', '#ffca70', '#e8e0c8']);
const coolWin = windowTex(6, 14, ['#cfe4ff', '#e8f0f8', '#9fc4e8']);
const techWin = windowTex(8, 20, ['#38e0ff', '#1c6dff', '#9fd8ff', '#cfe4ff']);

// ---------- small prop builders ----------
function tree(g, x, z, s = 1) {
  cyl(g, 0.09 * s, 0.13 * s, 0.6 * s, mat(0x3a2c1c, { rough: 0.9 }), x, 0.3 * s, z, 6);
  B(g, new THREE.ConeGeometry(0.75 * s, 1.9 * s, 7), mat(0x142e1a, { rough: 0.95 }), x, 1.4 * s, z);
}

function house(g, x, z, ry, tint) {
  const grp = new THREE.Group();
  box(grp, 2.6, 1.7, 2.2, mat(tint, { rough: 0.85 }), 0, 0.85, 0);
  const roof = B(grp, new THREE.ConeGeometry(2.05, 1.1, 4), mat(0x3a3028, { rough: 0.9 }), 0, 2.25, 0);
  roof.rotation.y = Math.PI / 4;
  plate(grp, 0.5, 0.4, mat(0xffd9a0, { emissive: 0xffca70, eInt: 0.7 }), -0.6, 0.9, 1.11);
  plate(grp, 0.5, 0.4, mat(0xffd9a0, { emissive: 0xffca70, eInt: 0.5 }), 0.7, 0.9, 1.11);
  grp.position.set(x, 0, z); grp.rotation.y = ry;
  g.add(grp);
}

function tower(g, x, z, w, h, d, tex, glow = 1.0) {
  box(g, w, h, d, mat(0x0d1015, { rough: 0.6, metal: 0.3 }), x, h / 2, z);
  plate(g, w * 0.92, h * 0.94, screenMat(tex, glow), x, h / 2, z + d / 2 + 0.02);
  plate(g, d * 0.92, h * 0.94, screenMat(tex, glow), x - w / 2 - 0.02, h / 2, z, Math.PI / 2);
}

function streetlamp(g, x, z) {
  cyl(g, 0.05, 0.07, 2.8, mat(0x2a2f36, { rough: 0.5, metal: 0.6 }), x, 1.4, z, 6);
  box(g, 0.5, 0.08, 0.14, mat(0x2a2f36), x + 0.2, 2.82, z);
  box(g, 0.3, 0.05, 0.12, mat(0xffe6b0, { emissive: 0xffd080, eInt: 1.2 }), x + 0.3, 2.76, z);
}

function mast(g, x, z, h) {
  cyl(g, 0.06, 0.12, h, mat(0x2a2f36, { rough: 0.5, metal: 0.6 }), x, h / 2, z, 6);
  box(g, 0.5, 0.04, 0.04, mat(0x2a2f36), x, h * 0.75, z);
  B(g, sphereGeo(0.09, 8), blinkMat(0xff2233, { speed: 1.6, min: 0.15, max: 2.2 }), x, h + 0.1, z);
}

function spire(g, x, z, w, h, seamColor, phase) {
  box(g, w, h, w, mat(0x0a0d12, { rough: 0.45, metal: 0.4 }), x, h / 2, z);
  box(g, 0.07, h * 0.92, 0.07, blinkMat(seamColor, { speed: 0.9, min: 0.5, max: 2.2, phase }), x + w / 2, h / 2, z + w / 2);
  box(g, 0.07, h * 0.92, 0.07, blinkMat(seamColor, { speed: 0.9, min: 0.5, max: 2.2, phase: phase + 1 }), x - w / 2, h / 2, z - w / 2);
  box(g, w * 0.6, 0.1, w * 0.6, blinkMat(seamColor, { speed: 1.4, min: 0.4, max: 1.8, phase }), x, h + 0.05, z);
}

// ---------- per-zone road segment ----------
function road(g, x0, x1, surface, markings) {
  const wSeg = x1 - x0, cx = (x0 + x1) / 2;
  box(g, wSeg, 0.02, ROAD_W, mat(surface, { rough: 0.95 }), cx, -0.03, ROAD_Z);
  if (markings === 'dashes') {
    const dashMat = mat(0xb8b8a8, { rough: 0.8, emissive: 0x555548, eInt: 0.15 });
    for (let x = x0 + 1; x < x1 - 1; x += 3) box(g, 1.2, 0.005, 0.09, dashMat, x + 0.6, -0.015, ROAD_Z);
  } else if (markings === 'glow') {
    box(g, wSeg, 0.008, 0.06, blinkMat(0x38e0ff, { speed: 0.6, min: 0.4, max: 1.1 }), cx, -0.015, ROAD_Z - ROAD_W / 2 + 0.1);
    box(g, wSeg, 0.008, 0.06, blinkMat(0x38e0ff, { speed: 0.6, min: 0.4, max: 1.1, phase: 2 }), cx, -0.015, ROAD_Z + ROAD_W / 2 - 0.1);
  }
}

function ground(g, x0, x1, color) {
  const p = plate(g, x1 - x0, GROUND_DEPTH, mat(color, { rough: 0.97 }), (x0 + x1) / 2, -0.06, 0);
  p.rotation.x = -Math.PI / 2;
}

// ---------- zone builders (era 0..6) ----------
const zoneBuilders = [
  // 0 — rural field: grass, dirt road, trees, fence posts
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x182615);
    road(g, x0, x1, 0x2e2a22, null);
    const back = -def.d / 2 - 3;
    for (let i = 0; i < 7; i++) tree(g, x0 + 1.5 + rnd(i) * (x1 - x0 - 3), back - 2 - rnd(i + 9) * 14, 0.8 + rnd(i + 4));
    for (let i = 0; i < 3; i++) tree(g, x0 + 1 + rnd(i + 20) * (x1 - x0 - 2), def.d / 2 + 3.5 + rnd(i + 30) * 3, 0.7 + rnd(i + 40) * 0.6);
    const post = mat(0x4a3a26, { rough: 0.9 });
    for (let x = x0 + 1; x < x1; x += 2.2) box(g, 0.08, 0.7, 0.08, post, x, 0.35, back - 0.5);
  },
  // 1 — suburbs: lawns, asphalt road, houses, trees
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x1b2a18);
    road(g, x0, x1, 0x232527, 'dashes');
    const back = -def.d / 2 - 5;
    house(g, x0 + 2.5, back - 2, 0.15, 0x8a7a64);
    house(g, (x0 + x1) / 2, back - 4, -0.1, 0x7a6a58);
    house(g, x1 - 2.5, back - 1.5, 0.3, 0x94846e);
    for (let i = 0; i < 4; i++) tree(g, x0 + 1 + rnd(i + 50) * (x1 - x0 - 2), back - 8 - rnd(i + 60) * 6, 0.9 + rnd(i + 70) * 0.5);
    streetlamp(g, (x0 + x1) / 2, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 2 — office town: pavement, small office blocks, streetlamps
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x22252a);
    road(g, x0, x1, 0x232527, 'dashes');
    const back = -def.d / 2 - 4;
    tower(g, x0 + 3, back - 4, 4, 7, 4, coolWin, 0.8);
    tower(g, (x0 + x1) / 2 + 1, back - 7, 5, 10, 5, coolWin, 0.8);
    tower(g, x1 - 3.5, back - 3, 3.5, 5.5, 3.5, warmWin, 0.8);
    streetlamp(g, x0 + 3, ROAD_Z - ROAD_W / 2 - 0.6);
    streetlamp(g, x1 - 3, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 3 — city edge: midrises with mixed windows and a neon accent
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x1d1f23);
    road(g, x0, x1, 0x232527, 'dashes');
    const back = -def.d / 2 - 4;
    tower(g, x0 + 3, back - 5, 4.5, 12, 4.5, warmWin, 0.9);
    tower(g, x0 + 9, back - 9, 5, 15, 5, coolWin, 0.9);
    tower(g, x1 - 8, back - 6, 4, 10, 4, warmWin, 0.9);
    tower(g, x1 - 2.5, back - 3, 3.5, 8, 3.5, coolWin, 0.9);
    // neon strip on a facade
    box(g, 0.12, 6, 0.12, blinkMat(0xff2bd6, { speed: 1.1, min: 0.5, max: 2.0 }), x0 + 3 + 2.3, 6, back - 5 + 2.3);
    streetlamp(g, (x0 + x1) / 2, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 4 — industrial: warehouses, stacks, power masts
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x1a1d20);
    road(g, x0, x1, 0x26282a, 'dashes');
    const back = -def.d / 2 - 4;
    box(g, 9, 3.4, 6, mat(0x2e3338, { rough: 0.8, metal: 0.2 }), x0 + 6, 1.7, back - 5);
    box(g, 9, 0.4, 6.4, mat(0x23272b, { rough: 0.8 }), x0 + 6, 3.6, back - 5);
    box(g, 7, 2.8, 5, mat(0x33383e, { rough: 0.8, metal: 0.2 }), x1 - 5, 1.4, back - 8);
    cyl(g, 0.5, 0.7, 6, mat(0x3a4046, { rough: 0.7, metal: 0.3 }), x0 + 2.5, 3, back - 9, 10);
    cyl(g, 0.4, 0.55, 4.5, mat(0x3a4046, { rough: 0.7, metal: 0.3 }), x0 + 4.2, 2.25, back - 10, 10);
    mast(g, (x0 + x1) / 2, back - 13, 7);
    mast(g, x1 - 2, back - 11, 5.5);
  },
  // 5 — tech campus: glass towers, glowing ground seams, antennas
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x121519);
    road(g, x0, x1, 0x1c1f24, 'glow');
    const back = -def.d / 2 - 5;
    tower(g, x0 + 5, back - 6, 5, 16, 5, techWin, 1.1);
    tower(g, x0 + 14, back - 10, 6, 21, 6, techWin, 1.1);
    tower(g, x1 - 10, back - 7, 5, 13, 5, coolWin, 1.0);
    tower(g, x1 - 3, back - 4, 4, 18, 4, techWin, 1.1);
    mast(g, x0 + 14, back - 10, 24.5);
    // glowing campus seams
    for (let i = 0; i < 2; i++)
      box(g, x1 - x0 - 4, 0.008, 0.05, blinkMat(0x1c6dff, { speed: 0.5, min: 0.3, max: 0.9, phase: i * 2 }), (x0 + x1) / 2, -0.02, -def.d / 2 - 2 - i * 4);
  },
  // 6 — future city: neon spires, a mega-tower, an orbiting ring
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x0e1116);
    road(g, x0, x1, 0x171a20, 'glow');
    const back = -def.d / 2 - 5;
    spire(g, x0 + 4, back - 6, 1.6, 19, 0x38e0ff, 0);
    spire(g, x0 + 9, back - 12, 2.2, 26, 0xb18aff, 1.2);
    spire(g, x1 - 9, back - 8, 1.8, 22, 0xff2bd6, 2.1);
    spire(g, x1 - 3.5, back - 4, 1.3, 15, 0x38e0ff, 3.0);
    // mega-tower with orbiting ring
    const mx = (x0 + x1) / 2, mz = back - 16;
    spire(g, mx, mz, 3, 32, 0x38e0ff, 0.6);
    const ring = B(g, new THREE.TorusGeometry(3.4, 0.12, 8, 40), blinkMat(0x38e0ff, { speed: 0.7, min: 0.6, max: 1.6 }), mx, 24, mz);
    ring.rotation.x = Math.PI / 2;
    ring.userData.spin = { axis: 'z', speed: 0.15 };
    // circuit lines on the ground
    for (let i = 0; i < 3; i++) {
      const zz = def.d / 2 + 4 + i * 2.5;
      box(g, x1 - x0 - 6, 0.008, 0.04, blinkMat([0x38e0ff, 0xb18aff, 0xff2bd6][i], { speed: 0.4 + i * 0.2, min: 0.3, max: 1.0, phase: i }), (x0 + x1) / 2, -0.02, -zz - def.d);
    }
  },
];

// zone x-boundaries: midpoints between room centers, padded at the ends
function zoneBounds() {
  const xs = ROOMS.map((r) => r.x);
  const bounds = [];
  for (let i = 0; i < xs.length; i++) {
    const x0 = i === 0 ? xs[0] - 20 : (xs[i - 1] + xs[i]) / 2;
    const x1 = i === xs.length - 1 ? xs[i] + 22 : (xs[i] + xs[i + 1]) / 2;
    bounds.push([x0, x1]);
  }
  return bounds;
}

// Always-visible distant layer: base ground, hills to the west,
// a skyline that grows taller toward the future end of the strip.
export function buildBackdrop(scene) {
  const g = new THREE.Group();
  // base ground under everything — no more void below the horizon
  const base = plate(g, 800, 520, mat(0x0a0d10, { rough: 1 }), 55, -0.12, 0);
  base.rotation.x = -Math.PI / 2;
  // western hills
  for (let i = 0; i < 5; i++) {
    const r = 26 + rnd(i) * 22, h = 9 + rnd(i + 3) * 11;
    const hill = B(g, new THREE.ConeGeometry(r, h, 6), mat(0x0b130e, { rough: 1 }), -95 + i * 38 + rnd(i + 7) * 10, h / 2 - 1.5, -85 - rnd(i + 11) * 25);
    hill.rotation.y = rnd(i + 5) * Math.PI;
  }
  // distant skyline: taller and denser toward the east (future) end
  for (let i = 0; i < 14; i++) {
    const x = 8 + i * 12 + rnd(i + 20) * 6;
    const grow = x / 160;
    const w = 4 + rnd(i + 30) * 3.5;
    const h = 5 + grow * 20 + rnd(i + 40) * 9;
    const z = -62 - rnd(i + 50) * 28;
    box(g, w, h, w, mat(0x07090c, { rough: 0.9 }), x, h / 2, z);
    plate(g, w * 0.9, h * 0.9, screenMat(coolWin, 0.3), x, h / 2, z + w / 2 + 0.02);
  }
  // a few mega-silhouettes past the vault
  for (let i = 0; i < 3; i++) {
    const x = 132 + i * 16, h = 26 + rnd(i + 60) * 14;
    box(g, 6, h, 6, mat(0x07090c, { rough: 0.9 }), x, h / 2, -70 - rnd(i + 70) * 15);
    box(g, 0.14, h * 0.9, 0.14, blinkMat(0x38e0ff, { speed: 0.5, min: 0.3, max: 1.2, phase: i }), x + 3, h / 2, -67 - rnd(i + 70) * 15);
  }
  // aircraft-warning blinks on two distant towers
  B(g, sphereGeo(0.3, 8), blinkMat(0xff2233, { speed: 1.1, min: 0.1, max: 2.0 }), 92, 24, -75);
  B(g, sphereGeo(0.3, 8), blinkMat(0xff2233, { speed: 1.3, min: 0.1, max: 2.0, phase: 2 }), 148, 38, -78);
  scene.add(g);
  return g;
}

export function buildOutsideZones(scene) {
  const bounds = zoneBounds();
  return ROOMS.map((def, era) => {
    const g = new THREE.Group();
    zoneBuilders[era](g, def, bounds[era][0], bounds[era][1]);
    g.visible = false;
    scene.add(g);
    return g;
  });
}
