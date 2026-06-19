import { GROWTH_MILESTONES, growthLabel } from "../data/growth.js";
import { OBJECTIVES } from "../data/objectives.js";
import { SIM } from "../data/tuning.js";
import { isObjectOperational } from "../sim/park.js";
import { starString } from "../sim/rating.js";

function operationalObjects(state) {
  return [...state.objects.values()].filter(
    (object) => object.category === "ride" || object.category === "facility" || object.category === "service",
  );
}

function guestCapacity(state, rideCount, sceneryScore) {
  return Math.round(
    Math.max(
      SIM.GUEST_CAP_RANGE[0],
      Math.min(
        SIM.GUEST_CAP_RANGE[1],
        SIM.GUEST_CAP_BASE +
          rideCount * SIM.GUEST_CAP_PER_RIDE +
          Math.floor(sceneryScore / 5) +
          Math.round(state.cleanliness * 0.08) +
          Math.round(state.averageHappiness * 0.06),
      ),
    ),
  );
}

export function getGuestActivityItems(state) {
  const hungry = state.guests.filter((guest) => guest.hunger >= 58).length;
  const delighted = state.guests.filter((guest) => guest.happiness >= 86).length;
  const queuing = state.guests.filter((guest) => guest.state === "queuing").length;
  const leaving = state.guests.filter((guest) => guest.state === "leaving").length;
  const wandering = state.guests.filter(
    (guest) => guest.state === "walking" || guest.state === "strolling",
  ).length;

  return [
    {
      label: "Exploring paths",
      value: wandering,
      tone: "good",
      detail: "Guests actively walking the park and reacting to your layout.",
    },
    {
      label: "Waiting in line",
      value: queuing,
      tone: queuing >= Math.max(6, state.guests.length * 0.3) ? "warn" : "good",
      detail: "High queue load means attractions are drawing well but may need overflow options.",
    },
    {
      label: "Feeling hungry",
      value: hungry,
      tone: hungry >= Math.max(5, state.guests.length * 0.25) ? "warn" : "good",
      detail: "Hungry guests lose patience faster. Food stalls help stabilize happiness.",
    },
    {
      label: "Leaving soon",
      value: leaving,
      tone: leaving >= 3 ? "warn" : "good",
      detail: delighted
        ? `${delighted} guests are currently delighted by scenery or rides.`
        : "Keep scenery and ride variety up to send guests home happy.",
    },
  ];
}

export function getGoalItems(state) {
  const nextMilestone = GROWTH_MILESTONES.find((m) => state.growthScore < m.score);
  const rideCount = [...state.objects.values()].filter((o) => o.category === "ride").length;
  const serviceCount = [...state.objects.values()].filter((o) => o.category === "service").length;
  const crowdedRide = [...state.objects.values()].find(
    (o) =>
      (o.category === "ride" || o.category === "facility") &&
      o.queue.length >= Math.ceil(o.stats.queueLimit * SIM.QUEUE_PRESSURE_RATIO),
  );
  const recommendedAction =
    state.cleanliness < 74
      ? "Add a care hub near your busiest branch."
      : crowdedRide
        ? `Branch paths near ${crowdedRide.label} or add a second marquee draw.`
        : rideCount < 3
          ? "Invest in another headline ride to lift attendance."
          : serviceCount < 1
            ? "Add service coverage before the park gets messy."
            : "Use scenery to lift happiness and keep guests circulating.";

  const items = [];

  const rating = state.parkRating ?? 0;
  items.push({
    key: "rating",
    label: "Park rating",
    chip: `${rating.toFixed(1)}★`,
    tone: "good",
    detail: `${starString(rating)} — blended from happiness, cleanliness, variety, and growth.`,
    current: true,
  });

  if (nextMilestone) {
    items.push({
      key: "next-tier",
      label: `Next tier: ${nextMilestone.label}`,
      chip: `${state.growthScore} / ${nextMilestone.score}`,
      tone: "good",
      detail: nextMilestone.detail,
      current: true,
    });
  } else {
    items.push({
      key: "top-tier",
      label: "Top tier reached",
      chip: growthLabel(state.growthScore),
      tone: "good",
      detail: "You are now tuning a destination park. Focus on polish, queue balance, and cleanliness.",
      current: true,
    });
  }

  items.push({
    key: "recommended",
    label: "Recommended next move",
    chip: state.cleanliness < 74 || crowdedRide ? "Needs attention" : "On track",
    tone: state.cleanliness < 74 || crowdedRide ? "warn" : "good",
    detail: recommendedAction,
  });

  items.push({
    key: "weekly",
    label: "Weekly operating result",
    chip: `${state.weeklyProfit >= 0 ? "+" : ""}$${Math.round(state.weeklyProfit)}`,
    tone: state.weeklyProfit < 0 ? "warn" : "good",
    detail: "Positive weekly cashflow lets you expand without stalling out on upkeep.",
  });

  // Campaign objectives — show the next few unfinished goals, then the rest.
  const completed = state.completedObjectives ?? new Set();
  const ordered = [...OBJECTIVES].sort((a, b) => Number(completed.has(a.id)) - Number(completed.has(b.id)));
  for (const objective of ordered) {
    const done = completed.has(objective.id);
    items.push({
      key: `obj-${objective.id}`,
      label: objective.label,
      chip: done ? "✓ Done" : `+$${objective.reward}`,
      tone: done ? "good" : "warn",
      detail: objective.detail,
      current: false,
    });
  }

  return items;
}

export function buildInsights(state) {
  const disconnected = [...state.objects.values()].filter(
    (o) => o.type !== "gate" && o.entry && !isObjectOperational(state, o),
  );
  const crowded = [...state.objects.values()].filter(
    (o) =>
      (o.category === "ride" || o.category === "facility") &&
      o.queue.length >= Math.ceil(o.stats.queueLimit * SIM.QUEUE_PRESSURE_RATIO),
  );
  const insights = [];

  if (state.money < 0) {
    insights.push({
      key: "in-the-red",
      tone: "warn",
      title: "Cash is in the red",
      detail: "Raise ticket prices, take a loan, or trim staff before an emergency bailout kicks in.",
    });
  } else if (state.money < 250) {
    insights.push({
      key: "low-cash",
      tone: "warn",
      title: "Cash is running thin",
      detail: "Slow expansion for a moment or add another revenue attraction before upkeep bites.",
    });
  } else if ((state.debt ?? 0) > 0) {
    insights.push({
      key: "debt",
      tone: "warn",
      title: `Carrying $${Math.round(state.debt)} of debt`,
      detail: "Interest compounds weekly — repay from the Finance tab once cash is comfortable.",
    });
  }

  if (state.cleanliness < 70) {
    insights.push({
      key: "clean",
      tone: "warn",
      title: "Cleanliness is slipping",
      detail: "Add a care hub near the busiest branch or reduce guest density with alternate routes.",
    });
  }

  // Surface the single most pressing unmet guest need so the player knows which
  // amenity to build next.
  if (state.guests.length >= 5) {
    const avg = (key, fallback = 0) =>
      state.guests.reduce((sum, g) => sum + (g[key] ?? fallback), 0) / state.guests.length;
    const needSignals = [
      { key: "relief", value: avg("relief"), threshold: 74, title: "Guests need restrooms", detail: "Relief is running high — add a Restroom so guests stay comfortable." },
      { key: "thirst", value: avg("thirst"), threshold: 72, title: "Guests are thirsty", detail: "Add a Drink Kiosk near the busy paths to quench thirst." },
      { key: "hunger", value: avg("hunger"), threshold: 74, title: "Guests are hungry", detail: "Open another Food Stall so queues for food stay short." },
      { key: "tired", value: 100 - avg("energy", 100), threshold: 74, title: "Guests are worn out", detail: "Place Benches so tired guests can rest and stay longer." },
    ];
    const pressing = needSignals.filter((n) => n.value >= n.threshold).sort((a, b) => b.value - a.value)[0];
    if (pressing) {
      insights.push({ key: `need-${pressing.key}`, tone: "warn", title: pressing.title, detail: pressing.detail });
    }
  }

  if (crowded.length) {
    insights.push({
      key: `crowd-${crowded[0].id}`,
      tone: "warn",
      title: `${crowded[0].label} is congested`,
      detail: "High queues are lowering patience. Add nearby alternatives or branch the pathing.",
    });
  }

  if (disconnected.length) {
    insights.push({
      key: `disc-${disconnected[0].id}`,
      tone: "warn",
      title: "An attraction is disconnected",
      detail: `${disconnected[0].label} has a path beside it, but guests still cannot reach that route from the gate.`,
    });
  }

  if (!insights.length) {
    insights.push({
      key: "stable",
      tone: "good",
      title: "Operations are stable",
      detail: "Guest flow, coverage, and attraction demand are currently in a healthy range.",
    });
  }

  insights.push({
    key: `week-${state.day}`,
    tone: "good",
    title: `Week ${state.day} outlook`,
    detail: `${growthLabel(state.growthScore)} park with ${state.guests.length} guests on site and ${state.guestsServed} completed experiences.`,
  });

  return insights.slice(0, 4);
}

export function getOperationsSummary(state) {
  const objects = [...state.objects.values()];
  const rides = objects.filter((object) => object.category === "ride");
  const facilities = objects.filter((object) => object.category === "facility");
  const services = objects.filter((object) => object.category === "service");
  const operatingObjects = operationalObjects(state);
  const offline = operatingObjects.filter((object) => !isObjectOperational(state, object));
  const queueObjects = objects.filter(
    (object) => object.category === "ride" || object.category === "facility",
  );
  const queuedGuests = queueObjects.reduce((sum, object) => sum + object.queue.length, 0);
  const queueLimit = queueObjects.reduce((sum, object) => sum + (object.stats.queueLimit ?? 0), 0);
  const cycleCapacity = queueObjects.reduce((sum, object) => sum + (object.stats.capacity ?? 0), 0);
  const sceneryScore = objects.reduce((sum, object) => sum + (object.stats.scenery ?? 0), 0);
  const litter = state.tiles.flat().reduce((sum, tile) => sum + tile.litter, 0);
  const netResult = state.totalRevenue - state.totalUpkeep;
  const capacity = guestCapacity(state, rides.length, sceneryScore);

  return {
    netResult,
    queueLoad: queueLimit ? queuedGuests / queueLimit : 0,
    guestLoad: capacity ? state.guests.length / capacity : 0,
    queuedGuests,
    queueLimit,
    cycleCapacity,
    capacity,
    rideCount: rides.length,
    facilityCount: facilities.length,
    serviceCount: services.length,
    offlineCount: offline.length,
    pathCount: state.pathTiles.length,
    sceneryScore,
    litter,
  };
}

export function getOperationsItems(state) {
  const summary = getOperationsSummary(state);
  const activeServices = summary.serviceCount - summary.offlineCount;
  const queuePercent = Math.round(summary.queueLoad * 100);
  const netPrefix = summary.netResult >= 0 ? "+" : "";

  return [
    {
      key: "finance",
      label: "Net operations",
      chip: `${netPrefix}$${Math.round(summary.netResult)}`,
      tone: summary.netResult < 0 ? "warn" : "good",
      value: Math.min(1, Math.max(0, (summary.netResult + 300) / 1200)),
      detail: `Revenue $${Math.round(state.totalRevenue)} against $${Math.round(state.totalUpkeep)} upkeep.`,
    },
    {
      key: "capacity",
      label: "Guest load",
      chip: `${state.guests.length} / ${summary.capacity}`,
      tone: summary.guestLoad > 0.85 ? "warn" : "good",
      value: Math.min(1, summary.guestLoad),
      detail: `${summary.rideCount} rides, ${summary.facilityCount} food stops, ${summary.cycleCapacity} seats per dispatch.`,
    },
    {
      key: "queues",
      label: "Queue pressure",
      chip: `${queuePercent}%`,
      tone: summary.queueLoad > SIM.QUEUE_PRESSURE_RATIO ? "warn" : "good",
      value: Math.min(1, summary.queueLoad),
      detail: `${summary.queuedGuests} guests waiting across ${summary.queueLimit || 0} available queue slots.`,
    },
    {
      key: "coverage",
      label: "Service coverage",
      chip: `${activeServices} / ${summary.serviceCount}`,
      tone: state.cleanliness < 74 || summary.offlineCount > 0 ? "warn" : "good",
      value: state.cleanliness / 100,
      detail: `${state.cleanliness}% clean with ${summary.litter} litter piles and ${summary.pathCount} path tiles.`,
    },
    {
      key: "appeal",
      label: "Park appeal",
      chip: growthLabel(state.growthScore),
      tone: state.averageHappiness < 68 ? "warn" : "good",
      value: Math.min(1, state.growthScore / 520),
      detail: `${summary.sceneryScore} scenery value, ${state.averageHappiness}% happiness, ${state.guestsServed} served.`,
    },
  ];
}
