import { ACHIEVEMENTS } from "../data/achievements.js";
import { saveUnlockedAchievements } from "../core/progress-store.js";
import { playSfx } from "../core/audio.js";
import { markUiDirty } from "../core/state.js";
import { addEvent } from "./events.js";

function buildContext(state) {
  const objects = [...state.objects.values()];
  const types = new Set(objects.map((object) => object.type));
  const sceneryScore = objects.reduce((sum, object) => sum + (object.stats.scenery ?? 0), 0);

  return {
    placedByPlayer: state.placedByPlayer,
    guestsInside: state.guests.length,
    guestsServed: state.guestsServed,
    money: state.money,
    cleanliness: state.cleanliness,
    averageHappiness: state.averageHappiness,
    growthScore: state.growthScore,
    sceneryScore,
    weather: state.weather,
    season: state.season ?? 0,
    showsLaunched: state.showsLaunched ?? 0,
    day: state.day,
    hasType: (type) => types.has(type),
  };
}

export function evaluateAchievements(state) {
  const unlocked = state.unlockedAchievements;
  const context = buildContext(state);
  let changed = false;

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue;
    let passed = false;
    try {
      passed = achievement.test(context);
    } catch {
      passed = false;
    }
    if (!passed) continue;

    unlocked.add(achievement.id);
    state.pendingToasts.push({
      kind: "award",
      icon: achievement.icon,
      title: achievement.label,
      detail: achievement.detail,
    });
    addEvent(state, "Achievement unlocked", `${achievement.icon} ${achievement.label} — ${achievement.detail}`);
    playSfx("achievement");
    changed = true;
  }

  if (changed) {
    saveUnlockedAchievements(unlocked);
    markUiDirty();
  }
}
