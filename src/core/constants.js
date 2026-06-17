export const GRID_WIDTH = 28;
export const GRID_HEIGHT = 28;
export const TILE_WIDTH = 104;
export const TILE_HEIGHT = 52;
export const CAMERA_SPEED = 720;
export const CAMERA_PADDING = 120;
export const GATE_POSITION = { x: 14, y: 25 };
export const SPAWN_TILE = { x: 14, y: 24 };

export const PROTECTED_PATH_KEYS = new Set([`${SPAWN_TILE.x},${SPAWN_TILE.y}`]);

// Land is sold in square plots. The park starts owning a central block; the
// rest is bought outward, one adjacent plot at a time.
export const PLOT_SIZE = 7;
export const PLOTS_PER_AXIS = GRID_WIDTH / PLOT_SIZE;
export const INITIAL_OWNED_PLOTS = [
  [1, 2], [2, 2],
  [1, 3], [2, 3],
];
