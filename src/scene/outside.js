// The world outside the rooms. One full-landscape variant per era —
// the ENTIRE outdoors evolves to match the latest era you've reached.
import * as THREE from 'three';
import { mat, box, cyl, plate, B, screenTex, screenMat, blinkMat, sphereGeo } from './helpers.js';

const ROAD_Z = 12;
const ROAD_W = 3.4;
const STRIP_X0 = -35, STRIP_X1 = 155;   // prop range along the strip
const GROUND_W = 800, GROUND_D = 520;   // matches the backdrop base — edges only die in fog

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

// ---------- prop builders ----------
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

function road(g, surface, markings) {
  const x0 = STRIP_X0 - 10, x1 = STRIP_X1 + 10;
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

function ground(g, color) {
  // same footprint as the backdrop base: the edge only ever dies in fog
  const p = plate(g, GROUND_W, GROUND_D, mat(color, { rough: 0.97, emissive: color, eInt: 0.38 }), 55, -0.06, 0);
  p.rotation.x = -Math.PI / 2;
}

// scatter helper: deterministic positions along the strip
function scatter(count, seed, fn) {
  for (let i = 0; i < count; i++) {
    const x = STRIP_X0 + rnd(seed + i * 7) * (STRIP_X1 - STRIP_X0);
    fn(x, i);
  }
}
const zBack = (seed) => -13 - rnd(seed) * 22;    // behind the rooms
const zFront = (seed) => 16 + rnd(seed) * 12;    // beyond the road

// ---------- full-world era variants ----------
const worldBuilders = [
  // 0 — countryside: fields, dirt road, trees, fences
  (g) => {
    ground(g, 0x263c20);
    road(g, 0x3c362b, null);
    scatter(20, 100, (x, i) => tree(g, x, zBack(100 + i), 0.8 + rnd(i + 4)));
    scatter(8, 140, (x, i) => tree(g, x, zFront(140 + i), 0.7 + rnd(i + 40) * 0.6));
    const post = mat(0x5c4a30, { rough: 0.9 });
    for (let x = STRIP_X0; x < STRIP_X1; x += 3.5) box(g, 0.08, 0.7, 0.08, post, x, 0.35, -11.5);
    streetlamp(g, 6.5, 6.5); // lone yard light by the garage
  },
  // 1 — suburbs: lawns, houses everywhere, asphalt road
  (g) => {
    ground(g, 0x28401f);
    road(g, 0x33363a, 'dashes');
    const tints = [0x9a8a72, 0x8a7a66, 0xa4947c, 0x94846a];
    scatter(12, 200, (x, i) => house(g, x, -14.5 - rnd(200 + i) * 6, rnd(i) * 0.6 - 0.3, tints[i % 4]));
    scatter(4, 230, (x, i) => house(g, x, zFront(230 + i) + 3, Math.PI + rnd(i) * 0.5 - 0.25, tints[(i + 2) % 4]));
    scatter(10, 260, (x, i) => tree(g, x, zBack(260 + i) - 6, 0.9 + rnd(i + 70) * 0.5));
    for (let x = STRIP_X0 + 10; x < STRIP_X1; x += 34) streetlamp(g, x, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 2 — office town: pavement, low office blocks, lamps
  (g) => {
    ground(g, 0x323740);
    road(g, 0x33363a, 'dashes');
    scatter(9, 300, (x, i) => {
      const h = 5 + rnd(300 + i) * 6;
      tower(g, x, -17 - rnd(310 + i) * 8, 3.5 + rnd(i) * 1.5, h, 3.5 + rnd(i + 9) * 1.5,
        i % 3 === 2 ? warmWin : coolWin, 1.0, i % 3 === 2 ? 0xffd9a0 : 0xcfe4ff);
    });
    scatter(3, 340, (x, i) => tower(g, x, zFront(340 + i) + 6, 3.5, 4.5 + rnd(i) * 3, 3.5, warmWin, 1.0, 0xffd9a0));
    scatter(6, 360, (x, i) => tree(g, x, zBack(360 + i) - 12, 0.8 + rnd(i) * 0.4));
    for (let x = STRIP_X0 + 6; x < STRIP_X1; x += 26) streetlamp(g, x, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 3 — city edge: midrises, neon accents
  (g) => {
    ground(g, 0x2b2e35);
    road(g, 0x33363a, 'dashes');
    scatter(11, 400, (x, i) => {
      const h = 8 + rnd(400 + i) * 8;
      tower(g, x, -17 - rnd(410 + i) * 10, 4 + rnd(i) * 1.5, h, 4 + rnd(i + 9) * 1.5,
        i % 2 ? warmWin : coolWin, 1.0, i % 2 ? 0xffd9a0 : 0xcfe4ff);
      if (i % 4 === 1) {
        box(g, 0.12, h * 0.5, 0.12, blinkMat(0xff2bd6, { speed: 1.1, min: 0.5, max: 2.0, phase: i }), x + 2.3, h * 0.5, -14.5 - rnd(410 + i) * 10 + 2.3);
      }
    });
    scatter(4, 440, (x, i) => tower(g, x, zFront(440 + i) + 8, 4, 6 + rnd(i) * 5, 4, coolWin, 1.0, 0xcfe4ff));
    for (let x = STRIP_X0 + 6; x < STRIP_X1; x += 24) streetlamp(g, x, ROAD_Z - ROAD_W / 2 - 0.6);
  },
  // 4 — industrial belt: warehouses, stacks, power masts, yard lights
  (g) => {
    ground(g, 0x282c31);
    road(g, 0x36393d, 'dashes');
    scatter(6, 500, (x, i) => {
      const wz = -18 - rnd(500 + i) * 8;
      box(g, 8 + rnd(i) * 3, 3 + rnd(i + 3), 5.5, mat(0x3a4046, { rough: 0.8, metal: 0.2 }), x, 1.6, wz);
      box(g, 8.4 + rnd(i) * 3, 0.4, 5.9, mat(0x2e3338, { rough: 0.8 }), x, 3.3 + rnd(i + 3) * 0.5, wz);
      streetlamp(g, x + 3, wz + 5);
    });
    scatter(4, 540, (x, i) => cyl(g, 0.45 + rnd(i) * 0.15, 0.65, 5 + rnd(540 + i) * 3, mat(0x4a525b, { rough: 0.7, metal: 0.3 }), x, 2.5 + rnd(540 + i) * 1.5, -26 - rnd(i) * 6, 10));
    scatter(5, 570, (x, i) => mast(g, x, -30 - rnd(570 + i) * 10, 5 + rnd(i) * 3));
    scatter(3, 590, (x, i) => box(g, 6, 2.4, 4.5, mat(0x424851, { rough: 0.8, metal: 0.2 }), x, 1.2, zFront(590 + i) + 8));
  },
  // 5 — tech metropolis: glass towers, glowing roads, antennas
  (g) => {
    ground(g, 0x1d222a);
    road(g, 0x2a2e36, 'glow');
    scatter(10, 600, (x, i) => {
      const h = 12 + rnd(600 + i) * 12;
      tower(g, x, -18 - rnd(610 + i) * 12, 4.5 + rnd(i) * 2, h, 4.5 + rnd(i + 9) * 2,
        i % 3 === 2 ? coolWin : techWin, 1.2, i % 3 === 2 ? 0xcfe4ff : 0x38e0ff);
      if (i % 4 === 0) mast(g, x, -18 - rnd(610 + i) * 12, h + 4);
    });
    scatter(3, 650, (x, i) => tower(g, x, zFront(650 + i) + 10, 4, 8 + rnd(i) * 6, 4, techWin, 1.1, 0x38e0ff));
    // glowing campus seams behind the rooms
    for (let i = 0; i < 2; i++)
      box(g, STRIP_X1 - STRIP_X0, 0.008, 0.05, blinkMat(0x1c6dff, { speed: 0.5, min: 0.3, max: 0.9, phase: i * 2 }), 60, -0.02, -13 - i * 5);
  },
  // 6 — future city: neon spires everywhere, mega-towers with rings
  (g) => {
    ground(g, 0x181d26);
    road(g, 0x262b34, 'glow');
    const seams = [0x38e0ff, 0xb18aff, 0xff2bd6];
    scatter(13, 700, (x, i) => {
      spire(g, x, -16 - rnd(700 + i) * 16, 1.3 + rnd(i) * 1.2, 14 + rnd(710 + i) * 14, seams[i % 3], i * 0.8);
    });
    scatter(4, 750, (x, i) => spire(g, x, zFront(750 + i) + 10, 1.2 + rnd(i), 10 + rnd(i) * 8, seams[(i + 1) % 3], i * 1.3));
    // two mega-towers with orbiting rings
    for (const [mx, mz, i] of [[38, -34, 0], [102, -30, 1]]) {
      spire(g, mx, mz, 3, 30 + i * 4, 0x38e0ff, 0.6 + i);
      const ring = B(g, new THREE.TorusGeometry(3.4, 0.12, 8, 40), blinkMat(0x38e0ff, { speed: 0.7, min: 0.6, max: 1.6, phase: i }), mx, 22 + i * 4, mz);
      ring.rotation.x = Math.PI / 2;
      ring.userData.spin = { axis: 'z', speed: 0.15 + i * 0.05 };
    }
    // circuit lines on the ground
    for (let i = 0; i < 3; i++)
      box(g, STRIP_X1 - STRIP_X0, 0.008, 0.04, blinkMat(seams[i], { speed: 0.4 + i * 0.2, min: 0.3, max: 1.0, phase: i }), 60, -0.02, 17 + i * 3);
  },
];

// Always-visible distant layer: base ground, hills to the west,
// a skyline that grows taller toward the future end of the strip.
export function buildBackdrop(scene) {
  const g = new THREE.Group();
  const base = plate(g, GROUND_W, GROUND_D, mat(0x161b1e, { rough: 1, emissive: 0x161b1e, eInt: 0.35 }), 55, -0.12, 0);
  base.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const r = 26 + rnd(i) * 22, h = 9 + rnd(i + 3) * 11;
    const hill = B(g, new THREE.ConeGeometry(r, h, 6), mat(0x18261c, { rough: 1, emissive: 0x18261c, eInt: 0.16 }), -95 + i * 38 + rnd(i + 7) * 10, h / 2 - 1.5, -85 - rnd(i + 11) * 25);
    hill.rotation.y = rnd(i + 5) * Math.PI;
  }
  for (let i = 0; i < 14; i++) {
    const x = 8 + i * 12 + rnd(i + 20) * 6;
    const grow = x / 160;
    const w = 4 + rnd(i + 30) * 3.5;
    const h = 5 + grow * 20 + rnd(i + 40) * 9;
    const z = -62 - rnd(i + 50) * 28;
    box(g, w, h, w, mat(0x121620, { rough: 0.9, emissive: 0x121620, eInt: 0.16 }), x, h / 2, z);
    plate(g, w * 0.9, h * 0.9, screenMat(coolWin, 0.45), x, h / 2, z + w / 2 + 0.02);
  }
  for (let i = 0; i < 3; i++) {
    const x = 132 + i * 16, h = 26 + rnd(i + 60) * 14;
    box(g, 6, h, 6, mat(0x121620, { rough: 0.9, emissive: 0x121620, eInt: 0.16 }), x, h / 2, -70 - rnd(i + 70) * 15);
    box(g, 0.14, h * 0.9, 0.14, blinkMat(0x38e0ff, { speed: 0.5, min: 0.3, max: 1.2, phase: i }), x + 3, h / 2, -67 - rnd(i + 70) * 15);
  }
  B(g, sphereGeo(0.3, 8), blinkMat(0xff2233, { speed: 1.1, min: 0.1, max: 2.0 }), 92, 24, -75);
  B(g, sphereGeo(0.3, 8), blinkMat(0xff2233, { speed: 1.3, min: 0.1, max: 2.0, phase: 2 }), 148, 38, -78);
  scene.add(g);
  return g;
}

// One hidden full-world group per era; world.js shows the latest one.
export function buildOutdoorWorlds(scene) {
  return worldBuilders.map((build) => {
    const g = new THREE.Group();
    build(g);
    g.visible = false;
    scene.add(g);
    return g;
  });
}
