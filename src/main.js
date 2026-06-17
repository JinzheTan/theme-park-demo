import { state } from "./core/state.js";
import { createGrid, seedPark } from "./sim/park.js";
import { computeParkMetrics } from "./sim/economy.js";
import { addEvent } from "./sim/events.js";
import { hasAutoSave, restoreAutoSave } from "./core/save-game.js";
import { unlockAudio } from "./core/audio.js";
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
import { bindGuestInspector } from "./ui/guest-inspector.js";
import { bindBuildControls } from "./ui/build-controls.js";
import { bindStaffPanel } from "./ui/staff-panel.js";
import { bindFinancePanel } from "./ui/finance-panel.js";
import { bindEventsPanel } from "./ui/events-panel.js";
import { maybeStartTutorial } from "./ui/tutorial.js";
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

  // Pick up where the player left off: a silent autosave is restored on boot so
  // an accidental refresh never wipes the park. Falls back to the starter park.
  let restoredFromAutoSave = false;
  if (state.settings.autoSave !== false && hasAutoSave()) {
    restoredFromAutoSave = restoreAutoSave(state);
  }

  await loadAssets(state);

  bindToolsPanel(state);
  bindSpeedControls(state);
  applySettingsToDocument(state);
  bindSettingsPanel(state);
  bindGuestInspector(state);
  bindBuildControls(state);
  bindStaffPanel(state);
  bindFinancePanel(state);
  bindEventsPanel(state);
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

  // Resume the audio context on the first real interaction (browsers block
  // audio until a user gesture). One-shot, then removed.
  const unlock = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);

  updateViewportResponsiveState(state);
  resize();
  computeParkMetrics(state);
  renderPanels(state);
  if (restoredFromAutoSave) {
    addEvent(state, "Welcome back", `Your park resumed at week ${state.day} with $${Math.round(state.money)} on hand.`);
  } else {
    addEvent(state, "Park open", "Wonderloop Park is ready for new paths, rides, and scenic upgrades.");
    addEvent(state, "Starter layout", "The opening plaza includes a carousel, food, and care coverage.");
  }

  // First-run coach: only for a genuinely fresh park, never on a restored one.
  maybeStartTutorial(state, { restored: restoredFromAutoSave });

  const advanceTime = startGameLoop(state, dom.canvas, ctx2d, dom.minimapCanvas, minimapCtx2d);
  installQaHooks(state, dom.canvas, advanceTime);
}

bootstrap().catch((error) => {
  console.error("Wonderloop bootstrap failed:", error);
});
