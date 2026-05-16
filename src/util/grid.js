import { GRID_WIDTH, GRID_HEIGHT } from "../core/constants.js";

export function tileKey(x, y) {
  return `${x},${y}`;
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
}

export function getTile(state, x, y) {
  return inBounds(x, y) ? state.tiles[y][x] : null;
}

export function neighbors4(x, y) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].filter((point) => inBounds(point.x, point.y));
}
