// All game balance in one place. Tune here, not in logic.

export const COST_GROWTH_BASE = 1.15;

// era: 0 Garage, 1 Home Office, 2 Office, 3 Startup Loft, 4 Server Room, 5 Datacenter, 6 Quantum Vault
export const TIERS = [
  { id: 0,  name: 'IBM 5100 Portable',   short: 'IBM 5100',  era: 0, baseCost: 15,     baseRate: 0.1,   icon: '📟', power: 0 },
  { id: 1,  name: 'Altair 8800',         short: 'Altair',    era: 0, baseCost: 100,    baseRate: 1,     icon: '🎛️', power: 0 },
  { id: 2,  name: 'Apple II',            short: 'Apple II',  era: 1, baseCost: 1100,   baseRate: 8,     icon: '🍎', power: 0 },
  { id: 3,  name: 'Commodore 64',        short: 'C64',       era: 1, baseCost: 12000,  baseRate: 47,    icon: '⌨️', power: 0 },
  { id: 4,  name: 'IBM PC 5150',         short: 'PC 5150',   era: 2, baseCost: 130000, baseRate: 260,   icon: '🖥️', power: 0 },
  { id: 5,  name: 'Beige 486 Tower',     short: '486 Tower', era: 2, baseCost: 1.4e6,  baseRate: 1400,  icon: '🗄️', power: 0 },
  { id: 6,  name: 'iMac G3',             short: 'iMac G3',   era: 3, baseCost: 2e7,    baseRate: 7800,  icon: '🍬', power: 0 },
  { id: 7,  name: 'RGB Gaming Rig',      short: 'RGB Rig',   era: 3, baseCost: 3.3e8,  baseRate: 44000, icon: '🌈', power: 0 },
  { id: 8,  name: '1U Rack Server',      short: '1U Server', era: 4, baseCost: 5.1e9,  baseRate: 2.6e5, icon: '📀', power: 2 },
  { id: 9,  name: 'Server Rack (42U)',   short: '42U Rack',  era: 4, baseCost: 7.5e10, baseRate: 1.6e6, icon: '🗼', power: 12 },
  { id: 10, name: 'GPU Compute Pod',     short: 'GPU Pod',   era: 5, baseCost: 1e12,   baseRate: 1e7,   icon: '🔥', power: 60 },
  { id: 11, name: 'Cryo Supercomputer Row', short: 'Cryo Row', era: 5, baseCost: 1.4e13, baseRate: 6.5e7, icon: '❄️', power: 250 },
  { id: 12, name: 'Quantum Annex',       short: 'Quantum',   era: 6, baseCost: 2e14,   baseRate: 4e8,   icon: '✨', power: 100, requiresPrestige: true },
];

export const ERAS = [
  { name: 'Garage',        blurb: 'A dusty garage, a workbench, and one very heavy portable computer.' },
  { name: 'Home Office',   blurb: 'The spare room fills with beige plastic and the smell of warm electronics.' },
  { name: 'Office',        blurb: 'Cubicles. Fluorescent light. You have employees now, apparently.' },
  { name: 'Startup Loft',  blurb: 'Exposed brick, translucent plastic, and RGB everything.' },
  { name: 'Server Room',   blurb: 'Raised floors and the first real hum. Watch your power draw.' },
  { name: 'Datacenter',    blurb: 'Aisles of light stretching into the dark. This is infrastructure.' },
  { name: 'Quantum Vault', blurb: 'A golden chandelier hangs in the cold. Probability itself works for you.' },
];

// Ownership milestone thresholds → each grants ×2 to that tier.
// Research 'hw_mini' additionally adds the 5-owned threshold.
export const MILESTONES = [10, 25, 50, 100, 200, 400];

// Per-tier software upgrades: unlock at `need` owned, grant ×mult to that tier.
const UP_NAMES = [
  ['APL ROM Pack', 'Tape Backup Rig', 'Field Service Contract'],
  ['S-100 Expansion Cards', 'Front Panel Macros', 'BASIC Interpreter'],
  ['Disk II Drives', 'VisiCalc License', '80-Column Card'],
  ['Fast Load Cartridge', 'GEOS Install', 'SID Music Side-Gigs'],
  ['Lotus 1-2-3', '20MB Hard Card', '8087 Math Coprocessor'],
  ['Turbo Button Always On', 'VESA Local Bus', 'Novell NetWare'],
  ['USB Peripherals', 'AirPort Card', 'Creative Suite'],
  ['Overclock Profiles', 'NVMe RAID', 'Crypto Side-Mining'],
  ['Hot-Swap Drive Bays', 'Hypervisor License', '10GbE Uplinks'],
  ['Cable Management', 'Blade Density', 'Colocation Contracts'],
  ['Tensor Firmware', 'NVLink Mesh', 'Foundation Model Gig'],
  ['Immersion Cooling', 'Photonic Fabric', 'National Lab Contract'],
  ['Error Correction', 'More Qubits', 'Decoherence Shielding'],
];
const UP_NEED = [5, 15, 30];
const UP_MULT = [2, 3, 4];
const UP_COSTX = [80, 2500, 60000];

export const UPGRADES = TIERS.flatMap((t, i) =>
  [0, 1, 2].map((k) => ({
    id: `u${i}_${k}`,
    tier: i,
    need: UP_NEED[k],
    mult: UP_MULT[k],
    cost: t.baseCost * UP_COSTX[k],
    name: UP_NAMES[i][k],
  }))
);

// Infrastructure (repeatable purchases). kind: 'power' adds kW capacity, 'cool' adds cooling capacity.
export const INFRA = [
  { id: 'psu',      kind: 'power', name: 'PSU Bank',         cap: 20,    baseCost: 2e9,   icon: '🔌' },
  { id: 'gen',      kind: 'power', name: 'Diesel Generator', cap: 150,   baseCost: 8e10,  icon: '⛽' },
  { id: 'sub',      kind: 'power', name: 'Substation',       cap: 1500,  baseCost: 2e12,  icon: '⚡' },
  { id: 'fusion',   kind: 'power', name: 'Fusion Feed',      cap: 20000, baseCost: 5e13,  icon: '☀️' },
  { id: 'fans',     kind: 'cool',  name: 'Fan Wall',         cap: 30,    baseCost: 4e9,   icon: '🌀' },
  { id: 'crac',     kind: 'cool',  name: 'CRAC Unit',        cap: 250,   baseCost: 1.2e11, icon: '🧊' },
  { id: 'liquid',   kind: 'cool',  name: 'Liquid Loop',      cap: 2500,  baseCost: 3e12,  icon: '💧' },
  { id: 'cryplant', kind: 'cool',  name: 'Cryo Plant',       cap: 30000, baseCost: 8e13,  icon: '❄️' },
];
export const INFRA_GROWTH = 1.35;

// Research tree. branch: hw / sw / inf. Effects are read by name in state.recompute().
// Each branch is a linear chain (req = previous node) climbing from tens to millions of RP.
export const RESEARCH = [
  // ── HARDWARE: raw production, cost curves, milestones ──
  { id: 'hw1',      branch: 'hw', name: 'Solder Skills',            cost: 10,     desc: '+10% global production', req: null },
  { id: 'hw2',      branch: 'hw', name: 'Bulk Discounts',           cost: 60,     desc: 'Cost growth 1.15 → 1.14', req: 'hw1' },
  { id: 'hw3',      branch: 'hw', name: 'Overclocking',             cost: 250,    desc: '+25% global production', req: 'hw2' },
  { id: 'hw_mini',  branch: 'hw', name: 'Miniaturization',          cost: 600,    desc: 'Milestone bonus also at 5 owned', req: 'hw3' },
  { id: 'hw5',      branch: 'hw', name: 'Mass Production',          cost: 3000,   desc: 'Cost growth → 1.13', req: 'hw_mini' },
  { id: 'hw_retro', branch: 'hw', name: 'Retro Restoration',        cost: 8000,   desc: 'Garage & Home Office machines ×3', req: 'hw5' },
  { id: 'hw6',      branch: 'hw', name: 'Photonic Interconnects',   cost: 12000,  desc: '+50% global production', req: 'hw_retro' },
  { id: 'hw_gold',  branch: 'hw', name: 'Golden Samples',           cost: 25000,  desc: 'Milestone bonus also at 15 owned', req: 'hw6' },
  { id: 'hw_office', branch: 'hw', name: 'Enterprise Contracts',    cost: 30000,  desc: 'Office & Loft machines ×3', req: 'hw_gold' },
  { id: 'hw7',      branch: 'hw', name: 'Silicon Refinement',       cost: 40000,  desc: '+75% global production', req: 'hw_office' },
  { id: 'hw_vert',  branch: 'hw', name: 'Vertical Integration',     cost: 80000,  desc: '+0.1% production per machine owned (cap +200%)', req: 'hw7' },
  { id: 'hw8',      branch: 'hw', name: 'Exotic Substrates',        cost: 150000, desc: 'Global production ×2', req: 'hw_vert' },
  { id: 'hw_hyper', branch: 'hw', name: 'Hyperscale Playbook',      cost: 250000, desc: 'Server Room & Datacenter machines ×3', req: 'hw8' },
  { id: 'hw9',      branch: 'hw', name: 'Self-Assembling Circuits', cost: 400000, desc: 'Cost growth → 1.12', req: 'hw_hyper' },
  { id: 'hw10',     branch: 'hw', name: 'Zero-Point Fabs',          cost: 1.2e6,  desc: 'Global production ×2.5', req: 'hw9' },
  { id: 'hw_q',     branch: 'hw', name: 'Quantum Supremacy',        cost: 2e6,    desc: 'Quantum Annex output ×3', req: 'hw10' },

  // ── SOFTWARE: clicks, contracts, offline, research itself ──
  { id: 'sw1',      branch: 'sw', name: 'Better Compilers',         cost: 10,     desc: 'Click power ×5', req: null },
  { id: 'sw2',      branch: 'sw', name: 'Job Scheduler',            cost: 50,     desc: 'Contract payouts ×2', req: 'sw1' },
  { id: 'sw3',      branch: 'sw', name: 'Idle Optimization',        cost: 200,    desc: 'Offline earnings 50% → 75%', req: 'sw2' },
  { id: 'sw_auto',  branch: 'sw', name: 'Auto-Clicker Daemon',      cost: 500,    desc: 'Runs 2 jobs/sec automatically', req: 'sw3' },
  { id: 'sw_net',   branch: 'sw', name: 'Networking',               cost: 900,    desc: 'Each tier +1% per adjacent-tier unit (cap +100%)', req: 'sw_auto' },
  { id: 'sw_rp1',   branch: 'sw', name: 'Lab Notebooks',            cost: 2000,   desc: '+25% research rate', req: 'sw_net' },
  { id: 'sw5',      branch: 'sw', name: 'Distributed OS',           cost: 2500,   desc: 'Offline earnings 75% → 100%', req: 'sw_rp1' },
  { id: 'sw6',      branch: 'sw', name: 'Macro Recorder',           cost: 5000,   desc: 'Click power ×5 again', req: 'sw5' },
  { id: 'sw7',      branch: 'sw', name: 'Contract Broker',          cost: 15000,  desc: 'Contract payouts ×3', req: 'sw6' },
  { id: 'sw_rp2',   branch: 'sw', name: 'Peer Review',              cost: 20000,  desc: '+50% research rate', req: 'sw7' },
  { id: 'sw8',      branch: 'sw', name: 'Peer-to-Peer Mesh',        cost: 60000,  desc: 'Adjacency bonus cap +100% → +200%', req: 'sw_rp2' },
  { id: 'sw9',      branch: 'sw', name: 'Daemon Swarm',             cost: 100000, desc: 'Auto-clicker 2 → 10 jobs/sec', req: 'sw8' },
  { id: 'sw_rp3',   branch: 'sw', name: 'Automated Theorem Prover', cost: 120000, desc: 'Research rate ×2', req: 'sw_rp2' },
  { id: 'sw10',     branch: 'sw', name: 'Dream Protocol',           cost: 300000, desc: 'Offline earnings ×1.5', req: 'sw_rp3' },
  { id: 'sw_rp4',   branch: 'sw', name: 'Oracle Machine',           cost: 1e6,    desc: 'Research rate ×3', req: 'sw10' },

  // ── INFRASTRUCTURE: power, heat, automation, prestige ──
  { id: 'inf1',     branch: 'inf', name: 'Power Efficiency I',      cost: 300,    desc: '-15% power draw', req: null },
  { id: 'inf2',     branch: 'inf', name: 'Airflow Modeling',        cost: 700,    desc: '-15% heat load', req: 'inf1' },
  { id: 'inf3',     branch: 'inf', name: 'Power Efficiency II',     cost: 4000,   desc: '-25% power draw', req: 'inf2' },
  { id: 'inf_ai',   branch: 'inf', name: 'Procurement AI',          cost: 6000,   desc: 'Unlock the auto-buyer', req: 'inf3' },
  { id: 'inf_alloc', branch: 'inf', name: 'Workload Allocator',     cost: 9000,   desc: 'Unlock compute allocation slider', req: 'inf_ai' },
  { id: 'inf4',     branch: 'inf', name: 'Cryo Doctrine',           cost: 18000,  desc: '-25% heat load', req: 'inf_alloc' },
  { id: 'inf7',     branch: 'inf', name: 'Redundant Arrays',        cost: 25000,  desc: 'Heat incidents half as likely, half as damaging', req: 'inf4' },
  { id: 'inf6',     branch: 'inf', name: 'Modular Substations',     cost: 35000,  desc: 'Infrastructure cost growth 1.35 → 1.28', req: 'inf7' },
  { id: 'inf5',     branch: 'inf', name: 'Superconducting Grid',    cost: 60000,  desc: '-40% power draw', req: 'inf6' },
  { id: 'inf_leg',  branch: 'inf', name: 'Legacy Emulation',        cost: 80000,  desc: '+5% production per museum relic', req: 'inf5' },
  { id: 'inf8',     branch: 'inf', name: 'Self-Healing Fabric',     cost: 150000, desc: 'Offline machines auto-reboot after 30s', req: 'inf_leg' },
  { id: 'inf9',     branch: 'inf', name: 'Procurement AI v2',       cost: 200000, desc: 'Auto-buyer acts 4× faster', req: 'inf8' },
  { id: 'inf_vault', branch: 'inf', name: 'Patent Vault',           cost: 500000, desc: 'Vintage Chips give +3% each (was +2%)', req: 'inf9' },
  { id: 'inf10',    branch: 'inf', name: 'Dyson Feed',              cost: 800000, desc: '-50% power draw', req: 'inf_vault' },
  { id: 'inf_foundry', branch: 'inf', name: 'Chip Foundry',         cost: 1.5e6,  desc: '+15% Vintage Chips on prestige', req: 'inf10' },
];

export const BRANCH_NAMES = { hw: 'Hardware', sw: 'Software', inf: 'Infrastructure' };

// Prestige
export const PRESTIGE_UNLOCK = 1e12;           // lifetime-this-run credits needed
export const CHIP_MULT = 0.02;                 // +2% production per Vintage Chip
export const chipsFor = (lifetimeRun) => Math.floor(Math.sqrt(lifetimeRun / PRESTIGE_UNLOCK));

// RP generation: rate per second from number of distinct tiers owned
export const rpRate = (distinctTiers) => 0.06 * distinctTiers * distinctTiers;

// Manual clicking
export const CLICK_CPS_FRACTION = 0.005;       // click = max(1, 0.5% of cps)

// Offline earnings cap (seconds)
export const OFFLINE_CAP = 24 * 3600;

// Jobs (early-game contracts)
export const JOB_CPS_LIMIT = 1e5;              // jobs stop appearing above this cps
export const JOB_NAMES = [
  "Payroll batch for Henderson's Grocery",
  'Ballistics tables for the county fair cannon',
  'Inventory sort for Discount Stereo Barn',
  'Mailing list dedupe for a church newsletter',
  'Tax season overflow from a strip-mall CPA',
  'Bowling league standings recalculation',
  'Star chart for an amateur astronomer',
  'Recipe database for a diner chain',
  'Card catalog digitization, box 47 of 900',
  'Actuarial tables for a very nervous insurer',
  'Weather model for a wedding planner',
  'Render frames for a local TV ad',
];

// Quantum Annex probability shards
export const SHARD_CHANCE_PER_ANNEX = 0.002;   // per second per annex

// Heat incidents
export const INCIDENT_BASE_CHANCE = 0.006;     // per second, scaled by overload ratio

export function costGrowth(researchFlags) {
  if (researchFlags.hw9) return 1.12;
  if (researchFlags.hw5) return 1.13;
  if (researchFlags.hw2) return 1.14;
  return COST_GROWTH_BASE;
}

export function infraGrowth(researchFlags) {
  return researchFlags.inf6 ? 1.28 : INFRA_GROWTH;
}

// Cost of buying `qty` units of tier when you already own `owned`.
export function bulkCost(tier, owned, qty, g) {
  const base = TIERS[tier].baseCost;
  return base * Math.pow(g, owned) * (Math.pow(g, qty) - 1) / (g - 1);
}

// Max units affordable with `credits`.
export function maxAffordable(tier, owned, credits, g) {
  const base = TIERS[tier].baseCost * Math.pow(g, owned);
  const n = Math.floor(Math.log(1 + (credits * (g - 1)) / base) / Math.log(g));
  return Math.max(0, n);
}

export function infraCost(item, count, growth = INFRA_GROWTH) {
  return item.baseCost * Math.pow(growth, count);
}

// research-granted extra milestone thresholds
export function extraMilestones(researchFlags) {
  const out = [];
  if (researchFlags.hw_mini) out.push(5);
  if (researchFlags.hw_gold) out.push(15);
  return out;
}

export function milestoneMult(owned, researchFlags) {
  let m = 1;
  for (const t of extraMilestones(researchFlags)) if (owned >= t) m *= 2;
  for (const t of MILESTONES) if (owned >= t) m *= 2;
  return m;
}
