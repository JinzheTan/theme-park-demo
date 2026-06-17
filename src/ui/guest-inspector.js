import { dom } from "./dom.js";
import { el, setText, setClass } from "./diff.js";
import { markUiDirty } from "../core/state.js";
import { guestKind } from "../data/guest-flavor.js";

let mounted = false;
let refs = {};
let stateRef = null;

function activityLabel(state, guest) {
  const object = guest.targetId || guest.waitingAt
    ? state.objects.get(guest.targetId ?? guest.waitingAt)
    : null;
  switch (guest.state) {
    case "queuing":
      return object ? `Queuing for ${object.label}` : "Waiting in line";
    case "riding":
      return object ? `Enjoying ${object.label}` : "On a ride";
    case "walking":
      return object ? `Heading to ${object.label}` : "On the move";
    case "strolling":
      return "Strolling the park";
    case "leaving":
      return "Heading for the exit";
    default:
      return "Deciding what to do";
  }
}

function meter(label) {
  const row = el("div", "guest-meter");
  const head = el("span", "guest-meter__label");
  setText(head, label);
  const track = el("span", "guest-meter__track");
  const fill = el("span");
  track.appendChild(fill);
  row.appendChild(head);
  row.appendChild(track);
  return { row, fill };
}

function mount() {
  const host = dom.guestInspector;
  if (!host) return;
  host.replaceChildren();

  const header = el("div", "guest-inspector__header");
  const name = el("strong");
  const close = el("button", "guest-inspector__close pill--reset");
  close.type = "button";
  setText(close, "✕");
  close.setAttribute("aria-label", "Stop following guest");
  header.appendChild(name);
  header.appendChild(close);

  const party = el("span", "guest-inspector__party");
  const activity = el("span", "guest-inspector__activity");
  const thought = el("span", "guest-inspector__thought");

  const happy = meter("Happiness");
  const energy = meter("Energy");
  const hunger = meter("Hunger");
  const thirst = meter("Thirst");
  const relief = meter("Relief");

  const footer = el("span", "guest-inspector__footer");

  host.appendChild(header);
  host.appendChild(party);
  host.appendChild(activity);
  host.appendChild(thought);
  host.appendChild(happy.row);
  host.appendChild(energy.row);
  host.appendChild(hunger.row);
  host.appendChild(thirst.row);
  host.appendChild(relief.row);
  host.appendChild(footer);

  close.addEventListener("click", () => {
    if (!stateRef) return;
    stateRef.selectedGuestId = null;
    markUiDirty();
  });

  refs = { name, party, activity, thought, happy, energy, hunger, thirst, relief, footer };
  mounted = true;
}

export function bindGuestInspector(state) {
  stateRef = state;
  if (!mounted) mount();
}

export function renderGuestInspector(state) {
  if (!mounted) mount();
  const host = dom.guestInspector;
  if (!host) return;

  const guest = state.selectedGuestId
    ? state.guests.find((entry) => entry.id === state.selectedGuestId)
    : null;

  if (!guest) {
    setClass(host, "visible", false);
    return;
  }
  setClass(host, "visible", true);

  const kind = guestKind(guest.kind);
  setText(refs.name, guest.name ?? `Guest #${guest.id}`);
  setText(refs.party, `${kind.icon} ${kind.label} · ${guest.partySize > 1 ? `party of ${guest.partySize}` : "solo"}`);
  setText(refs.activity, activityLabel(state, guest));

  if (guest.thought) {
    setText(refs.thought, `${guest.thought.icon} "${guest.thought.text}"`);
    setClass(refs.thought, "visible", true);
  } else {
    setClass(refs.thought, "visible", false);
  }

  const setMeter = (m, value, warnWhenLow, lowGood) => {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    m.fill.style.width = `${pct}%`;
    // lowGood meters (hunger/thirst/relief) are bad when high; others bad when low.
    const bad = lowGood ? pct > 64 : pct < (warnWhenLow ?? 40);
    setClass(m.fill, "warn", bad);
    setClass(m.fill, "good", !bad);
  };
  setMeter(refs.happy, guest.happiness, 45, false);
  setMeter(refs.energy, guest.energy ?? 100, 30, false);
  setMeter(refs.hunger, guest.hunger, null, true);
  setMeter(refs.thirst, guest.thirst ?? 0, null, true);
  setMeter(refs.relief, guest.relief ?? 0, null, true);

  setText(refs.footer, `${guest.activities} ride${guest.activities === 1 ? "" : "s"} enjoyed`);
}
