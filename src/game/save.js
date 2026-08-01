// localStorage autosave + export/import + offline earnings.
import { G, setState, defaultState, recompute, D, events, earn } from './state.js';
import { OFFLINE_CAP } from './balance.js';

const KEY = 'silicon-empire-save';

export function save() {
  G.lastSave = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(G));
  } catch (e) { /* storage full/blocked — keep playing */ }
}

// Merge a parsed save over defaults so old saves survive new fields.
function hydrate(parsed) {
  const s = defaultState();
  for (const k of Object.keys(s)) {
    if (parsed[k] === undefined) continue;
    if (Array.isArray(s[k])) {
      if (s[k].length > 0) {
        // fixed-length per-tier arrays: keep default length (new tiers append as 0)
        const arr = s[k].slice();
        for (let i = 0; i < Math.min(arr.length, parsed[k].length); i++) arr[i] = parsed[k][i];
        s[k] = arr;
      } else {
        // variable-length lists (museum): take the saved value as-is
        s[k] = Array.isArray(parsed[k]) ? parsed[k].slice() : s[k];
      }
    } else if (typeof s[k] === 'object' && s[k] !== null && !Array.isArray(parsed[k])) {
      s[k] = { ...s[k], ...parsed[k] };
    } else {
      s[k] = parsed[k];
    }
  }
  s.seen[0] = Math.max(s.seen[0], 2);
  return s;
}

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (!raw) return { loaded: false, offlineEarned: 0, offlineSecs: 0 };
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return { loaded: false, offlineEarned: 0, offlineSecs: 0 }; }
  const s = hydrate(parsed);
  setState(s);

  // offline earnings
  const now = Date.now();
  const secs = Math.min(OFFLINE_CAP, Math.max(0, (now - (s.lastSave || now)) / 1000));
  let offlineEarned = 0;
  if (secs > 10) {
    recompute();
    let rate = 0.5;
    if (s.research.sw3) rate = 0.75;
    if (s.research.sw5) rate = 1.0;
    if (s.research.sw10) rate *= 1.5;
    offlineEarned = D.cps * secs * rate;
    if (offlineEarned > 0) earn(offlineEarned);
    s.rp += D.rps * secs * rate;
  }
  return { loaded: true, offlineEarned, offlineSecs: secs };
}

export function exportSave() {
  G.lastSave = Date.now();
  return btoa(unescape(encodeURIComponent(JSON.stringify(G))));
}

export function importSave(text) {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.owned)) return false;
    setState(hydrate(parsed));
    save();
    events.emit('loaded');
    return true;
  } catch (e) {
    return false;
  }
}

export function hardReset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  setState(defaultState());
  G.seen[0] = 2;
  save();
  events.emit('loaded');
}

export function initAutosave() {
  setInterval(save, 30000);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}
