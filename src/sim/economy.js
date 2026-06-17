import { ECONOMY, SIM } from "../data/tuning.js";
import { GROWTH_MILESTONES } from "../data/growth.js";
import { clamp } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { isObjectOperational } from "./park.js";
import { createGuest } from "./guests.js";
import { addEvent } from "./events.js";
import { getAtmosphereModifiers } from "./atmosphere.js";
import { accrueWeeklyInterest, updateFinanceSafety } from "./finance.js";
import { marketingSpawnBoost } from "./shows.js";
import { computeParkRating } from "./rating.js";

export function updateEconomy(state, deltaTime) {
  state.dayClock += deltaTime;

  if (state.dayClock >= ECONOMY.WEEK_LENGTH_S) {
    state.dayClock -= ECONOMY.WEEK_LENGTH_S;
    const weeklyBonus = Math.round(
      Math.max(0, state.growthScore * 0.18 + state.averageHappiness * 1.5 + state.cleanliness),
    );
    // True weekly operating result = ride/food income minus upkeep accrued this
    // week, plus the performance dividend. Marks track the running totals so we
    // only count the most recent week.
    const weekRevenue = state.totalRevenue - state.weekRevenueMark;
    const weekUpkeep = state.totalUpkeep - state.weekUpkeepMark;
    state.weekRevenueMark = state.totalRevenue;
    state.weekUpkeepMark = state.totalUpkeep;
    state.money += weeklyBonus;
    state.weeklyProfit = Math.round(weekRevenue - weekUpkeep + weeklyBonus);
    accrueWeeklyInterest(state);
    state.day += 1;
    addEvent(
      state,
      "Weekly report",
      `Week ${state.day}: $${Math.round(weekRevenue - weekUpkeep)} operating result plus a $${weeklyBonus} growth dividend.`,
    );
  }

  const atmosphere = getAtmosphereModifiers(state);
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
    // A park entry fee is collected per arrival, but a steep gate price also
    // turns some would-be visitors away (longer spawn gap).
    const fee = state.entryFee ?? 0;
    if (fee > 0) {
      state.money += fee;
      state.totalRevenue += fee;
    }
    const feeDamp = Math.max(0.45, 1 - fee / 60);
    const baseDelay = clamp(
      SIM.SPAWN_BASE_DELAY -
        rideCount * 0.32 -
        sceneryScore * 0.01 +
        Math.max(0, 58 - state.cleanliness) * 0.015,
      SIM.SPAWN_TIMER_RANGE[0],
      SIM.SPAWN_TIMER_RANGE[1],
    );
    // Busier phases / fair weather / marketing shorten the gap between
    // arrivals; quiet nights, rain, and high gate prices stretch it out.
    state.guestSpawnTimer = clamp(
      baseDelay / Math.max(0.4, atmosphere.spawn * feeDamp * marketingSpawnBoost(state)),
      SIM.SPAWN_TIMER_RANGE[0] * 0.6,
      SIM.SPAWN_TIMER_RANGE[1] * 1.8,
    );
    markUiDirty();
  }

  if (state.guests.length > state.peakGuests) state.peakGuests = state.guests.length;

  updateFinanceSafety(state, deltaTime);
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

  state.parkRating = computeParkRating(state);
}

export function maybeAwardGrowthMilestones(state) {
  for (const milestone of GROWTH_MILESTONES) {
    if (state.growthScore < milestone.score || state.claimedMilestones.has(milestone.id)) continue;

    state.claimedMilestones.add(milestone.id);
    state.money += milestone.reward;
    playSfx("milestone");
    state.pendingToasts.push({
      kind: "milestone",
      icon: "🏆",
      title: `${milestone.label} tier reached`,
      detail: `+$${milestone.reward} expansion grant from investors.`,
    });
    addEvent(
      state,
      "Growth milestone",
      `${milestone.label} status reached. Investors kicked in $${milestone.reward} for the next expansion.`,
    );
    markUiDirty();
  }
}
