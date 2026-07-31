// Deterministic anchor slots per tier + sync of owned counts to placed models.
import * as THREE from 'three';
import { ROOMS } from './rooms.js';
import { builders, museumMini } from './models.js';
import { tween, easeOutBack, burst, registerSpins, unregisterSpins } from './fx.js';

// visible caps per tier (HUD always shows true counts)
export const CAPS = [8, 8, 10, 10, 12, 12, 10, 8, 42, 12, 8, 4, 1];

// ---------- anchor generation ----------
function grid(cx, cz, cols, rows, dx, dz, ry = 0) {
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ x: cx + (c - (cols - 1) / 2) * dx, y: 0, z: cz + r * dz, ry });
  return out;
}

export function buildAnchors() {
  const A = [];
  const R = ROOMS;
  // 0 — IBM 5100s on the garage workbench (bench top y=0.95) + shelf above
  {
    const r = R[0];
    const bench = [];
    for (let i = 0; i < 6; i++) bench.push({ x: r.x - 2.9 + i * 1.15, y: 0.95, z: -r.d / 2 + 0.65, ry: (i % 2) * 0.14 - 0.07 });
    bench.push({ x: r.x - 1.2, y: 1.9, z: -r.d / 2 + 0.55, ry: 0.1 });
    bench.push({ x: r.x + 0.4, y: 1.9, z: -r.d / 2 + 0.55, ry: -0.08 });
    A[0] = bench;
  }
  // 1 — Altairs on the right-wall shelving unit
  {
    const r = R[0];
    const out = [];
    for (let s = 0; s < 2; s++)
      for (let i = 0; i < 4; i++)
        out.push({ x: r.x + r.w / 2 - 0.55, y: 0.62 + s * 0.72, z: -2.4 + i * 1.35, ry: -Math.PI / 2 });
    A[1] = out;
  }
  // 2/3 — Apple IIs and C64s in home office, facing each other in rows
  {
    const r = R[1];
    A[2] = grid(r.x - 2.4, -r.d / 2 + 1.2, 2, 5, 1.5, 1.35, 0).map((a, i) => ({ ...a, ry: (i % 3) * 0.12 - 0.1 }));
    A[3] = grid(r.x + 2.4, -r.d / 2 + 1.2, 2, 5, 1.5, 1.35, 0).map((a, i) => ({ ...a, ry: (i % 3) * -0.12 + 0.06 }));
  }
  // 4/5 — cubicle blocks in the office
  {
    const r = R[2];
    A[4] = grid(r.x - 3.9, -r.d / 2 + 1.1, 3, 4, 1.9, 2.1, 0);
    A[5] = grid(r.x + 3.9, -r.d / 2 + 1.1, 3, 4, 1.9, 2.1, 0);
  }
  // 6/7 — loft: iMac tables and LAN row
  {
    const r = R[3];
    A[6] = grid(r.x - 3.8, -r.d / 2 + 1.4, 2, 5, 1.9, 1.6, 0.15);
    A[7] = grid(r.x + 4.0, -r.d / 2 + 1.2, 2, 4, 2.0, 1.9, -0.1);
  }
  // 8 — 1U sleds slot into 3 rack frames in the server room
  {
    const r = R[4];
    const out = [];
    for (let f = 0; f < 3; f++) {
      const fx = r.x - 5.5 + f * 1.4;
      for (let u = 0; u < 14; u++)
        out.push({ x: fx, y: 0.12 + u * 0.135, z: -r.d / 2 + 1.4, ry: 0, slide: true });
    }
    A[8] = out;
  }
  // 9 — 42U racks in a row along the server room
  {
    const r = R[4];
    const out = [];
    for (let i = 0; i < 12; i++)
      out.push({ x: r.x - 4.5 + (i % 6) * 1.6, y: 0, z: 0.6 + Math.floor(i / 6) * 3.0, ry: Math.floor(i / 6) === 1 ? Math.PI : 0 });
    A[9] = out;
  }
  // 10 — GPU pods, two aisles in the datacenter
  {
    const r = R[5];
    const out = [];
    for (let i = 0; i < 8; i++)
      out.push({ x: r.x - 10 + (i % 4) * 2.4, y: 0, z: -r.d / 2 + 3 + Math.floor(i / 4) * 4.5, ry: Math.floor(i / 4) === 1 ? Math.PI : 0 });
    A[10] = out;
  }
  // 11 — cryo rows fill the far half of the datacenter hall
  {
    const r = R[5];
    const out = [];
    for (let i = 0; i < 4; i++)
      out.push({ x: r.x + 6.5, y: 0, z: -r.d / 2 + 2.6 + i * 3.6, ry: 0 });
    A[11] = out;
  }
  // 12 — the chandelier, alone in the vault
  {
    const r = R[6];
    A[12] = [{ x: r.x, y: 0, z: 0, ry: 0 }];
  }
  return A;
}

// ---------- placement manager ----------
export class Placement {
  constructor(scene) {
    this.scene = scene;
    this.anchors = buildAnchors();
    this.placed = Array.from({ length: CAPS.length }, () => []);
    this.museumGroup = new THREE.Group();
    this.museumCount = 0;
    scene.add(this.museumGroup);
    // museum shelf position (garage left wall)
    const r = ROOMS[0];
    this.museumGroup.position.set(r.x - r.w / 2 + 0.45, 0, 0);
    this.museumGroup.rotation.y = Math.PI / 2;
  }

  // ensure scene matches owned counts; animate new additions
  sync(owned, animate = true) {
    for (let i = 0; i < CAPS.length; i++) {
      const target = Math.min(owned[i], CAPS[i], this.anchors[i].length);
      const arr = this.placed[i];
      // remove (prestige / import with fewer)
      while (arr.length > target) {
        const m = arr.pop();
        unregisterSpins(m);
        this.scene.remove(m);
      }
      // add — cap the per-frame burst so ×100 buys don't hitch
      let added = 0;
      while (arr.length < target && added < 6) {
        this.addUnit(i, arr.length, animate);
        added++;
      }
    }
  }

  addUnit(tier, idx, animate) {
    const a = this.anchors[tier][idx];
    const model = builders[tier](idx);
    model.position.set(a.x, a.y, a.z);
    model.rotation.y = a.ry || 0;
    this.scene.add(model);
    registerSpins(model);
    this.placed[tier].push(model);
    if (!animate) return;
    if (a.slide) {
      // server sled slides in from the front
      const z0 = a.z + 0.9;
      model.position.z = z0;
      tween((k) => { model.position.z = z0 + (a.z - z0) * k; }, 0.45);
      burst(new THREE.Vector3(a.x, a.y + 0.1, a.z + 0.4), 0x39ff6a, 10, 0.03);
    } else {
      model.scale.setScalar(0.01);
      tween((k) => { const s = Math.max(0.01, k); model.scale.setScalar(s); }, 0.5, easeOutBack);
      burst(new THREE.Vector3(a.x, a.y + 0.3, a.z), tier >= 10 ? 0x38e0ff : 0x4ade80, 20, 0.05);
    }
  }

  // centroid of a tier's currently-placed units (for camera fly-to)
  tierFocus(tier) {
    const arr = this.placed[tier];
    if (!arr.length) return null;
    const c = new THREE.Vector3();
    for (const m of arr) c.add(m.position);
    c.divideScalar(arr.length);
    c.y += tier >= 8 ? 1.2 : 0.9;
    return c;
  }

  // museum shelf minis (max 8 shown)
  syncMuseum(museum) {
    while (this.museumCount < Math.min(museum.length, 8)) {
      const i = this.museumCount;
      const mini = museumMini(museum[i]);
      const shelfY = i < 4 ? 1.17 : 1.72;
      mini.position.set(-0.75 + (i % 4) * 0.5, shelfY, 0);
      mini.rotation.y = -0.3 + (i % 3) * 0.3;
      this.museumGroup.add(mini);
      this.museumCount++;
    }
  }

  clearAll() {
    for (let i = 0; i < this.placed.length; i++) {
      for (const m of this.placed[i]) { unregisterSpins(m); this.scene.remove(m); }
      this.placed[i] = [];
    }
  }
}
