// Procedural low-poly models for every computer tier, built from primitives.
// builders[i](unitIndex) returns a fresh THREE.Group with origin at its base.
import * as THREE from 'three';
import {
  mat, physMat, box, rbox, cyl, plate, B,
  boxGeo, rboxGeo, cylGeo, planeGeo, sphereGeo,
  screenTex, screenMat, blinkMat,
} from './helpers.js';

// ---------- palette ----------
const CREAM = 0xd8cfae, PUTTY = 0xcfc0a0, BEIGE = 0xd4c9a8, GREIGE = 0xbdb098;
const DARK = 0x14161a, STEEL = 0x2a3440, WOOD = 0x7a5c3e, LEG = 0x2c2620;
const FABRIC = 0x8d99a8, TRIM = 0x9ea6ad;

const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- animated screen textures (shared across all instances) ----------
const GREEN = '#33ff66', AMBER = '#ffb347';

const ibmTex = screenTex(96, 72, (c, w, h, f) => {
  c.fillStyle = '#020a04'; c.fillRect(0, 0, w, h);
  c.fillStyle = GREEN;
  for (let i = 0; i < 8; i++) {
    const len = 10 + rnd(f * 8 + i) * (w - 20);
    c.fillRect(4, 5 + i * 8, len, 3);
  }
}, 2);

const appleTex = screenTex(128, 96, (c, w, h, f) => {
  c.fillStyle = '#02120a'; c.fillRect(0, 0, w, h);
  c.fillStyle = GREEN; c.font = '10px monospace';
  const lines = ['] CATALOG', 'A 034 SPREADSHEET', 'B 011 ADVENTURE', 'T 090 LEDGER.DAT', '] RUN LEDGER'];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const chars = Math.max(0, Math.min(line.length, f * 2 - i * 6));
    c.fillText(line.slice(0, chars), 5, 14 + i * 13);
  }
  if (f % 2) c.fillRect(5, 70, 7, 10);
}, 2);

const c64Tex = screenTex(128, 96, (c, w, h, f) => {
  c.fillStyle = '#8a7fce'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#40318d'; c.fillRect(10, 8, w - 20, h - 16);
  c.fillStyle = '#8a7fce'; c.font = '8px monospace';
  c.fillText('**** COMMODORE 64 ****', 14, 22);
  c.fillText('64K RAM SYSTEM', 14, 34);
  c.fillText('READY.', 14, 50);
  if (f % 2) c.fillRect(14, 56, 6, 8);
}, 2);

const dosTex = screenTex(128, 96, (c, w, h, f) => {
  c.fillStyle = '#031006'; c.fillRect(0, 0, w, h);
  c.fillStyle = GREEN; c.font = '8px monospace';
  c.fillText('C:\\> dir /w', 4, 12);
  for (let i = 0; i < 6; i++) {
    c.fillText(`FILE${((f + i) % 90).toString().padStart(3, '0')}.EXE   ${Math.floor(rnd(f + i) * 64)}K`, 4, 26 + i * 11);
  }
}, 2);

const winTex = screenTex(128, 96, (c, w, h, f) => {
  c.fillStyle = '#0b7d78'; c.fillRect(0, 0, w, h);
  const win = (x, y, ww, hh) => {
    c.fillStyle = '#c0c0c0'; c.fillRect(x, y, ww, hh);
    c.fillStyle = '#000082'; c.fillRect(x + 2, y + 2, ww - 4, 8);
    c.fillStyle = '#ffffff'; c.fillRect(x + 4, y + 14, ww - 8, hh - 18);
  };
  win(8, 8, 70, 50);
  win(46, 34, 70, 52);
  // busy cursor blink
  c.fillStyle = f % 2 ? '#000000' : '#666666'; c.fillRect(100, 14, 6, 10);
}, 1);

const imacTex = screenTex(96, 72, (c, w, h, f) => {
  const g = c.createLinearGradient(0, 0, w, h);
  const hue = (f * 12) % 360;
  g.addColorStop(0, `hsl(${hue},80%,60%)`);
  g.addColorStop(1, `hsl(${(hue + 90) % 360},80%,45%)`);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath(); c.arc(w / 2, h / 2, 12, 0, 6.29); c.fill();
}, 2);

const gameTex = screenTex(160, 68, (c, w, h, f) => {
  c.fillStyle = '#0a0a14'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    c.fillStyle = `hsl(${(f * 20 + i * 40) % 360},90%,55%)`;
    const x = rnd(i * 3 + f) * w, y = rnd(i * 7 + f) * h;
    c.fillRect(x, y, 8 + rnd(i) * 16, 4 + rnd(i + 9) * 8);
  }
  c.fillStyle = '#ffffff'; c.fillRect(w / 2 - 2, h / 2 - 2, 4, 4);
}, 4);

const altairTex = screenTex(256, 120, (c, w, h, f) => {
  c.fillStyle = '#33404e'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#25303c'; c.fillRect(6, 6, w - 12, h - 12);
  // LED rows
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 16; i++) {
      const on = rnd(f * 16 + i + row * 31) > 0.5;
      c.fillStyle = on ? '#ff4433' : '#441111';
      c.beginPath(); c.arc(22 + i * 13.5, 26 + row * 20, 3.6, 0, 6.29); c.fill();
    }
  }
  // switch rows
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = '#cfd6dd';
      const up = rnd(i + row * 17 + Math.floor(f / 6)) > 0.5;
      c.fillRect(20 + i * 13.5, 70 + row * 22 + (up ? -4 : 0), 4, 10);
    }
  }
}, 2);

const sledTex = screenTex(256, 40, (c, w, h, f) => {
  c.fillStyle = '#181c20'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = '#232930'; c.fillRect(6 + i * 30, 6, 26, 28);
    c.fillStyle = '#0d0f12'; c.fillRect(8 + i * 30, 8, 22, 16);
    c.fillStyle = rnd(f * 8 + i) > 0.35 ? '#39ff6a' : '#0a3315';
    c.fillRect(9 + i * 30, 27, 5, 4);
    c.fillStyle = rnd(f * 8 + i + 50) > 0.85 ? '#ffb020' : '#33240a';
    c.fillRect(17 + i * 30, 27, 5, 4);
  }
}, 3);

const rackTex = screenTex(256, 512, (c, w, h, f) => {
  c.fillStyle = '#101418'; c.fillRect(0, 0, w, h);
  for (let u = 0; u < 30; u++) {
    const y = 8 + u * 16.5;
    c.fillStyle = '#1a2027'; c.fillRect(10, y, w - 20, 14);
    if (u % 9 === 4) { // patch panel band
      for (let p = 0; p < 20; p++) {
        c.fillStyle = rnd(p + u) > 0.5 ? '#2266aa' : '#aa7722';
        c.fillRect(16 + p * 11, y + 4, 6, 6);
      }
      continue;
    }
    c.fillStyle = '#12161a'; c.fillRect(14, y + 3, 120, 8);
    for (let d = 0; d < 10; d++) {
      c.fillStyle = rnd(f * 10 + u * 13 + d) > 0.4 ? '#39ff6a' : '#0c2f16';
      c.fillRect(150 + d * 9, y + 5, 4, 4);
    }
  }
}, 3);

const podTex = screenTex(256, 512, (c, w, h, f) => {
  c.fillStyle = '#0c0e11'; c.fillRect(0, 0, w, h);
  for (let s = 0; s < 8; s++) {
    const y = 12 + s * 61;
    c.fillStyle = '#15181d'; c.fillRect(10, y, w - 20, 52);
    // gold heatsink fins
    c.fillStyle = '#8f6f1e';
    for (let x = 18; x < w - 60; x += 6) c.fillRect(x, y + 6, 3, 40);
    for (let d = 0; d < 4; d++) {
      c.fillStyle = rnd(f * 4 + s * 7 + d) > 0.25 ? '#38e0ff' : '#0a3340';
      c.fillRect(w - 44 + d * 8, y + 22, 5, 5);
    }
  }
}, 3);

const metricsTex = screenTex(96, 64, (c, w, h, f) => {
  c.fillStyle = '#04070a'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#7ee7ff'; c.font = '7px monospace';
  for (let i = 0; i < 7; i++) {
    c.fillText(`${['TFLOP', 'TEMP ', 'PWR  ', 'JOBS ', 'NET  ', 'QBIT ', 'ERR  '][i]} ${(rnd(f * 7 + i) * 999).toFixed(0).padStart(4)}`, 5, 10 + i * 8.5);
  }
}, 2);

// keyboards as single textured plates (was: 40-52 tiny meshes per machine)
function kbTexture(cols, rows, keyCol, gapCol) {
  return screenTex(cols * 12, rows * 12, (c, w, h) => {
    c.fillStyle = gapCol; c.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        c.fillStyle = keyCol;
        c.fillRect(k * 12 + 2, r * 12 + 2, 9, 9);
        c.fillStyle = 'rgba(255,255,255,0.10)';
        c.fillRect(k * 12 + 2, r * 12 + 2, 9, 2);
      }
    }
  }, 0);
}
function kbMat(cols, rows, keyCol, gapCol) {
  return new THREE.MeshStandardMaterial({ map: kbTexture(cols, rows, keyCol, gapCol), roughness: 0.8 });
}
const ibmKb = kbMat(10, 4, '#3b3b38', '#b7ab8b');
const appleKb = kbMat(12, 4, '#4a3b2c', '#c6bb9a');
const c64Kb = kbMat(13, 4, '#4c4438', '#a89c84');

// ---------- shared props ----------
export function desk(w = 1.1, d = 0.6, topColor = WOOD) {
  const g = new THREE.Group();
  box(g, w, 0.04, d, mat(topColor, { rough: 0.6 }), 0, 0.74, 0);
  const legMat = mat(LEG, { rough: 0.5, metal: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box(g, 0.045, 0.72, 0.045, legMat, sx * (w / 2 - 0.06), 0.36, sz * (d / 2 - 0.06));
  return g;
}

function cubicle(g) {
  const pm = mat(FABRIC, { rough: 0.9 });
  const tm = mat(TRIM, { rough: 0.4, metal: 0.6 });
  box(g, 1.5, 1.25, 0.05, pm, 0, 0.625, -0.42);          // back panel
  box(g, 1.5, 0.03, 0.06, tm, 0, 1.26, -0.42);
  box(g, 0.05, 1.25, 0.8, pm, -0.76, 0.625, -0.05);      // side panel
  box(g, 0.05, 0.03, 0.8, tm, -0.76, 1.26, -0.05);
  g.add(desk(1.35, 0.6));
  return g;
}

export function rackFrame() {
  const g = new THREE.Group();
  const fm = mat(0x22262c, { rough: 0.5, metal: 0.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box(g, 0.05, 2.05, 0.05, fm, sx * 0.29, 1.025, sz * 0.26);
  box(g, 0.64, 0.05, 0.58, fm, 0, 2.06, 0);
  box(g, 0.64, 0.08, 0.58, fm, 0, 0.04, 0);
  // rails with slot marks
  const rm = mat(0x3a4148, { rough: 0.5, metal: 0.5 });
  for (const sx of [-1, 1]) box(g, 0.02, 1.95, 0.04, rm, sx * 0.255, 1.03, 0.24);
  return g;
}

export function museumShelf() {
  const g = new THREE.Group();
  const sm = mat(0x6b4f33, { rough: 0.7 });
  box(g, 2.2, 0.04, 0.4, sm, 0, 1.15, 0);
  box(g, 2.2, 0.04, 0.4, sm, 0, 1.7, 0);
  const br = mat(0x33291d, { rough: 0.7 });
  for (const sx of [-1, 0, 1]) { box(g, 0.05, 0.12, 0.3, br, sx * 1.0, 1.07, 0); box(g, 0.05, 0.12, 0.3, br, sx * 1.0, 1.62, 0); }
  return g;
}

// ---------- tier builders ----------

// 0 — IBM 5100 Portable (sits on a bench/desk surface)
function ibm5100() {
  const g = new THREE.Group();
  const body = mat(CREAM, { rough: 0.65 });
  rbox(g, 0.48, 0.19, 0.36, 0.015, body, 0, 0.095, 0);
  box(g, 0.44, 0.012, 0.02, mat(0x9a8f72, { rough: 0.6 }), 0, 0.2, -0.05); // handle groove
  // front face: crt bezel left, keyboard right
  box(g, 0.15, 0.11, 0.015, mat(DARK, { rough: 0.4 }), -0.14, 0.11, 0.181);
  plate(g, 0.115, 0.082, screenMat(ibmTex, 1.4), -0.14, 0.11, 0.19);
  box(g, 0.26, 0.1, 0.012, mat(PUTTY, { rough: 0.7 }), 0.08, 0.09, 0.181); // keyboard plate
  plate(g, 0.24, 0.096, ibmKb, 0.08, 0.098, 0.188);
  // side vents
  box(g, 0.015, 0.12, 0.28, mat(0xbfb694, { rough: 0.8 }), 0.243, 0.1, 0);
  return g;
}

// 1 — Altair 8800 (sits on a shelf)
function altair() {
  const g = new THREE.Group();
  rbox(g, 0.46, 0.19, 0.36, 0.012, mat(0x9aa3ab, { rough: 0.5, metal: 0.4 }), 0, 0.095, 0);
  // front panel with animated LEDs/switches texture
  plate(g, 0.43, 0.165, screenMat(altairTex, 0.9), 0, 0.098, 0.181);
  // a few physical toggle switches for relief
  const sw = mat(0xd5dae0, { rough: 0.3, metal: 0.7 });
  for (let i = 0; i < 8; i++) cyl(g, 0.005, 0.005, 0.03, sw, -0.155 + i * 0.045, 0.055, 0.19, 8).rotation.x = Math.PI / 2;
  box(g, 0.46, 0.015, 0.36, mat(0x6f7880, { rough: 0.6, metal: 0.3 }), 0, 0.2, 0); // vented lid
  return g;
}

// 2 — Apple II (with its own desk)
function appleII() {
  const g = new THREE.Group();
  g.add(desk(1.15, 0.65));
  const beige = mat(BEIGE, { rough: 0.65 });
  const mach = new THREE.Group(); mach.position.set(-0.08, 0.76, 0.02); g.add(mach);
  // wedge body: main box + sloped keyboard front
  rbox(mach, 0.44, 0.11, 0.42, 0.015, beige, 0, 0.055, -0.03);
  const slope = rbox(mach, 0.44, 0.02, 0.17, 0.008, beige, 0, 0.045, 0.2);
  slope.rotation.x = -0.22;
  const akb = plate(mach, 0.3, 0.15, appleKb, 0, 0.05, 0.2);
  akb.rotation.x = -Math.PI / 2 + 0.28;
  // monitor
  const mon = new THREE.Group(); mon.position.set(0, 0.11, -0.06); mach.add(mon);
  rbox(mon, 0.3, 0.26, 0.3, 0.02, beige, 0, 0.14, 0);
  box(mon, 0.24, 0.19, 0.02, mat(DARK, { rough: 0.4 }), 0, 0.145, 0.145);
  plate(mon, 0.21, 0.16, screenMat(appleTex, 1.3), 0, 0.145, 0.157);
  // disk II drives
  const dm = mat(BEIGE, { rough: 0.65 });
  for (let i = 0; i < 2; i++) {
    rbox(mach, 0.15, 0.085, 0.3, 0.01, dm, 0.32, 0.043 + i * 0.09, -0.03);
    box(mach, 0.11, 0.008, 0.01, mat(DARK), 0.32, 0.06 + i * 0.09, 0.122);
    box(mach, 0.012, 0.012, 0.008, blinkMat(0xff3322, { speed: 5, min: 0.1, max: 1.8 }), 0.26, 0.03 + i * 0.09, 0.122);
  }
  return g;
}

// 3 — Commodore 64 + 1702 monitor (with desk)
function c64() {
  const g = new THREE.Group();
  g.add(desk(1.15, 0.65));
  const greige = mat(GREIGE, { rough: 0.65 });
  const mach = new THREE.Group(); mach.position.set(0, 0.76, 0.08); g.add(mach);
  // breadbin
  const bin = rbox(mach, 0.42, 0.05, 0.2, 0.015, greige, 0, 0.028, 0.1);
  bin.rotation.x = -0.06;
  const ckb = plate(mach, 0.34, 0.16, c64Kb, 0, 0.056, 0.102);
  ckb.rotation.x = -Math.PI / 2 - 0.06;
  // rainbow badge
  plate(mach, 0.05, 0.02, mat(0xcc3333, { emissive: 0x992222, eInt: 0.3 }), -0.16, 0.056, 0.028);
  // 1702 monitor
  const mon = new THREE.Group(); mon.position.set(0, 0, -0.16); mach.add(mon);
  rbox(mon, 0.36, 0.3, 0.33, 0.02, greige, 0, 0.15, 0);
  box(mon, 0.29, 0.22, 0.02, mat(DARK, { rough: 0.4 }), 0, 0.16, 0.16);
  plate(mon, 0.26, 0.19, screenMat(c64Tex, 1.3), 0, 0.16, 0.172);
  // 1541 drive
  rbox(mach, 0.18, 0.07, 0.3, 0.01, greige, 0.31, 0.035, -0.05);
  box(mach, 0.13, 0.008, 0.01, mat(DARK), 0.31, 0.05, 0.101);
  box(mach, 0.012, 0.012, 0.008, blinkMat(0x22ff44, { speed: 3, min: 0.2, max: 1.4 }), 0.25, 0.025, 0.101);
  return g;
}

// 4 — IBM PC 5150 (cubicle)
function pc5150() {
  const g = new THREE.Group();
  cubicle(g);
  const case5150 = mat(0xcec5ab, { rough: 0.6 });
  const mach = new THREE.Group(); mach.position.set(0.1, 0.76, -0.08); g.add(mach);
  rbox(mach, 0.5, 0.14, 0.4, 0.012, case5150, 0, 0.07, 0);
  // floppy bays
  for (let i = 0; i < 2; i++) {
    box(mach, 0.14, 0.09, 0.012, mat(0xb9b096, { rough: 0.6 }), 0.1 + i * 0.16, 0.07, 0.2);
    box(mach, 0.1, 0.01, 0.008, mat(DARK), 0.1 + i * 0.16, 0.09, 0.207);
  }
  box(mach, 0.03, 0.04, 0.012, mat(0x8a2a2a, { rough: 0.5 }), -0.19, 0.07, 0.2); // power rocker
  // monitor
  const mon = new THREE.Group(); mon.position.set(0, 0.14, -0.02); mach.add(mon);
  rbox(mon, 0.34, 0.28, 0.32, 0.02, case5150, 0, 0.15, 0);
  box(mon, 0.27, 0.2, 0.02, mat(DARK, { rough: 0.4 }), 0, 0.155, 0.155);
  plate(mon, 0.24, 0.175, screenMat(dosTex, 1.3), 0, 0.155, 0.167);
  // model F keyboard
  const kb = rbox(mach, 0.42, 0.03, 0.16, 0.01, mat(0xc4bba1, { rough: 0.65 }), -0.02, 0.012, 0.32);
  kb.rotation.x = -0.08;
  return g;
}

// 5 — Beige 486 Tower (cubicle)
function tower486() {
  const g = new THREE.Group();
  cubicle(g);
  const beige = mat(0xd6cdb4, { rough: 0.62 });
  // tower on floor beside desk
  const tw = new THREE.Group(); tw.position.set(0.52, 0, 0.12); tw.rotation.y = -0.18; g.add(tw);
  rbox(tw, 0.21, 0.46, 0.46, 0.012, beige, 0, 0.23, 0);
  box(tw, 0.15, 0.05, 0.012, mat(0xbfb69c), 0, 0.38, 0.231); // 5.25 bay
  box(tw, 0.1, 0.03, 0.012, mat(0xbfb69c), -0.02, 0.32, 0.231); // 3.5 bay
  box(tw, 0.035, 0.02, 0.012, mat(0xa8a08a), 0.05, 0.26, 0.231); // turbo button
  plate(tw, 0.04, 0.018, screenMat(screenTex(32, 16, (c, w, h) => {
    c.fillStyle = '#100800'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff8800'; c.font = 'bold 12px monospace'; c.fillText('66', 6, 13);
  }, 0), 1.2), -0.05, 0.26, 0.232);
  box(tw, 0.015, 0.008, 0.01, blinkMat(0x33ff55, { speed: 7, min: 0.2, max: 1.5 }), 0.03, 0.22, 0.231); // HDD LED
  // deep CRT on desk
  const mon = new THREE.Group(); mon.position.set(-0.1, 0.76, -0.1); g.add(mon);
  rbox(mon, 0.38, 0.32, 0.38, 0.02, beige, 0, 0.18, 0);
  box(mon, 0.31, 0.24, 0.02, mat(DARK, { rough: 0.4 }), 0, 0.185, 0.185);
  plate(mon, 0.28, 0.21, screenMat(winTex, 1.2), 0, 0.185, 0.197);
  box(mon, 0.3, 0.03, 0.24, beige, 0, -0.015, 0.02); // monitor foot
  const kb = rbox(g, 0.4, 0.028, 0.15, 0.01, mat(0xcac1a7), -0.12, 0.775, 0.18);
  kb.rotation.x = -0.06;
  return g;
}

// 6 — iMac G3 (funky round table, fruit color variants)
const FRUITS = [0x1f7fbf, 0xd94f70, 0x7fbf3f, 0xef8f3f, 0x8f5fbf]; // bondi, strawberry, lime, tangerine, grape
function imacG3(idx = 0) {
  const g = new THREE.Group();
  // round table
  cyl(g, 0.42, 0.42, 0.03, mat(0xe8e4da, { rough: 0.5 }), 0, 0.72, 0, 24);
  cyl(g, 0.03, 0.05, 0.7, mat(0x9aa0a6, { rough: 0.4, metal: 0.7 }), 0, 0.36, 0, 12);
  const color = FRUITS[idx % FRUITS.length];
  const shell = physMat(color, { transmission: 0.5, rough: 0.25 });
  const mach = new THREE.Group(); mach.position.set(0, 0.735, 0); g.add(mach);
  // gumdrop body: rounded box + rear bulge
  rbox(mach, 0.38, 0.36, 0.3, 0.09, shell, 0, 0.19, 0.02);
  const bulge = B(mach, sphereGeo(0.19, 18), shell, 0, 0.19, -0.1);
  bulge.scale.set(1, 0.92, 0.85);
  // inner CRT mass
  rbox(mach, 0.3, 0.28, 0.22, 0.05, mat(0x30343a, { rough: 0.6 }), 0, 0.19, -0.01);
  // front face + screen
  plate(mach, 0.3, 0.26, mat(0xe9e7e2, { rough: 0.5 }), 0, 0.2, 0.171);
  plate(mach, 0.235, 0.18, screenMat(imacTex, 1.2), 0, 0.2, 0.173);
  // foot
  box(mach, 0.2, 0.03, 0.16, shell, 0, 0.006, 0.06);
  // translucent keyboard + puck mouse
  rbox(g, 0.3, 0.02, 0.11, 0.008, physMat(color, { transmission: 0.55 }), 0.02, 0.745, 0.26);
  cyl(g, 0.028, 0.028, 0.015, physMat(color, { transmission: 0.5 }), 0.24, 0.745, 0.26, 14);
  return g;
}

// 7 — RGB Gaming Rig (black desk, glass tower, ultrawide)
function rgbRig() {
  const g = new THREE.Group();
  g.add(desk(1.3, 0.65, 0x1d2126));
  // tower
  const tw = new THREE.Group(); tw.position.set(0.42, 0.76, -0.05); g.add(tw);
  rbox(tw, 0.24, 0.46, 0.44, 0.01, mat(0x15181c, { rough: 0.45, metal: 0.3 }), 0, 0.23, 0);
  // glass side panel
  plate(tw, 0.4, 0.42, mat(0x88aacc, { transparent: true, opacity: 0.18, rough: 0.1, metal: 0.5 }), 0.125, 0.23, 0, Math.PI / 2);
  // internals visible through glass: 3 RGB fans + GPU
  const fanCols = [0x00e5ff, 0xff2bd6, 0xb4ff39];
  for (let i = 0; i < 3; i++) {
    const ring = B(tw, new THREE.TorusGeometry(0.045, 0.008, 8, 24), blinkMat(fanCols[i], { speed: 2 + i, min: 0.5, max: 2.2, phase: i * 2 }), 0.11, 0.1 + i * 0.13, -0.12);
    ring.rotation.y = Math.PI / 2;
    ring.userData.spin = { axis: 'z', speed: 6 + i * 2 };
  }
  box(tw, 0.02, 0.05, 0.3, mat(0x22262b, { rough: 0.4 }), 0.08, 0.18, 0.05); // GPU slab
  box(tw, 0.005, 0.012, 0.28, blinkMat(0xffffff, { speed: 1.5, min: 0.4, max: 1.4 }), 0.09, 0.21, 0.05); // GPU light bar
  // ultrawide monitor
  const mon = new THREE.Group(); mon.position.set(-0.18, 0.76, -0.16); g.add(mon);
  box(mon, 0.06, 0.2, 0.05, mat(0x1a1d21), 0, 0.1, 0);
  rbox(mon, 0.62, 0.28, 0.03, 0.008, mat(0x101216, { rough: 0.4 }), 0, 0.32, 0.02);
  plate(mon, 0.58, 0.24, screenMat(gameTex, 1.4), 0, 0.32, 0.038);
  // mech keyboard with glow strip
  rbox(g, 0.36, 0.025, 0.13, 0.008, mat(0x1b1e23, { rough: 0.5 }), -0.18, 0.775, 0.14);
  box(g, 0.34, 0.006, 0.1, blinkMat(0xff2bd6, { speed: 1.2, min: 0.3, max: 1.2 }), -0.18, 0.792, 0.14);
  return g;
}

// 8 — 1U Rack Server (a sled that slides into a rack frame)
function sled1U() {
  const g = new THREE.Group();
  rbox(g, 0.5, 0.044, 0.5, 0.005, mat(0x1b1f24, { rough: 0.5, metal: 0.4 }), 0, 0.022, 0);
  plate(g, 0.48, 0.04, screenMat(sledTex, 1.1), 0, 0.022, 0.251);
  // ear brackets
  const em = mat(0x2c3138, { rough: 0.4, metal: 0.6 });
  box(g, 0.02, 0.04, 0.015, em, -0.26, 0.022, 0.24);
  box(g, 0.02, 0.04, 0.015, em, 0.26, 0.022, 0.24);
  return g;
}

// 9 — Full 42U Server Rack
function rack42U() {
  const g = new THREE.Group();
  rbox(g, 0.62, 2.1, 0.82, 0.015, mat(0x14171b, { rough: 0.5, metal: 0.35 }), 0, 1.05, 0);
  plate(g, 0.56, 1.95, screenMat(rackTex, 1.1), 0, 1.02, 0.411);
  // top-of-rack switch LED strip
  box(g, 0.5, 0.03, 0.02, blinkMat(0x2299ff, { speed: 6, min: 0.3, max: 1.5 }), 0, 2.02, 0.4);
  // side cable bundle
  const cm = mat(0xcc7722, { rough: 0.8 });
  const tube = B(g, cylGeo(0.03, 0.03, 1.8, 8), cm, 0.34, 1.0, 0.2);
  tube.rotation.z = 0.04;
  cyl(g, 0.025, 0.025, 1.6, mat(0x3366cc, { rough: 0.8 }), 0.36, 0.9, 0.05, 8);
  // feet
  box(g, 0.66, 0.06, 0.86, mat(0x0d0f12), 0, 0.03, 0);
  return g;
}

// 10 — GPU Compute Pod
function gpuPod() {
  const g = new THREE.Group();
  rbox(g, 0.82, 2.25, 1.05, 0.02, mat(0x101318, { rough: 0.45, metal: 0.4 }), 0, 1.125, 0);
  plate(g, 0.74, 2.1, screenMat(podTex, 1.15), 0, 1.1, 0.526);
  // full-height breathing status bar
  box(g, 0.03, 2.0, 0.02, blinkMat(0x38e0ff, { speed: 1.1, min: 0.5, max: 2.4 }), -0.36, 1.1, 0.52);
  // rear copper bus bars
  const cu = mat(0xb87333, { rough: 0.35, metal: 0.8 });
  for (const sx of [-0.15, 0.15]) box(g, 0.05, 2.0, 0.03, cu, sx, 1.1, -0.53);
  // overhead cable tray stub
  box(g, 0.5, 0.06, 1.0, mat(0x2a2f36, { rough: 0.6, metal: 0.5 }), 0, 2.33, 0);
  box(g, 0.4, 0.05, 0.9, mat(0xcc7722, { rough: 0.8 }), 0, 2.38, 0);
  return g;
}

// 11 — Cryo Supercomputer Row (8 linked cabinets bought as one unit)
function cryoRow() {
  const g = new THREE.Group();
  const cabMat = mat(0x0b0d11, { rough: 0.35, metal: 0.5 });
  const N = 8, SP = 0.78;
  const width = N * SP;
  for (let i = 0; i < N; i++) {
    const x = -width / 2 + SP / 2 + i * SP;
    rbox(g, 0.72, 2.3, 1.1, 0.02, cabMat, x, 1.15, 0);
    // e-ink metrics panel
    plate(g, 0.3, 0.2, screenMat(metricsTex, 0.9), x, 1.7, 0.552);
    // vertical coolant drop from overhead pipe
    cyl(g, 0.045, 0.045, 0.45, mat(0xb8bec4, { rough: 0.3, metal: 0.7 }), x, 2.5, 0, 10);
    // frost patch at quick-disconnect
    B(g, sphereGeo(0.07, 10), mat(0xdfe8ee, { rough: 0.95 }), x, 2.32, 0.1).scale.set(1, 0.5, 1);
  }
  // continuous light seam down the row (traveling pulse via phased segments)
  for (let i = 0; i < N; i++) {
    const x = -width / 2 + SP / 2 + i * SP;
    box(g, SP - 0.06, 0.025, 0.02, blinkMat(0x38e0ff, { speed: 1.6, min: 0.25, max: 2.6, phase: i * 0.7 }), x, 1.15, 0.553);
  }
  // overhead insulated coolant pipe
  const pipe = B(g, cylGeo(0.09, 0.09, width + 0.4, 12), mat(0x9aa4ac, { rough: 0.55, metal: 0.4 }), 0, 2.72, 0);
  pipe.rotation.z = Math.PI / 2;
  // glass end doors
  const glass = mat(0x9fd8ff, { transparent: true, opacity: 0.15, rough: 0.1 });
  plate(g, 1.15, 2.3, glass, -width / 2 - 0.02, 1.15, 0, Math.PI / 2);
  plate(g, 1.15, 2.3, glass, width / 2 + 0.02, 1.15, 0, Math.PI / 2);
  // floor light strips along the aisle
  box(g, width, 0.012, 0.05, blinkMat(0x1c6dff, { speed: 0.8, min: 0.3, max: 1.2 }), 0, 0.008, 0.75);
  return g;
}

// 12 — Quantum Annex (golden chandelier in cryostat)
function quantum() {
  const g = new THREE.Group();
  // plinth
  cyl(g, 1.15, 1.3, 0.12, mat(0x14181e, { rough: 0.4, metal: 0.4 }), 0, 0.06, 0, 28);
  B(g, cylGeo(1.0, 1.0, 0.02, 28), blinkMat(0x2244ff, { speed: 0.9, min: 0.6, max: 2.0 }), 0, 0.13, 0);
  // cryostat frame: 3 posts + top ring
  const fm = mat(0x2e353d, { rough: 0.4, metal: 0.6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    cyl(g, 0.04, 0.04, 2.6, fm, Math.cos(a) * 1.0, 1.42, Math.sin(a) * 1.0, 10);
  }
  const ring = B(g, new THREE.TorusGeometry(1.0, 0.05, 10, 32), fm, 0, 2.72, 0);
  ring.rotation.x = Math.PI / 2;
  // chandelier (rotates slowly)
  const ch = new THREE.Group(); ch.position.y = 2.55; ch.userData.spin = { axis: 'y', speed: 0.12 }; g.add(ch);
  const gold = mat(0xd4a017, { rough: 0.22, metal: 1.0 });
  const goldDark = mat(0x8f6f1e, { rough: 0.3, metal: 1.0 });
  const tiers = [
    { r: 0.55, y: 0 }, { r: 0.42, y: -0.5 }, { r: 0.3, y: -1.0 }, { r: 0.18, y: -1.5 },
  ];
  for (const t of tiers) cyl(ch, t.r, t.r, 0.035, gold, 0, t.y, 0, 28);
  // hanging cable stages between plates
  for (let s = 0; s < tiers.length - 1; s++) {
    const a0 = tiers[s], a1 = tiers[s + 1];
    const n = 14 - s * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + s * 0.3;
      const r = (a0.r + a1.r) / 2;
      cyl(ch, 0.006, 0.006, a0.y - a1.y, goldDark, Math.cos(a) * r, (a0.y + a1.y) / 2, Math.sin(a) * r, 6);
    }
    // coiled loop hints at plate edges
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + s;
      const loop = B(ch, new THREE.TorusGeometry(0.03, 0.006, 6, 12), goldDark, Math.cos(a) * a0.r * 0.9, a0.y - 0.08, Math.sin(a) * a0.r * 0.9);
      loop.rotation.x = Math.PI / 2.3;
    }
  }
  // bottom qubit stage: small dark cylinder
  cyl(ch, 0.07, 0.07, 0.12, mat(0x1a1d22, { rough: 0.3, metal: 0.8 }), 0, -1.62, 0, 14);
  return g;
}

export const builders = [
  ibm5100, altair, appleII, c64, pc5150, tower486, imacG3, rgbRig,
  sled1U, rack42U, gpuPod, cryoRow, quantum,
];

// approximate model heights, used to scale museum miniatures
export const HEIGHTS = [0.22, 0.21, 1.3, 1.15, 1.35, 1.15, 1.15, 1.15, 0.06, 2.15, 2.4, 2.9, 2.9];

export function museumMini(tierIdx) {
  const model = builders[tierIdx](0);
  const s = 0.3 / HEIGHTS[tierIdx];
  model.scale.setScalar(Math.min(s, 1.4));
  return model;
}
