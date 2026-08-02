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
    c.fillStyle = '#070a0f'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = rnd(x * 13 + y * 7 + Math.floor(f / 3)) > 0.5;
        c.fillStyle = lit ? palette[Math.floor(rnd(x + y * 31) * palette.length)] : '#0d1118';
        c.fillRect(x * 8 + 1, y * 8 + 1, 5, 5);
      }
    }
  }, 0.4);
}
const warmWin = windowTex(6, 12, ['#ffd9a0', '#ffca70', '#e8e0c8']);
const coolWin = windowTex(6, 14, ['#cfe4ff', '#e8f0f8', '#9fc4e8']);
const techWin = windowTex(8, 20, ['#38e0ff', '#1c6dff', '#9fd8ff', '#cfe4ff']);

// ---------- additive light pools: cheap "lit at night" ground glow ----------
let poolTexture = null;
function getPoolTex() {
  if (!poolTexture) {
    poolTexture = screenTex(64, 64, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64);
      const grad = c.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.28)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = grad; c.fillRect(0, 0, 64, 64);
    }, 0);
  }
  return poolTexture;
}
function lightPool(g, x, z, r, color, opacity = 0.5) {
  const m = new THREE.MeshBasicMaterial({
    map: getPoolTex(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = plate(g, r * 2, r * 2, m, x, 0.02, z);
  p.rotation.x = -Math.PI / 2;
  return p;
}

// ---------- small prop builders ----------
function tree(g, x, z, s = 1) {
  cyl(g, 0.09 * s, 0.13 * s, 0.6 * s, mat(0x4a3823, { rough: 0.9 }), x, 0.3 * s, z, 6);
  B(g, new THREE.ConeGeometry(0.75 * s, 1.9 * s, 7), mat(0x1f4527, { rough: 0.95, emissive: 0x1f4527, eInt: 0.12 }), x, 1.4 * s, z);
}

function house(g, x, z, ry, tint) {
  const grp = new THREE.Group();
  box(grp, 2.6, 1.7, 2.2, mat(tint, { rough: 0.85 }), 0, 0.85, 0);
  const roof = B(grp, new THREE.ConeGeometry(2.05, 1.1, 4), mat(0x4a3e33, { rough: 0.9 }), 0, 2.25, 0);
  roof.rotation.y = Math.PI / 4;
  plate(grp, 0.5, 0.4, mat(0xffd9a0, { emissive: 0xffca70, eInt: 0.9 }), -0.6, 0.9, 1.11);
  plate(grp, 0.5, 0.4, mat(0xffd9a0, { emissive: 0xffca70, eInt: 0.7 }), 0.7, 0.9, 1.11);
  grp.position.set(x, 0, z); grp.rotation.y = ry;
  g.add(grp);
  // porch glow
  const fx = x + Math.sin(ry) * 1.6, fz = z + Math.cos(ry) * 1.6;
  lightPool(g, fx, fz, 1.5, 0xffca70, 0.35);
}

function tower(g, x, z, w, h, d, tex, glow = 1.0, poolColor = null) {
  box(g, w, h, d, mat(0x191e26, { rough: 0.6, metal: 0.3, emissive: 0x191e26, eInt: 0.12 }), x, h / 2, z);
  plate(g, w * 0.92, h * 0.94, screenMat(tex, glow), x, h / 2, z + d / 2 + 0.02);
  plate(g, d * 0.92, h * 0.94, screenMat(tex, glow), x - w / 2 - 0.02, h / 2, z, Math.PI / 2);
  if (poolColor) lightPool(g, x, z + d / 2 + 1.2, w * 0.8, poolColor, 0.3);
}

function streetlamp(g, x, z) {
  cyl(g, 0.05, 0.07, 2.8, mat(0x3a4048, { rough: 0.5, metal: 0.6 }), x, 1.4, z, 6);
  box(g, 0.5, 0.08, 0.14, mat(0x3a4048), x + 0.2, 2.82, z);
  box(g, 0.3, 0.05, 0.12, mat(0xffe6b0, { emissive: 0xffd080, eInt: 1.5 }), x + 0.3, 2.76, z);
  lightPool(g, x + 0.3, z, 2.4, 0xffd080, 0.5);
}

function mast(g, x, z, h) {
  cyl(g, 0.06, 0.12, h, mat(0x3a4048, { rough: 0.5, metal: 0.6 }), x, h / 2, z, 6);
  box(g, 0.5, 0.04, 0.04, mat(0x3a4048), x, h * 0.75, z);
  B(g, sphereGeo(0.09, 8), blinkMat(0xff2233, { speed: 1.6, min: 0.15, max: 2.2 }), x, h + 0.1, z);
}

function spire(g, x, z, w, h, seamColor, phase) {
  box(g, w, h, w, mat(0x171c24, { rough: 0.45, metal: 0.4, emissive: 0x171c24, eInt: 0.14 }), x, h / 2, z);
  box(g, 0.07, h * 0.92, 0.07, blinkMat(seamColor, { speed: 0.9, min: 0.5, max: 2.2, phase }), x + w / 2, h / 2, z + w / 2);
  box(g, 0.07, h * 0.92, 0.07, blinkMat(seamColor, { speed: 0.9, min: 0.5, max: 2.2, phase: phase + 1 }), x - w / 2, h / 2, z - w / 2);
  box(g, w * 0.6, 0.1, w * 0.6, blinkMat(seamColor, { speed: 1.4, min: 0.4, max: 1.8, phase }), x, h + 0.05, z);
  lightPool(g, x, z, w * 2.4, seamColor, 0.35);
}

// ---------- per-zone road segment ----------
function road(g, x0, x1, surface, markings) {
  const wSeg = x1 - x0, cx = (x0 + x1) / 2;
  box(g, wSeg, 0.02, ROAD_W, mat(surface, { rough: 0.95, emissive: surface, eInt: 0.18 }), cx, -0.03, ROAD_Z);
  if (markings === 'dashes') {
    const dashMat = mat(0xc8c8b8, { rough: 0.8, emissive: 0x686858, eInt: 0.25 });
    for (let x = x0 + 1; x < x1 - 1; x += 3) box(g, 1.2, 0.005, 0.09, dashMat, x + 0.6, -0.015, ROAD_Z);
  } else if (markings === 'glow') {
    box(g, wSeg, 0.008, 0.06, blinkMat(0x38e0ff, { speed: 0.6, min: 0.4, max: 1.1 }), cx, -0.015, ROAD_Z - ROAD_W / 2 + 0.1);
    box(g, wSeg, 0.008, 0.06, blinkMat(0x38e0ff, { speed: 0.6, min: 0.4, max: 1.1, phase: 2 }), cx, -0.015, ROAD_Z + ROAD_W / 2 - 0.1);
  }
}

function ground(g, x0, x1, color) {
  // slight self-illumination keeps terrain readable at long range
  const p = plate(g, x1 - x0, GROUND_DEPTH, mat(color, { rough: 0.97, emissive: color, eInt: 0.38 }), (x0 + x1) / 2, -0.06, 0);
  p.rotation.x = -Math.PI / 2;
}

// ---------- zone builders (era 0..6) ----------
const zoneBuilders = [
  // 0 — rural field: grass, dirt road, trees, fence posts
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x263c20);
    road(g, x0, x1, 0x3c362b, null);
    const back = -def.d / 2 - 3;
    for (let i = 0; i < 7; i++) tree(g, x0 + 1.5 + rnd(i) * (x1 - x0 - 3), back - 2 - rnd(i + 9) * 14, 0.8 + rnd(i + 4));
    for (let i = 0; i < 3; i++) tree(g, x0 + 1 + rnd(i + 20) * (x1 - x0 - 2), def.d / 2 + 3.5 + rnd(i + 30) * 3, 0.7 + rnd(i + 40) * 0.6);
    const post = mat(0x5c4a30, { rough: 0.9 });
    for (let x = x0 + 1; x < x1; x += 2.2) box(g, 0.08, 0.7, 0.08, post, x, 0.35, back - 0.5);
    // a lone yard light by the garage
    streetlamp(g, def.x + def.w / 2 + 2, def.d / 2 + 2);
  },
  // 1 — suburbs: lawns, asphalt road, houses, trees
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x28401f);
    road(g, x0, x1, 0x33363a, 'dashes');
    const back = -def.d / 2 - 5;
    house(g, x0 + 2.5, back - 2, 0.15, 0x9a8a72);
    house(g, (x0 + x1) / 2, back - 4, -0.1, 0x8a7a66);
    house(g, x1 - 2.5, back - 1.5, 0.3, 0xa4947c);
    for (let i = 0; i < 4; i++) tree(g, x0 + 1 + rnd(i + 50) * (x1 - x0 - 2), back - 8 - rnd(i + 60) * 6, 0.9 + rnd(i + 70) * 0.5);
    streetlamp(g, (x0 + x1) / 2, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 2 — office town: pavement, small office blocks, streetlamps
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x323740);
    road(g, x0, x1, 0x33363a, 'dashes');
    const back = -def.d / 2 - 4;
    tower(g, x0 + 3, back - 4, 4, 7, 4, coolWin, 1.0, 0xcfe4ff);
    tower(g, (x0 + x1) / 2 + 1, back - 7, 5, 10, 5, coolWin, 1.0, 0xcfe4ff);
    tower(g, x1 - 3.5, back - 3, 3.5, 5.5, 3.5, warmWin, 1.0, 0xffd9a0);
    streetlamp(g, x0 + 3, ROAD_Z - ROAD_W / 2 - 0.6);
    streetlamp(g, x1 - 3, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 3 — city edge: midrises with mixed windows and a neon accent
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x2b2e35);
    road(g, x0, x1, 0x33363a, 'dashes');
    const back = -def.d / 2 - 4;
    tower(g, x0 + 3, back - 5, 4.5, 12, 4.5, warmWin, 1.0, 0xffd9a0);
    tower(g, x0 + 9, back - 9, 5, 15, 5, coolWin, 1.0, 0xcfe4ff);
    tower(g, x1 - 8, back - 6, 4, 10, 4, warmWin, 1.0, 0xffd9a0);
    tower(g, x1 - 2.5, back - 3, 3.5, 8, 3.5, coolWin, 1.0, 0xcfe4ff);
    // neon strip on a facade
    box(g, 0.12, 6, 0.12, blinkMat(0xff2bd6, { speed: 1.1, min: 0.5, max: 2.0 }), x0 + 5.3, 6, back - 2.7);
    lightPool(g, x0 + 5.3, back - 1.4, 2.4, 0xff2bd6, 0.3);
    streetlamp(g, (x0 + x1) / 2, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 4 — industrial: warehouses, stacks, power masts
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x282c31);
    road(g, x0, x1, 0x36393d, 'dashes');
    const back = -def.d / 2 - 4;
    box(g, 9, 3.4, 6, mat(0x3a4046, { rough: 0.8, metal: 0.2 }), x0 + 6, 1.7, back - 5);
    box(g, 9, 0.4, 6.4, mat(0x2e3338, { rough: 0.8 }), x0 + 6, 3.6, back - 5);
    box(g, 7, 2.8, 5, mat(0x424851, { rough: 0.8, metal: 0.2 }), x1 - 5, 1.4, back - 8);
    cyl(g, 0.5, 0.7, 6, mat(0x4a525b, { rough: 0.7, metal: 0.3 }), x0 + 2.5, 3, back - 9, 10);
    cyl(g, 0.4, 0.55, 4.5, mat(0x4a525b, { rough: 0.7, metal: 0.3 }), x0 + 4.2, 2.25, back - 10, 10);
    mast(g, (x0 + x1) / 2, back - 13, 7);
    mast(g, x1 - 2, back - 11, 5.5);
    // sodium-vapor yard lighting
    streetlamp(g, x0 + 6, back - 1);
    streetlamp(g, x1 - 5, back - 4.5);
    lightPool(g, x0 + 6, back - 5, 4.5, 0xffb060, 0.22);
  },
  // 5 — tech campus: glass towers, glowing ground seams, antennas
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x1d222a);
    road(g, x0, x1, 0x2a2e36, 'glow');
    const back = -def.d / 2 - 5;
    tower(g, x0 + 5, back - 6, 5, 16, 5, techWin, 1.2, 0x38e0ff);
    tower(g, x0 + 14, back - 10, 6, 21, 6, techWin, 1.2, 0x38e0ff);
    tower(g, x1 - 10, back - 7, 5, 13, 5, coolWin, 1.1, 0xcfe4ff);
    tower(g, x1 - 3, back - 4, 4, 18, 4, techWin, 1.2, 0x38e0ff);
    mast(g, x0 + 14, back - 10, 24.5);
    // glowing campus seams
    for (let i = 0; i < 2; i++)
      box(g, x1 - x0 - 4, 0.008, 0.05, blinkMat(0x1c6dff, { speed: 0.5, min: 0.3, max: 0.9, phase: i * 2 }), (x0 + x1) / 2, -0.02, -def.d / 2 - 2 - i * 4);
  },
  // 6 — future city: neon spires, a mega-tower, an orbiting ring
  (g, def, x0, x1) => {
    ground(g, x0, x1, 0x181d26);
    road(g, x0, x1, 0x262b34, 'glow');
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
  const base = plate(g, 800, 520, mat(0x161b1e, { rough: 1, emissive: 0x161b1e, eInt: 0.35 }), 55, -0.12, 0);
  base.rotation.x = -Math.PI / 2;
  // western hills
  for (let i = 0; i < 5; i++) {
    const r = 26 + rnd(i) * 22, h = 9 + rnd(i + 3) * 11;
    const hill = B(g, new THREE.ConeGeometry(r, h, 6), mat(0x18261c, { rough: 1, emissive: 0x18261c, eInt: 0.16 }), -95 + i * 38 + rnd(i + 7) * 10, h / 2 - 1.5, -85 - rnd(i + 11) * 25);
    hill.rotation.y = rnd(i + 5) * Math.PI;
  }
  // distant skyline: taller and denser toward the east (future) end
  for (let i = 0; i < 14; i++) {
    const x = 8 + i * 12 + rnd(i + 20) * 6;
    const grow = x / 160;
    const w = 4 + rnd(i + 30) * 3.5;
    const h = 5 + grow * 20 + rnd(i + 40) * 9;
    const z = -62 - rnd(i + 50) * 28;
    box(g, w, h, w, mat(0x121620, { rough: 0.9, emissive: 0x121620, eInt: 0.16 }), x, h / 2, z);
    plate(g, w * 0.9, h * 0.9, screenMat(coolWin, 0.45), x, h / 2, z + w / 2 + 0.02);
  }
  // a few mega-silhouettes past the vault
  for (let i = 0; i < 3; i++) {
    const x = 132 + i * 16, h = 26 + rnd(i + 60) * 14;
    box(g, 6, h, 6, mat(0x121620, { rough: 0.9, emissive: 0x121620, eInt: 0.16 }), x, h / 2, -70 - rnd(i + 70) * 15);
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
