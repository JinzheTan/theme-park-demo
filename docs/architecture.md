# Architecture

Wonderloop Park is split into strict layers. Each layer only imports from layers below it, which makes the dependency graph a DAG and prevents the kind of accidental coupling that grows in monolithic files.

```
data  →  util  →  core  →  sim  →  render + ui + input  →  loop  →  main
```

## Module map

```mermaid
flowchart TB
  subgraph Data["data/"]
    D_OBJ[objects.js<br/>OBJECT_DEFS]
    D_TOOLS[tools.js<br/>TOOLS + SHORTCUTS]
    D_GROWTH[growth.js<br/>milestones + label]
    D_ASSETS[assets.js<br/>asset paths + loader]
    D_TUNE[tuning.js<br/>ECONOMY/GUEST/SIM/CAMERA]
  end

  subgraph Util["util/"]
    U_MATH[math.js]
    U_GRID[grid.js]
    U_ISO[iso.js]
  end

  subgraph Core["core/"]
    C_CONST[constants.js]
    C_STATE[state.js<br/>singleton]
    C_QA[qa-hooks.js]
  end

  subgraph Sim["sim/ (mutates state)"]
    S_EVT[events.js]
    S_PARK[park.js]
    S_PLACE[placement.js]
    S_PATH[pathfinding.js]
    S_GUESTS[guests.js]
    S_OBJ[objects.js]
    S_ECON[economy.js]
  end

  subgraph Render["render/ (reads state)"]
    R_CAM[camera.js]
    R_WORLD[canvas-world.js]
    R_MINI[canvas-minimap.js]
    R_RESIZE[resize.js]
  end

  subgraph UI["ui/ (DOM)"]
    UI_DOM[dom.js]
    UI_DIFF[diff.js]
    UI_INS[insights.js]
    UI_PAN[panels.js]
    UI_TOOLS[tools-panel.js]
    UI_HOVER[hover-card.js]
    UI_SPEED[speed-controls.js]
    UI_CTRL[controls-popover.js]
    UI_TABS[mobile-tabs.js]
  end

  subgraph Input["input/"]
    I_KEY[keyboard.js]
    I_PTR[pointer.js]
    I_WHL[wheel.js]
    I_MINI[minimap-input.js]
    I_FS[fullscreen.js]
  end

  Loop[loop/game-loop.js]
  Main[src/main.js]

  Data --> Sim
  Data --> Render
  Data --> UI
  Util --> Sim
  Util --> Render
  Util --> UI
  Core --> Sim
  Core --> Render
  Core --> UI
  Core --> Loop
  Input --> C_STATE
  Sim --> C_STATE
  C_STATE --> Render
  C_STATE --> UI
  Loop --> Sim
  Loop --> Render
  Loop --> UI
  Main --> Input
  Main --> Loop
  Main --> C_QA
  C_QA --> Sim
```

## Tick lifecycle

```mermaid
sequenceDiagram
  participant RAF as requestAnimationFrame
  participant Loop as loop/game-loop
  participant Sim as sim/*
  participant UI as ui/panels
  participant World as canvas-world
  participant Mini as canvas-minimap

  RAF->>Loop: timestamp
  Loop->>Loop: updateCamera(realDt)
  Loop->>Sim: updateEconomy(simDt)
  Loop->>Sim: updateGuests(simDt)
  Loop->>Sim: updateObjects(simDt)
  Loop->>Sim: computeParkMetrics()
  Loop->>Sim: maybeAwardMilestones()
  Loop->>UI: renderPanels() if dirty or 0.2s elapsed
  Loop->>World: render()
  Loop->>Mini: renderMinimap()
```

`realDt` clocks the camera & UI throttle; `simDt = realDt * timeScale` drives the simulation. Setting `timeScale = 0` freezes the world while the camera and UI still respond.

## Layer rules

| Layer | Allowed to import from | Forbidden | Responsibilities |
|---|---|---|---|
| **data** | (nothing) | anything else | Pure constants, asset paths, tuning numbers, asset loader |
| **util** | core/constants | sim, render, ui, input, loop | Pure functions: math, grid math, isometric projection |
| **core** | data, util | sim, render, ui, input, loop | State singleton, QA hooks |
| **sim** | data, util, core | render, ui, input, loop | All gameplay logic — mutates state |
| **render** | data, util, core, sim* | ui, input, loop | Canvas drawing — reads state |
| **ui** | data, util, core, sim* | render, input, loop | DOM panels, diff renderer, hover card |
| **input** | data, util, core, sim, render, ui | loop | Translates pointer/keyboard/wheel into state mutations |
| **loop** | everything below | (only main imports loop) | Per-frame orchestration |
| **main** | everything | — | Wires the app, installs QA hooks |

*`sim` import from render/ui is one-directional: render and ui *read* sim helpers like `isObjectOperational`, but never call sim mutations.

## State

A single, plain JS object exported from [`src/core/state.js`](../src/core/state.js). It is constructed once at bootstrap and passed explicitly into nearly every function. The pattern keeps modules pure-ish without paying the cost of a reactive store.

`markUiDirty()` is the single signal that triggers an out-of-cadence panel render — used by mutating sim code to skip the 0.2 s debounce when something visibly changed (placement, removal, milestone, event).

## Why this layering?

- Tight loop fits in one file (`loop/game-loop.js`) — easy to reason about ordering bugs.
- Render & UI can never accidentally mutate state because they don't import any sim mutation helpers (only readers like `isObjectOperational`, `canPlaceTool`).
- Tuning lives in one place: every magic number (hunger rate, refund ratio, zoom bounds...) is in [`src/data/tuning.js`](../src/data/tuning.js).
- Tests can construct an isolated state via `createState()` without touching DOM or canvas.

## Quick navigation

| If you want to... | Edit |
|---|---|
| Change a ride's price, ticket, or excitement | `src/data/objects.js` |
| Add or rename a tool / shortcut | `src/data/tools.js` |
| Tune hunger, patience, spawn rates | `src/data/tuning.js` |
| Change milestone thresholds / rewards | `src/data/growth.js` |
| Tweak path/placement rules | `src/sim/placement.js` |
| Tweak guest AI weighting | `src/sim/guests.js` `chooseGuestDestination` |
| Add a new HUD panel | `src/ui/panels.js` + new section in `index.html` |
| Change the glass look | `styles/tokens.css` + `styles/components/glass.css` |
| Add a keyboard shortcut | `src/data/tools.js` (numeric) or `src/input/keyboard.js` (non-tool) |
