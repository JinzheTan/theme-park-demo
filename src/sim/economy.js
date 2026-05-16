import { ECONOMY, SIM } from "../data/tuning.js";
import { GROWTH_MILESTONES } from "../data/growth.js";
import { clamp } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { isObjectOperational } from "./park.js";
import { createGuest } from "./guests.js";
import { addEvent } from "./events.js";

export function updateEconomy(state, deltaTime) {
  state.dayClock += deltaTime;

  if (state.dayClock >= ECONOMY.WEEK_LENGTH_S) {
    state.dayClock -= ECONOMY.WEEK_LENGTH_S;
    const weeklyBonus = Math.round(
      Math.max(0, state.growthScore * 0.18 + state.averageHappiness * 1.5 + state.cleanliness),
    );
    state.money += weeklyBonus;
    state.weeklyProfit = weeklyBonus;
    state.day += 1;
    addEvent(
      state,
      "Weekly report",
      `Week ${state.day} started with a $${weeklyBonus} growth dividend from park performance.`,
    );
  }

  state.guestSpawnTimer -= deltaTime;
  const rideCount = [...state.objects.values()].filter((object) => object.category === "ride").length;
  const sceneryScore = [...state.objects.values()].reduce(
    (sum, object) => sum + (object.stats.scenery ?? 0),
    0,
  );
  const cap = clamp(
    SIM.GUEST_CAP_BASE +
      rideCount * SIM.GUEST_CAP_PER_RIDE +
      Math.floor(sceneryScore / 5) +
      Math.round(state.cleanliness * 0.08) +
      Math.round(state.averageHappiness * 0.06),
    SIM.GUEST_CAP_RANGE[0],
    SIM.GUEST_CAP_RANGE[1],
  );

  if (state.guestSpawnTimer <= 0 && state.guests.length < cap) {
    createGuest(state);
    state.guestSpawnTimer = clamp(
      SIM.SPAWN_BASE_DELAY -
        rideCount * 0.32 -
        sceneryScore * 0.01 +
        Math.max(0, 58 - state.cleanliness) * 0.015,
      SIM.SPAWN_TIMER_RANGE[0],
      SIM.SPAWN_TIMER_RANGE[1],
    );
    markUiDirty();
  }
}

export function computeParkMetrics(state) {
  const totalLitter = state.tiles.flat().reduce((sum, tile) => sum + tile.litter, 0);
  const serviceCount = [...state.objects.values()].filter(
    (object) => object.category === "service" && isObjectOperational(state, object),
  ).length;
  const sceneryScore = [...state.objects.values()].reduce(
    (sum, object) => sum + (object.stats.scenery ?? 0),
    0,
  );
  const rideCount = [...state.objects.values()].filter((object) => object.category === "ride").length;

  state.averageHappiness = state.guests.length
    ? Math.round(state.guests.reduce((sum, guest) => sum + guest.happiness, 0) / state.guests.length)
    : 84;

  state.cleanliness = Math.round(
    clamp(100 - totalLitter * 3.2 + serviceCount * 12 + sceneryScore * 0.14, 8, 100),
  );

  state.growthScore = Math.round(
    clamp(
      rideCount * 28 +
        sceneryScore * 1.9 +
        state.guestsServed * 0.9 +
        state.averageHappiness * 1.3 +
        state.cleanliness * 0.8,
      0,
      999,
    ),
  );
}

export function maybeAwardGrowthMilestones(state) {
  for (const milestone of GROWTH_MILESTONES) {
    if (state.growthScore < milestone.score || state.claimedMilestones.has(milestone.id)) continue;

    state.claimedMilestones.add(milestone.id);
    state.money += milestone.reward;
    addEvent(
      state,
      "Growth milestone",
      `${milestone.label} status reached. Investors kicked in $${milestone.reward} for the next expansion.`,
    );
    markUiDirty();
  }
}
