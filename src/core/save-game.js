import { OBJECT_DEFS } from "../data/objects.js";
import { createState, markUiDirty } from "./state.js";
import { createGrid, refreshParkGraph, seedPark } from "../sim/park.js";
import { computeParkMetrics } from "../sim/economy.js";
import { addEvent } from "../sim/events.js";

const SAVE_KEY = "wonderloop-park-save-v1";
const SAVE_VERSION = 1;

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
  "averageHappiness",
  "cleanliness",
  "nextObjectId",
  "nextGuestId",
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
  markUiDirty();
}

export function clearSavedPark() {
  window.localStorage.removeItem(SAVE_KEY);
  return null;
}
