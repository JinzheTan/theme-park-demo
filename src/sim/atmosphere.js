import { ATMOSPHERE, WEATHER_TYPES, WEATHER_ORDER, SEASONS, phaseForTimeOfDay, seasonForDay } from "../data/atmosphere.js";
import { rand } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { addEvent } from "./events.js";

const NEUTRAL = {
  spawn: 1,
  happyDrift: 0,
  foodPull: 0,
  phase: phaseForTimeOfDay(0.32),
  weather: WEATHER_TYPES.sunny,
  season: SEASONS[0],
  active: false,
};

function pickWeather(excludeId) {
  const pool = WEATHER_ORDER.map((id) => WEATHER_TYPES[id]).filter((w) => w.id !== excludeId);
  const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
  let roll = rand(0, totalWeight);
  for (const weather of pool) {
    roll -= weather.weight;
    if (roll <= 0) return weather.id;
  }
  return pool[pool.length - 1].id;
}

export function updateAtmosphere(state, deltaTime) {
  if (state.settings?.dayNightCycle === false) return;

  const season = seasonForDay(state.day);
  if (season !== state.season) {
    state.season = season;
    const info = SEASONS[season];
    addEvent(state, "Season change", `${info.icon} ${info.label} settles over Wonderloop Park.`);
    markUiDirty();
  }

  state.timeOfDay = (state.timeOfDay + deltaTime / ATMOSPHERE.DAY_LENGTH_S) % 1;

  state.weatherTimer -= deltaTime;
  if (state.weatherTimer <= 0) {
    const previous = state.weather;
    state.weather = pickWeather(previous);
    state.weatherTimer = rand(ATMOSPHERE.WEATHER_MIN_S, ATMOSPHERE.WEATHER_MAX_S);
    if (state.weather !== previous) {
      const weather = WEATHER_TYPES[state.weather];
      addEvent(state, "Weather shift", `${weather.icon} ${weather.label} rolls over Wonderloop Park.`);
      markUiDirty();
    }
  }
}

// Single source of truth for how time + weather bend the sim. Returns neutral
// values when the player has switched the living-world layer off.
export function getAtmosphereModifiers(state) {
  if (state.settings?.dayNightCycle === false) return NEUTRAL;
  const phase = phaseForTimeOfDay(state.timeOfDay);
  const weather = WEATHER_TYPES[state.weather] ?? WEATHER_TYPES.sunny;
  const season = SEASONS[state.season] ?? SEASONS[0];
  return {
    spawn: phase.spawn * weather.spawn * season.spawn,
    happyDrift: weather.happyDrift,
    foodPull: weather.foodPull,
    phase,
    weather,
    season,
    active: true,
  };
}
