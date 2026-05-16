import { TILE_WIDTH, TILE_HEIGHT } from "../core/constants.js";

export function tileToScreen(state, x, y) {
  const worldX = (x - y) * (TILE_WIDTH / 2);
  const worldY = (x + y) * (TILE_HEIGHT / 2);
  return {
    x: worldX * state.camera.zoom + state.camera.x,
    y: worldY * state.camera.zoom + state.camera.y,
  };
}

export function screenToTile(state, screenX, screenY) {
  const worldX = (screenX - state.camera.x) / state.camera.zoom;
  const worldY = (screenY - state.camera.y) / state.camera.zoom;
  const x = (worldX / (TILE_WIDTH / 2) + worldY / (TILE_HEIGHT / 2)) / 2;
  const y = (worldY / (TILE_HEIGHT / 2) - worldX / (TILE_WIDTH / 2)) / 2;
  return { x: Math.floor(x), y: Math.floor(y) };
}
