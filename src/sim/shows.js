// Fireworks shows — a spend-to-delight event. Launching one costs cash, paints
// the sky with bursts, and lifts every guest's mood over the run, with a bigger
// payoff after dark. Bursts keep animating until they fade even after the show
// window closes.

import { rand, sample, clamp } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { phaseForTimeOfDay } from "../data/atmosphere.js";
import { addEvent } from "./events.js";

export const FIREWORKS_COST = 220;
export const MARKETING_COST = 180;
export const MARKETING_SPAWN_BOOST = 1.7;
const MARKETING_DURATION_S = 36;
const SHOW_DURATION_S = 6.5;
const HAPPY_BOOST_PER_S = 4.2;
const BURST_COLORS = ["#ffd76a", "#ff8a7a", "#8fd8e2", "#f4a1f0", "#8fd7aa", "#fff1d0"];

export function canStartMarketing(state) {
  return !state.marketing.active && state.money >= MARKETING_COST;
}

export function startMarketing(state) {
  if (!canStartMarketing(state)) return false;
  state.money -= MARKETING_COST;
  state.marketing.active = true;
  state.marketing.timer = MARKETING_DURATION_S;
  playSfx("cash");
  state.pendingToasts.push({
    kind: "milestone",
    icon: "📣",
    title: "Marketing blitz",
    detail: "Word is out — extra guests are streaming toward the gate.",
  });
  addEvent(state, "Marketing", "A marketing campaign launched and attendance is climbing.");
  markUiDirty();
  return true;
}

// Spawn multiplier from an active marketing campaign (1 when idle).
export function marketingSpawnBoost(state) {
  return state.marketing?.active ? MARKETING_SPAWN_BOOST : 1;
}

export function canLaunchFireworks(state) {
  return !state.show.active && state.money >= FIREWORKS_COST;
}

export function launchFireworks(state) {
  if (!canLaunchFireworks(state)) return false;
  state.money -= FIREWORKS_COST;
  state.show.active = true;
  state.show.timer = SHOW_DURATION_S;
  state.show.burstClock = 0;
  state.showsLaunched = (state.showsLaunched ?? 0) + 1;
  playSfx("milestone");
  state.pendingToasts.push({
    kind: "milestone",
    icon: "🎆",
    title: "Fireworks show!",
    detail: "Guests are gathering and the whole park lights up.",
  });
  addEvent(state, "Fireworks", "A dazzling fireworks show kicked off over Wonderloop Park.");
  markUiDirty();
  return true;
}

function spawnBurst(state) {
  state.fireworks.push({
    nx: rand(0.15, 0.85),
    ny: rand(0.08, 0.42),
    age: 0,
    life: rand(0.9, 1.5),
    color: sample(BURST_COLORS),
    sparks: Math.round(rand(11, 16)),
  });
}

export function updateShows(state, deltaTime) {
  if (state.marketing.active) {
    state.marketing.timer -= deltaTime;
    if (state.marketing.timer <= 0) {
      state.marketing.active = false;
      state.marketing.timer = 0;
      addEvent(state, "Campaign ended", "The marketing campaign wound down.");
      markUiDirty();
    }
  }

  // Age and retire existing bursts regardless of show state.
  if (state.fireworks.length) {
    for (const burst of state.fireworks) burst.age += deltaTime;
    state.fireworks = state.fireworks.filter((burst) => burst.age < burst.life);
  }

  if (!state.show.active) return;

  const night = phaseForTimeOfDay(state.timeOfDay).id;
  const nightBonus = night === "night" || night === "dusk" ? 1.4 : 1;

  state.show.timer -= deltaTime;
  state.show.burstClock -= deltaTime;
  if (state.show.burstClock <= 0) {
    spawnBurst(state);
    if (Math.random() < 0.4) spawnBurst(state);
    state.show.burstClock = rand(0.28, 0.6);
  }

  for (const guest of state.guests) {
    guest.happiness = clamp(guest.happiness + deltaTime * HAPPY_BOOST_PER_S * nightBonus, 0, 100);
  }

  if (state.show.timer <= 0) {
    state.show.active = false;
    state.show.timer = 0;
  }
}
