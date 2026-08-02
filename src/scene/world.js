// The 3D world: renderer, rooms, lighting, camera, era reveals, bloom.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { G, D, events } from '../game/state.js';
import { TIERS } from '../game/balance.js';
import { ROOMS } from './rooms.js';
import { mat, box, plate, screenTex, screenMat } from './helpers.js';
import { rackFrame, museumShelf, desk } from './models.js';
import { Placement, CAPS } from './placement.js';
import { buildOutdoorWorlds, buildBackdrop } from './outside.js';
import { updateFX, tween, finishTweens, easeInOut, setParticleScene, burst, registerSpins } from './fx.js';

export function initWorld(container) {
  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030706);
  scene.fog = new THREE.Fog(0x0b1512, 45, 420); // gentle haze; the whole strip stays readable at max zoom

  // ---------- sky: gradient dome, stars, moon ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(520, 24, 14),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = clamp(normalize(vP).y * 2.0, 0.0, 1.0);
          vec3 hor = vec3(0.058, 0.110, 0.088);   // phosphor city-glow horizon
          vec3 zen = vec3(0.006, 0.010, 0.016);
          gl_FragColor = vec4(mix(hor, zen, h), 1.0);
        }`,
    })
  );
  scene.add(sky);
  {
    const starPos = [];
    for (let i = 0; i < 650; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.06 + Math.random() * 1.4;
      const r = 470;
      starPos.push(r * Math.cos(e) * Math.cos(a), r * Math.sin(e), r * Math.cos(e) * Math.sin(a));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xaebfca, size: 1.6, sizeAttenuation: false,
      transparent: true, opacity: 0.7, fog: false, depthWrite: false,
    })));
    const halo = new THREE.Mesh(new THREE.CircleGeometry(30, 24),
      new THREE.MeshBasicMaterial({ color: 0x1c262e, transparent: true, opacity: 0.55, fog: false }));
    halo.position.set(-150, 200, -340); halo.lookAt(0, 0, 0);
    scene.add(halo);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(15, 24),
      new THREE.MeshBasicMaterial({ color: 0xd8e2ea, fog: false }));
    moon.position.set(-149, 199, -337.5); moon.lookAt(0, 0, 0);
    scene.add(moon);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(3, 4.5, 9);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.minDistance = 2;
  controls.maxDistance = 160;
  controls.maxPolarAngle = 1.48;
  controls.autoRotateSpeed = 0.55; // gentle orbit once a zoom lands
  controls.addEventListener('start', () => { controls.autoRotate = false; }); // user takes over

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x8fa0b8, 0.7));
  const hemi = new THREE.HemisphereLight(0xb8ccd8, 0x3a4238, 0.95);
  scene.add(hemi);
  // cool moonlight so distant geometry keeps its shape
  const moonLight = new THREE.DirectionalLight(0x9fb4dc, 0.75);
  moonLight.position.set(-60, 90, 50);
  scene.add(moonLight);

  // ---------- rooms ----------
  const roomGroups = [];
  const roomLights = [];
  const WALL_H = 3.4;

  function buildRoom(def) {
    const g = new THREE.Group();
    const { x, w, d, wall, floor, light, lightInt } = def;
    g.position.set(x, 0, 0);
    const wallMat = mat(wall, { rough: 0.9 });
    box(g, w, 0.1, d, mat(floor, { rough: 0.85 }), 0, -0.05, 0);
    box(g, w, WALL_H, 0.12, wallMat, 0, WALL_H / 2, -d / 2);          // back
    box(g, 0.12, WALL_H, d, wallMat, -w / 2, WALL_H / 2, 0);          // left
    box(g, 0.12, WALL_H, d, wallMat, w / 2, WALL_H / 2, 0);           // right
    const pl = new THREE.PointLight(light, lightInt, Math.max(w, d) * 2.4, 1.8);
    pl.position.set(0, WALL_H - 0.4, 0.5);
    g.add(pl);
    roomLights[def.era] = pl;
    scene.add(g);
    return g;
  }

  // per-room props
  function propGarage(g, def) {
    const bench = new THREE.Group();
    box(bench, 7.4, 0.09, 1.0, mat(0x6e5638, { rough: 0.8 }), 0, 0.9, 0);
    for (const sx of [-3.4, 0, 3.4]) box(bench, 0.09, 0.9, 0.9, mat(0x33291d), sx, 0.45, 0);
    box(bench, 7.0, 1.1, 0.05, mat(0x5c5346, { rough: 0.95 }), 0, 2.1, -0.42); // pegboard
    box(bench, 5.2, 0.05, 0.7, mat(0x584a34, { rough: 0.8 }), -0.4, 1.85, -0.1); // shelf over bench
    bench.position.set(0, 0, -def.d / 2 + 0.62);
    g.add(bench);
    // right-wall shelving for Altairs
    const shelves = new THREE.Group();
    for (let s = 0; s < 3; s++) box(shelves, 0.9, 0.05, 5.6, mat(0x584a34, { rough: 0.8 }), 0, 0.55 + s * 0.72, 0);
    for (const sz of [-2.7, 0, 2.7]) box(shelves, 0.06, 2.1, 0.8, mat(0x33291d), -0.4, 1.05, sz);
    shelves.position.set(def.w / 2 - 0.55, 0, 0);
    g.add(shelves);
    // museum shelf on left wall
    const ms = museumShelf();
    ms.position.set(-def.w / 2 + 0.45, 0, 0);
    ms.rotation.y = Math.PI / 2;
    g.add(ms);
    // garage door panel lines on back wall
    for (let i = 0; i < 4; i++) box(g, 3.4, 0.04, 0.04, mat(0x3a352c), 1.8, 0.7 + i * 0.75, -def.d / 2 + 0.09);
  }

  function propHomeOffice(g, def) {
    // warm window
    plate(g, 1.6, 1.4, mat(0xffe6b0, { emissive: 0xffd080, eInt: 0.35 }), -2.2, 1.9, -def.d / 2 + 0.07);
    plate(g, 1.6, 1.4, mat(0xffe6b0, { emissive: 0xffd080, eInt: 0.35 }), 2.2, 1.9, -def.d / 2 + 0.07);
    box(g, def.w * 0.7, 0.02, def.d * 0.6, mat(0x59453c, { rough: 0.95 }), 0, 0.011, 0.4); // rug
  }

  function propOffice(g, def) {
    // fluorescent bars
    for (let i = 0; i < 4; i++)
      box(g, 2.2, 0.06, 0.4, mat(0xf4f8ff, { emissive: 0xeef3ff, eInt: 1.6 }), -5 + i * 3.4, WALL_H - 0.15, 0.5);
    // wall clock
    plate(g, 0.5, 0.5, mat(0xd8dce0, { emissive: 0xd8dce0, eInt: 0.2 }), 0, 2.4, -def.d / 2 + 0.07);
  }

  function propLoft(g, def) {
    // brick tint stripes + neon sign
    const neonTex = screenTex(256, 64, (c, w, h) => {
      c.fillStyle = '#160d12'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ff2bd6'; c.lineWidth = 3; c.font = 'bold 30px monospace';
      c.strokeText('SILICON EMPIRE', 8, 42);
    }, 0);
    plate(g, 4.4, 1.1, screenMat(neonTex, 1.8), 0, 2.4, -def.d / 2 + 0.08);
    box(g, def.w * 0.5, 0.02, def.d * 0.5, mat(0x2e4638, { rough: 0.95 }), -2, 0.011, 0.6); // rug
  }

  const rackFrames = [];
  function propServer(g, def) {
    // raised-floor grid
    const gridTex = screenTex(256, 256, (c, w, h) => {
      c.fillStyle = '#2b3138'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#20252b'; c.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke();
        c.beginPath(); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke();
      }
    }, 0);
    gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
    gridTex.repeat.set(def.w / 2, def.d / 2);
    const fl = plate(g, def.w, def.d, new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.8 }), 0, 0.012, 0);
    fl.rotation.x = -Math.PI / 2;
    // three empty rack frames waiting for 1U sleds
    for (let f = 0; f < 3; f++) {
      const fr = rackFrame();
      fr.position.set(-5.5 + f * 1.4, 0, -def.d / 2 + 1.4);
      g.add(fr);
      rackFrames.push(fr);
    }
    // overhead cable tray
    box(g, def.w * 0.8, 0.05, 0.5, mat(0x2a2f36, { rough: 0.6, metal: 0.5 }), 0, WALL_H - 0.5, -def.d / 2 + 1.4);
  }

  let fogPlanes = [];
  function propDatacenter(g, def) {
    // floating light strips (no ceiling — every room stays open-top)
    for (let i = 0; i < 5; i++) {
      const strip = plate(g, def.w * 0.85, 0.18, mat(0xbfe0ff, { emissive: 0xbfe0ff, eInt: 0.9 }), 0, WALL_H - 0.02, -def.d / 2 + 2 + i * 3.6);
      strip.rotation.x = Math.PI / 2; // faces down; invisible edge-on
    }
    // aisle guide strips
    for (let i = 0; i < 3; i++)
      box(g, def.w * 0.9, 0.012, 0.06, mat(0x1c6dff, { emissive: 0x1c6dff, eInt: 1.1 }), 0, 0.012, -def.d / 2 + 4.2 + i * 4.2);
    // ground fog planes (visible once cryo rows exist)
    const fogTex = screenTex(128, 128, (c, w, h) => {
      const img = c.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 80;
        img.data[i] = 200; img.data[i + 1] = 225; img.data[i + 2] = 255;
        img.data[i + 3] = Math.random() < 0.5 ? 0 : v * 0.25;
      }
      c.putImageData(img, 0, 0);
    }, 0);
    fogTex.wrapS = fogTex.wrapT = THREE.RepeatWrapping;
    for (let i = 0; i < 2; i++) {
      const fm = new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.35, depthWrite: false });
      const fp = plate(g, 16, 8, fm, 6.5, 0.25 + i * 0.18, 0);
      fp.rotation.x = -Math.PI / 2;
      fp.visible = false;
      fogPlanes.push(fp);
    }
  }

  function propVault(g, def) {
    // ring of instrument boxes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const ib = new THREE.Group();
      box(ib, 0.5, 1.1, 0.4, mat(0x1a2028, { rough: 0.5, metal: 0.4 }), 0, 0.55, 0);
      box(ib, 0.4, 0.06, 0.02, mat(0x38e0ff, { emissive: 0x38e0ff, eInt: 1.4 }), 0, 0.9, 0.21);
      ib.position.set(Math.cos(a) * 4.4, 0, Math.sin(a) * 4.4);
      ib.lookAt(0, 0.5, 0);
      g.add(ib);
    }
  }

  const props = [propGarage, propHomeOffice, propOffice, propLoft, propServer, propDatacenter, propVault];
  for (const def of ROOMS) {
    const g = buildRoom(def);
    props[def.era](g, def);
    g.visible = false;
    roomGroups[def.era] = g;
  }

  // ---------- outdoor worlds (the whole outdoors matches the latest era) ----------
  const outdoorWorlds = buildOutdoorWorlds(scene);
  for (const g of outdoorWorlds) registerSpins(g);
  const backdrop = buildBackdrop(scene);

  let outdoorEra = -1;
  function showOutdoor(era, animated = false) {
    if (era === outdoorEra) return;
    outdoorEra = era;
    outdoorWorlds.forEach((g, i) => { g.visible = i === era; g.scale.set(1, 1, 1); });
    if (animated) {
      const g = outdoorWorlds[era];
      g.scale.set(1, 0.01, 1);
      tween((k) => { g.scale.y = Math.max(0.01, k); }, 0.9, easeInOut);
    }
  }

  // static geometry never moves — freeze matrices to skip per-frame updates
  for (const grp of [...roomGroups, ...outdoorWorlds, backdrop]) {
    grp.traverse((o) => { if (o.isMesh) { o.updateMatrix(); o.matrixAutoUpdate = false; } });
  }

  // ---------- placement ----------
  const placement = new Placement(scene);
  setParticleScene(scene);

  // ---------- camera framing ----------
  function roomView(era) {
    const r = ROOMS[era];
    const m = Math.max(r.w, r.d);
    const target = new THREE.Vector3(r.x, 1.0, 0.3);
    const pos = new THREE.Vector3(r.x - m * 0.12, m * 0.5 + 1.2, m * 0.8 + 2.5);
    return { target, pos };
  }

  let flightsActive = 0;
  function flyTo(target, pos, dur = 1.4, onDone = null) {
    controls.autoRotate = false; // any new flight cancels the gentle spin
    const t0 = controls.target.clone(), p0 = camera.position.clone();
    flightsActive++;
    tween((k) => {
      controls.target.lerpVectors(t0, target, k);
      camera.position.lerpVectors(p0, pos, k);
    }, dur, easeInOut, () => {
      flightsActive = Math.max(0, flightsActive - 1);
      onDone?.();
    });
  }

  function frameEra(era, animated = true) {
    const { target, pos } = roomView(era);
    if (animated) flyTo(target, pos);
    else {
      finishTweens();
      controls.autoRotate = false;
      controls.target.copy(target);
      camera.position.copy(pos);
    }
  }

  // ---------- era reveal ----------
  const revealed = ROOMS.map(() => false);

  function revealEra(era, animated = true) {
    if (revealed[era]) return;
    revealed[era] = true;
    const g = roomGroups[era];
    g.visible = true;
    showOutdoor(era, animated);
    if (!animated) { return; }
    g.scale.set(1, 0.01, 1);
    tween((k) => { g.scale.y = Math.max(0.01, k); }, 0.9, easeInOut);
    const r = ROOMS[era];
    burst(new THREE.Vector3(r.x, 1.2, 0), 0xffffff, 40, 0.08, 2.2);
    frameEra(era);
    events.emit('era', era);
  }

  function maxOwnedEra() {
    let era = 0;
    for (const t of TIERS) if (G.owned[t.id] > 0) era = Math.max(era, t.era);
    return era;
  }

  // reveal everything already reached by the save, place existing machines instantly
  function fullResync(animatedCamera = false) {
    placement.clearAll();
    for (const r of ROOMS) {
      revealed[r.era] = false;
      roomGroups[r.era].visible = false;
      roomGroups[r.era].scale.set(1, 1, 1);
    }
    outdoorEra = -1;
    const top = maxOwnedEra();
    for (let e = 0; e <= top; e++) revealEra(e, false);
    for (let i = 0; i < 40; i++) placement.sync(G.owned, false); // burst-place without animation
    placement.syncMuseum(G.museum);
    frameEra(top, animatedCamera);
  }
  fullResync(false);

  // close-up on the newest machine of a tier (anchor-based, so it works
  // even before the model finishes its pop-in animation)
  function flyToTierClose(tier) {
    if (flightsActive > 0) return; // don't restart the camera while a zoom is in flight
    const anchors = placement.anchors[tier];
    const idx = Math.max(0, Math.min(G.owned[tier], CAPS[tier], anchors.length) - 1);
    const a = anchors[idx];
    if (!a) return;
    let ty, dist;
    if (tier <= 1) { ty = a.y + 0.15; dist = 1.7; }          // bench & shelf machines
    else if (tier <= 7) { ty = 0.95; dist = 2.6; }           // desk setups
    else if (tier === 8) { ty = a.y + 0.05; dist = 2.2; }    // rack sled
    else if (tier <= 10) { ty = 1.3; dist = 4.5; }           // racks & pods
    else if (tier === 11) { ty = 1.4; dist = 8.5; }          // cryo row
    else { ty = 1.8; dist = 6.5; }                           // chandelier
    const target = new THREE.Vector3(a.x, ty, a.z);
    // approach from the machine's front (anchors on walls face into the room)
    const ry = a.ry || 0;
    const front = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    const right = new THREE.Vector3(front.z, 0, -front.x);
    const pos = target.clone()
      .addScaledVector(front, 0.86 * dist)
      .addScaledVector(right, 0.38 * dist)
      .add(new THREE.Vector3(0, 0.34 * dist, 0));
    flyTo(target, pos, 1.1, () => { controls.autoRotate = true; });
  }

  // ---------- click a room in 3D to center it ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointerDownAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownAt = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!pointerDownAt) return;
    const dx = e.clientX - pointerDownAt.x, dy = e.clientY - pointerDownAt.y;
    pointerDownAt = null;
    if (dx * dx + dy * dy > 36) return; // that was a drag, not a click
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    if (!hits.length) return;
    const p = hits[0].point;
    // rooms line up along x — pick the revealed room containing the hit point
    let bestEra = -1, bestD = Infinity;
    for (const def of ROOMS) {
      if (!revealed[def.era]) continue;
      const d = Math.abs(p.x - def.x);
      if (d < def.w / 2 + 1.5 && d < bestD) { bestD = d; bestEra = def.era; }
    }
    if (bestEra >= 0) frameEra(bestEra, true);
  });

  // ---------- events ----------
  events.on('buy', ({ tier, auto, free }) => {
    const era = TIERS[tier].era;
    if (!revealed[era]) { revealEra(era, true); return; }
    if (!auto && !free) flyToTierClose(tier);
  });
  events.on('prestige', () => {
    placement.clearAll();
    for (const r of ROOMS) if (r.era > 0) {
      revealed[r.era] = false;
      roomGroups[r.era].visible = false;
    }
    showOutdoor(0, false);
    placement.syncMuseum(G.museum);
    frameEra(0, true);
  });
  events.on('loaded', () => fullResync(false));
  events.on('shard', () => {
    const r = ROOMS[6];
    burst(new THREE.Vector3(r.x, 2.2, 0), 0xffe066, 30, 0.07, 1.8);
  });

  // incident: flicker the affected room's light
  let flicker = 0;
  events.on('incident', ({ tier }) => { flicker = 1.2; });

  // ---------- post-processing: bloom ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  bloom.enabled = G.settings.bloom !== false;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- per-frame ----------
  let syncTimer = 0;
  const baseInt = ROOMS.map((r) => r.lightInt);

  function tick(dt, t) {
    controls.update();
    updateFX(dt, t);

    syncTimer -= dt;
    if (syncTimer <= 0) {
      syncTimer = 0.35;
      placement.sync(G.owned, true);
      placement.syncMuseum(G.museum);
      // fog appears with the cryo rows
      const showFog = G.owned[11] > 0;
      for (const fp of fogPlanes) fp.visible = showFog;
    }
    // scroll fog
    for (const fp of fogPlanes) { fp.material.map.offset.x += dt * 0.008; fp.material.map.offset.y += dt * 0.004; }

    // light flicker: incidents + power throttling
    if (flicker > 0) flicker -= dt;
    for (let e = 0; e < roomLights.length; e++) {
      const L = roomLights[e];
      if (!L) continue;
      let f = 1;
      if (flicker > 0) f *= 0.4 + Math.random() * 0.7;
      else if (D.throttled) f *= 0.75 + Math.random() * 0.2;
      L.intensity = baseInt[e] * f;
    }

    composer.render();
  }

  return {
    _scene: scene,
    _camera: camera,
    _controls: controls,
    tick,
    flyToTier(i) {
      const focus = placement.tierFocus(i);
      if (!focus) return;
      const dist = i >= 10 ? 11 : i >= 8 ? 7 : 3.2;
      const pos = focus.clone().add(new THREE.Vector3(dist * 0.35, dist * 0.55, dist * 0.9));
      flyTo(focus, pos, 1.2, () => { controls.autoRotate = true; });
    },
    setBloom(b) { bloom.enabled = b; },
    frameEra,
  };
}
