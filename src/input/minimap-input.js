import { GRID_WIDTH, GRID_HEIGHT } from "../core/constants.js";
import { focusCameraOn } from "../render/camera.js";

export function bindMinimap(state, minimapCanvas, mainCanvas) {
  minimapCanvas.addEventListener("pointerdown", (event) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * GRID_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * GRID_HEIGHT;
    focusCameraOn(state, mainCanvas, x, y);
    state.cameraTouched = true;
  });
}
