import { ATMOSPHERE, WEATHER_TYPES, WEATHER_ORDER, phaseForTimeOfDay } from "../data/atmosphere.js";
import { rand } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { addEvent } from "./events.js";

const NEUTRAL = {
  spawn: 1,
  happyDrift: 0,
  foodPull: 0,
  phase: phaseForTimeOfDay(0.32),
  weather: WEATHER_TYPES.sunny,
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
  return {
    spawn: phase.spawn * weather.spawn,
    happyDrift: weather.happyDrift,
    foodPull: weather.foodPull,
    phase,
    weather,
    active: true,
  };
}
