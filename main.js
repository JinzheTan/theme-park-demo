const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

const toolGrid = document.getElementById("toolGrid");
const rideStatusList = document.getElementById("rideStatusList");
const insightList = document.getElementById("insightList");
const eventLog = document.getElementById("eventLog");
const headlineMetrics = document.getElementById("headlineMetrics");
const hoverCard = document.getElementById("hoverCard");
const floatingTools = document.getElementById("floatingTools");
const speedControls = document.getElementById("speedControls");
const centerCameraButton = document.getElementById("centerCameraButton");

const GRID_WIDTH = 28;
const GRID_HEIGHT = 28;
const TILE_WIDTH = 104;
const TILE_HEIGHT = 52;
const CAMERA_SPEED = 720;
const CAMERA_PADDING = 120;
const MAX_EVENTS = 9;
const GATE_POSITION = { x: 14, y: 25 };
const SPAWN_TILE = { x: 14, y: 24 };
const PROTECTED_PATH_KEYS = new Set([tileKey(SPAWN_TILE.x, SPAWN_TILE.y)]);

const SHORTCUT_TO_TOOL = {
  1: "path",
  2: "carousel",
  3: "wheel",
  4: "coaster",
  5: "food",
  6: "service",
  7: "tree",
  8: "flowerbed",
  9: "fountain",
  0: "remove",
};

const GUEST_COLORS = ["#f7d17b", "#8fd8e2", "#f3a16b", "#f47a93", "#8fd7aa", "#f4ebc9"];

const OBJECT_DEFS = {
  gate: {
    id: "gate",
    label: "Grand Gate",
    category: "landmark",
    asset: "gate",
    cost: 0,
    anchorY: 76,
    width: 166,
    height: 154,
    removable: false,
  },
  carousel: {
    id: "carousel",
    label: "Sun Carousel",
    category: "ride",
    asset: "carousel",
    cost: 260,
    width: 154,
    height: 184,
    anchorY: 82,
    ticket: 18,
    cycle: 8.5,
    capacity: 5,
    excitement: 17,
    queueLimit: 11,
    upkeep: 9,
  },
  wheel: {
    id: "wheel",
    label: "Sky Wheel",
    category: "ride",
    asset: "wheel",
    cost: 420,
    width: 168,
    height: 204,
    anchorY: 92,
    ticket: 28,
    cycle: 10.5,
    capacity: 8,
    excitement: 23,
    queueLimit: 14,
    upkeep: 12,
  },
  coaster: {
    id: "coaster",
    label: "Comet Coaster",
    category: "ride",
    asset: "coaster",
    cost: 700,
    width: 184,
    height: 184,
    anchorY: 84,
    ticket: 36,
    cycle: 12.5,
    capacity: 10,
    excitement: 32,
    queueLimit: 16,
    upkeep: 18,
  },
  food: {
    id: "food",
    label: "Snack Stall",
    category: "facility",
    asset: "food",
    cost: 170,
    width: 138,
    height: 138,
    anchorY: 66,
    ticket: 14,
    cycle: 6.2,
    capacity: 4,
    excitement: 8,
    queueLimit: 8,
    upkeep: 7,
    hungerRestore: 48,
  },
  service: {
    id: "service",
    label: "Care Hub",
    category: "service",
    asset: "service",
    cost: 220,
    width: 140,
    height: 140,
    anchorY: 66,
    cleanRadius: 4,
    upkeep: 6,
  },
  tree: {
    id: "tree",
    label: "Lush Tree",
    category: "scenery",
    asset: "tree",
    cost: 45,
    width: 124,
    height: 154,
    anchorY: 72,
    scenery: 7,
  },
  flowerbed: {
    id: "flowerbed",
    label: "Flower Bed",
    category: "scenery",
    asset: "flowerbed",
    cost: 32,
    width: 122,
    height: 126,
    anchorY: 54,
    scenery: 5,
  },
  fountain: {
    id: "fountain",
    label: "Grand Fountain",
    category: "scenery",
    asset: "fountain",
    cost: 125,
    width: 126,
    height: 154,
    anchorY: 72,
    scenery: 14,
    needsPath: true,
  },
  banner: {
    id: "banner",
    label: "Festival Banner",
    category: "scenery",
    asset: "banner",
    cost: 28,
    width: 92,
    height: 128,
    anchorY: 62,
    scenery: 4,
    needsPath: true,
  },
};

const TOOLS = [
  { id: "path", label: "Path", detail: "Brush winding walkways.", cost: 6 },
  { id: "carousel", label: "Carousel", detail: "Low queue, family draw.", cost: 260 },
  { id: "wheel", label: "Wheel", detail: "Scenic views, steady demand.", cost: 420 },
  { id: "coaster", label: "Coaster", detail: "Big thrill, high payoff.", cost: 700 },
  { id: "food", label: "Food Stall", detail: "Feeds guests and lifts mood.", cost: 170 },
  { id: "service", label: "Care Hub", detail: "Keeps litter under control.", cost: 220 },
  { id: "tree", label: "Tree", detail: "Softens vistas and boosts charm.", cost: 45 },
  { id: "flowerbed", label: "Flower Bed", detail: "Cheap color and guest delight.", cost: 32 },
  { id: "fountain", label: "Fountain", detail: "Premium landmark piece.", cost: 125 },
  { id: "banner", label: "Banner", detail: "Guides flow and brightens plazas.", cost: 28 },
  { id: "remove", label: "Remove", detail: "Refund half of placed items.", cost: 0 },
];

const ASSET_PATHS = {
  grass: "./assets/tiles/grass.svg",
  path: "./assets/tiles/path.svg",
  water: "./assets/tiles/water.svg",
  tree: "./assets/scenery/tree.svg",
  flowerbed: "./assets/scenery/flowerbed.svg",
  fountain: "./assets/scenery/fountain.svg",
  banner: "./assets/scenery/banner.svg",
  carousel: "./assets/rides/carousel.svg",
  wheel: "./assets/rides/ferris-wheel.svg",
  coaster: "./assets/rides/coaster.svg",
  food: "./assets/buildings/food-stall.svg",
  service: "./assets/buildings/service-hub.svg",
  gate: "./assets/buildings/gate.svg",
};

const state = {
  tiles: [],
  objects: new Map(),
  guests: [],
  selectedTool: "path",
  money: 6200,
  guestsServed: 0,
  guestSpawnTimer: 1.6,
  eventClock: 0,
  economyClock: 0,
  dayClock: 0,
  day: 1,
  growthScore: 0,
  totalGuestCount: 0,
  totalRevenue: 0,
  totalUpkeep: 0,
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
  pointer: {
    x: 0,
    y: 0,
    tile: null,
    inside: false,
    isPainting: false,
    isPanning: false,
  },
  keys: new Set(),
  camera: {
    x: 0,
    y: -280,
    zoom: 0.92,
  },
  cameraTouched: false,
  feed: [],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
}

function getTile(x, y) {
  return inBounds(x, y) ? state.tiles[y][x] : null;
}

function neighbors4(x, y) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].filter((point) => inBounds(point.x, point.y));
}

function tileToScreen(x, y) {
  const worldX = (x - y) * (TILE_WIDTH / 2);
  const worldY = (x + y) * (TILE_HEIGHT / 2);

  return {
    x: worldX * state.camera.zoom + state.camera.x,
    y: worldY * state.camera.zoom + state.camera.y,
  };
}

function screenToTile(screenX, screenY) {
  const worldX = (screenX - state.camera.x) / state.camera.zoom;
  const worldY = (screenY - state.camera.y) / state.camera.zoom;
  const x = (worldX / (TILE_WIDTH / 2) + worldY / (TILE_HEIGHT / 2)) / 2;
  const y = (worldY / (TILE_HEIGHT / 2) - worldX / (TILE_WIDTH / 2)) / 2;

  return { x: Math.floor(x), y: Math.floor(y) };
}

function markUiDirty() {
  state.uiDirty = true;
}

function isObjectOperational(object) {
  return Boolean(
    object?.entry && state.reachableFromGate.has(tileKey(object.entry.x, object.entry.y)),
  );
}

function clampCamera() {
  const minWorldX = -(GRID_HEIGHT - 1) * (TILE_WIDTH / 2);
  const maxWorldX = (GRID_WIDTH - 1) * (TILE_WIDTH / 2);
  const minWorldY = -260;
  const maxWorldY = (GRID_WIDTH + GRID_HEIGHT - 2) * (TILE_HEIGHT / 2) + 160;

  const horizontalSlack = Math.max(CAMERA_PADDING, canvas.clientWidth * 0.34);
  const verticalSlack = Math.max(CAMERA_PADDING, canvas.clientHeight * 0.24);

  const minX = canvas.clientWidth - horizontalSlack - maxWorldX * state.camera.zoom;
  const maxX = horizontalSlack - minWorldX * state.camera.zoom;
  const minY = canvas.clientHeight - verticalSlack - maxWorldY * state.camera.zoom;
  const maxY = verticalSlack - minWorldY * state.camera.zoom;

  state.camera.x = minX > maxX ? (minX + maxX) / 2 : clamp(state.camera.x, minX, maxX);
  state.camera.y = minY > maxY ? (minY + maxY) / 2 : clamp(state.camera.y, minY, maxY);
}

function setSelectedTool(toolId) {
  if (!TOOLS.some((tool) => tool.id === toolId)) {
    return;
  }
  state.selectedTool = toolId;
  renderToolButtons();
  markUiDirty();
  updateHoverCard();
}

function setSimulationSpeed(nextSpeed) {
  state.timeScale = nextSpeed;
  renderSpeedButtons();
  markUiDirty();
}

function collectActiveTiles() {
  const seen = new Set();
  const active = [];

  for (const tile of state.pathTiles) {
    const key = tileKey(tile.x, tile.y);
    if (!seen.has(key)) {
      seen.add(key);
      active.push(tile);
    }
  }

  for (const object of state.objects.values()) {
    const key = tileKey(object.x, object.y);
    if (!seen.has(key)) {
      seen.add(key);
      active.push({ x: object.x, y: object.y });
    }
  }

  if (!active.length) {
    active.push({ x: GATE_POSITION.x, y: GATE_POSITION.y }, SPAWN_TILE);
  }

  return active;
}

function getActiveWorldBounds() {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const tile of collectActiveTiles()) {
    const centerX = (tile.x - tile.y) * (TILE_WIDTH / 2);
    const centerY = (tile.x + tile.y) * (TILE_HEIGHT / 2);
    const object = getTile(tile.x, tile.y)?.objectId
      ? state.objects.get(getTile(tile.x, tile.y).objectId)
      : null;
    const topLift = object ? object.stats.height - object.stats.anchorY : 0;

    bounds.minX = Math.min(bounds.minX, centerX - TILE_WIDTH * 0.56);
    bounds.maxX = Math.max(bounds.maxX, centerX + TILE_WIDTH * 0.56);
    bounds.minY = Math.min(bounds.minY, centerY - topLift - TILE_HEIGHT * 0.3);
    bounds.maxY = Math.max(bounds.maxY, centerY + TILE_HEIGHT * 0.98);
  }

  return bounds;
}

function updateActiveTileBounds() {
  const activeTiles = collectActiveTiles();
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const tile of activeTiles) {
    minX = Math.min(minX, tile.x);
    maxX = Math.max(maxX, tile.x);
    minY = Math.min(minY, tile.y);
    maxY = Math.max(maxY, tile.y);
  }

  state.activeTileBounds = { minX, maxX, minY, maxY };
}

function focusCameraOn(tileX, tileY) {
  const focusZoom = canvas.clientWidth < 900 ? 0.76 : 0.92;
  state.camera.zoom = focusZoom;
  const worldX = (tileX - tileY) * (TILE_WIDTH / 2);
  const worldY = (tileX + tileY) * (TILE_HEIGHT / 2);

  state.camera.x = canvas.clientWidth * 0.48 - worldX * state.camera.zoom;
  state.camera.y = canvas.clientHeight * 0.5 - worldY * state.camera.zoom;
  clampCamera();
}

function fitCameraToPark() {
  const bounds = getActiveWorldBounds();
  const viewportWidth = canvas.clientWidth - 140;
  const viewportHeight = canvas.clientHeight - 180;
  const worldWidth = Math.max(220, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(180, bounds.maxY - bounds.minY);
  const minZoom = canvas.clientWidth < 900 ? 0.62 : 0.72;
  const maxZoom = canvas.clientWidth < 900 ? 0.98 : 1.08;

  state.camera.zoom = clamp(
    Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight),
    minZoom,
    maxZoom,
  );

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  state.camera.x = canvas.clientWidth * 0.5 - centerX * state.camera.zoom;
  state.camera.y = canvas.clientHeight * 0.62 - centerY * state.camera.zoom;
  clampCamera();
}

function createGrid() {
  state.tiles = Array.from({ length: GRID_HEIGHT }, (_, y) =>
    Array.from({ length: GRID_WIDTH }, (_, x) => ({
      x,
      y,
      terrain: "grass",
      path: false,
      objectId: null,
      litter: 0,
    })),
  );

  const waterTiles = [
    [4, 4], [5, 4], [6, 4], [4, 5], [5, 5], [6, 5], [7, 5], [4, 6], [5, 6], [6, 6], [5, 7],
    [20, 5], [21, 5], [22, 5], [20, 6], [21, 6], [22, 6], [21, 7], [22, 7], [23, 7],
  ];

  for (const [x, y] of waterTiles) {
    const tile = getTile(x, y);
    if (tile) {
      tile.terrain = "water";
    }
  }

  state.orderedTiles = state.tiles.flat().sort((a, b) => a.x + a.y - (b.x + b.y));
  updateActiveTileBounds();
}

function markPath(x, y) {
  const tile = getTile(x, y);
  if (!tile || tile.terrain !== "grass" || tile.objectId) {
    return false;
  }

  tile.path = true;
  return true;
}

function seedPark() {
  addObject("gate", GATE_POSITION.x, GATE_POSITION.y, { free: true, locked: true });

  const starterPaths = [
    [12, 24], [13, 24], [14, 24], [15, 24], [16, 24],
    [12, 23], [13, 23], [14, 23], [15, 23], [16, 23],
    [13, 22], [14, 22], [15, 22], [14, 21], [14, 20], [14, 19], [14, 18],
    [12, 20], [13, 20], [15, 20], [16, 20], [17, 20],
    [17, 21],
    [11, 19], [12, 19], [13, 19], [15, 19], [16, 19], [17, 19],
    [10, 18], [11, 18], [12, 18], [16, 18], [17, 18], [18, 18],
  ];

  for (const [x, y] of starterPaths) {
    markPath(x, y);
  }

  addObject("carousel", 10, 19, { free: true });
  addObject("food", 17, 19, { free: true });
  addObject("service", 17, 22, { free: true });
  addObject("fountain", 11, 22, { free: true });
  addObject("tree", 9, 17, { free: true });
  addObject("tree", 18, 17, { free: true });
  addObject("flowerbed", 15, 17, { free: true });
  addObject("banner", 12, 21, { free: true });
  addObject("banner", 16, 21, { free: true });

  state.money += 0;
}

function addObject(type, x, y, options = {}) {
  const def = OBJECT_DEFS[type];
  const tile = getTile(x, y);

  if (!def || !tile) {
    return null;
  }

  const object = {
    id: state.nextObjectId++,
    type,
    label: def.label,
    category: def.category,
    asset: def.asset,
    x,
    y,
    entry: null,
    queue: [],
    riders: [],
    cycleRemaining: 0,
    upkeepClock: 0,
    locked: Boolean(options.locked),
    removable: def.removable !== false && !options.locked,
    stats: { ...def },
    sparkle: rand(0, Math.PI * 2),
  };

  tile.objectId = object.id;
  state.objects.set(object.id, object);

  if (!options.free) {
    state.money -= def.cost;
  }

  refreshParkGraph();
  markUiDirty();
  return object;
}

function removeObject(object) {
  const tile = getTile(object.x, object.y);
  if (!tile || object.locked) {
    return false;
  }

  for (const guest of state.guests) {
    if (guest.targetId === object.id || guest.waitingAt === object.id) {
      guest.state = "thinking";
      guest.targetId = null;
      guest.waitingAt = null;
      guest.route = [];
      guest.happiness = clamp(guest.happiness - 6, 0, 100);
    }
  }

  tile.objectId = null;
  state.objects.delete(object.id);
  state.money += Math.round(object.stats.cost * 0.55);
  refreshParkGraph();
  addEvent("Layout changed", `${object.label} was removed and guests are rerouting.`);
  markUiDirty();
  return true;
}

function refreshParkGraph() {
  state.pathTiles = [];

  for (const row of state.tiles) {
    for (const tile of row) {
      if (tile.path) {
        state.pathTiles.push({ x: tile.x, y: tile.y });
      }
    }
  }

  const reachable = new Set();
  const queue = [];
  const start = getTile(SPAWN_TILE.x, SPAWN_TILE.y);

  if (start?.path) {
    queue.push(start);
    reachable.add(tileKey(start.x, start.y));
  }

  while (queue.length) {
    const current = queue.shift();

    for (const next of neighbors4(current.x, current.y)) {
      const tile = getTile(next.x, next.y);
      const key = tileKey(next.x, next.y);
      if (tile?.path && !reachable.has(key)) {
        reachable.add(key);
        queue.push(tile);
      }
    }
  }

  state.reachableFromGate = reachable;

  for (const object of state.objects.values()) {
    object.entry = findObjectEntry(object);
  }

  updateActiveTileBounds();
  markUiDirty();
}

function findObjectEntry(object) {
  let best = null;

  for (const neighbor of neighbors4(object.x, object.y)) {
    const tile = getTile(neighbor.x, neighbor.y);
    if (!tile?.path) {
      continue;
    }

    const score = Math.abs(neighbor.x - SPAWN_TILE.x) + Math.abs(neighbor.y - SPAWN_TILE.y);
    if (!best || score < best.score) {
      best = { x: neighbor.x, y: neighbor.y, score };
    }
  }

  return best ? { x: best.x, y: best.y } : null;
}

function objectNearPath(x, y) {
  return neighbors4(x, y).some((neighbor) => getTile(neighbor.x, neighbor.y)?.path);
}

function canPlaceTool(toolId, x, y) {
  const tile = getTile(x, y);
  if (!tile) {
    return { ok: false, reason: "Out of bounds" };
  }

  if (toolId === "remove") {
    if (tile.objectId) {
      const object = state.objects.get(tile.objectId);
      if (object?.locked) {
        return { ok: false, reason: "The park gate is fixed" };
      }
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
    if (tile.terrain !== "grass") {
      return { ok: false, reason: "Paths need dry ground" };
    }
    if (tile.objectId) {
      return { ok: false, reason: "Object blocks this tile" };
    }
    if (tile.path) {
      return { ok: false, reason: "Path already laid" };
    }
    if (state.money < 6) {
      return { ok: false, reason: "Not enough cash" };
    }
    return { ok: true };
  }

  const def = OBJECT_DEFS[toolId];
  if (!def) {
    return { ok: false, reason: "Unknown tool" };
  }

  if (tile.terrain !== "grass") {
    return { ok: false, reason: "Only placeable on grass" };
  }
  if (tile.path) {
    return { ok: false, reason: "Clear the path first" };
  }
  if (tile.objectId) {
    return { ok: false, reason: "Tile already occupied" };
  }
  if (state.money < def.cost) {
    return { ok: false, reason: "Not enough cash" };
  }
  if ((def.category === "ride" || def.category === "facility" || def.category === "service" || def.needsPath) && !objectNearPath(x, y)) {
    return { ok: false, reason: "Needs a path connection" };
  }

  return { ok: true };
}

function useToolAt(x, y) {
  const toolId = state.selectedTool;
  const verdict = canPlaceTool(toolId, x, y);
  if (!verdict.ok) {
    return false;
  }

  if (toolId === "path") {
    const placed = markPath(x, y);
    if (placed) {
      state.money -= 6;
      refreshParkGraph();
      markUiDirty();
      return true;
    }
    return false;
  }

  if (toolId === "remove") {
    const tile = getTile(x, y);
    if (tile.objectId) {
      return removeObject(state.objects.get(tile.objectId));
    }
    if (tile.path) {
      tile.path = false;
      tile.litter = 0;
      state.money += 3;
      refreshParkGraph();
      addEvent("Path updated", "Guests are testing the new circulation layout.");
      markUiDirty();
      return true;
    }
    return false;
  }

  const object = addObject(toolId, x, y);
  if (object) {
    const def = OBJECT_DEFS[toolId];
    addEvent("New addition", `${def.label} opened and guests are already reacting.`);
    return true;
  }
  return false;
}

function pathfind(start, goal) {
  const startTile = getTile(start.x, start.y);
  const goalTile = getTile(goal.x, goal.y);

  if (!startTile?.path || !goalTile?.path) {
    return null;
  }

  const queue = [start];
  const cameFrom = new Map([[tileKey(start.x, start.y), null]]);

  while (queue.length) {
    const current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) {
      break;
    }

    for (const next of neighbors4(current.x, current.y)) {
      const tile = getTile(next.x, next.y);
      const key = tileKey(next.x, next.y);
      if (!tile?.path || cameFrom.has(key)) {
        continue;
      }
      cameFrom.set(key, current);
      queue.push(next);
    }
  }

  if (!cameFrom.has(tileKey(goal.x, goal.y))) {
    return null;
  }

  const route = [];
  let current = goal;

  while (current) {
    route.push(current);
    current = cameFrom.get(tileKey(current.x, current.y));
  }

  route.reverse();
  route.shift();
  return route;
}

function randomWalkableTile(origin) {
  if (!state.pathTiles.length) {
    return null;
  }

  const candidates = state.pathTiles.filter((tile) => {
    const distance = Math.abs(tile.x - origin.x) + Math.abs(tile.y - origin.y);
    return distance > 3;
  });

  return sample(candidates.length ? candidates : state.pathTiles);
}

function createGuest() {
  const spawnTile = getTile(SPAWN_TILE.x, SPAWN_TILE.y);
  if (!spawnTile?.path) {
    return;
  }

  const guest = {
    id: state.nextGuestId++,
    x: SPAWN_TILE.x,
    y: SPAWN_TILE.y,
    state: "thinking",
    route: [],
    color: GUEST_COLORS[(state.nextGuestId - 2) % GUEST_COLORS.length],
    targetId: null,
    waitingAt: null,
    queueOffset: 0,
    happiness: clamp(rand(64, 90), 0, 100),
    hunger: rand(12, 36),
    patience: rand(55, 84),
    activities: 0,
    lingerClock: rand(0.2, 0.8),
    litterClock: rand(5, 10),
    speed: rand(1.55, 2.1),
  };

  state.guests.push(guest);
  state.totalGuestCount += 1;
}

function chooseGuestDestination(guest) {
  const accessibleObjects = [...state.objects.values()].filter((object) => {
    if (object.type === "gate" || !isObjectOperational(object)) {
      return false;
    }
    return true;
  });

  const rides = accessibleObjects.filter((object) => object.category === "ride");
  const food = accessibleObjects.filter((object) => object.category === "facility");

  if (guest.activities >= rand(2.8, 4.5) || guest.happiness < 26) {
    const routeHome = pathfind({ x: Math.round(guest.x), y: Math.round(guest.y) }, SPAWN_TILE);
    if (routeHome) {
      guest.route = routeHome;
      guest.state = "leaving";
      guest.targetId = null;
      return;
    }
  }

  let target = null;

  if (guest.hunger > 58 && food.length) {
    target = food
      .map((object) => ({
        object,
        score: 30 - object.queue.length * 4 - manhattan(object.entry, guest),
      }))
      .sort((a, b) => b.score - a.score)[0]?.object;
  }

  if (!target && rides.length) {
    target = rides
      .map((object) => ({
        object,
        score:
          object.stats.excitement +
          rand(-3, 6) -
          object.queue.length * 2.2 -
          manhattan(object.entry, guest) * 0.5,
      }))
      .sort((a, b) => b.score - a.score)[0]?.object;
  }

  if (target) {
    const route = pathfind({ x: Math.round(guest.x), y: Math.round(guest.y) }, target.entry);
    if (route) {
      guest.route = route;
      guest.state = "walking";
      guest.targetId = target.id;
      return;
    }
  }

  const strollTile = randomWalkableTile({ x: Math.round(guest.x), y: Math.round(guest.y) });
  if (strollTile) {
    const route = pathfind({ x: Math.round(guest.x), y: Math.round(guest.y) }, strollTile);
    if (route) {
      guest.route = route;
      guest.state = "strolling";
      guest.targetId = null;
      return;
    }
  }

  guest.state = "idle";
  guest.route = [];
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function scenicValueAt(x, y) {
  let score = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const tile = getTile(x + dx, y + dy);
      if (!tile?.objectId) {
        continue;
      }
      const object = state.objects.get(tile.objectId);
      if (!object) {
        continue;
      }
      score += (object.stats.scenery ?? 0) / (Math.abs(dx) + Math.abs(dy) + 1);
    }
  }
  return score;
}

function joinQueue(guest, object) {
  if (!object.entry) {
    guest.state = "thinking";
    guest.targetId = null;
    return;
  }
  if (object.queue.length >= object.stats.queueLimit) {
    guest.happiness = clamp(guest.happiness - 7, 0, 100);
    guest.patience = clamp(guest.patience - 9, 0, 100);
    guest.state = "thinking";
    guest.targetId = null;
    addEvent("Queue overflow", `${object.label} feels too crowded and guests are peeling away.`);
    return;
  }

  object.queue.push(guest.id);
  guest.waitingAt = object.id;
  guest.state = "queuing";
  guest.route = [];
}

function leavePark(guest) {
  state.guests = state.guests.filter((entry) => entry.id !== guest.id);
}

function updateGuests(deltaTime) {
  for (const guest of [...state.guests]) {
    guest.hunger = clamp(guest.hunger + deltaTime * 1.8, 0, 100);
    guest.patience = clamp(guest.patience - deltaTime * 0.55, 0, 100);
    guest.litterClock -= deltaTime;
    guest.happiness = clamp(
      guest.happiness - deltaTime * (guest.hunger > 72 ? 0.9 : 0.22) - deltaTime * (100 - state.cleanliness) * 0.01,
      0,
      100,
    );

    if (guest.litterClock <= 0) {
      const tile = getTile(Math.round(guest.x), Math.round(guest.y));
      if (tile?.path && Math.random() < 0.07 + (100 - state.cleanliness) / 320) {
        tile.litter = clamp(tile.litter + 1, 0, 4);
        markUiDirty();
      }
      guest.litterClock = rand(6, 11);
    }

    if (guest.state === "thinking" || guest.state === "idle") {
      guest.lingerClock -= deltaTime;
      if (guest.lingerClock <= 0) {
        chooseGuestDestination(guest);
        guest.lingerClock = rand(0.25, 0.9);
      }
      continue;
    }

    if (guest.state === "walking" || guest.state === "strolling" || guest.state === "leaving") {
      if (!guest.route.length) {
        if (guest.state === "leaving") {
          leavePark(guest);
          continue;
        }
        if (guest.targetId) {
          const object = state.objects.get(guest.targetId);
          if (object) {
            joinQueue(guest, object);
            continue;
          }
        }
        guest.state = "thinking";
        guest.targetId = null;
        continue;
      }

      const next = guest.route[0];
      const stepX = next.x - guest.x;
      const stepY = next.y - guest.y;
      const distance = Math.hypot(stepX, stepY);
      const move = deltaTime * guest.speed;

      if (distance <= move) {
        guest.x = next.x;
        guest.y = next.y;
        guest.route.shift();
        const sceneryBoost = scenicValueAt(Math.round(guest.x), Math.round(guest.y));
        if (sceneryBoost > 0) {
          guest.happiness = clamp(guest.happiness + sceneryBoost * 0.008, 0, 100);
        }
      } else {
        guest.x += (stepX / distance) * move;
        guest.y += (stepY / distance) * move;
      }
      continue;
    }

    if (guest.state === "queuing") {
      const object = state.objects.get(guest.waitingAt);
      if (!object) {
        guest.waitingAt = null;
        guest.state = "thinking";
        continue;
      }
      guest.happiness = clamp(guest.happiness - deltaTime * 0.5, 0, 100);
      if (guest.patience < 12) {
        object.queue = object.queue.filter((id) => id !== guest.id);
        guest.waitingAt = null;
        guest.state = "thinking";
        guest.happiness = clamp(guest.happiness - 8, 0, 100);
        addEvent("Guest churn", "A guest bailed from a long wait and went looking elsewhere.");
      }
      continue;
    }

    if (guest.state === "riding") {
      continue;
    }
  }
}

function updateObjects(deltaTime) {
  for (const object of state.objects.values()) {
    if (object.type === "gate") {
      continue;
    }

    object.sparkle += deltaTime * 0.75;
    object.upkeepClock += deltaTime;

    if (object.upkeepClock >= 10) {
      object.upkeepClock -= 10;
      const upkeep = object.stats.upkeep ?? 0;
      state.money -= upkeep;
      state.totalUpkeep += upkeep;
    }

    if (object.category === "service") {
      if (!isObjectOperational(object)) {
        object.cycleRemaining = 0;
        continue;
      }
      object.cycleRemaining -= deltaTime;
      if (object.cycleRemaining <= 0) {
        cleanAround(object);
        object.cycleRemaining = 4.2;
      }
      continue;
    }

    if (!isObjectOperational(object)) {
      continue;
    }

    if (object.riders.length > 0) {
      object.cycleRemaining -= deltaTime;
      if (object.cycleRemaining <= 0) {
        finishRideCycle(object);
      }
      continue;
    }

    if (object.queue.length > 0) {
      const boarded = object.queue.splice(0, object.stats.capacity);
      object.riders = boarded;
      object.cycleRemaining = object.stats.cycle;

      const revenue = boarded.length * object.stats.ticket;
      state.money += revenue;
      state.totalRevenue += revenue;

      for (const guestId of boarded) {
        const guest = state.guests.find((entry) => entry.id === guestId);
        if (!guest) {
          continue;
        }
        guest.state = "riding";
        guest.activities += 1;
      }

      addEvent("Ride dispatch", `${object.label} sent off ${boarded.length} guests.`);
    }
  }
}

function finishRideCycle(object) {
  const entry = object.entry;
  const guests = object.riders
    .map((guestId) => state.guests.find((entryGuest) => entryGuest.id === guestId))
    .filter(Boolean);

  for (const guest of guests) {
    guest.state = "thinking";
    guest.waitingAt = null;
    guest.targetId = null;
    guest.x = entry.x;
    guest.y = entry.y;
    guest.route = [];
    guest.happiness = clamp(
      guest.happiness + object.stats.excitement - Math.max(0, guest.hunger - 70) * 0.08,
      0,
      100,
    );
    guest.patience = clamp(guest.patience + 18, 0, 100);
    if (object.category === "facility") {
      guest.hunger = clamp(guest.hunger - object.stats.hungerRestore, 0, 100);
      guest.happiness = clamp(guest.happiness + 8, 0, 100);
    } else {
      guest.hunger = clamp(guest.hunger + 7, 0, 100);
    }
    state.guestsServed += 1;
  }

  object.riders = [];
  object.cycleRemaining = 0;
}

function cleanAround(object) {
  let cleaned = 0;
  for (let y = object.y - object.stats.cleanRadius; y <= object.y + object.stats.cleanRadius; y += 1) {
    for (let x = object.x - object.stats.cleanRadius; x <= object.x + object.stats.cleanRadius; x += 1) {
      const tile = getTile(x, y);
      if (!tile || tile.litter <= 0) {
        continue;
      }
      cleaned += tile.litter;
      tile.litter = 0;
    }
  }
  if (cleaned > 0) {
    addEvent("Crew sweep", `${object.label} cleared ${cleaned} litter piles nearby.`);
    markUiDirty();
  }
}

function updateEconomy(deltaTime) {
  state.dayClock += deltaTime;

  if (state.dayClock >= 28) {
    state.dayClock -= 28;
    state.day += 1;
    addEvent("Park growth", `Week ${state.day} has started. Attendance pressure is rising.`);
  }

  state.guestSpawnTimer -= deltaTime;
  const rideCount = [...state.objects.values()].filter((object) => object.category === "ride").length;
  const sceneryScore = [...state.objects.values()].reduce(
    (sum, object) => sum + (object.stats.scenery ?? 0),
    0,
  );
  const cap = clamp(
    10 +
      rideCount * 9 +
      Math.floor(sceneryScore / 5) +
      Math.round(state.cleanliness * 0.08) +
      Math.round(state.averageHappiness * 0.06),
    12,
    110,
  );

  if (state.guestSpawnTimer <= 0 && state.guests.length < cap) {
    createGuest();
    state.guestSpawnTimer = clamp(
      4.5 -
        rideCount * 0.32 -
        sceneryScore * 0.01 +
        Math.max(0, 58 - state.cleanliness) * 0.015,
      1.2,
      4.8,
    );
    markUiDirty();
  }
}

function computeParkMetrics() {
  const totalLitter = state.tiles.flat().reduce((sum, tile) => sum + tile.litter, 0);
  const serviceCount = [...state.objects.values()].filter(
    (object) => object.category === "service" && isObjectOperational(object),
  ).length;
  const sceneryScore = [...state.objects.values()].reduce(
    (sum, object) => sum + (object.stats.scenery ?? 0),
    0,
  );
  const rideCount = [...state.objects.values()].filter((object) => object.category === "ride").length;

  state.averageHappiness = state.guests.length
    ? Math.round(
        state.guests.reduce((sum, guest) => sum + guest.happiness, 0) / state.guests.length,
      )
    : 84;

  state.cleanliness = Math.round(
    clamp(100 - totalLitter * 3.2 + serviceCount * 12 + sceneryScore * 0.14, 8, 100),
  );

  state.growthScore = Math.round(
    clamp(
      rideCount * 28 +
        sceneryScore * 1.9 +
        state.guestsServed * 0.9 +
        state.averageHappiness * 1.3 +
        state.cleanliness * 0.8,
      0,
      999,
    ),
  );
}

function growthLabel() {
  if (state.growthScore < 170) {
    return "Budding";
  }
  if (state.growthScore < 320) {
    return "Buzzing";
  }
  if (state.growthScore < 520) {
    return "Signature";
  }
  return "Destination";
}

function addEvent(title, description) {
  state.feed.unshift({
    id: performance.now() + Math.random(),
    title,
    description,
  });
  state.feed = state.feed.slice(0, MAX_EVENTS);
  markUiDirty();
}

function buildInsights() {
  const disconnected = [...state.objects.values()].filter(
    (object) => object.type !== "gate" && object.entry && !isObjectOperational(object),
  );
  const crowded = [...state.objects.values()].filter(
    (object) =>
      (object.category === "ride" || object.category === "facility") &&
      object.queue.length >= Math.ceil(object.stats.queueLimit * 0.65),
  );
  const insights = [];

  if (state.money < 250) {
    insights.push({
      tone: "warn",
      title: "Cash is running thin",
      detail: "Slow expansion for a moment or add another revenue attraction before upkeep bites.",
    });
  }

  if (state.cleanliness < 70) {
    insights.push({
      tone: "warn",
      title: "Cleanliness is slipping",
      detail: "Add a care hub near the busiest branch or reduce guest density with alternate routes.",
    });
  }

  if (crowded.length) {
    insights.push({
      tone: "warn",
      title: `${crowded[0].label} is congested`,
      detail: "High queues are lowering patience. Add nearby alternatives or branch the pathing.",
    });
  }

  if (disconnected.length) {
    insights.push({
      tone: "warn",
      title: "An attraction is disconnected",
      detail: `${disconnected[0].label} has a path beside it, but guests still cannot reach that route from the gate.`,
    });
  }

  if (!insights.length) {
    insights.push({
      tone: "good",
      title: "Operations are stable",
      detail: "Guest flow, coverage, and attraction demand are currently in a healthy range.",
    });
  }

  insights.push({
    tone: "good",
    title: `Week ${state.day} outlook`,
    detail: `${growthLabel()} park with ${state.guests.length} guests on site and ${state.guestsServed} completed experiences.`,
  });

  return insights.slice(0, 4);
}

function renderSpeedButtons() {
  for (const button of speedControls.querySelectorAll("[data-speed]")) {
    button.classList.toggle("active", Number(button.dataset.speed) === state.timeScale);
  }
}

function renderPanels() {
  headlineMetrics.innerHTML = `
    <div class="metric-pill"><strong>$${Math.round(state.money)}</strong><span>Cash on hand</span></div>
    <div class="metric-pill"><strong>${state.guests.length}</strong><span>Guests inside</span></div>
    <div class="metric-pill"><strong>${state.averageHappiness}%</strong><span>Average happiness</span></div>
    <div class="metric-pill"><strong>${state.cleanliness}%</strong><span>Cleanliness</span></div>
    <div class="metric-pill"><strong>${growthLabel()}</strong><span>Growth score ${state.growthScore}</span></div>
  `;

  const buildables = [...state.objects.values()].filter((object) => object.type !== "gate");
  rideStatusList.innerHTML = buildables
    .map((object) => {
      let line = "Decorative";
      let statusClass = "status-chip";
      const operational = isObjectOperational(object);

      if (object.category === "ride" || object.category === "facility") {
        if (!object.entry) {
          line = "Missing path connection";
          statusClass = "status-chip warn";
        } else if (!operational) {
          line = "Disconnected from gate";
          statusClass = "status-chip warn";
        } else if (object.riders.length) {
          line = `Running ${object.riders.length} guests / ${object.stats.capacity}`;
        } else {
          line = `Queue ${object.queue.length} / ${object.stats.queueLimit}`;
        }
      }

      if (object.category === "service") {
        line = operational
          ? `Cleaning radius ${object.stats.cleanRadius} tiles`
          : "Offline: no guest access";
        if (!operational) {
          statusClass = "status-chip warn";
        }
      }

      return `
        <article class="ride-card">
          <strong>${object.label}<span class="${statusClass}">${line}</span></strong>
          <span>Revenue ${object.stats.ticket ? `$${object.stats.ticket} / cycle` : "support only"}.</span>
          <span>${object.category === "ride" ? `Excitement ${object.stats.excitement}` : object.category === "scenery" ? `Scenery ${object.stats.scenery}` : "Keeps the park moving"}.</span>
        </article>
      `;
    })
    .join("");

  insightList.innerHTML = buildInsights()
    .map(
      (insight) => `
        <article class="insight-item ${insight.tone}">
          <strong>${insight.title}</strong>
          <span>${insight.detail}</span>
        </article>
      `,
    )
    .join("");

  eventLog.innerHTML = state.feed
    .map(
      (entry) => `
        <article class="event-item">
          <strong>${entry.title}</strong>
          <span>${entry.description}</span>
        </article>
      `,
    )
    .join("");

  const currentTool = TOOLS.find((tool) => tool.id === state.selectedTool);
  const rideCount = [...state.objects.values()].filter((object) => object.category === "ride").length;

  floatingTools.innerHTML = `
    <div class="floating-tool active">
      <strong>${currentTool.label}</strong>
      <span>${currentTool.detail}</span>
    </div>
    <div class="floating-tool">
      <strong>${rideCount} rides</strong>
      <span>${state.guestsServed} guest experiences completed</span>
    </div>
    <div class="floating-tool">
      <strong>${state.timeScale === 0 ? "Paused" : `${state.timeScale}x speed`}</strong>
      <span>${state.cleanliness}% clean with live service coverage</span>
    </div>
  `;

  state.uiDirty = false;
}

function renderToolButtons() {
  toolGrid.innerHTML = TOOLS.map(
    (tool) => `
      <button class="tool-button ${tool.id === state.selectedTool ? "active" : ""}" data-tool="${tool.id}" type="button">
        <span class="cost-tag">${tool.cost ? `$${tool.cost}` : "Tool"}</span>
        <strong>${tool.label}</strong>
        <span>${tool.detail}</span>
      </button>
    `,
  ).join("");

  for (const button of toolGrid.querySelectorAll("[data-tool]")) {
    button.addEventListener("click", () => {
      setSelectedTool(button.dataset.tool);
    });
  }
}

function updateHoverCard() {
  const tileCoord = state.pointer.tile;
  if (!state.pointer.inside || !tileCoord || !inBounds(tileCoord.x, tileCoord.y)) {
    hoverCard.classList.remove("visible");
    return;
  }

  const tile = getTile(tileCoord.x, tileCoord.y);
  const object = tile.objectId ? state.objects.get(tile.objectId) : null;
  const verdict = canPlaceTool(state.selectedTool, tileCoord.x, tileCoord.y);
  const terrain = tile.terrain === "water" ? "Water" : tile.path ? "Path" : "Grass";
  const objectDetail = object
    ? object.category === "ride" || object.category === "facility"
      ? isObjectOperational(object)
        ? `Queue ${object.queue.length}, riders ${object.riders.length}`
        : "Disconnected from main park path"
      : object.category === "service"
        ? isObjectOperational(object)
          ? "Staffed and active"
          : "Placed, but staff cannot reach it"
        : object.category
    : null;

  hoverCard.innerHTML = `
    <strong>${object?.label ?? terrain} · ${tileCoord.x}, ${tileCoord.y}</strong>
    <span>${objectDetail ?? (tile.litter ? `${tile.litter} litter pile${tile.litter === 1 ? "" : "s"}` : terrain === "Grass" ? "Buildable tile" : "Scenic water edge")}</span>
    <span>${verdict.ok ? "Ready for placement" : verdict.reason}</span>
  `;
  hoverCard.classList.add("visible");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadAssets() {
  const loaded = await Promise.all(
    Object.entries(ASSET_PATHS).map(async ([key, src]) => [key, await loadImage(src)]),
  );
  state.assets = Object.fromEntries(loaded);
}

function drawAsset(image, screenX, screenY, width, height, anchorY, options = {}) {
  if (!image) {
    return;
  }

  const wobbleY = options.wobbleY ?? 0;
  const alpha = options.alpha ?? 1;
  const x = screenX - (width * state.camera.zoom) / 2;
  const y = screenY - height * state.camera.zoom + anchorY * state.camera.zoom + wobbleY;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, x, y, width * state.camera.zoom, height * state.camera.zoom);
  ctx.restore();
}

function drawDiamondOutline(x, y, color) {
  const screen = tileToScreen(x, y);
  const halfW = (TILE_WIDTH / 2) * state.camera.zoom;
  const halfH = (TILE_HEIGHT / 2) * state.camera.zoom;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(screen.x, screen.y);
  ctx.lineTo(screen.x + halfW, screen.y + halfH);
  ctx.lineTo(screen.x, screen.y + halfH * 2);
  ctx.lineTo(screen.x - halfW, screen.y + halfH);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawDiamondFill(x, y, color, alpha) {
  const screen = tileToScreen(x, y);
  const halfW = (TILE_WIDTH / 2) * state.camera.zoom;
  const halfH = (TILE_HEIGHT / 2) * state.camera.zoom;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(screen.x, screen.y);
  ctx.lineTo(screen.x + halfW, screen.y + halfH);
  ctx.lineTo(screen.x, screen.y + halfH * 2);
  ctx.lineTo(screen.x - halfW, screen.y + halfH);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function tileFocusDistance(tile) {
  const bounds = state.activeTileBounds;
  if (!bounds) {
    return 0;
  }

  const padding = 4;
  const dx =
    tile.x < bounds.minX - padding
      ? bounds.minX - padding - tile.x
      : tile.x > bounds.maxX + padding
        ? tile.x - (bounds.maxX + padding)
        : 0;
  const dy =
    tile.y < bounds.minY - padding
      ? bounds.minY - padding - tile.y
      : tile.y > bounds.maxY + padding
        ? tile.y - (bounds.maxY + padding)
        : 0;

  return Math.max(dx, dy);
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  gradient.addColorStop(0, "#114250");
  gradient.addColorStop(0.45, "#1c5f6f");
  gradient.addColorStop(1, "#0b2027");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  for (let i = 0; i < 8; i += 1) {
    const x = (i / 7) * canvas.clientWidth;
    const y = 60 + Math.sin(i * 1.3 + state.dayClock * 0.08) * 12;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 245, 219, 0.09)";
    ctx.ellipse(x + 60, y, 80, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTile(tile) {
  const screen = tileToScreen(tile.x, tile.y);
  const terrainImage = state.assets[tile.terrain];

  drawAsset(terrainImage, screen.x, screen.y, TILE_WIDTH, TILE_HEIGHT, 0);

  if (tile.path) {
    drawAsset(state.assets.path, screen.x, screen.y, TILE_WIDTH, TILE_HEIGHT, 0);
  }

  if (tile.litter) {
    ctx.save();
    const litterScreen = tileToScreen(tile.x + 0.12, tile.y + 0.16);
    for (let i = 0; i < tile.litter; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#f3d089" : "#f28c66";
      ctx.beginPath();
      ctx.arc(
        litterScreen.x + i * 5 * state.camera.zoom,
        litterScreen.y + TILE_HEIGHT * 0.55 * state.camera.zoom + (i % 2) * 2,
        2.5 * state.camera.zoom,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  const fadeDistance = tileFocusDistance(tile);
  if (fadeDistance > 0) {
    drawDiamondFill(tile.x, tile.y, "#0d2430", clamp(0.08 + fadeDistance * 0.03, 0.08, 0.28));
  }
}

function drawObject(object) {
  const def = object.stats;
  const screen = tileToScreen(object.x, object.y);
  const image = state.assets[object.asset];
  const bob =
    object.category === "ride" && object.riders.length
      ? Math.sin(state.dayClock * 2.5 + object.sparkle) * 3
      : 0;

  if (object.category === "ride" && (object.riders.length || object.queue.length)) {
    ctx.save();
    ctx.fillStyle = "rgba(243, 208, 137, 0.16)";
    ctx.beginPath();
    ctx.ellipse(
      screen.x,
      screen.y + TILE_HEIGHT * 0.8 * state.camera.zoom,
      36 * state.camera.zoom,
      13 * state.camera.zoom,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  drawAsset(image, screen.x, screen.y, def.width, def.height, def.anchorY, { wobbleY: bob });

  if (object.category === "ride" || object.category === "facility") {
    const labelY = screen.y - def.height * 0.42 * state.camera.zoom;
    ctx.save();
    ctx.font = `${11 * state.camera.zoom + 6}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f9f3dc";
    ctx.fillText(
      object.riders.length ? "Running" : `Q ${object.queue.length}`,
      screen.x,
      labelY,
    );
    ctx.restore();
  }
}

function queuePosition(object, index) {
  const entry = object.entry ?? { x: object.x, y: object.y };
  const dx = entry.x - object.x;
  const dy = entry.y - object.y;
  const lateral = index % 2 === 0 ? 0.12 : -0.12;

  return {
    x: entry.x + dx * index * 0.42 + dy * lateral,
    y: entry.y + dy * index * 0.42 - dx * lateral,
  };
}

function drawGuest(guest) {
  if (guest.state === "riding") {
    return;
  }

  let drawX = guest.x;
  let drawY = guest.y;

  if (guest.state === "queuing") {
    const object = state.objects.get(guest.waitingAt);
    if (object) {
      const index = object.queue.indexOf(guest.id);
      const pos = queuePosition(object, Math.max(index, 0));
      drawX = pos.x;
      drawY = pos.y;
    }
  }

  const screen = tileToScreen(drawX, drawY);
  const baseY = screen.y + TILE_HEIGHT * 0.62 * state.camera.zoom;
  const size = 10 * state.camera.zoom + 2;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(screen.x, baseY + 6, size * 0.95, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = guest.color;
  ctx.beginPath();
  ctx.arc(screen.x, baseY - size * 1.8, size * 0.68, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#20353d";
  ctx.fillRect(screen.x - size * 0.42, baseY - size * 1.22, size * 0.84, size * 1.55);
  ctx.fillStyle = guest.color;
  ctx.fillRect(screen.x - size * 0.52, baseY - size * 1.12, size * 1.04, size * 1.02);
  ctx.restore();
}

function renderMinimap() {
  minimapCtx.clearRect(0, 0, minimapCanvas.clientWidth, minimapCanvas.clientHeight);
  minimapCtx.fillStyle = "#0b2027";
  minimapCtx.fillRect(0, 0, minimapCanvas.clientWidth, minimapCanvas.clientHeight);

  const scaleX = minimapCanvas.clientWidth / GRID_WIDTH;
  const scaleY = minimapCanvas.clientHeight / GRID_HEIGHT;

  for (const row of state.tiles) {
    for (const tile of row) {
      minimapCtx.fillStyle =
        tile.terrain === "water" ? "#4fa9bd" : tile.path ? "#f3d089" : "#4f975f";
      minimapCtx.fillRect(tile.x * scaleX, tile.y * scaleY, scaleX - 1, scaleY - 1);
    }
  }

  for (const object of state.objects.values()) {
    minimapCtx.fillStyle =
      object.category === "ride"
        ? "#f28c66"
        : object.category === "facility"
          ? "#8ac7d7"
          : object.category === "service"
            ? "#74c5bb"
            : "#f9f3dc";
    minimapCtx.fillRect(object.x * scaleX, object.y * scaleY, scaleX, scaleY);
  }

  for (const guest of state.guests) {
    minimapCtx.fillStyle = "#fff4d8";
    minimapCtx.fillRect(guest.x * scaleX, guest.y * scaleY, 2, 2);
  }

  const topLeft = screenToTile(0, 0);
  const bottomRight = screenToTile(canvas.clientWidth, canvas.clientHeight);
  const width = (bottomRight.x - topLeft.x) * scaleX;
  const height = (bottomRight.y - topLeft.y) * scaleY;
  minimapCtx.strokeStyle = "rgba(249, 243, 220, 0.9)";
  minimapCtx.lineWidth = 2;
  minimapCtx.strokeRect(topLeft.x * scaleX, topLeft.y * scaleY, width, height);
}

function render() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawBackdrop();

  const guestsByTile = new Map();
  for (const guest of state.guests) {
    const key = tileKey(Math.round(guest.x), Math.round(guest.y));
    const entries = guestsByTile.get(key) ?? [];
    entries.push(guest);
    guestsByTile.set(key, entries);
  }

  for (const tile of state.orderedTiles) {
    drawTile(tile);
    const object = tile.objectId ? state.objects.get(tile.objectId) : null;
    if (object) {
      drawObject(object);
    }

    for (const guest of guestsByTile.get(tileKey(tile.x, tile.y)) ?? []) {
      drawGuest(guest);
    }
  }

  if (state.pointer.tile && inBounds(state.pointer.tile.x, state.pointer.tile.y)) {
    const verdict = canPlaceTool(state.selectedTool, state.pointer.tile.x, state.pointer.tile.y);
    drawDiamondOutline(state.pointer.tile.x, state.pointer.tile.y, verdict.ok ? "#f3d089" : "#ff6f65");

    if (verdict.ok && state.selectedTool !== "path" && state.selectedTool !== "remove") {
      const def = OBJECT_DEFS[state.selectedTool];
      const screen = tileToScreen(state.pointer.tile.x, state.pointer.tile.y);
      drawAsset(
        state.assets[def.asset],
        screen.x,
        screen.y,
        def.width,
        def.height,
        def.anchorY,
        { alpha: 0.45 },
      );
    }
  }

  renderMinimap();
}

function updateCamera(deltaTime) {
  let moveX = 0;
  let moveY = 0;

  if (state.keys.has("ArrowUp") || state.keys.has("w")) {
    moveY += 1;
  }
  if (state.keys.has("ArrowDown") || state.keys.has("s")) {
    moveY -= 1;
  }
  if (state.keys.has("ArrowLeft") || state.keys.has("a")) {
    moveX += 1;
  }
  if (state.keys.has("ArrowRight") || state.keys.has("d")) {
    moveX -= 1;
  }

  state.camera.x += moveX * CAMERA_SPEED * deltaTime;
  state.camera.y += moveY * CAMERA_SPEED * deltaTime;
  clampCamera();
}

function gameLoop(timestamp) {
  const realDeltaTime = clamp((timestamp - (gameLoop.lastTime ?? timestamp)) / 1000, 0, 0.033);
  gameLoop.lastTime = timestamp;
  const simDeltaTime = realDeltaTime * state.timeScale;

  updateCamera(realDeltaTime);
  if (simDeltaTime > 0) {
    updateEconomy(simDeltaTime);
    updateGuests(simDeltaTime);
    updateObjects(simDeltaTime);
  }
  computeParkMetrics();
  state.uiClock += realDeltaTime;
  if (state.uiDirty || state.uiClock >= 0.2) {
    state.uiClock = 0;
    renderPanels();
  }
  render();

  requestAnimationFrame(gameLoop);
}

function handlePointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  state.pointer.tile = screenToTile(state.pointer.x, state.pointer.y);

  if (state.pointer.isPanning) {
    state.camera.x += event.movementX;
    state.camera.y += event.movementY;
    state.cameraTouched = true;
    clampCamera();
  }

  if (state.pointer.isPainting && (state.selectedTool === "path" || state.selectedTool === "remove")) {
    useToolAt(state.pointer.tile.x, state.pointer.tile.y);
  }

  updateHoverCard();
}

function handlePointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  state.pointer.tile = screenToTile(state.pointer.x, state.pointer.y);

  if (event.button === 2) {
    state.pointer.isPanning = true;
    return;
  }

  if (event.button !== 0 || !state.pointer.tile) {
    return;
  }

  if (state.selectedTool === "path" || state.selectedTool === "remove") {
    state.pointer.isPainting = true;
  }

  useToolAt(state.pointer.tile.x, state.pointer.tile.y);
  updateHoverCard();
}

function handlePointerUp() {
  state.pointer.isPainting = false;
  state.pointer.isPanning = false;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const minimapRect = minimapCanvas.getBoundingClientRect();
  minimapCanvas.width = minimapRect.width * dpr;
  minimapCanvas.height = minimapRect.height * dpr;
  minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!state.cameraTouched) {
    fitCameraToPark();
  } else {
    clampCamera();
  }
}

function bindEvents() {
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerenter", () => {
    state.pointer.inside = true;
  });
  canvas.addEventListener("pointerleave", () => {
    state.pointer.inside = false;
    hoverCard.classList.remove("visible");
  });
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handlePointerUp);

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const pointerX = state.pointer.x || canvas.clientWidth * 0.5;
    const pointerY = state.pointer.y || canvas.clientHeight * 0.5;
    const worldX = (pointerX - state.camera.x) / state.camera.zoom;
    const worldY = (pointerY - state.camera.y) / state.camera.zoom;
    const nextZoom = clamp(state.camera.zoom - event.deltaY * 0.0008, 0.46, 1.32);
    state.camera.zoom = nextZoom;
    state.camera.x = pointerX - worldX * state.camera.zoom;
    state.camera.y = pointerY - worldY * state.camera.zoom;
    state.cameraTouched = true;
    clampCamera();
  }, { passive: false });

  minimapCanvas.addEventListener("pointerdown", (event) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * GRID_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * GRID_HEIGHT;
    focusCameraOn(x, y);
    state.cameraTouched = true;
  });

  centerCameraButton.addEventListener("click", () => {
    fitCameraToPark();
    state.cameraTouched = false;
  });

  for (const button of speedControls.querySelectorAll("[data-speed]")) {
    button.addEventListener("click", () => {
      setSimulationSpeed(Number(button.dataset.speed));
    });
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (SHORTCUT_TO_TOOL[key]) {
      setSelectedTool(SHORTCUT_TO_TOOL[key]);
      return;
    }
    if (key === "c") {
      fitCameraToPark();
      state.cameraTouched = false;
      return;
    }
    if (key === " ") {
      event.preventDefault();
      setSimulationSpeed(state.timeScale === 0 ? 1 : 0);
      return;
    }

    state.keys.add(key);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      state.cameraTouched = true;
    }
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("resize", resizeCanvas);
}

async function bootstrap() {
  createGrid();
  seedPark();
  await loadAssets();
  renderToolButtons();
  renderSpeedButtons();
  bindEvents();
  resizeCanvas();
  computeParkMetrics();
  renderPanels();
  addEvent("Park open", "Wonderloop Park is ready for new paths, rides, and scenic upgrades.");
  addEvent("Starter layout", "The opening plaza includes a carousel, food, and care coverage.");
  window.__wonderloop = {
    state,
    useToolAt,
    canPlaceTool,
    screenToTile,
    tileToScreen,
    focusCameraOn,
    fitCameraToPark,
    setTool(toolId) {
      setSelectedTool(toolId);
    },
    setSpeed(speed) {
      setSimulationSpeed(speed);
    },
  };
  requestAnimationFrame(gameLoop);
}

bootstrap();
