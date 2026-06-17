// Undo/redo for building. Rather than reverse each command by hand (which gets
// hairy once money, refunds, and path connectivity interact), we snapshot the
// *build-relevant* slice of state before a change and swap snapshots in/out.
// Guests, feed, clocks, and weather are deliberately NOT captured — undoing a
// path edit shouldn't rewind the whole simulation.

import { OBJECT_DEFS } from "../data/objects.js";
import { rand } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { refreshParkGraph } from "./park.js";

const MAX_DEPTH = 40;

export function captureBuildSnapshot(state) {
  return {
    money: state.money,
    nextObjectId: state.nextObjectId,
    tiles: state.tiles.map((row) =>
      row.map((tile) => ({ path: tile.path, litter: tile.litter, objectId: tile.objectId })),
    ),
    objects: [...state.objects.values()].map((object) => ({
      id: object.id,
      type: object.type,
      x: object.x,
      y: object.y,
      locked: object.locked,
      removable: object.removable,
    })),
  };
}

function rebuildObject(data) {
  const def = OBJECT_DEFS[data.type];
  if (!def) return null;
  return {
    id: data.id,
    type: data.type,
    label: def.label,
    category: def.category,
    asset: def.asset,
    x: data.x,
    y: data.y,
    entry: null,
    queue: [],
    riders: [],
    cycleRemaining: 0,
    upkeepClock: 0,
    locked: Boolean(data.locked),
    removable: Boolean(data.removable),
    stats: { ...def },
    sparkle: rand(0, Math.PI * 2),
  };
}

function restoreBuildSnapshot(state, snap) {
  state.money = snap.money;
  state.nextObjectId = snap.nextObjectId;

  for (let y = 0; y < state.tiles.length; y += 1) {
    for (let x = 0; x < state.tiles[y].length; x += 1) {
      const tile = state.tiles[y][x];
      const saved = snap.tiles[y][x];
      tile.path = saved.path;
      tile.litter = saved.litter;
      tile.objectId = saved.objectId;
    }
  }

  state.objects = new Map();
  for (const data of snap.objects) {
    const object = rebuildObject(data);
    if (object) state.objects.set(object.id, object);
  }

  // Any guest tied to a ride/queue we just rebuilt (now empty) is sent back to
  // free roaming so nobody is stuck pointing at a stale object.
  if (state.selectedGuestId && !state.guests.some((g) => g.id === state.selectedGuestId)) {
    state.selectedGuestId = null;
  }
  for (const guest of state.guests) {
    const targetMissing = guest.targetId && !state.objects.has(guest.targetId);
    const waitMissing = guest.waitingAt && !state.objects.has(guest.waitingAt);
    if (guest.state === "queuing" || guest.state === "riding" || targetMissing || waitMissing) {
      guest.state = "thinking";
      guest.targetId = null;
      guest.waitingAt = null;
      guest.route = [];
    }
  }

  refreshParkGraph(state);
  markUiDirty();
}

// Push the pre-change snapshot. Called once per build interaction (a click or a
// whole drag stroke), which is why drag-painting a path undoes in one step.
export function pushUndoSnapshot(state, snapshot) {
  state.undoStack.push(snapshot);
  if (state.undoStack.length > MAX_DEPTH) state.undoStack.shift();
  state.redoStack = [];
}

export function canUndo(state) {
  return state.undoStack.length > 0;
}

export function canRedo(state) {
  return state.redoStack.length > 0;
}

export function undoBuild(state) {
  if (!state.undoStack.length) return false;
  state.redoStack.push(captureBuildSnapshot(state));
  if (state.redoStack.length > MAX_DEPTH) state.redoStack.shift();
  restoreBuildSnapshot(state, state.undoStack.pop());
  return true;
}

export function redoBuild(state) {
  if (!state.redoStack.length) return false;
  state.undoStack.push(captureBuildSnapshot(state));
  if (state.undoStack.length > MAX_DEPTH) state.undoStack.shift();
  restoreBuildSnapshot(state, state.redoStack.pop());
  return true;
}
