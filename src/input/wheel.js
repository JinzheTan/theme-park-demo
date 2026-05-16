import { CAMERA } from "../data/tuning.js";
import { clamp } from "../util/math.js";
import { clampCamera } from "../render/camera.js";

export function bindWheel(state, canvas) {
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const pointerX = state.pointer.x || canvas.clientWidth * 0.5;
      const pointerY = state.pointer.y || canvas.clientHeight * 0.5;
      const worldX = (pointerX - state.camera.x) / state.camera.zoom;
      const worldY = (pointerY - state.camera.y) / state.camera.zoom;
      const nextZoom = clamp(state.camera.zoom - event.deltaY * CAMERA.ZOOM_STEP, CAMERA.ZOOM_MIN, CAMERA.ZOOM_MAX);
      state.camera.zoom = nextZoom;
      state.camera.x = pointerX - worldX * state.camera.zoom;
      state.camera.y = pointerY - worldY * state.camera.zoom;
      state.cameraTouched = true;
      clampCamera(state, canvas);
    },
    { passive: false },
  );
}
