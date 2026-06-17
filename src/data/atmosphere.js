// Atmosphere tuning — the living-world layer that gives the park a sense of
// time passing. A full day cycles every DAY_LENGTH_S real seconds (scaled by
// timeScale through the sim delta). Weather rotates on its own slower clock.
//
// All numbers here are deliberately gentle: time-of-day and weather should add
// texture and rhythm, never punish the player or make the park feel broken.

export const ATMOSPHERE = {
  DAY_LENGTH_S: 96, // one full dawn→day→dusk→night loop
  WEATHER_MIN_S: 38,
  WEATHER_MAX_S: 74,
};

// Phases are derived from timeOfDay in [0, 1). Each entry owns a slice of the
// day and carries a sky tint (used by the canvas backdrop + night overlay) and
// a spawn multiplier — guests arrive in waves, busiest at midday.
export const DAY_PHASES = [
  { id: "dawn", label: "Dawn", from: 0.0, icon: "🌅", spawn: 0.85, overlay: "rgba(255, 184, 120, 0.10)" },
  { id: "day", label: "Daytime", from: 0.18, icon: "☀️", spawn: 1.15, overlay: "rgba(255, 255, 255, 0.0)" },
  { id: "dusk", label: "Dusk", from: 0.62, icon: "🌇", spawn: 0.95, overlay: "rgba(255, 132, 88, 0.18)" },
  { id: "night", label: "Night", from: 0.78, icon: "🌙", spawn: 0.55, overlay: "rgba(16, 26, 64, 0.44)" },
];

// Weather types with their gameplay + visual modifiers.
//   spawn      — multiplies guest arrival rate
//   happyDrift — per-second happiness nudge applied to every guest
//   foodPull   — extra weight toward food when warm/sunny (appetite)
export const WEATHER_TYPES = {
  sunny: {
    id: "sunny",
    label: "Sunny",
    icon: "☀️",
    spawn: 1.12,
    happyDrift: 0.05,
    foodPull: 6,
    weight: 5,
    tint: "rgba(255, 244, 209, 0.0)",
  },
  cloudy: {
    id: "cloudy",
    label: "Cloudy",
    icon: "⛅",
    spawn: 1.0,
    happyDrift: 0,
    foodPull: 0,
    weight: 4,
    tint: "rgba(150, 165, 180, 0.10)",
  },
  overcast: {
    id: "overcast",
    label: "Overcast",
    icon: "☁️",
    spawn: 0.9,
    happyDrift: -0.02,
    foodPull: 0,
    weight: 2,
    tint: "rgba(120, 134, 150, 0.16)",
  },
  rain: {
    id: "rain",
    label: "Rain",
    icon: "🌧️",
    spawn: 0.66,
    happyDrift: -0.08,
    foodPull: 0,
    weight: 2,
    tint: "rgba(90, 110, 140, 0.24)",
  },
};

export const WEATHER_ORDER = ["sunny", "cloudy", "overcast", "rain"];

// Seasons rotate over several in-game weeks, layered on top of the daily cycle.
// Summer packs the park; winter quiets it. Each adds a faint colour wash.
export const SEASONS = [
  { id: "spring", label: "Spring", icon: "🌸", spawn: 1.06, tint: "rgba(255, 212, 224, 0.06)" },
  { id: "summer", label: "Summer", icon: "☀️", spawn: 1.2, tint: "rgba(255, 236, 170, 0.05)" },
  { id: "autumn", label: "Autumn", icon: "🍂", spawn: 1.0, tint: "rgba(212, 150, 90, 0.09)" },
  { id: "winter", label: "Winter", icon: "❄️", spawn: 0.8, tint: "rgba(150, 180, 210, 0.13)" },
];

export const SEASON_LENGTH_WEEKS = 3;

export function seasonForDay(day) {
  return Math.floor((Math.max(1, day) - 1) / SEASON_LENGTH_WEEKS) % SEASONS.length;
}

export function phaseForTimeOfDay(timeOfDay) {
  let current = DAY_PHASES[0];
  for (const phase of DAY_PHASES) {
    if (timeOfDay >= phase.from) current = phase;
  }
  return current;
}
