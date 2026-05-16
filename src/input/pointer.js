import { screenToTile } from "../util/iso.js";
import { useToolAt } from "../sim/placement.js";
import { updateHoverCard, hideHoverCard } from "../ui/hover-card.js";
import { clampCamera } from "../render/camera.js";

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
