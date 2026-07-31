# Silicon Empire

An idle/incremental game about buying computers of increasing complexity — from a
second-hand IBM 5100 in a dusty garage to cathedral-scale rows of cryo-cooled
supercomputers — rendered as a living 3D scene in three.js.

See [DESIGN.md](DESIGN.md) for the full game design document.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## How to play

- **Run Job** to earn your first Credits, then buy the IBM 5100 on the workbench.
- Every machine you buy physically appears in the scene. Click a tier card to fly
  the camera to your machines.
- New eras physically unfold new rooms: garage → home office → office → startup
  loft → server room → datacenter → quantum vault.
- From the server era onward, machines draw **power** and make **heat** — buy PSUs,
  generators, fans and cooling loops or production throttles and racks catch fire.
- Earn **Research Points** by owning many *distinct* machine types; spend them in
  the tech tree (top right).
- At ₵1T lifetime earnings you can **prestige** — sell the company, keep the
  patents. Each Vintage Chip is a permanent +2% to production, and a miniature of
  your best machine goes on the garage museum shelf, forever.
- The **Quantum Annex** (unlocked after your first prestige) occasionally
  duplicates machines for free via probability shards.

Progress autosaves to localStorage every 30 seconds and while you're away the
empire keeps earning (50% rate, upgradeable to 100% via research). Save
export/import and hard reset live in ⚙ Settings.

## Code layout

```
src/
  game/     headless game logic — balance.js is the single tuning file
  scene/    three.js world: procedural models, rooms, placement, fx
  ui/       DOM HUD
```

The game logic runs on its own interval, fully decoupled from rendering — the
whole simulation is testable headlessly in Node (see the design doc §10).
