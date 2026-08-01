// Headless game state + logic. No DOM, no three.js — fully simulatable.
import {
  TIERS, UPGRADES, INFRA, RESEARCH, MILESTONES,
  PRESTIGE_UNLOCK, CHIP_MULT, chipsFor, rpRate, CLICK_CPS_FRACTION,
  JOB_CPS_LIMIT, JOB_NAMES, SHARD_CHANCE_PER_ANNEX, INCIDENT_BASE_CHANCE,
  costGrowth, infraGrowth, bulkCost, maxAffordable, infraCost, milestoneMult,
} from './balance.js';

// ---------- events ----------
const listeners = {};
export const events = {
  on(name, fn) { (listeners[name] ||= []).push(fn); },
  emit(name, data) { for (const fn of listeners[name] || []) fn(data); },
};

// ---------- state ----------
export function defaultState() {
  return {
    v: 1,
    credits: 0,
    lifetime: 0,        // across all prestiges
    lifetimeRun: 0,     // this run only
    owned: Array(TIERS.length).fill(0),
    offline: Array(TIERS.length).fill(0),   // units knocked out by heat incidents
    upgrades: {},       // id -> true
    research: {},       // id -> true
    rp: 0,
    alloc: 0,           // 0..0.9 fraction of compute diverted to research
    infra: {},          // id -> count
    chips: 0,
    prestiges: 0,
    museum: [],         // per prestige: highest tier index reached
    seen: Array(TIERS.length).fill(0), // 0 hidden, 1 silhouette, 2 revealed (sticky)
    autoBuy: false,
    clicks: 0,
    job: null,          // {name, reward, expires}
    jobTimer: 20,       // seconds until next job offer
    lastSave: Date.now(),
    started: Date.now(),
    settings: { vol: 0.5, bloom: true },
  };
}

export let G = defaultState();
G.seen[0] = 2; // the starter machine is always visible

export function setState(s) { G = s; }

// ---------- derived (recomputed every tick) ----------
export const D = {
  mult: Array(TIERS.length).fill(1),
  rate: Array(TIERS.length).fill(0), // per-unit rate incl. mults
  cps: 0,
  rps: 0,
  clickValue: 1,
  powerUse: 0, powerCap: 0,
  heatLoad: 0, coolCap: 0,
  throttled: false, overheating: false,
  growth: 1.15,
};

export function recompute() {
  const R = G.research;
  D.growth = costGrowth(R);

  const chipMult = R.inf_vault ? 0.03 : CHIP_MULT;
  let global = 1 + chipMult * G.chips;
  if (R.hw1) global *= 1.10;
  if (R.hw3) global *= 1.25;
  if (R.hw6) global *= 1.50;
  if (R.hw7) global *= 1.75;
  if (R.hw8) global *= 2;
  if (R.hw10) global *= 2.5;
  if (R.inf_leg) global *= 1 + 0.05 * G.museum.length;
  if (R.hw_vert) {
    const totalOwned = G.owned.reduce((a, b) => a + b, 0);
    global *= 1 + Math.min(2, totalOwned * 0.001);
  }
  if (G.alloc > 0 && R.inf_alloc) global *= (1 - G.alloc);

  // power & heat
  let powerCap = 0, coolCap = 0;
  for (const item of INFRA) {
    const n = G.infra[item.id] || 0;
    if (item.kind === 'power') powerCap += item.cap * n;
    else coolCap += item.cap * n;
  }
  let powerEff = 1;
  if (R.inf1) powerEff *= 0.85;
  if (R.inf3) powerEff *= 0.75;
  if (R.inf5) powerEff *= 0.6;
  if (R.inf10) powerEff *= 0.5;
  let powerUse = 0;
  for (const t of TIERS) powerUse += (G.owned[t.id] - G.offline[t.id]) * t.power * powerEff;
  let heatEff = 1;
  if (R.inf2) heatEff *= 0.85;
  if (R.inf4) heatEff *= 0.75;
  const heatLoad = powerUse * heatEff;

  D.powerUse = powerUse; D.powerCap = powerCap;
  D.heatLoad = heatLoad; D.coolCap = coolCap;
  D.throttled = powerUse > powerCap && powerUse > 0;
  D.overheating = heatLoad > coolCap && heatLoad > 0;
  if (D.throttled) global *= 0.5;

  // per-tier multipliers
  const adjCap = R.sw8 ? 2 : 1;
  let cps = 0;
  for (const t of TIERS) {
    const i = t.id;
    let m = milestoneMult(G.owned[i], R);
    for (const u of UPGRADES) if (u.tier === i && G.upgrades[u.id]) m *= u.mult;
    if (R.sw_net) {
      const adj = (i > 0 ? G.owned[i - 1] : 0) + (i < TIERS.length - 1 ? G.owned[i + 1] : 0);
      m *= 1 + Math.min(adjCap, adj * 0.01);
    }
    if (R.hw_retro && t.era <= 1) m *= 3;
    if (R.hw_office && (t.era === 2 || t.era === 3)) m *= 3;
    if (R.hw_hyper && (t.era === 4 || t.era === 5)) m *= 3;
    if (R.hw_q && i === 12) m *= 3;
    m *= global;
    D.mult[i] = m;
    D.rate[i] = t.baseRate * m;
    cps += Math.max(0, G.owned[i] - G.offline[i]) * D.rate[i];
  }
  D.cps = cps;

  // research points
  const distinct = G.owned.filter((n) => n > 0).length;
  let rps = rpRate(distinct);
  if (R.sw_rp1) rps *= 1.25;
  if (R.sw_rp2) rps *= 1.5;
  if (R.sw_rp3) rps *= 2;
  if (R.sw_rp4) rps *= 3;
  if (G.alloc > 0 && R.inf_alloc) rps *= 1 + 3 * G.alloc;
  D.rps = distinct >= 2 ? rps : 0; // RP starts once you own two distinct machines

  // clicking
  let cv = Math.max(1, cps * CLICK_CPS_FRACTION);
  if (R.sw1) cv *= 5;
  if (R.sw6) cv *= 5;
  D.clickValue = cv;

  return D;
}

// ---------- discovery ----------
function updateSeen() {
  for (const t of TIERS) {
    const i = t.id;
    if (t.requiresPrestige && G.prestiges < 1) continue;
    if (G.owned[i] > 0 || G.lifetimeRun >= t.baseCost * 0.35) {
      if (G.seen[i] < 2) { G.seen[i] = 2; events.emit('seen', i); }
    } else if (G.lifetimeRun >= t.baseCost * 0.07) {
      if (G.seen[i] < 1) { G.seen[i] = 1; events.emit('seen', i); }
    }
  }
}

// ---------- actions ----------
export function earn(amount) {
  G.credits += amount;
  G.lifetime += amount;
  G.lifetimeRun += amount;
}

export function doClick() {
  recompute();
  earn(D.clickValue);
  G.clicks++;
  events.emit('click', D.clickValue);
}

export function buyTier(i, qty = 1) {
  recompute();
  const g = D.growth;
  let n = qty === 'max' ? maxAffordable(i, G.owned[i], G.credits, g) : qty;
  if (n <= 0) return 0;
  const cost = bulkCost(i, G.owned[i], n, g);
  if (cost > G.credits + 1e-9) {
    if (qty === 'max') return 0;
    // try largest affordable chunk of the requested qty
    n = Math.min(n, maxAffordable(i, G.owned[i], G.credits, g));
    if (n <= 0) return 0;
    return buyTier(i, n);
  }
  G.credits -= cost;
  G.owned[i] += n;
  updateSeen();
  events.emit('buy', { tier: i, qty: n, owned: G.owned[i] });
  return n;
}

export function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || G.upgrades[id] || G.owned[u.tier] < u.need || G.credits < u.cost) return false;
  G.credits -= u.cost;
  G.upgrades[id] = true;
  events.emit('upgrade', u);
  return true;
}

export function buyResearch(id) {
  const r = RESEARCH.find((x) => x.id === id);
  if (!r || G.research[id] || G.rp < r.cost) return false;
  if (r.req && !G.research[r.req]) return false;
  G.rp -= r.cost;
  G.research[id] = true;
  events.emit('research', r);
  return true;
}

export function buyInfra(id) {
  const item = INFRA.find((x) => x.id === id);
  if (!item) return false;
  const cost = infraCost(item, G.infra[id] || 0, infraGrowth(G.research));
  if (G.credits < cost) return false;
  G.credits -= cost;
  G.infra[id] = (G.infra[id] || 0) + 1;
  events.emit('infra', item);
  return true;
}

export function claimJob() {
  if (!G.job) return;
  const r = G.job.reward;
  earn(r);
  events.emit('jobClaimed', G.job);
  G.job = null;
  G.jobTimer = 25 + Math.random() * 35;
}

export function rebootAll() {
  let n = 0;
  for (let i = 0; i < TIERS.length; i++) { n += G.offline[i]; G.offline[i] = 0; }
  if (n > 0) events.emit('reboot', n);
}

export function prestigeGain() {
  const bonus = G.research.inf_foundry ? 1.15 : 1;
  return Math.floor(chipsFor(G.lifetimeRun) * bonus);
}
export function prestigeAvailable() { return G.lifetimeRun >= PRESTIGE_UNLOCK; }

export function doPrestige() {
  if (!prestigeAvailable()) return false;
  const gain = prestigeGain();
  let maxTier = 0;
  for (let i = 0; i < TIERS.length; i++) if (G.owned[i] > 0) maxTier = i;
  G.museum.push(maxTier);
  G.chips += gain;
  G.prestiges++;
  G.credits = 0;
  G.lifetimeRun = 0;
  G.owned = Array(TIERS.length).fill(0);
  G.offline = Array(TIERS.length).fill(0);
  G.upgrades = {};
  G.infra = {};
  G.job = null;
  G.jobTimer = 15;
  updateSeen();
  events.emit('prestige', { gain, maxTier });
  return true;
}

// ---------- auto-buyer ----------
let autoBuyTimer = 0;
function autoBuyStep(dt) {
  if (!G.autoBuy || !G.research.inf_ai) return;
  autoBuyTimer -= dt;
  if (autoBuyTimer > 0) return;
  autoBuyTimer = G.research.inf9 ? 0.5 : 2;
  // fix power/cooling first
  if (D.throttled || D.overheating) {
    const kind = D.throttled ? 'power' : 'cool';
    let best = null, bestScore = 0;
    for (const item of INFRA) {
      if (item.kind !== kind) continue;
      const cost = infraCost(item, G.infra[item.id] || 0, infraGrowth(G.research));
      if (cost <= G.credits && item.cap / cost > bestScore) { best = item; bestScore = item.cap / cost; }
    }
    if (best && buyInfra(best.id)) {
      events.emit('autobuy', { label: best.name, key: 'infra:' + best.id });
      return;
    }
  }
  // then best credits/sec per credit
  let best = -1, bestScore = 0;
  for (const t of TIERS) {
    if (G.seen[t.id] < 2) continue;
    if (t.requiresPrestige && G.prestiges < 1) continue;
    const cost = bulkCost(t.id, G.owned[t.id], 1, D.growth);
    if (cost > G.credits) continue;
    const score = D.rate[t.id] / cost;
    if (score > bestScore) { bestScore = score; best = t.id; }
  }
  if (best >= 0 && buyTier(best, 1) > 0) {
    events.emit('autobuy', { label: TIERS[best].name, key: 'tier:' + best });
  }
}

// ---------- jobs ----------
function jobStep(dt) {
  if (G.job) {
    G.job.expires -= dt;
    if (G.job.expires <= 0) {
      events.emit('jobExpired', G.job);
      G.job = null;
      G.jobTimer = 20 + Math.random() * 30;
    }
    return;
  }
  if (D.cps > JOB_CPS_LIMIT) return;
  G.jobTimer -= dt;
  if (G.jobTimer <= 0) {
    let reward = Math.max(50, D.cps * 25, D.clickValue * 30);
    if (G.research.sw2) reward *= 2;
    if (G.research.sw7) reward *= 3;
    reward = Math.round(reward);
    G.job = {
      name: JOB_NAMES[Math.floor(Math.random() * JOB_NAMES.length)],
      reward,
      expires: 45,
    };
    events.emit('jobOffered', G.job);
  }
}

// ---------- heat incidents & quantum shards ----------
let autoRebootTimer = 0;
function hazardStep(dt) {
  if (D.overheating && D.coolCap >= 0) {
    const ratio = D.heatLoad / Math.max(1, D.coolCap);
    let p = Math.min(0.05, INCIDENT_BASE_CHANCE * (ratio - 1)) * dt;
    if (G.research.inf7) p *= 0.5;
    if (Math.random() < p) {
      // knock out ~10% of a random powered tier (5% with Redundant Arrays)
      const candidates = TIERS.filter((t) => t.power > 0 && G.owned[t.id] - G.offline[t.id] > 0);
      if (candidates.length) {
        const t = candidates[Math.floor(Math.random() * candidates.length)];
        const frac = G.research.inf7 ? 0.05 : 0.1;
        const hit = Math.max(1, Math.ceil(G.owned[t.id] * frac));
        G.offline[t.id] = Math.min(G.owned[t.id], G.offline[t.id] + hit);
        events.emit('incident', { tier: t.id, count: hit });
      }
    }
  }
  // Self-Healing Fabric: offline machines come back on their own
  if (G.research.inf8 && G.offline.some((n) => n > 0)) {
    autoRebootTimer += dt;
    if (autoRebootTimer >= 30) { autoRebootTimer = 0; rebootAll(); }
  } else {
    autoRebootTimer = 0;
  }
  // probability shards
  const annexes = G.owned[12] - G.offline[12];
  if (annexes > 0 && Math.random() < SHARD_CHANCE_PER_ANNEX * annexes * dt) {
    const owned = TIERS.filter((t) => t.id !== 12 && G.owned[t.id] > 0);
    if (owned.length) {
      const t = owned[Math.floor(Math.random() * owned.length)];
      G.owned[t.id]++;
      events.emit('shard', { tier: t.id });
      events.emit('buy', { tier: t.id, qty: 1, owned: G.owned[t.id], free: true });
    }
  }
}

// ---------- main tick ----------
export function tick(dt) {
  recompute();
  earn(D.cps * dt);
  G.rp += D.rps * dt;
  if (G.research.sw_auto) earn(D.clickValue * (G.research.sw9 ? 10 : 2) * dt);
  jobStep(dt);
  hazardStep(dt);
  autoBuyStep(dt);
  updateSeen();
}

// ---------- formatting ----------
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n === Math.floor(n)) return String(n);
    return n < 10 ? n.toFixed(1) : String(Math.floor(n));
  }
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  if (tier >= SUFFIXES.length - 1 && scaled >= 1000) return n.toExponential(2);
  return scaled.toFixed(digits) + SUFFIXES[tier];
}
