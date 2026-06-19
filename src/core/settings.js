export const DEFAULT_SETTINGS = {
  showMinimap: true,
  showFloatingHud: true,
  showHoverCard: true,
  showRideLabels: true,
  showBuildPreview: true,
  focusActiveArea: true,
  dayNightCycle: true,
  sound: true,
  autoSave: true,
  darkMode: false,
  reducedMotion: false,
  uiScale: 100,
  startPaused: false,
};

const STORAGE_KEY = "wonderloop-settings-v1";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSettings(input = {}) {
  const settings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (typeof DEFAULT_SETTINGS[key] === "boolean") {
      settings[key] = typeof input[key] === "boolean" ? input[key] : DEFAULT_SETTINGS[key];
    }
  }

  const uiScale = Number(input.uiScale);
  settings.uiScale = Number.isFinite(uiScale)
    ? clamp(Math.round(uiScale / 5) * 5, 90, 110)
    : DEFAULT_SETTINGS.uiScale;

  return settings;
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Settings still work for the current session when storage is unavailable.
  }
}
