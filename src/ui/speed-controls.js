import { dom } from "./dom.js";
import { markUiDirty } from "../core/state.js";

let stateRef = null;

export function bindSpeedControls(state) {
  stateRef = state;
  dom.speedControls.addEventListener("click", (event) => {
    const target = event.target.closest("[data-speed]");
    if (!target) return;
    setSimulationSpeed(Number(target.dataset.speed));
  });
  renderSpeedButtons(state);
}

export function renderSpeedButtons(state) {
  for (const button of dom.speedControls.querySelectorAll("[data-speed]")) {
    const active = Number(button.dataset.speed) === state.timeScale;
    button.classList.toggle("active", active);
    button.classList.toggle("glass--active", active);
  }
}

export function setSimulationSpeed(nextSpeed) {
  if (!stateRef) return;
  stateRef.timeScale = nextSpeed;
  renderSpeedButtons(stateRef);
  markUiDirty();
}
