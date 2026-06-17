import { dom } from "./dom.js";
import { TOOLS, TOOL_GROUPS } from "../data/tools.js";
import { isToolUnlocked, unlockLabel } from "../data/unlocks.js";
import { markUiDirty } from "../core/state.js";
import { updateHoverCard } from "./hover-card.js";
import { el, setClass } from "./diff.js";

let mounted = false;
let buttonsByTool = new Map();

function mountToolGrid() {
  const { toolGrid } = dom;
  toolGrid.replaceChildren();
  buttonsByTool = new Map();

  for (const group of TOOL_GROUPS) {
    const tools = TOOLS.filter((t) => t.group === group);
    if (!tools.length) continue;

    const section = el("section", "tool-section");
    const heading = el("p", "tool-section__heading eyebrow");
    heading.textContent = group;
    section.appendChild(heading);

    const grid = el("div", "tool-grid");
    section.appendChild(grid);

    for (const tool of tools) {
      const btn = el("button", "tool-button pill--reset glass glass--depth-2");
      btn.type = "button";
      btn.dataset.tool = tool.id;
      btn.title = tool.detail;

      const cost = el("span", "cost-tag");
      cost.textContent = tool.cost ? `$${tool.cost}` : "Tool";
      const label = el("strong");
      label.textContent = tool.label;
      const detail = el("span");
      detail.textContent = tool.detail;

      btn.appendChild(cost);
      btn.appendChild(label);
      btn.appendChild(detail);
      grid.appendChild(btn);
      buttonsByTool.set(tool.id, btn);
    }

    toolGrid.appendChild(section);
  }

  toolGrid.addEventListener("click", (event) => {
    const target = event.target.closest("[data-tool]");
    if (target && target.dataset.tool) setSelectedTool(target.dataset.tool);
  });

  mounted = true;
}

export function renderToolButtons(state) {
  if (!mounted) mountToolGrid();
  for (const [toolId, btn] of buttonsByTool) {
    const active = toolId === state.selectedTool;
    setClass(btn, "active", active);
    setClass(btn, "glass--active", active);

    const locked = !isToolUnlocked(state, toolId);
    setClass(btn, "locked", locked);
    const costTag = btn.querySelector(".cost-tag");
    if (costTag) {
      const tool = TOOLS.find((t) => t.id === toolId);
      costTag.textContent = locked ? "🔒" : tool?.cost ? `$${tool.cost}` : "Tool";
    }
    btn.title = locked ? `Locked — ${unlockLabel(toolId)}` : TOOLS.find((t) => t.id === toolId)?.detail ?? "";
  }
}

let stateRef = null;
export function bindToolsPanel(state) {
  stateRef = state;
  renderToolButtons(state);
}

export function setSelectedTool(toolId) {
  if (!stateRef) return;
  if (!TOOLS.some((t) => t.id === toolId)) return;
  stateRef.selectedTool = toolId;
  renderToolButtons(stateRef);
  markUiDirty();
  updateHoverCard(stateRef);
}
