// Bootstrap: game logic loop + HUD + 3D world.
import { G, tick, fmt, events } from './game/state.js';
import * as STATE from './game/state.js';
import * as SAVE from './game/save.js';
import { ERAS } from './game/balance.js';
import { load, save, initAutosave } from './game/save.js';
import { initHUD, setSceneAPI, toast, refresh, runBootSplash } from './ui/hud.js';
import { initAudio } from './game/audio.js';
import { initWorld } from './scene/world.js';

// ---- load save & offline earnings ----
const { loaded, offlineEarned, offlineSecs } = load();

// ---- HUD ----
runBootSplash();
initHUD();
initAudio();

if (loaded && offlineEarned > 0) {
  const hrs = offlineSecs / 3600;
  const when = hrs >= 1 ? `${hrs.toFixed(1)}h` : `${Math.round(offlineSecs / 60)}m`;
  toast(`💤 While you were away (${when}): +₵${fmt(offlineEarned)}`, 'gold');
}

// ---- 3D world ----
let world = null;
try {
  world = initWorld(document.getElementById('scene-container'));
  setSceneAPI(world);
} catch (e) {
  console.error('3D world failed to start; running in HUD-only mode.', e);
}

events.on('era', (era) => {
  toast(`🏗 <b>${ERAS[era].name} unlocked</b><br><span style="color:var(--dim)">${ERAS[era].blurb}</span>`, 'gold');
});

// ---- logic loop (headless, independent of rendering) ----
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  // background-tab throttling can lump time; cap a single step
  dt = Math.min(dt, 600);
  tick(dt);
}, 250);

// ---- render loop ----
if (world) {
  let lastFrame = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    world.tick(dt, now / 1000);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---- autosave ----
initAutosave();
save();

// debug/cheat handle (also used by automated playtesting)
window.GAME = {
  get G() { return G; },
  events,
  world,
  state: STATE,
  save: SAVE,
  cheat(n) { G.credits += n; G.lifetime += n; G.lifetimeRun += n; refresh(); },
  cheatRP(n) { G.rp += n; refresh(); },
};
