import { tileKey, getTile, neighbors4 } from "../util/grid.js";
import { sample } from "../util/math.js";

export function pathfind(state, start, goal) {
  const startTile = getTile(state, start.x, start.y);
  const goalTile = getTile(state, goal.x, goal.y);
  if (!startTile?.path || !goalTile?.path) return null;

  const queue = [start];
  const cameFrom = new Map([[tileKey(start.x, start.y), null]]);

  while (queue.length) {
    const current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) break;

    for (const next of neighbors4(current.x, current.y)) {
      const tile = getTile(state, next.x, next.y);
      const key = tileKey(next.x, next.y);
      if (!tile?.path || cameFrom.has(key)) continue;
      cameFrom.set(key, current);
      queue.push(next);
    }
  }

  if (!cameFrom.has(tileKey(goal.x, goal.y))) return null;

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

export function randomWalkableTile(state, origin) {
  if (!state.pathTiles.length) return null;
  const candidates = state.pathTiles.filter((tile) => {
    const distance = Math.abs(tile.x - origin.x) + Math.abs(tile.y - origin.y);
    return distance > 3;
  });
  return sample(candidates.length ? candidates : state.pathTiles);
}
