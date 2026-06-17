// Land ownership. The buildable park is a set of owned square plots; everything
// else is dimmed and off-limits until bought. New plots can only be acquired
// next to land you already own, with an escalating price as the park sprawls.

import { PLOT_SIZE, PLOTS_PER_AXIS, INITIAL_OWNED_PLOTS } from "../core/constants.js";
import { ECONOMY } from "../data/tuning.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { addEvent } from "./events.js";

export function plotKey(px, py) {
  return `${px},${py}`;
}

export function plotForTile(x, y) {
  return { px: Math.floor(x / PLOT_SIZE), py: Math.floor(y / PLOT_SIZE) };
}

export function isPlotOwned(state, px, py) {
  return state.ownedPlots.has(plotKey(px, py));
}

export function isTileOwned(state, x, y) {
  const { px, py } = plotForTile(x, y);
  return isPlotOwned(state, px, py);
}

export function initOwnedPlots(state) {
  state.ownedPlots = new Set(INITIAL_OWNED_PLOTS.map(([px, py]) => plotKey(px, py)));
}

function plotInBounds(px, py) {
  return px >= 0 && py >= 0 && px < PLOTS_PER_AXIS && py < PLOTS_PER_AXIS;
}

export function isPlotBuyable(state, px, py) {
  if (!plotInBounds(px, py) || isPlotOwned(state, px, py)) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isPlotOwned(state, px + dx, py + dy));
}

export function plotCost(state) {
  const extra = Math.max(0, state.ownedPlots.size - INITIAL_OWNED_PLOTS.length);
  return ECONOMY.PLOT_BASE_COST + extra * ECONOMY.PLOT_STEP_COST;
}

export function buyPlotAt(state, x, y) {
  const { px, py } = plotForTile(x, y);
  if (!isPlotBuyable(state, px, py)) return false;
  const cost = plotCost(state);
  if (state.money < cost) return false;
  state.money -= cost;
  state.ownedPlots.add(plotKey(px, py));
  playSfx("cash");
  addEvent(state, "Land acquired", `Bought a new plot for $${cost}. Room to keep building.`);
  markUiDirty();
  return true;
}
