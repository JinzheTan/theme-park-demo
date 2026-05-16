import { dom } from "./dom.js";
import { inBounds, getTile } from "../util/grid.js";
import { canPlaceTool } from "../sim/placement.js";
import { isObjectOperational } from "../sim/park.js";
import { setText, setClass } from "./diff.js";

let mounted = false;
let titleNode = null;
let infoNode = null;
let verdictNode = null;

const OFFSET = 14;

function ensureMounted() {
  if (mounted) return;
  const card = dom.hoverCard;
  card.replaceChildren();
  titleNode = document.createElement("strong");
  infoNode = document.createElement("span");
  verdictNode = document.createElement("span");
  card.appendChild(titleNode);
  card.appendChild(infoNode);
  card.appendChild(verdictNode);
  card.classList.add("hover-card", "glass", "glass--depth-1");
  mounted = true;
}

function clampToViewport(x, y, w, h, parent) {
  const maxX = parent.clientWidth - w - 8;
  const maxY = parent.clientHeight - h - 8;
  return {
    x: Math.max(8, Math.min(x, maxX)),
    y: Math.max(8, Math.min(y, maxY)),
  };
}

export function updateHoverCard(state) {
  ensureMounted();
  const card = dom.hoverCard;
  const tileCoord = state.pointer.tile;

  if (!state.pointer.inside || !tileCoord || !inBounds(tileCoord.x, tileCoord.y)) {
    setClass(card, "visible", false);
    return;
  }

  const tile = getTile(state, tileCoord.x, tileCoord.y);
  const object = tile?.objectId ? state.objects.get(tile.objectId) : null;
  const verdict = canPlaceTool(state, state.selectedTool, tileCoord.x, tileCoord.y);
  const terrain = tile.terrain === "water" ? "Water" : tile.path ? "Path" : "Grass";

  const objectDetail = object
    ? object.category === "ride" || object.category === "facility"
      ? isObjectOperational(state, object)
        ? `Queue ${object.queue.length}, riders ${object.riders.length}`
        : "Disconnected from main park path"
      : object.category === "service"
        ? isObjectOperational(state, object)
          ? "Staffed and active"
          : "Placed, but staff cannot reach it"
        : object.category
    : null;

  setText(titleNode, `${object?.label ?? terrain} · ${tileCoord.x}, ${tileCoord.y}`);
  setText(
    infoNode,
    objectDetail
      ?? (tile.litter
        ? `${tile.litter} litter pile${tile.litter === 1 ? "" : "s"}`
        : terrain === "Grass"
          ? "Buildable tile"
          : "Scenic water edge"),
  );
  setText(verdictNode, verdict.ok ? "Ready for placement" : verdict.reason);
  setClass(verdictNode, "warn", !verdict.ok);

  // Position near the cursor; the parent is the viewport panel.
  const parent = card.offsetParent ?? card.parentElement;
  if (parent) {
    // measure first by making visible briefly (CSS visibility hidden trick avoided — use offset post-layout):
    card.style.left = "0px";
    card.style.top = "0px";
    setClass(card, "visible", true);
    const rect = card.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const desiredX = state.pointer.x + OFFSET;
    const desiredY = state.pointer.y + OFFSET;
    const clamped = clampToViewport(desiredX, desiredY, rect.width, rect.height, parent);
    card.style.left = `${clamped.x}px`;
    card.style.top = `${clamped.y}px`;
    // parentRect kept for future absolute-correction needs; ignore.
    void parentRect;
  } else {
    setClass(card, "visible", true);
  }
}

export function hideHoverCard() {
  ensureMounted();
  setClass(dom.hoverCard, "visible", false);
}
