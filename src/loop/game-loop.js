import { SIM } from "../data/tuning.js";
import { clamp } from "../util/math.js";
import { updateEconomy, computeParkMetrics, maybeAwardGrowthMilestones } from "../sim/economy.js";
import { updateGuests } from "../sim/guests.js";
import { updateObjects } from "../sim/objects.js";
import { updateCamera } from "../render/camera.js";
import { render } from "../render/canvas-world.js";
import { renderMinimap } from "../render/canvas-minimap.js";
import { renderPanels } from "../ui/panels.js";

export function stepFrame(state, canvas, ctx, minimapCanvas, minimapCtx, realDt, simDt) {
  updateCamera(state, canvas, realDt);
  if (simDt > 0) {
    updateEconomy(state, simDt);
    updateGuests(state, simDt);
    updateObjects(state, simDt);
  }
  computeParkMetrics(state);
  maybeAwardGrowthMilestones(state);

  state.uiClock += realDt;
  if (state.uiDirty || state.uiClock >= SIM.UI_REFRESH_INTERVAL_S) {
    state.uiClock = 0;
    renderPanels(state);
  }

  render(state, ctx, canvas);
  renderMinimap(state, minimapCtx, minimapCanvas, canvas);
}

export function startGameLoop(state, canvas, ctx, minimapCanvas, minimapCtx) {
  let lastTime = null;
  function frame(timestamp) {
    const realDt = clamp((timestamp - (lastTime ?? timestamp)) / 1000, 0, SIM.MAX_FRAME_DT);
    lastTime = timestamp;
    stepFrame(state, canvas, ctx, minimapCanvas, minimapCtx, realDt, realDt * state.timeScale);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return (ms) => {
    // expose deterministic advance: drive sim using fixed-step ticks
    const stepMs = 1000 / 60;
    const steps = Math.max(1, Math.round(ms / stepMs));
    const dt = ms / 1000 / steps;
    for (let i = 0; i < steps; i += 1) {
      stepFrame(state, canvas, ctx, minimapCanvas, minimapCtx, dt, dt * state.timeScale);
    }
  };
}
