import { TILE_WIDTH, TILE_HEIGHT } from "../core/constants.js";
import { OBJECT_DEFS } from "../data/objects.js";
import { clamp } from "../util/math.js";
import { tileKey, inBounds } from "../util/grid.js";
import { tileToScreen } from "../util/iso.js";
import { canPlaceTool } from "../sim/placement.js";

function drawAsset(state, ctx, image, screenX, screenY, width, height, anchorY, options = {}) {
  if (!image) return;
  const wobbleY = options.wobbleY ?? 0;
  const alpha = options.alpha ?? 1;
  const x = screenX - (width * state.camera.zoom) / 2;
  const y = screenY - height * state.camera.zoom + anchorY * state.camera.zoom + wobbleY;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, x, y, width * state.camera.zoom, height * state.camera.zoom);
  ctx.restore();
}

function drawDiamondOutline(state, ctx, x, y, color) {
  const screen = tileToScreen(state, x, y);
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

function drawDiamondFill(state, ctx, x, y, color, alpha) {
  const screen = tileToScreen(state, x, y);
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

function tileFocusDistance(state, tile) {
  const bounds = state.activeTileBounds;
  if (!bounds) return 0;
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

function drawBackdrop(state, ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  const motionClock = state.settings?.reducedMotion ? 0 : state.dayClock;
  gradient.addColorStop(0, "#114250");
  gradient.addColorStop(0.45, "#1c5f6f");
  gradient.addColorStop(1, "#0b2027");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  for (let i = 0; i < 8; i += 1) {
    const x = (i / 7) * canvas.clientWidth;
    const y = 60 + Math.sin(i * 1.3 + motionClock * 0.08) * 12;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 245, 219, 0.09)";
    ctx.ellipse(x + 60, y, 80, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTile(state, ctx, tile) {
  const screen = tileToScreen(state, tile.x, tile.y);
  const terrainImage = state.assets[tile.terrain];
  drawAsset(state, ctx, terrainImage, screen.x, screen.y, TILE_WIDTH, TILE_HEIGHT, 0);

  if (tile.path) {
    drawAsset(state, ctx, state.assets.path, screen.x, screen.y, TILE_WIDTH, TILE_HEIGHT, 0);
  }

  if (tile.litter) {
    ctx.save();
    const litterScreen = tileToScreen(state, tile.x + 0.12, tile.y + 0.16);
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

  const fadeDistance = tileFocusDistance(state, tile);
  if (state.settings?.focusActiveArea !== false && fadeDistance > 0) {
    drawDiamondFill(state, ctx, tile.x, tile.y, "#0d2430", clamp(0.08 + fadeDistance * 0.03, 0.08, 0.28));
  }
}

function drawObject(state, ctx, object) {
  const def = object.stats;
  const screen = tileToScreen(state, object.x, object.y);
  const image = state.assets[object.asset];
  const bob =
    object.category === "ride" && object.riders.length && !state.settings?.reducedMotion
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

  drawAsset(state, ctx, image, screen.x, screen.y, def.width, def.height, def.anchorY, { wobbleY: bob });

  if (state.settings?.showRideLabels !== false && (object.category === "ride" || object.category === "facility")) {
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

function drawGuest(state, ctx, guest) {
  if (guest.state === "riding") return;
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

  const screen = tileToScreen(state, drawX, drawY);
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

export function render(state, ctx, canvas) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawBackdrop(state, ctx, canvas);

  // Pass 1 — paint the entire ground plane first. Doing this in a separate
  // pass guarantees object sprites are never clipped by tiles painted "later"
  // in iso order, which used to look like the sprites were sinking into the
  // ground when their footprint extended past their anchor tile.
  for (const tile of state.orderedTiles) {
    drawTile(state, ctx, tile);
  }

  // Pass 2 — paint objects + guests in iso depth order so closer items sit on
  // top of further items, but everything sits on top of the ground.
  const drawables = [];
  for (const object of state.objects.values()) {
    drawables.push({ depth: object.x + object.y, kind: "object", payload: object });
  }
  for (const guest of state.guests) {
    drawables.push({ depth: guest.x + guest.y, kind: "guest", payload: guest });
  }
  drawables.sort((a, b) => a.depth - b.depth);

  for (const item of drawables) {
    if (item.kind === "object") drawObject(state, ctx, item.payload);
    else drawGuest(state, ctx, item.payload);
  }

  if (
    state.settings?.showBuildPreview !== false &&
    state.pointer.tile &&
    inBounds(state.pointer.tile.x, state.pointer.tile.y)
  ) {
    const verdict = canPlaceTool(state, state.selectedTool, state.pointer.tile.x, state.pointer.tile.y);
    drawDiamondOutline(state, ctx, state.pointer.tile.x, state.pointer.tile.y, verdict.ok ? "#f3d089" : "#ff6f65");

    if (verdict.ok && state.selectedTool !== "path" && state.selectedTool !== "remove") {
      const def = OBJECT_DEFS[state.selectedTool];
      if (def) {
        const screen = tileToScreen(state, state.pointer.tile.x, state.pointer.tile.y);
        drawAsset(
          state, ctx,
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
  }
}
