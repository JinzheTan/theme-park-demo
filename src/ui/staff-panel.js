import { dom } from "./dom.js";
import { el, setText, setClass } from "./diff.js";
import { STAFF_TYPES, STAFF_ORDER } from "../data/staff.js";
import { hireStaff, fireStaff, staffCountsByType, totalStaffWage } from "../sim/staff.js";

let mounted = false;
let stateRef = null;
let rows = [];
let wageNode = null;

function mount() {
  const host = dom.staffPanel;
  if (!host) return;
  host.replaceChildren();
  rows = [];

  const summary = el("div", "staff-summary");
  const wageLabel = el("span", "staff-summary__label");
  setText(wageLabel, "Total wages / cycle");
  wageNode = el("strong");
  summary.appendChild(wageLabel);
  summary.appendChild(wageNode);
  host.appendChild(summary);

  for (const typeId of STAFF_ORDER) {
    const def = STAFF_TYPES[typeId];
    const card = el("article", "staff-card list-card glass glass--depth-2");

    const head = el("strong");
    const icon = el("span", "staff-card__icon");
    setText(icon, def.icon);
    const name = document.createTextNode(def.label);
    const count = el("span", "staff-card__count");
    head.appendChild(icon);
    head.appendChild(name);
    head.appendChild(count);

    const blurb = el("span");
    setText(blurb, `${def.blurb} $${def.wage}/cycle.`);

    const actions = el("div", "staff-card__actions");
    const hire = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
    hire.type = "button";
    hire.dataset.hire = typeId;
    setText(hire, `Hire $${def.hire}`);
    const fire = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
    fire.type = "button";
    fire.dataset.fire = typeId;
    setText(fire, "Dismiss");
    actions.appendChild(hire);
    actions.appendChild(fire);

    card.appendChild(head);
    card.appendChild(blurb);
    card.appendChild(actions);
    host.appendChild(card);

    rows.push({ typeId, def, count, hire, fire });
  }

  host.addEventListener("click", (event) => {
    if (!stateRef) return;
    const hireTarget = event.target.closest("[data-hire]");
    if (hireTarget) {
      hireStaff(stateRef, hireTarget.dataset.hire);
      renderStaff(stateRef);
      return;
    }
    const fireTarget = event.target.closest("[data-fire]");
    if (fireTarget) {
      fireStaff(stateRef, fireTarget.dataset.fire);
      renderStaff(stateRef);
    }
  });

  mounted = true;
}

export function bindStaffPanel(state) {
  stateRef = state;
  if (!mounted) mount();
  renderStaff(state);
}

export function renderStaff(state) {
  if (!mounted) mount();
  setText(wageNode, `$${totalStaffWage(state)}`);
  const counts = staffCountsByType(state);
  for (const row of rows) {
    const count = counts[row.typeId] ?? 0;
    setText(row.count, count ? `×${count}` : "");
    row.hire.disabled = state.money < row.def.hire;
    row.fire.disabled = count === 0;
  }
}
