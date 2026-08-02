// DOM HUD. Reads G/D, calls state actions, listens to game events.
import {
  G, D, events, fmt, recompute,
  doClick, buyTier, buyUpgrade, buyResearch, buyInfra,
  claimJob, rebootAll, doPrestige, prestigeGain, prestigeAvailable,
} from '../game/state.js';
import { TIERS, ERAS, UPGRADES, RESEARCH, BRANCH_NAMES, INFRA, infraCost, infraGrowth, bulkCost, maxAffordable, MILESTONES, extraMilestones, PRESTIGE_UNLOCK } from '../game/balance.js';
import { exportSave, importSave, hardReset, save } from '../game/save.js';

const $ = (id) => document.getElementById(id);

let buyQty = 1; // 1 | 10 | 100 | 'max'
let sceneAPI = null; // set by main.js once the 3D world exists
export function setSceneAPI(api) { sceneAPI = api; }

// ---------- glitch fx ----------
function glitchEl(el) {
  if (!el || !el.classList.contains('glitch')) return;
  el.classList.remove('glitching');
  void el.offsetWidth; // restart animation
  el.classList.add('glitching');
  setTimeout(() => el.classList.remove('glitching'), 320);
}

// ---------- the wired ticker ----------
const TICKER_LINES = [
  'the wired remembers everything',
  'protocol 7 :: handshake accepted',
  'you are already connected',
  'signal bleed detected on layer 02',
  'copper sings at fifty hertz',
  'packet loss negligible. presence confirmed',
  'present day // present time',
  'no one is ever really offline',
  'NAVI idle. dreaming in hex',
  'the hum is not coming from the machines',
  'everyone will be connected soon enough',
  'do not mind the second shadow on the crt',
];
let tickerIdx = Math.floor(Math.random() * TICKER_LINES.length);
function rotateTicker() {
  const el = $('ticker');
  el.classList.add('swap');
  setTimeout(() => {
    tickerIdx = (tickerIdx + 1 + Math.floor(Math.random() * 3)) % TICKER_LINES.length;
    el.textContent = TICKER_LINES[tickerIdx];
    el.classList.remove('swap');
  }, 400);
}

// ---------- boot splash ----------
const BOOT_LINES = [
  'SILICON EMPIRE // NAVI BOOT AGENT v2.6',
  'MEM CHECK ............ 65536K OK',
  'CRT PHOSPHOR ......... WARM',
  'PROTOCOL 7 ........... LINKED',
  'ENTERING THE WIRED ...',
];
export function runBootSplash() {
  const boot = $('boot');
  const pre = $('boot-text');
  if (!boot || !pre) return;
  let line = 0;
  const finish = () => { boot.classList.add('done'); setTimeout(() => boot.remove(), 500); };
  boot.addEventListener('click', finish, { once: true });
  const iv = setInterval(() => {
    if (line >= BOOT_LINES.length) { clearInterval(iv); setTimeout(finish, 350); return; }
    const cls = line === 0 || line === BOOT_LINES.length - 1 ? '' : 'dim-line';
    pre.innerHTML += `<span class="${cls}">${BOOT_LINES[line]}</span>\n`;
    line++;
  }, 230);
}

// ---------- auto-buy notification (small, replaces in place, no stacking) ----------
const autoBuyNote = { key: null, count: 0, timer: null };
function showAutoBuyNote({ label, key }) {
  const el = $('autobuy-note');
  if (autoBuyNote.key === key && el.classList.contains('show')) autoBuyNote.count++;
  else { autoBuyNote.key = key; autoBuyNote.count = 1; }
  el.textContent = `⚙ auto-buy ▸ ${label}` + (autoBuyNote.count > 1 ? ` ×${autoBuyNote.count}` : '');
  el.classList.add('show');
  clearTimeout(autoBuyNote.timer);
  autoBuyNote.timer = setTimeout(() => {
    el.classList.remove('show');
    autoBuyNote.key = null;
  }, 2800);
}

// ---------- toasts ----------
export function toast(msg, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('fade'), 3600);
  setTimeout(() => el.remove(), 4200);
}

// ---------- tier cards ----------
const cards = new Map(); // tier -> {root, owned, rate, cost, buy, ups}

function buildCard(i) {
  const t = TIERS[i];
  const root = document.createElement('div');
  root.className = 'tier-card';
  root.dataset.tier = i;
  root.innerHTML = `
    <div class="row1"><span class="icon">${t.icon}</span><span class="name">${t.name}</span><span class="owned">0</span></div>
    <div class="row2"><span class="rate"></span><span class="mstone"></span></div>
    <button class="buy-btn"></button>
    <div class="upgrades"></div>`;
  const refs = {
    root,
    name: root.querySelector('.name'),
    icon: root.querySelector('.icon'),
    owned: root.querySelector('.owned'),
    rate: root.querySelector('.rate'),
    mstone: root.querySelector('.mstone'),
    buy: root.querySelector('.buy-btn'),
    ups: root.querySelector('.upgrades'),
    upBtns: new Map(),
  };
  refs.buy.addEventListener('click', (e) => {
    e.stopPropagation();
    const n = buyTier(i, buyQty);
    if (n > 0) updateAll();
  });
  root.addEventListener('click', () => { if (sceneAPI && G.owned[i] > 0) sceneAPI.flyToTier(i); });
  cards.set(i, refs);
  return root;
}

// Diff-based: existing card nodes are never recreated, so in-flight clicks
// always land on a live element. Only adds/removes cards when the visible
// tier set changes (discovery, prestige, import).
function rebuildTierList() {
  const wrap = $('tiers');
  const wanted = TIERS
    .filter((t) => G.seen[t.id] > 0 && !(t.requiresPrestige && G.prestiges < 1))
    .map((t) => t.id);
  for (const [id, refs] of [...cards]) {
    if (!wanted.includes(id)) { refs.root.remove(); cards.delete(id); }
  }
  let prev = null;
  for (const id of wanted) {
    let refs = cards.get(id);
    if (!refs) {
      const root = buildCard(id);
      if (prev) prev.after(root);
      else wrap.prepend(root);
      refs = cards.get(id);
    }
    prev = refs.root;
  }
}

function allMilestones() {
  return [...extraMilestones(G.research), ...MILESTONES].sort((a, b) => a - b);
}
function nextMilestone(owned) {
  for (const m of allMilestones()) if (owned < m) return m;
  return null;
}

function updateCards() {
  for (const [i, c] of cards) {
    const t = TIERS[i];
    const mystery = G.seen[i] < 2;
    c.root.classList.toggle('mystery', mystery);
    if (mystery) {
      c.name.textContent = '???';
      c.icon.textContent = '❓';
      c.owned.textContent = '';
      c.rate.textContent = 'Something hums beyond your budget…';
      c.mstone.textContent = '';
      c.buy.disabled = true;
      c.buy.textContent = `₵${fmt(t.baseCost)}`;
      c.ups.innerHTML = '';
      continue;
    }
    c.name.textContent = t.name;
    c.icon.textContent = t.icon;
    const off = G.offline[i];
    c.owned.textContent = off > 0 ? `${G.owned[i] - off}/${G.owned[i]}` : String(G.owned[i]);
    c.rate.textContent = `₵${fmt(D.rate[i])}/s each`;
    const nm = nextMilestone(G.owned[i]);
    c.mstone.textContent = nm ? `×2 at ${nm}` : '';

    const g = D.growth;
    let qty = buyQty === 'max' ? Math.max(1, maxAffordable(i, G.owned[i], G.credits, g)) : buyQty;
    const cost = bulkCost(i, G.owned[i], qty, g);
    const afford = G.credits >= cost;
    if (c.buy.disabled !== !afford) c.buy.disabled = !afford;
    const buyTxt = `Buy ${buyQty === 'max' ? `Max (${afford ? qty : 0})` : '×' + qty} — ₵${fmt(cost)}`;
    if (c.buy.textContent !== buyTxt) c.buy.textContent = buyTxt;

    // upgrades
    for (const u of UPGRADES) {
      if (u.tier !== i || G.upgrades[u.id]) { c.upBtns.get(u.id)?.remove(); c.upBtns.delete(u.id); continue; }
      if (G.owned[i] < u.need) continue;
      let btn = c.upBtns.get(u.id);
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'up-btn';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (buyUpgrade(u.id)) { toast(`🔧 ${u.name} — ${t.short} ×${u.mult}`); updateAll(); }
        });
        c.ups.appendChild(btn);
        c.upBtns.set(u.id, btn);
      }
      const upTxt = `${u.name} ×${u.mult} — ₵${fmt(u.cost)}`;
      if (btn.textContent !== upTxt) {
        btn.textContent = upTxt;
        btn.title = `Multiplies ${t.name} output by ${u.mult}`;
      }
      const upDis = G.credits < u.cost;
      if (btn.disabled !== upDis) btn.disabled = upDis;
    }
  }
}

// ---------- infra ----------
const infraBtns = new Map();
function buildInfra() {
  const wrap = $('infra-list');
  wrap.innerHTML = '';
  infraBtns.clear();
  for (const item of INFRA) {
    const btn = document.createElement('button');
    btn.className = 'infra-btn';
    btn.addEventListener('click', () => { if (buyInfra(item.id)) updateAll(); });
    wrap.appendChild(btn);
    infraBtns.set(item.id, btn);
  }
}
function updateInfra() {
  const show = G.seen[8] > 0;
  $('infra-panel').classList.toggle('hidden', !show);
  if (!show) return;
  for (const item of INFRA) {
    const btn = infraBtns.get(item.id);
    const n = G.infra[item.id] || 0;
    const cost = infraCost(item, n, infraGrowth(G.research));
    const html = `<span>${item.icon} ${item.name} <b style="color:var(--blue)">×${n}</b> (+${item.cap} ${item.kind === 'power' ? 'kW' : 'cool'})</span><span>₵${fmt(cost)}</span>`;
    if (btn.innerHTML !== html) btn.innerHTML = html;
    const dis = G.credits < cost;
    if (btn.disabled !== dis) btn.disabled = dis;
  }
  $('alloc-row').classList.toggle('hidden', !G.research.inf_alloc);
  $('autobuy-row').classList.toggle('hidden', !G.research.inf_ai);
}

// ---------- research ----------
function buildResearch() {
  const wrap = $('research-cols');
  wrap.innerHTML = '';
  for (const b of ['hw', 'sw', 'inf']) {
    const col = document.createElement('div');
    col.innerHTML = `<div class="branch-title">${BRANCH_NAMES[b]}</div>`;
    for (const r of RESEARCH.filter((x) => x.branch === b)) {
      const node = document.createElement('div');
      node.className = 'res-node';
      node.id = 'res-' + r.id;
      node.innerHTML = `<div class="rn">${r.name}</div><div class="rd">${r.desc}</div><div class="rc"></div>`;
      node.addEventListener('click', () => {
        if (buyResearch(r.id)) { toast(`🔬 Researched: ${r.name}`); updateAll(); }
      });
      col.appendChild(node);
    }
    wrap.appendChild(col);
  }
}
function updateResearch() {
  for (const r of RESEARCH) {
    const node = $('res-' + r.id);
    if (!node) continue;
    const owned = !!G.research[r.id];
    const locked = r.req && !G.research[r.req];
    node.classList.toggle('owned', owned);
    node.classList.toggle('locked', !owned && locked);
    node.classList.toggle('afford', !owned && !locked && G.rp >= r.cost);
    const rcTxt = owned ? '✓ researched' : `${fmt(r.cost)} RP` + (locked ? ` · needs ${RESEARCH.find((x) => x.id === r.req).name}` : '');
    const rc = node.querySelector('.rc');
    if (rc.textContent !== rcTxt) rc.textContent = rcTxt;
  }
}

// ---------- jobs ----------
let jobShown = null;
function updateJob() {
  const el = $('job-offer');
  if (!G.job) { el.classList.add('hidden'); jobShown = null; return; }
  if (jobShown !== G.job) {
    jobShown = G.job;
    el.innerHTML = `<span class="job-name">📋 ${G.job.name}</span><span class="job-timer"></span><button id="job-claim">Accept ₵${fmt(G.job.reward)}</button>`;
    el.querySelector('#job-claim').addEventListener('click', () => { claimJob(); refresh(); });
    el.classList.remove('hidden');
  }
  el.querySelector('.job-timer').textContent = Math.ceil(G.job.expires) + 's';
}

// ---------- incident banner ----------
function updateIncident() {
  const total = G.offline.reduce((a, b) => a + b, 0);
  const banner = $('incident-banner');
  if (total <= 0) { banner.classList.add('hidden'); return; }
  banner.classList.remove('hidden');
  $('incident-text').textContent = `⚠ Overheating! ${total} machine${total > 1 ? 's' : ''} offline`;
}

// ---------- room navigator (bottom-left of viewport) ----------
let roomNavSig = '';
function updateRoomNav() {
  const unlocked = new Set([0]);
  for (const t of TIERS) if (G.owned[t.id] > 0) unlocked.add(t.era);
  const eras = [...unlocked].sort((a, b) => a - b);
  const sig = eras.join(',');
  if (sig === roomNavSig) return;
  roomNavSig = sig;
  const wrap = $('room-nav');
  wrap.innerHTML = '';
  for (const era of eras) {
    const btn = document.createElement('button');
    btn.innerHTML = `<span class="rn-num">0${era + 1}</span>${ERAS[era].name}`;
    btn.addEventListener('click', () => sceneAPI?.frameEra(era, true));
    wrap.appendChild(btn);
  }
}

// ---------- top bar ----------
function updateTopbar() {
  $('credits').textContent = '₵' + fmt(G.credits);
  $('cps').textContent = '₵' + fmt(D.cps) + '/s' + (D.throttled ? ' ⚠' : '');
  $('cps').parentElement.classList.toggle('warn', D.throttled);

  const showRP = D.rps > 0 || G.rp >= 1;
  $('rp-stat').classList.toggle('hidden', !showRP);
  $('research-btn').classList.toggle('hidden', !showRP);
  if (showRP) $('rp').textContent = fmt(Math.floor(G.rp)) + (D.rps > 0 ? ` (+${D.rps.toFixed(1)}/s)` : '');
  $('rp-inline').textContent = `— ${fmt(Math.floor(G.rp))} RP available`;

  const showPower = D.powerUse > 0 || D.powerCap > 0;
  $('power-stat').classList.toggle('hidden', !showPower);
  if (showPower) {
    $('power').textContent = `${fmt(D.powerUse)}/${fmt(D.powerCap)}`;
    $('power-stat').classList.toggle('warn', D.throttled);
  }
  const showHeat = D.heatLoad > 0 || D.coolCap > 0;
  $('heat-stat').classList.toggle('hidden', !showHeat);
  if (showHeat) {
    $('heat').textContent = `${fmt(D.heatLoad)}/${fmt(D.coolCap)}`;
    $('heat-stat').classList.toggle('warn', D.overheating);
  }

  $('chips-stat').classList.toggle('hidden', G.chips === 0);
  const chipPct = G.research.inf_vault ? 8 : 5;
  $('chips').textContent = fmt(G.chips) + ` (+${G.chips * chipPct}%)`;

  $('prevrun-stat').classList.toggle('hidden', !(G.lastRunIncome > 0));
  if (G.lastRunIncome > 0) $('prevrun').textContent = '₵' + fmt(G.lastRunIncome) + '/s';

  const showPrestige = G.lifetimeRun >= PRESTIGE_UNLOCK * 0.25 || G.prestiges > 0;
  $('prestige-btn').classList.toggle('hidden', !showPrestige);
  if (showPrestige) {
    $('prestige-btn').textContent = prestigeAvailable()
      ? `⟲ Prestige (+${fmt(prestigeGain())} chips)`
      : `⟲ Prestige (${Math.floor(100 * G.lifetimeRun / PRESTIGE_UNLOCK)}%)`;
  }

  // era title & click button
  let era = 0;
  for (const t of TIERS) if (G.owned[t.id] > 0) era = t.era;
  const eraLabel = `LAYER 0${era + 1} // ${ERAS[era].name.toUpperCase()}`;
  const et = $('era-title');
  if (et.textContent !== eraLabel) { et.textContent = eraLabel; et.dataset.text = eraLabel; glitchEl(et); }
  $('click-btn').classList.toggle('hidden', era >= 4);
  $('click-value').textContent = `+₵${fmt(D.clickValue)}`;
}

// ---------- modal ----------
function openModal(html) {
  $('modal').innerHTML = html;
  $('modal-overlay').classList.remove('hidden');
}
export function closeModal() { $('modal-overlay').classList.add('hidden'); }

function openPrestigeModal() {
  const avail = prestigeAvailable();
  const gain = prestigeGain();
  openModal(`
    <h2>⟲ Sell the company, keep the patents</h2>
    <p>Reset your empire back to the garage. Your research and museum survive; everything else goes.</p>
    <p>${avail
      ? `You will earn <b style="color:var(--amber)">${fmt(gain)} Vintage Chip${gain > 1 ? 's' : ''}</b> — each is a permanent +${G.research.inf_vault ? 8 : 5}% to all production.`
      : `Requires <b>₵${fmt(PRESTIGE_UNLOCK)}</b> earned this run. Progress: ${Math.floor(100 * G.lifetimeRun / PRESTIGE_UNLOCK)}%`}</p>
    <p class="dim">Lifetime this run: ₵${fmt(G.lifetimeRun)} · Current chips: ${fmt(G.chips)}</p>
    ${G.lastRunIncome > 0 ? `<p class="dim">Previous run record income: ₵${fmt(G.lastRunIncome)}/s</p>` : ''}
    <div class="btn-row">
      ${avail ? '<button class="primary" id="m-prestige">Sell &amp; restart</button>' : ''}
      <button id="m-cancel">Not yet</button>
    </div>`);
  $('m-cancel').addEventListener('click', closeModal);
  $('m-prestige')?.addEventListener('click', () => {
    doPrestige();
    save();
    closeModal();
    refresh();
  });
}

function openSettingsModal() {
  openModal(`
    <h2>⚙ Settings</h2>
    <div class="setting-row"><label>Volume</label><input type="range" id="s-vol" min="0" max="100" value="${Math.round(G.settings.vol * 100)}"></div>
    <div class="setting-row"><label>Bloom / glow effects</label><button id="s-bloom">${G.settings.bloom ? 'On' : 'Off'}</button></div>
    <div class="setting-row"><label>Export save</label><textarea id="s-export" readonly>${exportSave()}</textarea>
      <button id="s-copy">Copy to clipboard</button></div>
    <div class="setting-row"><label>Import save</label><textarea id="s-import" placeholder="Paste an exported save here"></textarea>
      <button id="s-doimport">Import</button></div>
    <div class="btn-row">
      <button class="danger" id="s-reset">Hard reset</button>
      <button class="primary" id="s-close">Close</button>
    </div>`);
  $('s-close').addEventListener('click', closeModal);
  $('s-vol').addEventListener('input', (e) => { G.settings.vol = e.target.value / 100; });
  $('s-bloom').addEventListener('click', (e) => {
    G.settings.bloom = !G.settings.bloom;
    e.target.textContent = G.settings.bloom ? 'On' : 'Off';
    sceneAPI?.setBloom(G.settings.bloom);
  });
  $('s-copy').addEventListener('click', () => {
    navigator.clipboard?.writeText($('s-export').value);
    toast('Save copied to clipboard');
  });
  $('s-doimport').addEventListener('click', () => {
    if (importSave($('s-import').value)) { toast('Save imported'); closeModal(); refresh(); }
    else toast('Import failed — invalid save', 'red');
  });
  $('s-reset').addEventListener('click', () => {
    openModal(`
      <h2>Hard reset</h2>
      <p>This permanently deletes ALL progress, including prestige chips and research. There is no undo.</p>
      <div class="btn-row"><button class="danger" id="s-really">Delete everything</button><button class="primary" id="s-no">Keep my empire</button></div>`);
    $('s-no').addEventListener('click', closeModal);
    $('s-really').addEventListener('click', () => { hardReset(); closeModal(); refresh(); });
  });
}

// ---------- refresh (structure) vs update (numbers) ----------
export function refresh() {
  rebuildTierList();
  updateAll();
}

function updateAll() {
  recompute();
  updateTopbar();
  updateRoomNav();
  updateCards();
  updateInfra();
  updateResearch();
  updateJob();
  updateIncident();
}

// ---------- init ----------
export function initHUD() {
  buildInfra();
  buildResearch();
  rebuildTierList();

  // qty selector
  document.querySelectorAll('.qty').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qty').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      buyQty = btn.dataset.qty === 'max' ? 'max' : parseInt(btn.dataset.qty, 10);
      updateAll();
    });
  });

  $('click-btn').addEventListener('click', (e) => {
    doClick();
    const f = document.createElement('div');
    f.className = 'float-num';
    f.textContent = '+₵' + fmt(D.clickValue);
    f.style.left = (e.clientX + (Math.random() * 40 - 20)) + 'px';
    f.style.top = (e.clientY - 24) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  });

  $('reboot-btn').addEventListener('click', () => { rebootAll(); updateAll(); });
  $('prestige-btn').addEventListener('click', openPrestigeModal);
  $('settings-btn').addEventListener('click', openSettingsModal);
  $('research-btn').addEventListener('click', () => $('research-panel').classList.toggle('hidden'));
  $('research-close').addEventListener('click', () => $('research-panel').classList.add('hidden'));
  $('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal(); });

  $('alloc').addEventListener('input', (e) => {
    G.alloc = e.target.value / 100;
    const pct = Math.round(G.alloc * 100);
    $('alloc-label').textContent = pct === 0 ? '100% credits' : `${100 - pct}% credits / +${pct * 3}% research`;
  });
  $('autobuy').addEventListener('change', (e) => { G.autoBuy = e.target.checked; });

  // game events → toasts / rebuilds
  events.on('seen', () => refresh());
  events.on('research', () => refresh());
  events.on('prestige', ({ gain }) => {
    toast(`⟲ Company sold. +${fmt(gain)} Vintage Chips. Back to the garage…`, 'gold');
    refresh();
  });
  events.on('incident', ({ tier, count }) => {
    toast(`🔥 Heat incident: ${count}× ${TIERS[tier].short} offline!`, 'red');
  });
  events.on('reboot', (n) => toast(`♻ Rebooted ${n} machine${n > 1 ? 's' : ''}`));
  events.on('shard', ({ tier }) => toast(`✨ Probability shard! Free ${TIERS[tier].short} materialized`, 'gold'));
  events.on('autobuy', showAutoBuyNote);
  events.on('jobOffered', () => updateJob());
  events.on('jobClaimed', (j) => toast(`📋 Contract paid: ₵${fmt(j.reward)}`, 'gold'));
  events.on('loaded', () => refresh());
  events.on('buy', ({ tier, owned }) => {
    // milestone celebration
    if (allMilestones().includes(owned)) toast(`🏆 ${owned}× ${TIERS[tier].short} — output doubled!`);
  });

  // sync autobuy checkbox with save
  $('autobuy').checked = G.autoBuy;
  $('alloc').value = Math.round(G.alloc * 100);

  // the wired ticker + ambient glitches
  $('ticker').textContent = TICKER_LINES[tickerIdx];
  setInterval(rotateTicker, 7000 + Math.random() * 4000);
  setInterval(() => {
    if (Math.random() < 0.5) glitchEl($('era-title'));
  }, 9000);
  events.on('era', () => glitchEl($('era-title')));
  events.on('prestige', () => glitchEl($('era-title')));

  updateAll();
  // slow UI loop (numbers); scene runs its own rAF
  setInterval(updateAll, 150);
}
