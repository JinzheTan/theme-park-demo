import {
  GRID_WIDTH, GRID_HEIGHT, TILE_WIDTH, TILE_HEIGHT,
  CAMERA_SPEED, CAMERA_PADDING,
} from "../core/constants.js";
import { CAMERA } from "../data/tuning.js";
import { clamp } from "../util/math.js";
import { getActiveWorldBounds } from "../sim/park.js";

export function getViewportMetrics() {
  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
    scale: visualViewport?.scale ?? 1,
  };
}

export function updateViewportResponsiveState(state) {
  const metrics = getViewportMetrics();
  state.viewportScale = metrics.scale;
  const overlayScale = clamp(1 / Math.sqrt(metrics.scale), 0.86, 1);
  const overlayShift = metrics.scale > 1.01 ? `${Math.round((metrics.scale - 1) * 14)}px` : "0px";
  document.documentElement.style.setProperty("--overlay-scale", overlayScale.toFixed(3));
  document.documentElement.style.setProperty("--overlay-shift", overlayShift);
}

export function clampCamera(state, canvas) {
  const minWorldX = -(GRID_HEIGHT - 1) * (TILE_WIDTH / 2);
  const maxWorldX = (GRID_WIDTH - 1) * (TILE_WIDTH / 2);
  const minWorldY = -260;
  const maxWorldY = (GRID_WIDTH + GRID_HEIGHT - 2) * (TILE_HEIGHT / 2) + 160;

  const zoomAdjustedPadding = CAMERA_PADDING / Math.max(state.viewportScale, 1);
  const horizontalSlack = Math.max(zoomAdjustedPadding, canvas.clientWidth * 0.34);
  const verticalSlack = Math.max(zoomAdjustedPadding, canvas.clientHeight * 0.24);

  const minX = canvas.clientWidth - horizontalSlack - maxWorldX * state.camera.zoom;
  const maxX = horizontalSlack - minWorldX * state.camera.zoom;
  const minY = canvas.clientHeight - verticalSlack - maxWorldY * state.camera.zoom;
  const maxY = verticalSlack - minWorldY * state.camera.zoom;

  state.camera.x = minX > maxX ? (minX + maxX) / 2 : clamp(state.camera.x, minX, maxX);
  state.camera.y = minY > maxY ? (minY + maxY) / 2 : clamp(state.camera.y, minY, maxY);
}

export function focusCameraOn(state, canvas, tileX, tileY) {
  const focusZoom = canvas.clientWidth < CAMERA.MOBILE_BREAKPOINT_PX
    ? CAMERA.FOCUS_ZOOM_MOBILE
    : CAMERA.FOCUS_ZOOM_DESKTOP;
  state.camera.zoom = focusZoom;
  const worldX = (tileX - tileY) * (TILE_WIDTH / 2);
  const worldY = (tileX + tileY) * (TILE_HEIGHT / 2);
  state.camera.x = canvas.clientWidth * 0.48 - worldX * state.camera.zoom;
  state.camera.y = canvas.clientHeight * 0.5 - worldY * state.camera.zoom;
  clampCamera(state, canvas);
}

export function fitCameraToPark(state, canvas) {
  const bounds = getActiveWorldBounds(state);
  const viewportWidth = canvas.clientWidth - 140 / Math.max(state.viewportScale, 1);
  const viewportHeight = canvas.clientHeight - 180 / Math.max(state.viewportScale, 1);
  const worldWidth = Math.max(220, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(180, bounds.maxY - bounds.minY);
  const isMobile = canvas.clientWidth < CAMERA.MOBILE_BREAKPOINT_PX;
  const minZoom = isMobile ? CAMERA.ZOOM_FIT_MIN_MOBILE : CAMERA.ZOOM_FIT_MIN_DESKTOP;
  const maxZoom = isMobile ? CAMERA.ZOOM_FIT_MAX_MOBILE : CAMERA.ZOOM_FIT_MAX_DESKTOP;

  state.camera.zoom = clamp(
    Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight),
    minZoom,
    maxZoom,
  );

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  state.camera.x = canvas.clientWidth * 0.5 - centerX * state.camera.zoom;
  state.camera.y = canvas.clientHeight * 0.62 - centerY * state.camera.zoom;
  clampCamera(state, canvas);
}

export function updateCamera(state, canvas, deltaTime) {
  let moveX = 0;
  let moveY = 0;

  if (state.keys.has("arrowup") || state.keys.has("w")) moveY += 1;
  if (state.keys.has("arrowdown") || state.keys.has("s")) moveY -= 1;
  if (state.keys.has("arrowleft") || state.keys.has("a")) moveX += 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) moveX -= 1;

  state.camera.x += moveX * CAMERA_SPEED * deltaTime;
  state.camera.y += moveY * CAMERA_SPEED * deltaTime;
  clampCamera(state, canvas);
}
