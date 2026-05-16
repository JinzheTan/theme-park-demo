import { DEFAULT_SETTINGS, normalizeSettings, saveSettings } from "../core/settings.js";
import { markUiDirty } from "../core/state.js";
import { dom } from "./dom.js";
import { el, setClass, setText } from "./diff.js";

const SETTING_SECTIONS = [
  {
    label: "View",
    controls: [
      { key: "showMinimap", type: "toggle", label: "Minimap" },
      { key: "showFloatingHud", type: "toggle", label: "HUD cards" },
      { key: "showHoverCard", type: "toggle", label: "Tile details" },
      { key: "showRideLabels", type: "toggle", label: "Ride labels" },
    ],
  },
  {
    label: "Build Assist",
    controls: [
      { key: "showBuildPreview", type: "toggle", label: "Build preview" },
      { key: "focusActiveArea", type: "toggle", label: "Park focus" },
    ],
  },
  {
    label: "Comfort",
    controls: [
      { key: "reducedMotion", type: "toggle", label: "Reduced motion" },
      { key: "startPaused", type: "toggle", label: "Start paused" },
      { key: "uiScale", type: "range", label: "UI scale", min: 90, max: 110, step: 5 },
    ],
  },
];

let mounted = false;
let stateRef = null;
let controlRefs = new Map();

function applySettingClasses(settings) {
  document.documentElement.style.setProperty("--ui-scale", (settings.uiScale / 100).toFixed(2));
  document.body.classList.toggle("settings-hide-minimap", !settings.showMinimap);
  document.body.classList.toggle("settings-hide-floating", !settings.showFloatingHud);
  document.body.classList.toggle("settings-hide-hover", !settings.showHoverCard);
  document.body.classList.toggle("settings-reduced-motion", settings.reducedMotion);
}

export function applySettingsToDocument(state) {
  state.settings = normalizeSettings(state.settings);
  applySettingClasses(state.settings);
}

function valueLabel(control, value) {
  if (control.type === "range") return `${value}%`;
  return value ? "On" : "Off";
}

function makeToggle(control, state) {
  const label = el("label", "settings-row settings-row--toggle");
  const text = el("span", "settings-row__text");
  const title = el("strong");
  const value = el("span", "settings-value");
  const input = document.createElement("input");
  const switchTrack = el("span", "settings-switch");

  input.type = "checkbox";
  input.dataset.setting = control.key;
  input.checked = Boolean(state.settings[control.key]);

  setText(title, control.label);
  setText(value, valueLabel(control, input.checked));
  text.appendChild(title);
  text.appendChild(value);
  label.appendChild(text);
  label.appendChild(input);
  label.appendChild(switchTrack);
  controlRefs.set(control.key, { control, input, value });
  return label;
}

function makeRange(control, state) {
  const row = el("div", "settings-row settings-row--range");
  const text = el("span", "settings-row__text");
  const title = el("strong");
  const value = el("span", "settings-value");
  const input = document.createElement("input");

  input.type = "range";
  input.dataset.setting = control.key;
  input.min = control.min;
  input.max = control.max;
  input.step = control.step;
  input.value = state.settings[control.key];

  setText(title, control.label);
  setText(value, valueLabel(control, input.value));
  text.appendChild(title);
  text.appendChild(value);
  row.appendChild(text);
  row.appendChild(input);
  controlRefs.set(control.key, { control, input, value });
  return row;
}

function mountSettingsPanel(state) {
  const host = dom.settingsPanel;
  if (!host) return;

  host.replaceChildren();
  controlRefs = new Map();

  for (const section of SETTING_SECTIONS) {
    const sectionNode = el("section", "settings-section");
    const heading = el("p", "settings-section__heading eyebrow");
    setText(heading, section.label);
    sectionNode.appendChild(heading);

    for (const control of section.controls) {
      sectionNode.appendChild(
        control.type === "range" ? makeRange(control, state) : makeToggle(control, state),
      );
    }

    host.appendChild(sectionNode);
  }

  const footer = el("div", "settings-footer");
  const reset = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
  reset.type = "button";
  reset.dataset.settingsReset = "true";
  setText(reset, "Reset Settings");
  footer.appendChild(reset);
  host.appendChild(footer);

  host.addEventListener("input", handleSettingsInput);
  host.addEventListener("change", handleSettingsInput);
  host.addEventListener("click", handleSettingsClick);
  mounted = true;
}

function setSetting(key, value) {
  if (!stateRef || !(key in DEFAULT_SETTINGS)) return;

  stateRef.settings = normalizeSettings({ ...stateRef.settings, [key]: value });
  applySettingClasses(stateRef.settings);
  saveSettings(stateRef.settings);
  renderSettingsControls(stateRef);
  markUiDirty();
}

function handleSettingsInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.dataset.setting) return;

  const ref = controlRefs.get(target.dataset.setting);
  if (!ref) return;
  const value = ref.control.type === "range" ? Number(target.value) : target.checked;
  setSetting(target.dataset.setting, value);
}

function handleSettingsClick(event) {
  const target = event.target.closest("[data-settings-reset]");
  if (!target || !stateRef) return;

  stateRef.settings = { ...DEFAULT_SETTINGS };
  applySettingClasses(stateRef.settings);
  saveSettings(stateRef.settings);
  renderSettingsControls(stateRef);
  markUiDirty();
}

export function renderSettingsControls(state) {
  if (!mounted) mountSettingsPanel(state);

  for (const [key, ref] of controlRefs) {
    const value = state.settings[key];
    if (ref.control.type === "range") ref.input.value = value;
    else ref.input.checked = Boolean(value);
    setText(ref.value, valueLabel(ref.control, value));
    setClass(ref.value, "settings-value--muted", ref.control.type !== "range" && !value);
  }
}

export function bindSettingsPanel(state) {
  stateRef = state;
  applySettingsToDocument(state);
  renderSettingsControls(state);
}
