import { dom } from "./dom.js";
import { el, setText, setClass } from "./diff.js";

// A lightweight first-run coach. Each step is either informational (advanced by
// the player pressing Next) or an action step with a `check` predicate that
// auto-advances once the player does the thing. Progress is checked from the
// panel-render loop, so detection is just reading live state — no extra wiring
// into the sim. Completion is remembered in localStorage; returning players
// (restored autosave) never see it unless they replay it from Settings.

const STORAGE_KEY = "wonderloop-tutorial-v1";

function rideCount(state) {
  return [...state.objects.values()].filter((o) => o.category === "ride").length;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Wonderloop Park",
    body: "You're the new park operator. In a few steps you'll lay paths, open a ride, and meet your guests. Ready?",
    cta: "Let's go",
  },
  {
    id: "path",
    title: "Lay down a path",
    body: "Open the Park Tools panel, pick Path, then click-drag on the grass to draw a few walkway tiles from the plaza.",
    onEnter: (state, b) => { b.path = state.pathTiles.length; },
    check: (state, b) => state.pathTiles.length >= (b.path ?? 0) + 3,
  },
  {
    id: "ride",
    title: "Open an attraction",
    body: "In the Rides palette, pick the Sun Carousel (it's unlocked from the start) and place it on grass next to a path so guests can queue. Bigger rides unlock as you serve more guests.",
    onEnter: (state, b) => { b.rides = rideCount(state); },
    check: (state, b) => rideCount(state) > (b.rides ?? 0),
  },
  {
    id: "inspect",
    title: "Meet a guest",
    body: "Choose the Inspect tool and click any guest to follow them and see their mood, needs, and thoughts.",
    check: (state) => state.selectedGuestId != null,
  },
  {
    id: "done",
    title: "You're ready to grow",
    body: "Keep guests happy and clean to raise your growth score, chase achievements in the Awards tab, and expand your park. Have fun!",
    cta: "Start building",
  },
];

let mounted = false;
let active = false;
let step = 0;
let stateRef = null;
const baseline = {};
let refs = {};

export function isTutorialComplete() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function markComplete() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    // Non-fatal.
  }
}

function mount() {
  const host = dom.tutorialCard;
  if (!host) return;
  host.replaceChildren();

  const eyebrow = el("p", "tutorial-card__step eyebrow");
  const title = el("h3", "tutorial-card__title");
  const body = el("p", "tutorial-card__body");
  const actions = el("div", "tutorial-card__actions");
  const skip = el("button", "pill pill--reset tutorial-card__skip");
  skip.type = "button";
  setText(skip, "Skip tour");
  const next = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
  next.type = "button";
  actions.appendChild(skip);
  actions.appendChild(next);

  host.appendChild(eyebrow);
  host.appendChild(title);
  host.appendChild(body);
  host.appendChild(actions);

  skip.addEventListener("click", finishTutorial);
  next.addEventListener("click", () => advance());

  refs = { eyebrow, title, body, next };
  mounted = true;
}

function enterStep() {
  const current = STEPS[step];
  if (current?.onEnter && stateRef) current.onEnter(stateRef, baseline);
}

function advance() {
  step += 1;
  if (step >= STEPS.length) {
    finishTutorial();
    return;
  }
  enterStep();
  renderTutorial(stateRef);
}

export function finishTutorial() {
  active = false;
  markComplete();
  if (dom.tutorialCard) setClass(dom.tutorialCard, "visible", false);
}

export function startTutorial(state) {
  stateRef = state;
  if (!mounted) mount();
  active = true;
  step = 0;
  enterStep();
  renderTutorial(state);
}

export function maybeStartTutorial(state, { restored } = {}) {
  stateRef = state;
  if (!mounted) mount();
  if (restored || isTutorialComplete()) return;
  startTutorial(state);
}

export function renderTutorial(state) {
  stateRef = state;
  if (!mounted) mount();
  const host = dom.tutorialCard;
  if (!host) return;

  if (!active) {
    setClass(host, "visible", false);
    return;
  }

  const current = STEPS[step];
  // Auto-advance action steps the moment the player completes them.
  if (current.check && current.check(state, baseline)) {
    advance();
    return;
  }

  setClass(host, "visible", true);
  setText(refs.eyebrow, `Tutorial · Step ${step + 1} / ${STEPS.length}`);
  setText(refs.title, current.title);
  setText(refs.body, current.body);

  if (current.check) {
    // Action step — no manual advance; nudge that we're watching.
    setText(refs.next, "Waiting for you…");
    refs.next.disabled = true;
  } else {
    setText(refs.next, current.cta ?? "Next");
    refs.next.disabled = false;
  }
}
