Original prompt: 现在我更新了我的代码库，你先帮我梳理一下，然后听我的指挥。

Current task: Design and implement a first-pass settings panel for the fuller Wonderloop Park app, then check and fix UI display/style inconsistencies.

Plan notes:
- Settings panel should match simulation-app expectations: view overlays, build assistance, accessibility/display comfort, and safe defaults.
- First version should avoid destructive park actions and focus on immediate, reversible controls.
- Verify desktop and mobile layouts after implementation.

Progress:
- Added settings state with localStorage persistence.
- Added sidebar settings panel for view overlays, build assist, reduced motion, startup pause, and UI scale.
- Wired settings into canvas render behavior and CSS visibility classes.
- Shortened metric/HUD labels after desktop screenshot showed truncation at 1280px width.
- Fixed QA snapshot parity so service buildings count with the Ride Status/ops list.
- Replaced the QA script's `npx http-server` dependency with an inline Node static server to avoid flaky startup/download timing.
- Verified settings toggles and Reset Settings with real browser clicks; desktop and mobile screenshots showed no console/page errors.

Verification:
- `npm run lint:dead` passed.
- `npm run qa` passed once after the QA fixes: QA OK, 8 guests inside, growth score 282, rides 3.
- A later final QA rerun was blocked by environment escalation quota, not by app/test failure.

Next step progress:
- Added a Park Ops panel as the next management-depth layer after Settings.
- Park Ops reports net operations, guest load, queue pressure, service coverage, and park appeal.
- Added an Ops mobile tab and exposed operations data in the QA text snapshot.
- Added Park Data controls for local Save, Load, Clear, and New Park reset.
- Exposed save/load/reset through QA hooks for repeatable verification.

Session — gameplay depth + ship hardening:
- Goal: make the build shippable and add features for necessity, retention, and fun.
- Bug fixes: real weekly operating result (revenue − upkeep + dividend) instead of just the dividend; "1 ride" pluralization.
- Auto-save & restore: silent autosave slot (18s wall-clock cadence) restored on boot ("Welcome back"), independent of the manual save slot; setting toggle. Park replacements (load/reset) refresh the autosave mirror.
- Achievements: 14 account-level badges in `data/achievements.js`, evaluated each tick, persisted via `core/progress-store.js` (survive New Park), with a new Awards panel/tab, toast notifications (`ui/toast.js`), and a chime.
- Day/night + weather: `data/atmosphere.js` + `sim/atmosphere.js`; `getAtmosphereModifiers` bends spawn/mood/appetite, drives a canvas tint + rain pass and a HUD pill; gated by a "Day & weather" setting.
- Sound: `core/audio.js` synthesizes all SFX (place/remove/dispatch/milestone/achievement) via WebAudio, unlocked on first gesture, toggleable.
- New settings section "Live World" (Day & weather, Sound, Autosave). Save schema extended (backward compatible, version unchanged).

Verification:
- `npm run lint:dead` passed (49 files reachable).
- `npm run qa` passed: QA OK, no page errors, save/load + pause assertions green.
- Browser-verified desktop + mobile: atmosphere pill, rain rendering, achievement toast/unlock, autosave restore, Awards tab — no console errors.

Phase 1 — experience & guest life (D track):
- Guest identity: names + party size (data/guest-flavor.js); serialized with guests.
- Thought bubbles: contextual speech bubbles (ride loved, hungry, queue too long, scenery, leaving) rendered on canvas with cooldowns.
- Inspect tool + guest inspector: click a guest to follow; floating card shows mood/hunger/patience meters, activity, thought; selection ring on canvas.
- Trends dashboard: sim/stats.js ring-buffer sampler + ui/stats-panel.js sparklines (cash/guests/happiness/growth).
- Undo/redo: sim/history.js snapshot stack (build-only slice), Ctrl+Z/Y + action-bar buttons; drag-stroke = one undo step.
- Dark mode: token overrides in styles/components/theme-dark.css, settings toggle.
- Interactive tutorial: ui/tutorial.js 5-step first-run coach with auto-advancing action steps; localStorage-gated; replayable from Settings.
- Verified: lint:dead 56 files, npm run qa green, browser checks of every feature (incl. real click-to-inspect) with no console errors.

Phase 2 — management depth (A track), in progress:
- Guest needs v2: thirst, relief (bladder), energy added alongside hunger; stacking happiness penalties; needs-priority destination choice; need-satisfaction thoughts.
- New facilities: Drink Kiosk (thirst), Restroom (relief), Park Bench (energy), Trash Bin (cuts nearby litter). Authored 4 palette-matched SVG sprites loaded via the existing Image loader. New "Comfort" tool group. Seeded a few into the starter park. Need-based insights guide what to build. New "Creature Comforts" achievement.
- Staff system (src/data/staff.js + src/sim/staff.js): hire/dismiss Janitor/Mechanic/Entertainer/Security with up-front fee + per-cycle wages; staff walk the paths; janitor cleans litter, entertainer/security apply nearby auras, mechanic services/repairs rides. Staff panel + mobile tab + canvas rendering; staff persisted in saves.
- Breakdowns & repair (src/sim/breakdown.js): rides wear with use, break down and stop, mechanics repair fast, external crew auto-recovers after a downtime window so no soft-lock. Ride condition shown in Ride Status + "⚠ Closed" canvas label; breakdown toast.
- Pricing + loans/bankruptcy (src/sim/finance.js + src/ui/finance-panel.js): global ticket-price multiplier (0.6–1.6x) with demand elasticity (high prices damp ride demand) and a park entry fee (revenue per arrival, but dampens spawn). Loans (3 sizes) with weekly compounding interest; manual repay. Cushioned bankruptcy: cash below the floor for a grace window triggers an investor bailout (cash floated to a small positive, debt added, growth-score dinged) instead of game over. Finance panel + "Money" tab; cash/debt insights.
- Phase 2 COMPLETE (tasks 14-18). Verified: lint:dead 62 files, npm run qa green (rides 5), browser checks: hiring all 4 staff, janitor cleaning, forced breakdown → mechanic repair, needs loop, loans, pricing, and the cushioned bailout firing, with no console errors.
