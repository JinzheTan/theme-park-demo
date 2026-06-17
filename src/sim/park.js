import { GRID_WIDTH, GRID_HEIGHT, TILE_WIDTH, TILE_HEIGHT, GATE_POSITION, SPAWN_TILE } from "../core/constants.js";
import { OBJECT_DEFS } from "../data/objects.js";
import { markUiDirty } from "../core/state.js";
import { tileKey, inBounds, getTile, neighbors4 } from "../util/grid.js";
import { rand } from "../util/math.js";
import { addEvent } from "./events.js";
import { ECONOMY } from "../data/tuning.js";

export function isObjectOperational(state, object) {
  return Boolean(
    object?.entry && state.reachableFromGate.has(tileKey(object.entry.x, object.entry.y)),
  );
}

export function collectActiveTiles(state) {
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

export function getActiveWorldBounds(state) {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const tile of collectActiveTiles(state)) {
    const centerX = (tile.x - tile.y) * (TILE_WIDTH / 2);
    const centerY = (tile.x + tile.y) * (TILE_HEIGHT / 2);
    const gridTile = getTile(state, tile.x, tile.y);
    const object = gridTile?.objectId ? state.objects.get(gridTile.objectId) : null;
    const topLift = object ? object.stats.height - object.stats.anchorY : 0;

    bounds.minX = Math.min(bounds.minX, centerX - TILE_WIDTH * 0.56);
    bounds.maxX = Math.max(bounds.maxX, centerX + TILE_WIDTH * 0.56);
    bounds.minY = Math.min(bounds.minY, centerY - topLift - TILE_HEIGHT * 0.3);
    bounds.maxY = Math.max(bounds.maxY, centerY + TILE_HEIGHT * 0.98);
  }

  return bounds;
}

export function updateActiveTileBounds(state) {
  const activeTiles = collectActiveTiles(state);
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

export function createGrid(state) {
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
    const tile = getTile(state, x, y);
    if (tile) tile.terrain = "water";
  }

  state.orderedTiles = state.tiles.flat().sort((a, b) => a.x + a.y - (b.x + b.y));
  updateActiveTileBounds(state);
}

export function markPath(state, x, y) {
  const tile = getTile(state, x, y);
  if (!tile || tile.terrain !== "grass" || tile.objectId) return false;
  tile.path = true;
  return true;
}

export function findObjectEntry(state, object) {
  let best = null;
  for (const neighbor of neighbors4(object.x, object.y)) {
    const tile = getTile(state, neighbor.x, neighbor.y);
    if (!tile?.path) continue;
    const score = Math.abs(neighbor.x - SPAWN_TILE.x) + Math.abs(neighbor.y - SPAWN_TILE.y);
    if (!best || score < best.score) {
      best = { x: neighbor.x, y: neighbor.y, score };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

export function objectNearPath(state, x, y) {
  return neighbors4(x, y).some((neighbor) => getTile(state, neighbor.x, neighbor.y)?.path);
}

export function refreshParkGraph(state) {
  state.pathTiles = [];
  for (const row of state.tiles) {
    for (const tile of row) {
      if (tile.path) state.pathTiles.push({ x: tile.x, y: tile.y });
    }
  }

  const reachable = new Set();
  const queue = [];
  const start = getTile(state, SPAWN_TILE.x, SPAWN_TILE.y);

  if (start?.path) {
    queue.push(start);
    reachable.add(tileKey(start.x, start.y));
  }

  while (queue.length) {
    const current = queue.shift();
    for (const next of neighbors4(current.x, current.y)) {
      const tile = getTile(state, next.x, next.y);
      const key = tileKey(next.x, next.y);
      if (tile?.path && !reachable.has(key)) {
        reachable.add(key);
        queue.push(tile);
      }
    }
  }

  state.reachableFromGate = reachable;

  for (const object of state.objects.values()) {
    object.entry = findObjectEntry(state, object);
  }

  updateActiveTileBounds(state);
  markUiDirty();
}

export function addObject(state, type, x, y, options = {}) {
  const def = OBJECT_DEFS[type];
  const tile = getTile(state, x, y);
  if (!def || !tile) return null;

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
    condition: def.category === "ride" ? 100 : null,
    broken: false,
    downtime: 0,
  };

  tile.objectId = object.id;
  state.objects.set(object.id, object);

  if (!options.free) state.money -= def.cost;

  refreshParkGraph(state);
  markUiDirty();
  return object;
}

export function removeObject(state, object) {
  const tile = getTile(state, object.x, object.y);
  if (!tile || object.locked) return false;

  for (const guest of state.guests) {
    if (guest.targetId === object.id || guest.waitingAt === object.id) {
      guest.state = "thinking";
      guest.targetId = null;
      guest.waitingAt = null;
      guest.route = [];
      guest.happiness = Math.max(0, guest.happiness - 6);
    }
  }

  tile.objectId = null;
  state.objects.delete(object.id);
  state.money += Math.round(object.stats.cost * ECONOMY.REMOVE_REFUND_RATIO);
  refreshParkGraph(state);
  addEvent(state, "Layout changed", `${object.label} was removed and guests are rerouting.`);
  markUiDirty();
  return true;
}

export function seedPark(state) {
  addObject(state, "gate", GATE_POSITION.x, GATE_POSITION.y, { free: true, locked: true });

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
    markPath(state, x, y);
  }

  addObject(state, "carousel", 10, 19, { free: true });
  addObject(state, "food", 17, 19, { free: true });
  addObject(state, "drink", 18, 19, { free: true });
  addObject(state, "bench", 13, 18, { free: true });
  addObject(state, "bin", 15, 18, { free: true });
  addObject(state, "service", 17, 22, { free: true });
  addObject(state, "fountain", 11, 22, { free: true });
  addObject(state, "tree", 9, 17, { free: true });
  addObject(state, "tree", 18, 17, { free: true });
  addObject(state, "flowerbed", 15, 17, { free: true });
  addObject(state, "banner", 12, 21, { free: true });
  addObject(state, "banner", 16, 21, { free: true });
}
