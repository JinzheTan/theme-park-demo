import { updateViewportResponsiveState, clampCamera, fitCameraToPark } from "./camera.js";

export function resizeCanvas(state, canvas, minimapCanvas, ctx, minimapCtx) {
  updateViewportResponsiveState(state);
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const minimapRect = minimapCanvas.getBoundingClientRect();
  minimapCanvas.width = minimapRect.width * dpr;
  minimapCanvas.height = minimapRect.height * dpr;
  minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!state.cameraTouched) {
    fitCameraToPark(state, canvas);
  } else {
    clampCamera(state, canvas);
  }
}
