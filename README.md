# Wonderloop Park

An isometric, browser-based theme-park simulation. Build paths, place rides, watch guests queue, manage cleanliness, hit growth milestones — all rendered on a single Canvas with a liquid-glass HUD overlay.

> Vanilla JS, no build step. Open `index.html` or run `npm run dev`.

## Features

- **Live park sim** — guests pathfind from the gate to rides and food, queue, ride, drop litter, and leave; janitors keep it clean; the economy runs on tickets, upkeep, and weekly dividends.
- **Living guests** — each visitor has a name, party size, and four needs (hunger, thirst, relief, energy), and surfaces contextual **thought bubbles** ("This line is too long!", "Ahh, refreshing!"). Use the **Inspect** tool to follow one and watch their mood and needs.
- **Amenities & comfort** — Drink Kiosks, Restrooms, Park Benches, and Trash Bins keep guests watered, relieved, rested, and the paths tidy.
- **Staff** — hire Janitors, Mechanics, Entertainers, and Security who roam the park doing their jobs, for an up-front fee plus per-cycle wages.
- **Ride upkeep** — rides wear and can break down; Mechanics repair them fast (with an external-crew fallback so you're never stuck).
- **Finance** — set a ticket-pricing strategy and park entry fee with real demand trade-offs, take loans with weekly interest, and a cushioned bailout that keeps a broke park alive instead of ending the game.
- **Day/night + weather** — a rolling time-of-day and rotating weather (sunny → cloudy → overcast → rain) that nudge attendance, mood, and appetite, with a canvas tint and rain, shown live in the HUD.
- **Achievements** — 14 account-level badges that persist across parks, with celebratory toasts and chimes.
- **Growth milestones** — per-park tiers (Budding → Destination) that pay expansion grants.
- **Trends dashboard** — live sparkline charts of cash, attendance, happiness, and growth over time.
- **Undo / redo** — every build action is reversible (`Ctrl+Z` / `Ctrl+Y`, or the action-bar buttons); a drag-painted path undoes in one step.
- **Interactive tutorial** — a first-run coach walks new operators through paths, rides, and guests; replayable from **Settings**.
- **Autosave & restore** — a silent autosave brings your park back after a refresh; a manual save slot lives alongside it.
- **Dark mode & comfort options** — dark theme, reduced motion, UI scale, and toggles for every overlay, all in **Settings**.
- **Sound** — all SFX are synthesized in-browser (no audio files). Toggleable in **Settings**.

## Quick start

```bash
npm run dev          # starts npx http-server on http://localhost:5173
```

Then open <http://localhost:5173>.

## Controls

| Action | Input |
|---|---|
| Pan | WASD / arrows / right-drag |
| Zoom | mouse wheel |
| Fit camera to park | `C` or **Fit Park** button |
| Fullscreen | `F` |
| Pick tool 1-9 / Remove | digit keys `1`-`9`, `0` |
| Pause / 1x / 2x | `Space`, or speed pills |
| Place / paint path | left-click / left-drag |
| Remove tile or building | Remove tool, click |
| Undo / redo | `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`) |
| Follow a guest | Inspect tool, click a guest |

## Architecture (high level)

```
data  →  util  →  core (state, qa-hooks)  →  sim (mutates state)
                                          ↘
                                            render + ui + input  →  loop  →  main
```

- `src/data/*` — pure constants, asset paths, tuning numbers
- `src/util/*` — math, grid, isometric projection
- `src/core/*` — state singleton, constants, QA window-globals
- `src/sim/*` — guests, rides, economy, pathfinding (only mutates state)
- `src/render/*` — canvas world + minimap, camera, resize
- `src/ui/*` — DOM panels, diff renderer, hover-card, tools, mobile tabs
- `src/input/*` — keyboard, pointer, wheel, minimap click, fullscreen
- `src/loop/*` — per-frame orchestration

CSS lives in `styles/` and is composed via `@import` from `styles/index.css`.

Full details: [docs/architecture.md](docs/architecture.md), [docs/design-system.md](docs/design-system.md).

## QA / testing

```bash
npm run qa           # Playwright smoke test against the live game
npm run lint:dead    # static check: every src/ file is reachable from src/main.js
```

The browser exposes these globals for test harnesses:

- `window.advanceTime(ms)` — deterministic time advance
- `window.render_game_to_text()` — JSON snapshot of the current park state
- `window.__wonderloop` — `{ state, setTool(id), setSpeed(n), placeAt(x,y), removeAt(x,y), snapshot() }`

## Folder map

```
assets/generated/    — 19 runtime PNGs (loaded by data/assets.js)
design-source/svg/   — SVG source files for the generated PNGs (NOT loaded)
src/                 — all JS, layered by concern
styles/              — tokens, glass system, components
docs/                — architecture, design system, history
qa/                  — Playwright + dead-import scanner
```

## Why no build?

The whole game is small enough that native browser ESM is fine. Less ceremony, no toolchain to maintain, easier to share. If/when bundling matters, swap `http-server` for Vite — no source changes required.
