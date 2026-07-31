# SILICON EMPIRE
### A three.js idle game about buying computers of increasing complexity

---

## 1. High Concept

You start in a dusty garage in 1975 with a single second-hand IBM 5100. It crunches numbers and earns you a trickle of money. You reinvest that money into more machines, then better machines, working your way through five decades of computing history — from beige microcomputers to humming datacenter aisles of liquid-cooled supercomputer racks.

The hook (borrowed from Cookie Clicker / Universal Paperclips): **numbers that always go up, purchases that always feel just-affordable, and a world that visibly transforms as you grow.** The twist that makes it ours: every machine you buy physically appears in a 3D scene, and the scene itself evolves — garage → home office → small business → server room → datacenter — so your progress is something you can *look at*, not just a stat line.

- **Engine:** three.js (WebGL), single-page browser game
- **Session model:** idle/incremental — active clicking early, automation later, offline progress always
- **Art style:** clean low-poly with era-accurate silhouettes and materials; emissive LEDs and CRT glow do the atmospheric heavy lifting
- **Target session:** meaningful progress in 5-minute check-ins; full playthrough to first prestige ~6–10 hours of (mostly idle) time

---

## 2. Core Loop

```
 earn Credits  ──►  buy computers  ──►  computers generate Credits/sec
      ▲                                          │
      │                                          ▼
 prestige for ◄──  hit era milestones  ◄──  buy upgrades & research
 Vintage Chips
```

1. **Early game (minutes 0–15):** You have one IBM 5100 and a "Run Job" button. Clicking it manually executes a compute job for Credits. This is the Cookie Clicker "click the cookie" phase — it teaches the currency and makes the first automated purchase feel like a relief.
2. **Mid game:** Computers earn passively. You juggle buying *more* of a tier vs. saving for the *next* tier, plus upgrades that multiply output. New eras unlock new mechanics (see §5).
3. **Late game:** You manage rows of racks with aggregate stats, automation buys hardware for you, and the interesting decisions move up a level (research allocation, power/heat management, prestige timing).
4. **Prestige:** Reset for **Vintage Chips**, a permanent multiplier currency, and start over faster — with cosmetic relics of past runs kept in the scene (your original 5100 sits on a shelf in the datacenter, forever).

---

## 3. Currencies & Resources

| Resource | Earned by | Spent on | Notes |
|---|---|---|---|
| **Credits (₵)** | Computers (per second), manual jobs | Computers, upgrades | The main number-goes-up currency |
| **Research Points (RP)** | Generated slowly per *distinct* computer tier owned | Tech tree nodes | Rewards breadth, not just stacking one tier |
| **Power (kW)** | Capacity from PSUs/generators/substations | Consumed by machines | Soft cap on expansion; late-game logistics mechanic (§5.3) |
| **Heat** | Produced by high-tier machines | Removed by cooling purchases | Only exists from the server era onward |
| **Vintage Chips** | Prestige reset | Permanent global multipliers, QoL unlocks | `chips = floor((lifetime ₵ / 10¹²)^0.5)` style formula |

Number formatting: standard idle-game suffixes (K, M, B, T, Qa, Qi, …) with scientific notation fallback.

---

## 4. The Computers (Purchase Tiers)

Each tier follows the classic idle cost curve:

- **Cost of nth unit:** `baseCost × 1.15ⁿ`
- **Base production:** each tier earns roughly **8–12× the previous tier**, while costing roughly **10–15× more** — so earlier tiers stay briefly relevant, then gracefully fade into "background income"
- Owning **10 / 25 / 50 / 100** of a tier grants milestone multipliers (×2 at each), Cookie Clicker style

| # | Tier | Era | Base Cost (₵) | Base ₵/sec | Where it appears in scene |
|---|---|---|---|---|---|
| 1 | **IBM 5100 Portable** | 1975 | 15 | 0.1 | Garage workbench |
| 2 | **Altair 8800** | 1976 | 100 | 1 | Garage shelving |
| 3 | **Apple II** | 1977 | 1,100 | 8 | Home office desks |
| 4 | **Commodore 64 + 1702 monitor** | 1982 | 12,000 | 47 | Home office, kid's-desk clutter |
| 5 | **IBM PC 5150** | 1983 | 130,000 | 260 | Office cubicles appear |
| 6 | **Beige 486 Tower + CRT** | 1991 | 1.4M | 1,400 | Rows of cubicles |
| 7 | **iMac G3** | 1998 | 20M | 7,800 | Colorful "startup loft" corner |
| 8 | **RGB Gaming Rig** | 2015 | 330M | 44,000 | Glass-walled LAN room |
| 9 | **1U Rack Server** | 2010s | 5.1B | 260,000 | First server closet; racks fill 1U at a time |
| 10 | **Full Server Rack (42U)** | 2010s | 75B | 1.6M | Server room with raised floor |
| 11 | **GPU Compute Pod** | 2020s | 1T | 10M | Datacenter aisle, blinding LED walls |
| 12 | **Cryo Supercomputer Rack Row** | Near-future | 14T | 65M | Cathedral-scale hall, liquid cooling, fog |
| 13 | **Quantum Annex** *(post-prestige unlock)* | Future | 200T | 400M | Golden chandelier in a dark vault room |

Design intent per tier:

- **Tiers 1–4** are *personal computers* — bought one at a time, each visibly placed. Intimacy phase.
- **Tiers 5–8** are *office computing* — bought in small batches, the camera pulls back, and you start seeing "your company."
- **Tiers 9–13** are *infrastructure* — bought in bulk (buy ×1/×10/×100/Max buttons matter now), rendered with instancing, and the scene becomes an architectural spectacle.

---

## 5. Era Mechanics (the Universal Paperclips influence)

Universal Paperclips works because the game keeps *changing what game it is*. Each era unlock introduces one new mechanic rather than just bigger numbers:

### 5.1 Garage Era (Tiers 1–2) — Manual labor
- "Run Job" button: click to earn `max(1, 0.5% of ₵/sec)` per click.
- **Job Board:** small randomized contracts ("Payroll batch for Hendersons' Grocery — 500 cycles → ₵40") that give the early game texture and burst income.

### 5.2 Home/Office Era (Tiers 3–6) — Software & upgrades
- **Software upgrades** unlock: OS improvements, compilers, "Spreadsheet License" — flat multipliers per tier (×2, ×3…), priced ~10× the tier's current unit cost.
- **Research Points** start accruing; the **tech tree** opens (§6).
- **Networking** upgrade: owning N of a tier gives adjacent tiers +1% each (synergy incentive to diversify).

### 5.3 Server Era (Tiers 9–10) — Power & heat
- Machines now consume **Power**. You buy PSU banks → generators → a substation. Exceeding capacity throttles all production to 50% (visible: lights flicker in the scene).
- **Heat** accumulates; buy cooling (fans → CRAC units → liquid cooling loops). Overheating adds a failure chance: a random rack goes offline (smoke particle effect) until clicked to reboot — a light "check in on your game" tap on the shoulder.

### 5.4 Datacenter Era (Tiers 11–13) — Automation & optimization
- **Auto-buyer** ("Procurement AI"): configurable — keeps buying the best ₵/sec-per-₵ option. This is the moment the game plays itself, deliberately.
- **Workload allocator:** slider distributing compute between *Credits*, *Research*, and *Cooling efficiency* — the late-game knob to fiddle with.
- **Quantum Annex** (post-prestige): produces **probability shards** that randomly duplicate a purchase for free. Slot-machine dopamine, strictly bonus.

---

## 6. Research Tree (RP)

A compact DAG (~25 nodes), three branches:

- **Hardware:** global % production, cost-growth reduction (1.15 → 1.14 → 1.135…), milestone bonuses at 5-owned instead of 10.
- **Software:** click power, job board payouts, offline earnings rate (50% → 75% → 100% of online rate), auto-clicker.
- **Infrastructure:** power efficiency, heat reduction, buy-in-bulk discounts, unlock auto-buyer earlier.

RP generation: `0.1 × (number of distinct tiers owned)²` per second — a deliberate incentive to keep old machines around rather than ignoring lower tiers.

---

## 7. Prestige: "Legacy Hardware"

- Unlocks at 1 Trillion lifetime Credits.
- Reset grants **Vintage Chips**; each chip = +2% global production, permanent.
- Non-reset persistents: research tree stays, cosmetic relics stay (one museum shelf per prestige showing that run's highest-tier machine), Quantum Annex tier unlocks on 1st prestige.
- Prestige screen framed as *"Sell the company, keep the patents."* The scene visibly resets to the empty garage — but the museum shelf on the wall carries your history. This moment should feel bittersweet and is the emotional core of the game.

---

## 8. The 3D Scene

### 8.1 Structure
One continuous environment that *expands* rather than switching maps. Camera is orbit-constrained (rotate + limited zoom, no free-fly). Each era unlock plays a short camera pull-back and a wall/room "unfold" animation revealing new floorspace:

```
[Garage 6×4m] → knock out wall → [Home office] → [Office floor with cubicles]
   → [Startup loft] → [Server room, raised floor] → [Datacenter hall, 100m aisles]
```

- Placement is **automatic and deterministic**: each tier has an ordered list of anchor points (desk slots, shelf slots, rack slots). Purchase #7 of Apple IIs always lands in the same spot — saves are just counts, scene is a pure function of game state.
- Past-era rooms remain visible and lit at the edge of the scene (your history is always physically present).
- **Performance:** tiers 1–8 are individual meshes (counts stay small, ~dozens). Tiers 9+ use `InstancedMesh` — thousands of rack units at 60fps. LED blinking via shader time offset per instance, not per-object updates.

### 8.2 Rendering & mood
- Low-poly geometry, but **material-rich**: era-accurate palettes (1970s beige-cream, 1980s greige, 2000s bondi blue, datacenter black + LED).
- Lighting evolves per era: warm single garage bulb → fluorescent office panels → cold blue datacenter with volumetric-ish fog planes and emissive LED bloom (UnrealBloomPass).
- Ambient audio evolves too: single fan whir → office murmur → deep datacenter roar (layered, volume tied to machine count).

### 8.3 Per-computer model specs

Each model is built procedurally from three.js primitives (Box/Cylinder/Extrude + bevels via `RoundedBoxGeometry`), targeting **300–1,500 triangles** for desk machines and **heavier detail on rack units only at LOD0**. Every machine has at least one **idle animation** so the scene never feels static.

---

**Tier 1 — IBM 5100 Portable (the starter)**
- Silhouette: single boxy slab (~1.9× wide vs deep), integrated tiny 5" CRT on the left front face, wide keyboard plane on the sloped front, cream/putty casing.
- Details: black CRT bezel inset with green phosphor emissive plane (scrolling text texture), keyboard as a single displacement-textured plate + a few individually modeled chunky keys, carry handle groove on top, IBM badge decal, side vent slots (normal-mapped).
- Animation: green text flickers/scrolls on the tiny CRT; subtle emissive pulse when it "completes a job" (synced to income tick).

**Tier 2 — Altair 8800**
- Silhouette: low wide rack-style steel box, iconic **front panel of toggle switches and red LEDs** — two rows of switches, two rows of lights.
- Details: 25+ tiny toggle switches (instanced micro-geometry), 30+ red LED dots (emissive), blue/gray two-tone faceplate, vented steel top.
- Animation: LEDs blink in shifting binary patterns (shader-driven); one random toggle switch occasionally "flips" itself.

**Tier 3 — Apple II**
- Silhouette: wedge-shaped beige case with integrated keyboard, separate 9" monochrome monitor perched on top, twin Disk II drives stacked beside it.
- Details: rainbow Apple badge decal, brown keycaps, monitor with green-on-black emissive screen showing `]` prompt and typing animation, Disk II drives with red activity LED and slot.
- Animation: typing appears on screen character-by-character; disk drive LED flashes with a soft *thunk* audio tick on purchase milestones.

**Tier 4 — Commodore 64 + 1702 monitor**
- Silhouette: the famous breadbin — low sloped keyboard unit in greige — beneath a chunky CRT monitor; 1541 floppy drive beside it.
- Details: rainbow-stripe badge, dark brown keys, CRT with the iconic **blue-on-lighter-blue BASIC screen** (`READY.` + blinking cursor, emissive), curved glass suggested by a fresnel-tinted screen shader.
- Animation: blinking cursor; occasional screen "loading stripes" border flicker (Datasette loading homage).

**Tier 5 — IBM PC 5150**
- Silhouette: horizontal desktop case with monitor on top, big clacky Model F keyboard in front. First "system + monitor + keyboard" triple.
- Details: two 5.25" floppy bays with slot detail, front power rocker, green monochrome screen with DOS `C:\>` prompt, cable modeled as a tube from keyboard to case rear.
- Animation: floppy LED blink; DOS screen occasionally runs a `dir` scroll.

**Tier 6 — Beige 486 Tower + CRT**
- Silhouette: vertical mid-tower beside a deep 15" CRT on a desk; the archetypal 90s office machine. This is the tier where cubicles appear, so it's designed to read well repeated in rows.
- Details: turbo button + LED + 7-seg "66" MHz display, 3.5" and 5.25" bays, CRT with Windows-3.x-style tiled desktop (emissive texture, generic — no trademarked UI), mouse + pad, tower slightly angled on desk for a human touch.
- Animation: screensaver kicks in on idle machines (flying-shapes), HDD LED flicker; CRTs have subtle scanline shader.

**Tier 7 — iMac G3**
- Silhouette: one-piece translucent teardrop/gumdrop. The translucency is the whole point.
- Details: `MeshPhysicalMaterial` with transmission + roughness for the bondi-blue shell, visible darker inner-CRT mass inside the shell, round puck mouse, matching translucent keyboard, carry handle cutout on top.
- Purchases cycle through the five fruit colors (blueberry, strawberry, lime, tangerine, grape) — free visual variety in the loft scene.
- Animation: screen shows a slow color-cycling gradient; shell catches light as the camera orbits.

**Tier 8 — RGB Gaming Rig**
- Silhouette: black mid-tower with full tempered-glass side panel, ultrawide monitor, mechanical keyboard with per-key glow.
- Details: through the glass — three stacked RGB fans (emissive rings), GPU with backplate + support bracket, CPU AIO block with glowing logo, RAM sticks with light bars, sleeved cable run. Monitor shows a scrolling "game" abstract.
- Animation: all RGB slowly cycles hue in sync per-machine but offset between machines (wave effect across the LAN room); fan blades actually rotate (simple spin, cheap).

**Tier 9 — 1U Rack Server**
- Silhouette: pizza-box 1U sled. Bought individually, they **slide into a partially empty rack** one at a time — the purchase animation *is* the model reveal (rack ships empty with rails visible).
- Details: front face is the star — 8× hot-swap drive caddies each with two micro-LEDs, perforated hex-mesh faceplate (alpha texture), dual PSU handles at rear, ear brackets with thumbscrews.
- Animation: sled slides in with a click on purchase; drive LEDs blink independently (green activity / occasional amber).

**Tier 10 — Full Server Rack (42U)**
- Silhouette: full-height black enclosure, perforated front door slightly ajar-angled, fully populated with a mix of 1U/2U faces and a patch panel.
- Details: cable management — a modeled bundle of colored cables cascading down one side into a vertical manager, top-of-rack switch with 48 port LEDs, rack PDU visible at rear edge, unit-number decals up the rail.
- Animation: hundreds of port/drive LEDs (all shader-instanced), one rack occasionally does a rolling "reboot wave" where its LEDs blackout and cascade back on.

**Tier 11 — GPU Compute Pod**
- Silhouette: wider, deeper cabinet than the 42U rack, gold-heatsink GPU trays with visible dense fin stacks, thick orange/black power cabling, LED status bar down the full height of the front.
- Details: 8 GPU sleds each showing 4 heatsink fin blocks + NVLink-style bridges, rear bus bars (copper emissive-tinged), overhead cable tray connecting pods in a row, floor grille tiles beneath (raised-floor airflow story).
- Animation: full-height status bar "breathes" between green and cyan with load; heat-shimmer distortion shader rises faintly above each pod row.

**Tier 12 — Cryo Supercomputer Rack Row (the endgame spectacle)**
- Bought as an entire **row of 8 linked cabinets** — one purchase = one row materializing in the great hall.
- Silhouette: monolithic matte-black cabinets with a single continuous edge-lit seam of cyan running the length of the row; overhead insulated coolant pipes (thick, foil-wrapped, modeled with slight sag) plugging into each cabinet top; glass end-doors on the row.
- Details: coolant quick-disconnects with frost material (white rough patches + faint fog sprite), status e-ink style panel per cabinet showing scrolling metrics, floor lightstrips guiding the aisle, drip of condensation particles near pipe joints.
- Animation: slow pulse travels down the row's light seam like a heartbeat; cold-fog ground layer (translucent scrolling noise planes); pipe-mounted valve indicator wheels rotate slowly. Purchasing a row plays a hall-shaking bass hum swell.

**Tier 13 — Quantum Annex (post-prestige)**
- Silhouette: the iconic **golden chandelier** — inverted tiered wedding-cake of gold discs connected by dozens of fine vertical coax lines, suspended inside a cylindrical open cryostat frame, in its own dark vault room.
- Details: 4 diminishing gold plate tiers (metalness 1.0, warm env-map), ~60 thin cylinder "cables" with slight programmatic droop/curve, coiled loops at each tier edge, surrounding frame with instrument boxes and a single deep-blue glow from beneath.
- Animation: the entire chandelier very slowly rotates; occasional camera-visible "probability shard" event — a bright particle spirals up the chandelier and flies to the credits counter (this is the free-duplication proc, made physical).

---

## 9. UI / UX

- **Layout:** 3D scene fills the viewport; HTML/CSS overlay UI (not in-canvas) — left panel = purchase list (tier cards with icon, owned count, cost, ₵/sec, buy ×1/×10/×100/Max), top bar = Credits, ₵/sec, Power, Heat, RP; right slide-out = research tree; bottom-center = "Run Job" button (early game only, fades away once obsolete).
- Tier cards show *silhouette-only* dark placeholders for the next undiscovered tier ("???" + cost hint) — the Cookie Clicker curiosity driver.
- Clicking a tier card **flies the camera** to that machine group in the scene; clicking empty scene returns to era-default framing.
- Every purchase: machine materializes with a quick scale-up + dust/sparkle particle, soft era-appropriate sound (floppy chunk / server click / bass hum), and a floating `+₵/sec` toast.
- Number ticks animate (lerped counter), because watching the number go up *is* the game.
- Settings: audio sliders, bloom toggle, instancing quality (low-spec fallback), hard reset, export/import save.

---

## 10. Technical Architecture

```
/src
  main.js            bootstrapping, render loop, resize
  game/
    state.js         single source of truth (plain object), tick(), offline calc
    balance.js       all tier/cost/production constants (one tunable file)
    save.js          localStorage autosave (30s) + export/import (base64 JSON)
    research.js      tree definitions + effects
  scene/
    world.js         rooms, era-unfold animations, lighting rigs
    models/          one module per computer tier (procedural builders)
    placement.js     deterministic anchor-point slotting
    instancing.js    InstancedMesh managers for tiers 9+
    fx.js            bloom, particles, LED shader, fog planes
  ui/
    hud.js           DOM overlay binding to state (no framework needed; or Preact if desired)
```

Key decisions:
- **Game logic is fully headless** — `tick(dt)` runs on `setInterval` (1s), independent of `requestAnimationFrame` rendering, so a background tab still earns (plus `visibilitychange` + timestamp diff for true offline gains, capped at e.g. 24h).
- **Scene = f(state):** renderer diffs owned-counts against placed-models each frame-batch and adds/removes; nothing about the scene is saved.
- **All balance in `balance.js`** as a data table — tuning without touching logic.
- No build step required (ES modules + import map for three.js), but Vite recommended for dev ergonomics.

---

## 11. Progression Pacing Targets

| Milestone | Target time (active-ish play) |
|---|---|
| First automated income (2nd IBM 5100) | ~1 min |
| Apple II era | ~10 min |
| Office era (5150s, cubicles appear) | ~45 min |
| First 1U server slides into a rack | ~3 hrs |
| First full datacenter aisle | ~6 hrs |
| First prestige available | ~8–10 hrs |
| Cryo row wall-of-racks endgame | multi-day idle |

Tune with the standard idle heuristic: the next meaningful purchase should almost always be **30 seconds – 5 minutes** away in the active phases, stretching longer only when era transitions are imminent (anticipation spikes).

---

## 12. Scope & Milestones (for when we build it)

1. **M1 — Playable core:** state/tick/save, tiers 1–5, flat HTML UI, no 3D. Prove the loop is fun.
2. **M2 — The scene:** garage + home office rooms, models for tiers 1–5, placement system, purchase animations.
3. **M3 — Full ladder:** tiers 6–12, era unfolds, instancing, power/heat, research tree.
4. **M4 — Prestige & polish:** Vintage Chips, Quantum Annex, audio, bloom/fog, balance pass, offline earnings.
5. **M5 — Juice:** job board, reboot events, museum shelf, settings, save export.

Out of scope (v1): multiplayer/leaderboards, real-money anything, mobile touch layout (desktop-first; revisit later), free camera.

---

## 13. Open Questions

- Should Power/Heat be optional ("management mode" toggle) to keep pure-idle players happy?
- Second prestige layer (beyond Vintage Chips) if retention warrants it — "timeline reset" with era-skip tokens?
- Do we want a Paperclips-style narrative thread (emails from clients → investors → governments as you scale)? Cheap to add (text only), big flavor payoff. **Recommendation: yes, in M5.**
