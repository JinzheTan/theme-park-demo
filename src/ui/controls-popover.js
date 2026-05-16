import { dom } from "./dom.js";

const AUTO_COLLAPSE_MS = 4000;

export function initControlsPopover() {
  const button = dom.controlsButton;
  const popover = dom.controlsPopover;
  if (!button || !popover) return;

  popover.classList.add("visible");

  const close = () => {
    popover.classList.remove("visible");
    button.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    popover.classList.add("visible");
    button.setAttribute("aria-expanded", "true");
  };
  const toggle = () => {
    if (popover.classList.contains("visible")) close();
    else open();
  };

  button.addEventListener("click", toggle);
  document.addEventListener("keydown", (event) => {
    if (event.key === "F1") {
      event.preventDefault();
      toggle();
    } else if (event.key === "Escape") {
      close();
    }
  });
  document.addEventListener("click", (event) => {
    if (!popover.contains(event.target) && event.target !== button) close();
  });

  setTimeout(close, AUTO_COLLAPSE_MS);
}
