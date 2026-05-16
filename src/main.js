import { state } from "./core/state.js";
import { createGrid, seedPark } from "./sim/park.js";
import { computeParkMetrics } from "./sim/economy.js";
import { addEvent } from "./sim/events.js";
import { loadAssets } from "./data/assets.js";
import { dom, ctx2d, minimapCtx2d } from "./ui/dom.js";
import { updateViewportResponsiveState, fitCameraToPark } from "./render/camera.js";
import { resizeCanvas } from "./render/resize.js";
import { renderPanels } from "./ui/panels.js";
import { bindToolsPanel } from "./ui/tools-panel.js";
import { bindSpeedControls } from "./ui/speed-controls.js";
import { initControlsPopover } from "./ui/controls-popover.js";
import { initMobileTabs } from "./ui/mobile-tabs.js";
import { bindSettingsPanel, applySettingsToDocument } from "./ui/settings-panel.js";
import { bindKeyboard } from "./input/keyboard.js";
import { bindPointer } from "./input/pointer.js";
import { bindWheel } from "./input/wheel.js";
import { bindMinimap } from "./input/minimap-input.js";
import { startGameLoop } from "./loop/game-loop.js";
import { installQaHooks } from "./core/qa-hooks.js";

async function bootstrap() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  createGrid(state);
  seedPark(state);
  await loadAssets(state);

  bindToolsPanel(state);
  bindSpeedControls(state);
  applySettingsToDocument(state);
  bindSettingsPanel(state);
  initControlsPopover();
  initMobileTabs();

  bindPointer(state, dom.canvas);
  bindWheel(state, dom.canvas);
  bindMinimap(state, dom.minimapCanvas, dom.canvas);
  bindKeyboard(state, dom.canvas);

  dom.centerCameraButton.addEventListener("click", () => {
    fitCameraToPark(state, dom.canvas);
    state.cameraTouched = false;
  });

  const resize = () => resizeCanvas(state, dom.canvas, dom.minimapCanvas, ctx2d, minimapCtx2d);
  window.addEventListener("resize", resize);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);

  updateViewportResponsiveState(state);
  resize();
  computeParkMetrics(state);
  renderPanels(state);
  addEvent(state, "Park open", "Wonderloop Park is ready for new paths, rides, and scenic upgrades.");
  addEvent(state, "Starter layout", "The opening plaza includes a carousel, food, and care coverage.");

  const advanceTime = startGameLoop(state, dom.canvas, ctx2d, dom.minimapCanvas, minimapCtx2d);
  installQaHooks(state, dom.canvas, advanceTime);
}

bootstrap().catch((error) => {
  console.error("Wonderloop bootstrap failed:", error);
});
