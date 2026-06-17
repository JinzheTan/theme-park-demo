import { dom } from "./dom.js";
import { el, setText } from "./diff.js";
import {
  FIREWORKS_COST,
  MARKETING_COST,
  canLaunchFireworks,
  launchFireworks,
  canStartMarketing,
  startMarketing,
} from "../sim/shows.js";

let mounted = false;
let stateRef = null;
let refs = {};

function mount() {
  const host = dom.eventsPanel;
  if (!host) return;
  host.replaceChildren();

  const fireworks = el("article", "event-action list-card glass glass--depth-2");
  const head = el("strong");
  setText(head, "🎆 Fireworks Show");
  const blurb = el("span");
  setText(blurb, "Light up the sky to thrill every guest. Best after dark.");
  const button = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
  button.type = "button";
  button.dataset.fireworks = "true";
  fireworks.appendChild(head);
  fireworks.appendChild(blurb);
  fireworks.appendChild(button);
  host.appendChild(fireworks);

  const marketing = el("article", "event-action list-card glass glass--depth-2");
  const mHead = el("strong");
  setText(mHead, "📣 Marketing Blitz");
  const mBlurb = el("span");
  setText(mBlurb, "Run a campaign to pull a wave of extra guests for a while.");
  const mButton = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
  mButton.type = "button";
  mButton.dataset.marketing = "true";
  marketing.appendChild(mHead);
  marketing.appendChild(mBlurb);
  marketing.appendChild(mButton);
  host.appendChild(marketing);

  host.addEventListener("click", (event) => {
    if (!stateRef) return;
    if (event.target.closest("[data-fireworks]")) {
      launchFireworks(stateRef);
      renderEvents(stateRef);
    } else if (event.target.closest("[data-marketing]")) {
      startMarketing(stateRef);
      renderEvents(stateRef);
    }
  });

  refs = { fireworksButton: button, marketingButton: mButton };
  mounted = true;
}

export function bindEventsPanel(state) {
  stateRef = state;
  if (!mounted) mount();
  renderEvents(state);
}

export function renderEvents(state) {
  if (!mounted) mount();
  if (state.show.active) {
    setText(refs.fireworksButton, "Show running…");
    refs.fireworksButton.disabled = true;
  } else {
    setText(refs.fireworksButton, `Launch — $${FIREWORKS_COST}`);
    refs.fireworksButton.disabled = !canLaunchFireworks(state);
  }

  if (state.marketing.active) {
    setText(refs.marketingButton, `Active — ${Math.ceil(state.marketing.timer)}s left`);
    refs.marketingButton.disabled = true;
  } else {
    setText(refs.marketingButton, `Run campaign — $${MARKETING_COST}`);
    refs.marketingButton.disabled = !canStartMarketing(state);
  }
}
