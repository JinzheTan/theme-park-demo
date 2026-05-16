import { ECONOMY, SIM } from "../data/tuning.js";
import { GATE_POSITION } from "./constants.js";

export function createState() {
  return {
    tiles: [],
    objects: new Map(),
    guests: [],
    selectedTool: "path",
    money: ECONOMY.STARTING_MONEY,
    guestsServed: 0,
    guestSpawnTimer: SIM.SPAWN_TIMER_INIT,
    eventClock: 0,
    economyClock: 0,
    dayClock: 0,
    day: 1,
    growthScore: 0,
    totalGuestCount: 0,
    totalRevenue: 0,
    totalUpkeep: 0,
    weeklyProfit: 0,
    averageHappiness: 82,
    cleanliness: 100,
    uiClock: 0,
    uiDirty: true,
    timeScale: 1,
    reachableFromGate: new Set(),
    pathTiles: [],
    orderedTiles: [],
    activeTileBounds: null,
    assets: {},
    nextObjectId: 1,
    nextGuestId: 1,
    nextEventId: 1,
    pointer: {
      x: 0,
      y: 0,
      tile: null,
      inside: false,
      isPainting: false,
      isPanning: false,
    },
    keys: new Set(),
    camera: { x: 0, y: -280, zoom: 0.92 },
    viewportScale: 1,
    cameraTouched: false,
    feed: [],
    claimedMilestones: new Set(),
    focusedTile: { x: GATE_POSITION.x, y: GATE_POSITION.y },
  };
}

export const state = createState();

export function markUiDirty() {
  state.uiDirty = true;
}
