import { SHORTCUT_TO_TOOL } from "../data/tools.js";
import { setSelectedTool } from "../ui/tools-panel.js";
import { setSimulationSpeed } from "../ui/speed-controls.js";
import { performUndo, performRedo } from "../ui/build-controls.js";
import { fitCameraToPark } from "../render/camera.js";
import { toggleFullscreen } from "./fullscreen.js";

const MOVE_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);

export function bindKeyboard(state, canvas) {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
      event.preventDefault();
      performUndo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
      event.preventDefault();
      performRedo();
      return;
    }

    if (SHORTCUT_TO_TOOL[key]) {
      event.preventDefault();
      setSelectedTool(SHORTCUT_TO_TOOL[key]);
      return;
    }
    if (key === "c") {
      event.preventDefault();
      fitCameraToPark(state, canvas);
      state.cameraTouched = false;
      return;
    }
    if (key === "f") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    if (key === " ") {
      event.preventDefault();
      setSimulationSpeed(state.timeScale === 0 ? 1 : 0);
      return;
    }

    state.keys.add(key);
    if (MOVE_KEYS.has(key)) state.cameraTouched = true;
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key.toLowerCase());
  });
}
