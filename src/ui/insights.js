import { GROWTH_MILESTONES, growthLabel } from "../data/growth.js";
import { SIM } from "../data/tuning.js";
import { isObjectOperational } from "../sim/park.js";

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

  if (state.money < 250) {
    insights.push({
      key: "low-cash",
      tone: "warn",
      title: "Cash is running thin",
      detail: "Slow expansion for a moment or add another revenue attraction before upkeep bites.",
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
