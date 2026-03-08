Original prompt: 将这个仓库完全清理。并且执行下列prompt：Use $playwright-interactive and $imagegen. Create an interactive isometric theme park simulation game that I can build and navigate in the browser. Use imagegen to establish the overall visual vision and generate the game’s assets, including rides, paths, terrain, trees, water, food stalls, decorations, buildings, icons, and UI illustrations. The world should feel cohesive, polished, and visually rich, with a premium art direction that works well from an isometric perspective. Let me place and remove paths, add attractions, position scenery, and move around the park smoothly while monitoring guest activity, ride status, and park growth. Include believable guest movement, simple park management systems like money, cleanliness, queueing, and happiness, and make the experience feel playful, clear, and complete rather than like a rough prototype. Prioritize charm, readability, and strong game feel over realism. When play testing, be sure to build and expand a park through several rounds of play, verify that placement and navigation work smoothly, confirm that guests react to the park layout and attractions, and ensure the visuals, UI, and interactions feel stable and cohesive.

Notes
- Reusing the existing static app as the clean rebuild base is faster than deleting it outright; repo will be left as a focused single-page park sim with organized assets and no unrelated scaffolding.
- `OPENAI_API_KEY` is not set in the current shell, so live `imagegen` API calls are blocked for now. Proceed with prompt specs + local asset polish unless the key becomes available.

TODO
- Add deterministic test hooks required by the web-game workflow: `window.render_game_to_text` and `window.advanceTime(ms)`.
- Tighten the simulation so guests, queues, cleanliness, and growth remain readable during longer play sessions.
- Add a clearer build/manage HUD and improve onboarding text without cluttering the play surface.
- Run Playwright-based functional and visual QA, then fix any issues exposed there.

QA inventory
- Claim: the park can be expanded by placing paths, rides, facilities, and scenery, and items can be removed cleanly.
- Claim: camera navigation is smooth via keyboard, wheel zoom, minimap/focus controls, and fullscreen toggle.
- Claim: guests visibly move through the path network, queue for attractions, react to food/service/scenery, and leave when done.
- Claim: management values stay readable and coherent: money, cleanliness, happiness, ride status, guest activity, and growth goals.
- Claim: visuals feel cohesive in both the main viewport and sidebar UI, with no clipped essential controls at startup.
- Controls to cover: tool palette buttons, numeric shortcuts, left-click placement/removal, drag path painting, right-drag pan, wheel zoom, speed buttons, `Space`, `C`, `F`, minimap click, Fit Park button.
- State changes to cover: valid placement, invalid placement, guest queue growth, ride dispatch, cleanliness pressure, weekly growth bonus, removal/reroute, pause/resume, fullscreen enter/exit.
- Exploratory scenario 1: build a long branch with disconnected placement attempts, then reconnect and verify guests reroute correctly.
- Exploratory scenario 2: overbuild rides without extra service/food, watch cleanliness and queue pressure worsen, then fix it with support buildings.

Progress
- Added guest activity and growth goal panels to make park state easier to read.
- Added weekly growth dividends, milestone rewards, route validation for guests, fullscreen toggle, and deterministic `advanceTime` / `render_game_to_text` hooks for automated QA.
- Fixed the desktop viewport-fit issue by turning the app into a fixed-height shell with an internally scrolling sidebar; startup no longer lands mid-page.
- Verified desktop interactions in a persistent Playwright browser: placed a wheel ride, extended paths, removed/restored support coverage, used keyboard shortcuts, zoom, minimap, pause/resume, and fit-camera controls.
- Verified mobile viewport loads without layout breakage; the experience becomes a scrollable stacked layout rather than clipping critical UI.
- Ran the develop-web-game Playwright client from a local copy under `tmp/` to satisfy module resolution, producing screenshots and `render_game_to_text` captures in `output/web-game-path/` and `output/web-game-wheel/`.
- No Playwright console errors were reported in the MCP browser session, and the web-game client runs produced screenshots/state JSON without `errors-*.json`.

Remaining blocker
- Live `imagegen` API output was not possible because `OPENAI_API_KEY` is missing. I prepared `output/imagegen/asset-prompts.md` and validated the full batch as a dry-run so the asset generation step is ready once the key exists.
