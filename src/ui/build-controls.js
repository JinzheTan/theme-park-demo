import { dom } from "./dom.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { canUndo, canRedo, undoBuild, redoBuild } from "../sim/history.js";

let stateRef = null;

export function performUndo() {
  if (!stateRef) return;
  if (undoBuild(stateRef)) {
    playSfx("remove");
    markUiDirty();
  }
}

export function performRedo() {
  if (!stateRef) return;
  if (redoBuild(stateRef)) {
    playSfx("click");
    markUiDirty();
  }
}

export function renderBuildControls(state) {
  if (dom.undoButton) dom.undoButton.disabled = !canUndo(state);
  if (dom.redoButton) dom.redoButton.disabled = !canRedo(state);
}

export function bindBuildControls(state) {
  stateRef = state;
  dom.undoButton?.addEventListener("click", performUndo);
  dom.redoButton?.addEventListener("click", performRedo);
  renderBuildControls(state);
}
