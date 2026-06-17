import { TILE_WIDTH, TILE_HEIGHT } from "../core/constants.js";
import { OBJECT_DEFS } from "../data/objects.js";
import { clamp } from "../util/math.js";
import { tileKey, inBounds } from "../util/grid.js";
import { tileToScreen } from "../util/iso.js";
import { canPlaceTool } from "../sim/placement.js";
import { getAtmosphereModifiers } from "../sim/atmosphere.js";

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

function drawThoughtBubble(state, ctx, centerX, bottomY, thought) {
  const zoom = state.camera.zoom;
  const fontSize = Math.round(11 * zoom + 4);
  ctx.save();
  ctx.font = `${fontSize}px "Trebuchet MS", sans-serif`;
  const label = `${thought.icon} ${thought.text}`;
  const textWidth = ctx.measureText(label).width;
  const padX = 8 * zoom + 4;
  const padY = 5 * zoom + 3;
  const w = textWidth + padX * 2;
  const h = fontSize + padY * 2;
  const x = centerX - w / 2;
  const y = bottomY - h;
  const r = 8 * zoom + 3;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  // Little tail pointing down to the guest.
  ctx.moveTo(centerX - 5 * zoom, y + h);
  ctx.lineTo(centerX, y + h + 7 * zoom);
  ctx.lineTo(centerX + 5 * zoom, y + h);
  ctx.closePath();

  ctx.fillStyle = "rgba(255, 252, 244, 0.96)";
  ctx.shadowColor = "rgba(23, 53, 61, 0.28)";
  ctx.shadowBlur = 10 * zoom;
  ctx.shadowOffsetY = 3 * zoom;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#1d3a43";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, centerX, y + h / 2 + 1);
  ctx.restore();
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
  const selected = guest.id === state.selectedGuestId;

  ctx.save();
  if (selected) {
    const pulse = state.settings?.reducedMotion ? 1 : 1 + Math.sin(state.dayClock * 5) * 0.12;
    ctx.strokeStyle = "rgba(216, 157, 38, 0.95)";
    ctx.lineWidth = 2.5 * state.camera.zoom;
    ctx.beginPath();
    ctx.ellipse(screen.x, baseY + 6, size * 1.4 * pulse, size * 0.7 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
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

  if (guest.thought && state.camera.zoom > 0.55) {
    drawThoughtBubble(state, ctx, screen.x, baseY - size * 3.1, guest.thought);
  }
}

// Full-screen wash that sells time-of-day + weather without touching any of
// the sprite art. Night dims toward blue, dusk warms, rain cools and streaks.
function drawAtmosphere(state, ctx, canvas) {
  const atmosphere = getAtmosphereModifiers(state);
  if (!atmosphere.active) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (atmosphere.phase.overlay) {
    ctx.save();
    ctx.fillStyle = atmosphere.phase.overlay;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (atmosphere.weather.tint) {
    ctx.save();
    ctx.fillStyle = atmosphere.weather.tint;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (atmosphere.weather.id === "rain") {
    const reduced = Boolean(state.settings?.reducedMotion);
    const drift = reduced ? 0 : (state.timeOfDay * 4200) % 60;
    ctx.save();
    ctx.strokeStyle = "rgba(214, 230, 245, 0.32)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 70; i += 1) {
      const baseX = (i * 137.5) % width;
      const baseY = (i * 89.3) % height;
      const x = (baseX + drift * 0.6) % width;
      const y = (baseY + drift * 2.4) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 14);
      ctx.stroke();
    }
    ctx.restore();
  }
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

  drawAtmosphere(state, ctx, canvas);

  if (
    state.settings?.showBuildPreview !== false &&
    state.selectedTool !== "inspect" &&
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
