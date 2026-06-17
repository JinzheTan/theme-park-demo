import { OBJECT_DEFS } from "../data/objects.js";
import { createState, markUiDirty } from "./state.js";
import { createGrid, refreshParkGraph, seedPark } from "../sim/park.js";
import { computeParkMetrics } from "../sim/economy.js";
import { addEvent } from "../sim/events.js";

const SAVE_KEY = "wonderloop-park-save-v1";
const AUTOSAVE_KEY = "wonderloop-park-autosave-v1";
const SAVE_VERSION = 1;
const AUTOSAVE_INTERVAL_S = 18;

const STATE_KEYS = [
  "money",
  "guestsServed",
  "guestSpawnTimer",
  "eventClock",
  "economyClock",
  "dayClock",
  "day",
  "growthScore",
  "totalGuestCount",
  "totalRevenue",
  "totalUpkeep",
  "weeklyProfit",
  "weekRevenueMark",
  "weekUpkeepMark",
  "averageHappiness",
  "cleanliness",
  "timeOfDay",
  "weather",
  "weatherTimer",
  "placedByPlayer",
  "peakGuests",
  "nextObjectId",
  "nextGuestId",
  "nextStaffId",
  "nextEventId",
  "camera",
  "cameraTouched",
  "focusedTile",
];

function nowLabel(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function cloneTile(tile) {
  return {
    x: tile.x,
    y: tile.y,
    terrain: tile.terrain,
    path: tile.path,
    objectId: tile.objectId,
    litter: tile.litter,
  };
}

function cloneObject(object) {
  return {
    id: object.id,
    type: object.type,
    x: object.x,
    y: object.y,
    entry: object.entry,
    queue: [...object.queue],
    riders: [...object.riders],
    cycleRemaining: object.cycleRemaining,
    upkeepClock: object.upkeepClock,
    locked: object.locked,
    removable: object.removable,
    sparkle: object.sparkle,
    condition: object.condition,
    broken: object.broken,
    downtime: object.downtime,
    ticketPrice: object.ticketPrice,
  };
}

function restoreObject(data) {
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
    entry: data.entry ?? null,
    queue: Array.isArray(data.queue) ? [...data.queue] : [],
    riders: Array.isArray(data.riders) ? [...data.riders] : [],
    cycleRemaining: Number(data.cycleRemaining) || 0,
    upkeepClock: Number(data.upkeepClock) || 0,
    locked: Boolean(data.locked),
    removable: Boolean(data.removable),
    stats: { ...def },
    sparkle: Number(data.sparkle) || 0,
    condition: data.condition == null ? (def.category === "ride" ? 100 : null) : Number(data.condition),
    broken: Boolean(data.broken),
    downtime: Number(data.downtime) || 0,
    ticketPrice: data.ticketPrice == null ? null : Number(data.ticketPrice),
  };
}

function applyPlainState(state, plain) {
  const settings = state.settings;
  const assets = state.assets;
  const selectedTool = state.selectedTool;
  const timeScale = state.timeScale;
  const fresh = createState();

  Object.assign(state, fresh, {
    settings,
    assets,
    selectedTool,
    timeScale,
  });

  for (const key of STATE_KEYS) {
    if (plain[key] !== undefined) state[key] = plain[key];
  }

  state.tiles = Array.isArray(plain.tiles)
    ? plain.tiles.map((row) => row.map(cloneTile))
    : fresh.tiles;
  state.orderedTiles = state.tiles.flat().sort((a, b) => a.x + a.y - (b.x + b.y));
  state.objects = new Map();
  for (const data of plain.objects ?? []) {
    const object = restoreObject(data);
    if (object) state.objects.set(object.id, object);
  }
  state.guests = Array.isArray(plain.guests) ? plain.guests.map((guest) => ({ ...guest })) : [];
  state.staff = Array.isArray(plain.staff) ? plain.staff.map((worker) => ({ ...worker, route: [] })) : [];
  state.feed = Array.isArray(plain.feed) ? plain.feed.map((entry) => ({ ...entry })) : [];
  state.claimedMilestones = new Set(plain.claimedMilestones ?? []);
  refreshParkGraph(state);
  computeParkMetrics(state);
  markUiDirty();
}

export function getSaveMeta() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (save.version !== SAVE_VERSION || !save.savedAt) return null;
    return {
      savedAt: save.savedAt,
      label: nowLabel(save.savedAt),
      day: save.state?.day ?? 1,
      money: Math.round(save.state?.money ?? 0),
      growthScore: save.state?.growthScore ?? 0,
    };
  } catch {
    return null;
  }
}

export function serializePark(state) {
  const plain = {
    tiles: state.tiles.map((row) => row.map(cloneTile)),
    objects: [...state.objects.values()].map(cloneObject),
    guests: state.guests.map((guest) => ({ ...guest })),
    staff: state.staff.map((worker) => ({ ...worker, route: [] })),
    feed: state.feed.map((entry) => ({ ...entry })),
    claimedMilestones: [...state.claimedMilestones],
  };

  for (const key of STATE_KEYS) {
    plain[key] = state[key];
  }

  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state: plain,
  };
}

export function savePark(state) {
  const save = serializePark(state);
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  addEvent(state, "Park saved", "Current park layout and operations were stored locally.");
  markUiDirty();
  return getSaveMeta();
}

export function loadPark(state) {
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  const save = JSON.parse(raw);
  if (save.version !== SAVE_VERSION || !save.state) return null;
  applyPlainState(state, save.state);
  addEvent(state, "Park loaded", "Saved park state restored from this browser.");
  if (state.settings?.autoSave !== false) writeAutoSave(state);
  return getSaveMeta();
}

export function resetPark(state) {
  const settings = state.settings;
  const assets = state.assets;
  const fresh = createState();
  Object.assign(state, fresh, { settings, assets, timeScale: settings.startPaused ? 0 : 1 });
  createGrid(state);
  seedPark(state);
  computeParkMetrics(state);
  addEvent(state, "Fresh start", "Park reset to the starter layout.");
  if (state.settings?.autoSave !== false) writeAutoSave(state);
  markUiDirty();
}

export function clearSavedPark() {
  window.localStorage.removeItem(SAVE_KEY);
  return null;
}

// --- Autosave -------------------------------------------------------------
// A silent, separate slot so the park survives an accidental refresh without
// the player ever pressing Save. Independent from the manual save slot above.

export function hasAutoSave() {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    return save.version === SAVE_VERSION && Boolean(save.state);
  } catch {
    return false;
  }
}

export function writeAutoSave(state) {
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializePark(state)));
  } catch {
    // Storage may be full or blocked; the live session is unaffected.
  }
}

// Wall-clock cadence so progress is captured even while the sim is paused.
export function autoSaveTick(state, realDeltaSeconds) {
  if (state.settings?.autoSave === false) return;
  state.autoSaveClock += realDeltaSeconds;
  if (state.autoSaveClock < AUTOSAVE_INTERVAL_S) return;
  state.autoSaveClock = 0;
  writeAutoSave(state);
}

export function restoreAutoSave(state) {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    if (save.version !== SAVE_VERSION || !save.state) return false;
    applyPlainState(state, save.state);
    return true;
  } catch {
    return false;
  }
}

export function clearAutoSave() {
  window.localStorage.removeItem(AUTOSAVE_KEY);
}
