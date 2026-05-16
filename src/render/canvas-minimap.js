import { GRID_WIDTH, GRID_HEIGHT } from "../core/constants.js";
import { clamp } from "../util/math.js";
import { screenToTile } from "../util/iso.js";

export function renderMinimap(state, minimapCtx, minimapCanvas, mainCanvas) {
  const w = minimapCanvas.clientWidth;
  const h = minimapCanvas.clientHeight;
  minimapCtx.clearRect(0, 0, w, h);
  minimapCtx.fillStyle = "#0b2027";
  minimapCtx.fillRect(0, 0, w, h);

  const scaleX = w / GRID_WIDTH;
  const scaleY = h / GRID_HEIGHT;

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

  const topLeft = screenToTile(state, 0, 0);
  const bottomRight = screenToTile(state, mainCanvas.clientWidth, mainCanvas.clientHeight);

  // Clamp to minimap bounds to avoid rectangles drawing outside on extreme zoom-out.
  const clampedLeft = clamp(topLeft.x, 0, GRID_WIDTH);
  const clampedTop = clamp(topLeft.y, 0, GRID_HEIGHT);
  const clampedRight = clamp(bottomRight.x, 0, GRID_WIDTH);
  const clampedBottom = clamp(bottomRight.y, 0, GRID_HEIGHT);

  const rectX = clampedLeft * scaleX;
  const rectY = clampedTop * scaleY;
  const rectW = (clampedRight - clampedLeft) * scaleX;
  const rectH = (clampedBottom - clampedTop) * scaleY;

  if (rectW > 0 && rectH > 0) {
    minimapCtx.strokeStyle = "rgba(249, 243, 220, 0.9)";
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(rectX, rectY, rectW, rectH);
  }
}
