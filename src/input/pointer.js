import { TILE_HEIGHT } from "../core/constants.js";
import { screenToTile, tileToScreen } from "../util/iso.js";
import { markUiDirty } from "../core/state.js";
import { useToolAt } from "../sim/placement.js";
import { playSfx } from "../core/audio.js";
import { updateHoverCard, hideHoverCard } from "../ui/hover-card.js";
import { clampCamera } from "../render/camera.js";

// Find the guest whose on-screen body is closest to a click, within a forgiving
// radius. Used by the Inspect tool to start following someone.
function pickGuestAt(state, screenX, screenY) {
  const zoom = state.camera.zoom;
  const radius = 24 * zoom + 6;
  let best = null;
  let bestDist = radius;
  for (const guest of state.guests) {
    if (guest.state === "riding") continue;
    const screen = tileToScreen(state, guest.x, guest.y);
    const torsoY = screen.y + TILE_HEIGHT * 0.62 * zoom - (10 * zoom + 2) * 1.5;
    const dist = Math.hypot(screenX - screen.x, screenY - torsoY);
    if (dist < bestDist) {
      best = guest;
      bestDist = dist;
    }
  }
  return best;
}

export function bindPointer(state, canvas) {
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("pointerenter", () => {
    state.pointer.inside = true;
  });
  canvas.addEventListener("pointerleave", () => {
    state.pointer.inside = false;
    hideHoverCard();
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.tile = screenToTile(state, state.pointer.x, state.pointer.y);
    state.focusedTile = state.pointer.tile;

    if (state.pointer.isPanning) {
      state.camera.x += event.movementX;
      state.camera.y += event.movementY;
      state.cameraTouched = true;
      clampCamera(state, canvas);
    }

    if (state.pointer.isPainting && (state.selectedTool === "path" || state.selectedTool === "remove")) {
      useToolAt(state, state.pointer.tile.x, state.pointer.tile.y);
    }

    updateHoverCard(state);
  });

  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.tile = screenToTile(state, state.pointer.x, state.pointer.y);
    state.focusedTile = state.pointer.tile;

    if (event.button === 2) {
      state.pointer.isPanning = true;
      return;
    }
    if (event.button !== 0 || !state.pointer.tile) return;

    if (state.selectedTool === "inspect") {
      const picked = pickGuestAt(state, state.pointer.x, state.pointer.y);
      state.selectedGuestId = picked ? picked.id : null;
      playSfx(picked ? "click" : "remove");
      markUiDirty();
      updateHoverCard(state);
      return;
    }

    // Start a fresh undo group for this click / drag-stroke.
    state.strokeUndoPushed = false;

    if (state.selectedTool === "path" || state.selectedTool === "remove") {
      state.pointer.isPainting = true;
    }

    useToolAt(state, state.pointer.tile.x, state.pointer.tile.y);
    updateHoverCard(state);
  });

  window.addEventListener("pointerup", () => {
    state.pointer.isPainting = false;
    state.pointer.isPanning = false;
  });
}
