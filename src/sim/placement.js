import { OBJECT_DEFS } from "../data/objects.js";
import { ECONOMY } from "../data/tuning.js";
import { PROTECTED_PATH_KEYS } from "../core/constants.js";
import { tileKey, getTile } from "../util/grid.js";
import { markUiDirty } from "../core/state.js";
import {
  addObject,
  removeObject,
  markPath,
  objectNearPath,
  refreshParkGraph,
} from "./park.js";
import { addEvent } from "./events.js";

export function canPlaceTool(state, toolId, x, y) {
  const tile = getTile(state, x, y);
  if (!tile) return { ok: false, reason: "Out of bounds" };

  if (toolId === "remove") {
    if (tile.objectId) {
      const object = state.objects.get(tile.objectId);
      if (object?.locked) return { ok: false, reason: "The park gate is fixed" };
      return { ok: true };
    }
    if (tile.path) {
      if (PROTECTED_PATH_KEYS.has(tileKey(x, y))) {
        return { ok: false, reason: "Guests need the gate entry path" };
      }
      return { ok: true };
    }
    return { ok: false, reason: "Nothing to clear here" };
  }

  if (toolId === "path") {
    if (tile.terrain !== "grass") return { ok: false, reason: "Paths need dry ground" };
    if (tile.objectId) return { ok: false, reason: "Object blocks this tile" };
    if (tile.path) return { ok: false, reason: "Path already laid" };
    if (state.money < ECONOMY.PATH_COST) return { ok: false, reason: "Not enough cash" };
    return { ok: true };
  }

  const def = OBJECT_DEFS[toolId];
  if (!def) return { ok: false, reason: "Unknown tool" };

  if (tile.terrain !== "grass") return { ok: false, reason: "Only placeable on grass" };
  if (tile.path) return { ok: false, reason: "Clear the path first" };
  if (tile.objectId) return { ok: false, reason: "Tile already occupied" };
  if (state.money < def.cost) return { ok: false, reason: "Not enough cash" };
  if (
    (def.category === "ride" ||
      def.category === "facility" ||
      def.category === "service" ||
      def.needsPath) &&
    !objectNearPath(state, x, y)
  ) {
    return { ok: false, reason: "Needs a path connection" };
  }

  return { ok: true };
}

export function useToolAt(state, x, y) {
  const toolId = state.selectedTool;
  const verdict = canPlaceTool(state, toolId, x, y);
  if (!verdict.ok) return false;

  if (toolId === "path") {
    const placed = markPath(state, x, y);
    if (placed) {
      state.money -= ECONOMY.PATH_COST;
      refreshParkGraph(state);
      markUiDirty();
      return true;
    }
    return false;
  }

  if (toolId === "remove") {
    const tile = getTile(state, x, y);
    if (tile.objectId) return removeObject(state, state.objects.get(tile.objectId));
    if (tile.path) {
      tile.path = false;
      tile.litter = 0;
      state.money += ECONOMY.PATH_REFUND;
      refreshParkGraph(state);
      addEvent(state, "Path updated", "Guests are testing the new circulation layout.");
      markUiDirty();
      return true;
    }
    return false;
  }

  const object = addObject(state, toolId, x, y);
  if (object) {
    const def = OBJECT_DEFS[toolId];
    addEvent(state, "New addition", `${def.label} opened and guests are already reacting.`);
    return true;
  }
  return false;
}
