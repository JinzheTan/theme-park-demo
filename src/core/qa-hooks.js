import { inBounds, getTile } from "../util/grid.js";
import { isObjectOperational } from "../sim/park.js";
import { useToolAt, canPlaceTool } from "../sim/placement.js";
import { tileToScreen, screenToTile } from "../util/iso.js";
import { focusCameraOn, fitCameraToPark } from "../render/camera.js";
import { setSelectedTool } from "../ui/tools-panel.js";
import { setSimulationSpeed } from "../ui/speed-controls.js";
import { getGuestActivityItems } from "../ui/insights.js";
import { growthLabel } from "../data/growth.js";

function getFocusedTileSummary(state) {
  const tile =
    state.focusedTile && inBounds(state.focusedTile.x, state.focusedTile.y)
      ? getTile(state, state.focusedTile.x, state.focusedTile.y)
      : null;
  if (!tile) return null;
  const object = tile.objectId ? state.objects.get(tile.objectId) : null;
  return {
    tile: { x: tile.x, y: tile.y, terrain: tile.terrain, path: tile.path, litter: tile.litter },
    object: object
      ? {
          type: object.type,
          label: object.label,
          queue: object.queue.length,
          riders: object.riders.length,
          operational: isObjectOperational(state, object),
        }
      : null,
  };
}

function renderGameToText(state) {
  const rides = [...state.objects.values()]
    .filter((o) => o.category === "ride" || o.category === "facility")
    .map((object) => ({
      id: object.id,
      type: object.type,
      label: object.label,
      x: object.x,
      y: object.y,
      queue: object.queue.length,
      riders: object.riders.length,
      operational: isObjectOperational(state, object),
    }));

  const guestStates = getGuestActivityItems(state).map((entry) => ({
    label: entry.label,
    value: entry.value,
  }));

  return JSON.stringify({
    mode: "play",
    coordinateSystem:
      "Grid origin is top-left at tile 0,0. +x moves down-right on screen, +y moves down-left on screen.",
    selectedTool: state.selectedTool,
    timeScale: state.timeScale,
    day: state.day,
    money: Math.round(state.money),
    growthScore: state.growthScore,
    growthLabel: growthLabel(state.growthScore),
    cleanliness: state.cleanliness,
    averageHappiness: state.averageHappiness,
    guestsInside: state.guests.length,
    guestsServed: state.guestsServed,
    guestStates,
    focused: getFocusedTileSummary(state),
    rides,
    recentEvents: state.feed.slice(0, 4).map((entry) => ({
      title: entry.title,
      description: entry.description,
    })),
  });
}

export function installQaHooks(state, canvas, advanceTime) {
  window.advanceTime = advanceTime;
  window.render_game_to_text = () => renderGameToText(state);
  window.__wonderloop = {
    state,
    useToolAt: (x, y) => useToolAt(state, x, y),
    canPlaceTool: (toolId, x, y) => canPlaceTool(state, toolId, x, y),
    screenToTile: (sx, sy) => screenToTile(state, sx, sy),
    tileToScreen: (x, y) => tileToScreen(state, x, y),
    focusCameraOn: (x, y) => focusCameraOn(state, canvas, x, y),
    fitCameraToPark: () => fitCameraToPark(state, canvas),
    setTool: (toolId) => setSelectedTool(toolId),
    setSpeed: (speed) => setSimulationSpeed(speed),
    snapshot: () => JSON.parse(renderGameToText(state)),
  };
}
