import { dom } from "./dom.js";
import { el, renderList, setText, setClass } from "./diff.js";
import { METRIC_ICON_PATHS } from "../data/assets.js";
import { TOOLS } from "../data/tools.js";
import { growthLabel } from "../data/growth.js";
import { isObjectOperational } from "../sim/park.js";
import { getAtmosphereModifiers } from "../sim/atmosphere.js";
import { starString } from "../sim/rating.js";
import { getGuestActivityItems, getGoalItems, buildInsights, getOperationsItems } from "./insights.js";
import { renderAchievements } from "./achievements-panel.js";
import { renderGuestInspector } from "./guest-inspector.js";
import { renderToolButtons } from "./tools-panel.js";
import { renderStats } from "./stats-panel.js";
import { renderStaff } from "./staff-panel.js";
import { renderFinance } from "./finance-panel.js";
import { renderEvents } from "./events-panel.js";
import { renderBuildControls } from "./build-controls.js";
import { renderTutorial } from "./tutorial.js";
import { flushToasts } from "./toast.js";

let metricsMounted = false;
let metricRefs = {};
let floatingMounted = false;
let floatingRefs = {};

function mountHeadlineMetrics() {
  const { headlineMetrics } = dom;
  headlineMetrics.replaceChildren();

  const make = (iconKey, ariaLabel) => {
    const card = el("article", "metric-pill pill pill--metric glass glass--depth-2");
    card.setAttribute("aria-label", ariaLabel);
    if (iconKey) {
      const img = document.createElement("img");
      img.src = METRIC_ICON_PATHS[iconKey];
      img.alt = "";
      card.appendChild(img);
    }
    const body = el("div", "metric-pill__body");
    const strong = el("strong");
    const span = el("span");
    body.appendChild(strong);
    body.appendChild(span);
    card.appendChild(body);
    headlineMetrics.appendChild(card);
    return { strong, span };
  };

  metricRefs = {
    money: make("money", "Cash on hand"),
    guests: make("guests", "Guests inside"),
    happiness: make("happiness", "Average happiness"),
    cleanliness: make("cleanliness", "Cleanliness"),
    growth: make(null, "Park growth"),
    atmosphere: make(null, "Time and weather"),
  };
  metricsMounted = true;
}

export function renderHeadlineMetrics(state) {
  if (!metricsMounted) mountHeadlineMetrics();
  setText(metricRefs.money.strong, `$${Math.round(state.money)}`);
  setText(metricRefs.money.span, "Cash");
  setText(metricRefs.guests.strong, state.guests.length);
  setText(metricRefs.guests.span, "Guests inside");
  setText(metricRefs.happiness.strong, `${state.averageHappiness}%`);
  setText(metricRefs.happiness.span, "Happiness");
  setText(metricRefs.cleanliness.strong, `${state.cleanliness}%`);
  setText(metricRefs.cleanliness.span, "Cleanliness");
  const rating = state.parkRating ?? 0;
  setText(metricRefs.growth.strong, starString(rating));
  setText(metricRefs.growth.span, `${growthLabel(state.growthScore)} · ${rating.toFixed(1)}★`);

  const atmosphere = getAtmosphereModifiers(state);
  if (atmosphere.active) {
    setText(metricRefs.atmosphere.strong, `${atmosphere.season.icon} ${atmosphere.season.label}`);
    setText(metricRefs.atmosphere.span, `${atmosphere.phase.icon} ${atmosphere.weather.icon} ${atmosphere.weather.label}`);
  } else {
    setText(metricRefs.atmosphere.strong, "Sandbox");
    setText(metricRefs.atmosphere.span, "Time & weather off");
  }
}

export function renderActivity(state) {
  renderList(
    dom.guestActivityList,
    getGuestActivityItems(state),
    (item) => item.label,
    () => {
      const node = el("article", "guest-activity-item list-card glass glass--depth-2");
      const head = el("strong");
      const chip = el("span", "guest-chip");
      head.appendChild(document.createTextNode(""));
      head.appendChild(chip);
      const detail = el("span");
      node.appendChild(head);
      node.appendChild(detail);
      node._refs = { head: head.firstChild, chip, detail };
      return node;
    },
    (item, node) => {
      node._refs.head.nodeValue = item.label;
      setText(node._refs.chip, item.value);
      setClass(node._refs.chip, "warn", item.tone === "warn");
      setText(node._refs.detail, item.detail);
    },
  );
}

export function renderGoals(state) {
  renderList(
    dom.goalList,
    getGoalItems(state),
    (item) => item.key,
    () => {
      const node = el("article", "goal-item list-card glass glass--depth-2");
      const head = el("strong");
      const chip = el("span", "goal-chip");
      head.appendChild(document.createTextNode(""));
      head.appendChild(chip);
      const detail = el("span");
      node.appendChild(head);
      node.appendChild(detail);
      node._refs = { head: head.firstChild, chip, detail };
      return node;
    },
    (item, node) => {
      node._refs.head.nodeValue = item.label;
      setText(node._refs.chip, item.chip);
      setClass(node._refs.chip, "warn", item.tone === "warn");
      setText(node._refs.detail, item.detail);
      setClass(node, "current", Boolean(item.current));
      setClass(node, "glass--active", Boolean(item.current));
    },
  );
}

function rideStatusItems(state) {
  return [...state.objects.values()]
    .filter((o) => o.type !== "gate")
    .map((object) => {
      let line = "Decorative";
      let warn = false;
      const operational = isObjectOperational(state, object);
      if (object.category === "ride" || object.category === "facility") {
        if (!object.entry) {
          line = "Missing path connection";
          warn = true;
        } else if (!operational) {
          line = "Disconnected from gate";
          warn = true;
        } else if (object.broken) {
          line = "Broken — needs a mechanic";
          warn = true;
        } else if (object.riders.length) {
          line = `Running ${object.riders.length} guests / ${object.stats.capacity}`;
        } else {
          line = `Queue ${object.queue.length} / ${object.stats.queueLimit}`;
        }
      } else if (object.category === "service") {
        line = operational
          ? `Cleaning radius ${object.stats.cleanRadius} tiles`
          : "Offline: no guest access";
        if (!operational) warn = true;
      }
      const secondary =
        object.category === "ride"
          ? `Excitement ${object.stats.excitement} · ${Math.round(object.condition ?? 100)}% condition`
          : object.category === "scenery"
            ? `Scenery ${object.stats.scenery}`
            : "Keeps the park moving";
      const revenue = object.stats.ticket ? `$${object.stats.ticket} / cycle` : "support only";

      return {
        key: String(object.id),
        label: object.label,
        chip: line,
        warn,
        primary: `Revenue ${revenue}.`,
        secondary: `${secondary}.`,
      };
    });
}

export function renderRideStatus(state) {
  renderList(
    dom.rideStatusList,
    rideStatusItems(state),
    (item) => item.key,
    () => {
      const node = el("article", "ride-card list-card glass glass--depth-2");
      const head = el("strong");
      const chip = el("span", "status-chip");
      head.appendChild(document.createTextNode(""));
      head.appendChild(chip);
      const primary = el("span");
      const secondary = el("span");
      node.appendChild(head);
      node.appendChild(primary);
      node.appendChild(secondary);
      node._refs = { head: head.firstChild, chip, primary, secondary };
      return node;
    },
    (item, node) => {
      node._refs.head.nodeValue = item.label;
      setText(node._refs.chip, item.chip);
      setClass(node._refs.chip, "warn", item.warn);
      setText(node._refs.primary, item.primary);
      setText(node._refs.secondary, item.secondary);
    },
  );
}

export function renderOperations(state) {
  renderList(
    dom.operationsPanel,
    getOperationsItems(state),
    (item) => item.key,
    () => {
      const node = el("article", "operation-card list-card glass glass--depth-2");
      const head = el("strong");
      const chip = el("span", "operation-chip");
      head.appendChild(document.createTextNode(""));
      head.appendChild(chip);
      const detail = el("span");
      const track = el("span", "operation-meter");
      const fill = el("span");
      track.appendChild(fill);
      node.appendChild(head);
      node.appendChild(detail);
      node.appendChild(track);
      node._refs = { head: head.firstChild, chip, detail, fill };
      return node;
    },
    (item, node) => {
      node._refs.head.nodeValue = item.label;
      setText(node._refs.chip, item.chip);
      setText(node._refs.detail, item.detail);
      setClass(node, "warn", item.tone === "warn");
      setClass(node, "good", item.tone === "good");
      setClass(node._refs.chip, "warn", item.tone === "warn");
      node._refs.fill.style.width = `${Math.round(item.value * 100)}%`;
    },
  );
}

export function renderInsights(state) {
  renderList(
    dom.insightList,
    buildInsights(state),
    (item) => item.key,
    () => {
      const node = el("article", "insight-item list-card glass glass--depth-2");
      const head = el("strong");
      const detail = el("span");
      node.appendChild(head);
      node.appendChild(detail);
      node._refs = { head, detail };
      return node;
    },
    (item, node) => {
      setText(node._refs.head, item.title);
      setText(node._refs.detail, item.detail);
      setClass(node, "warn", item.tone === "warn");
      setClass(node, "good", item.tone === "good");
    },
  );
}

export function renderEventLog(state) {
  renderList(
    dom.eventLog,
    state.feed,
    (entry) => String(entry.id),
    () => {
      const node = el("article", "event-item list-card glass glass--depth-2");
      const title = el("strong");
      const detail = el("span");
      node.appendChild(title);
      node.appendChild(detail);
      node._refs = { title, detail };
      return node;
    },
    (entry, node) => {
      setText(node._refs.title, entry.title);
      setText(node._refs.detail, entry.description);
    },
  );
}

function mountFloatingTools() {
  const { floatingTools } = dom;
  floatingTools.replaceChildren();

  const make = (variant) => {
    const node = el("article", `floating-tool glass glass--depth-1 ${variant}`);
    const strong = el("strong");
    const span = el("span");
    node.appendChild(strong);
    node.appendChild(span);
    floatingTools.appendChild(node);
    return { node, strong, span };
  };

  floatingRefs = {
    tool: make("floating-tool--tool"),
    rides: make("floating-tool--rides"),
    speed: make("floating-tool--speed"),
  };
  floatingMounted = true;
}

export function renderFloatingTools(state) {
  if (!floatingMounted) mountFloatingTools();
  const currentTool = TOOLS.find((t) => t.id === state.selectedTool);
  const rideCount = [...state.objects.values()].filter((o) => o.category === "ride").length;

  setText(floatingRefs.tool.strong, currentTool?.label ?? "—");
  setText(floatingRefs.tool.span, currentTool?.detail ?? "");
  setClass(floatingRefs.tool.node, "glass--active", true);

  setText(floatingRefs.rides.strong, `${rideCount} ride${rideCount === 1 ? "" : "s"}`);
  setText(floatingRefs.rides.span, `${state.guestsServed} experiences completed`);

  setText(floatingRefs.speed.strong, state.timeScale === 0 ? "Paused" : `${state.timeScale}x speed`);
  setText(floatingRefs.speed.span, `${state.cleanliness}% clean, service active`);
}

export function renderPanels(state) {
  renderHeadlineMetrics(state);
  renderActivity(state);
  renderGoals(state);
  renderOperations(state);
  renderStats(state);
  renderStaff(state);
  renderFinance(state);
  renderEvents(state);
  renderRideStatus(state);
  renderInsights(state);
  renderAchievements(state);
  renderEventLog(state);
  renderFloatingTools(state);
  renderGuestInspector(state);
  renderToolButtons(state);
  renderBuildControls(state);
  renderTutorial(state);
  flushToasts(state);
  state.uiDirty = false;
}
