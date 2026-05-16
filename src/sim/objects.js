import { ECONOMY, SIM, GUEST } from "../data/tuning.js";
import { clamp } from "../util/math.js";
import { getTile } from "../util/grid.js";
import { markUiDirty } from "../core/state.js";
import { isObjectOperational } from "./park.js";
import { addEvent } from "./events.js";

export function cleanAround(state, object) {
  let cleaned = 0;
  for (let y = object.y - object.stats.cleanRadius; y <= object.y + object.stats.cleanRadius; y += 1) {
    for (let x = object.x - object.stats.cleanRadius; x <= object.x + object.stats.cleanRadius; x += 1) {
      const tile = getTile(state, x, y);
      if (!tile || tile.litter <= 0) continue;
      cleaned += tile.litter;
      tile.litter = 0;
    }
  }
  if (cleaned > 0) {
    addEvent(state, "Crew sweep", `${object.label} cleared ${cleaned} litter piles nearby.`);
    markUiDirty();
  }
}

export function finishRideCycle(state, object) {
  const entry = object.entry;
  const guests = object.riders
    .map((guestId) => state.guests.find((entryGuest) => entryGuest.id === guestId))
    .filter(Boolean);

  for (const guest of guests) {
    guest.state = "thinking";
    guest.waitingAt = null;
    guest.targetId = null;
    guest.x = entry.x;
    guest.y = entry.y;
    guest.route = [];
    guest.happiness = clamp(
      guest.happiness + object.stats.excitement - Math.max(0, guest.hunger - 70) * 0.08,
      0,
      100,
    );
    guest.patience = clamp(guest.patience + GUEST.POST_RIDE_PATIENCE_BOOST, 0, 100);
    if (object.category === "facility") {
      guest.hunger = clamp(guest.hunger - object.stats.hungerRestore, 0, 100);
      guest.happiness = clamp(guest.happiness + GUEST.FACILITY_POST_HAPPY_BOOST, 0, 100);
    } else {
      guest.hunger = clamp(guest.hunger + GUEST.POST_RIDE_HUNGER_TICK, 0, 100);
    }
    state.guestsServed += 1;
  }

  object.riders = [];
  object.cycleRemaining = 0;
}

export function updateObjects(state, deltaTime) {
  for (const object of state.objects.values()) {
    if (object.type === "gate") continue;

    object.sparkle += deltaTime * 0.75;
    object.upkeepClock += deltaTime;

    if (object.upkeepClock >= ECONOMY.UPKEEP_INTERVAL_S) {
      object.upkeepClock -= ECONOMY.UPKEEP_INTERVAL_S;
      const upkeep = object.stats.upkeep ?? 0;
      state.money -= upkeep;
      state.totalUpkeep += upkeep;
    }

    if (object.category === "service") {
      if (!isObjectOperational(state, object)) {
        object.cycleRemaining = 0;
        continue;
      }
      object.cycleRemaining -= deltaTime;
      if (object.cycleRemaining <= 0) {
        cleanAround(state, object);
        object.cycleRemaining = SIM.SERVICE_CYCLE_S;
      }
      continue;
    }

    if (!isObjectOperational(state, object)) continue;

    if (object.riders.length > 0) {
      object.cycleRemaining -= deltaTime;
      if (object.cycleRemaining <= 0) finishRideCycle(state, object);
      continue;
    }

    if (object.queue.length > 0) {
      const boarded = object.queue.splice(0, object.stats.capacity);
      object.riders = boarded;
      object.cycleRemaining = object.stats.cycle;

      const revenue = boarded.length * object.stats.ticket;
      state.money += revenue;
      state.totalRevenue += revenue;

      for (const guestId of boarded) {
        const guest = state.guests.find((entry) => entry.id === guestId);
        if (!guest) continue;
        guest.state = "riding";
        guest.activities += 1;
      }

      addEvent(state, "Ride dispatch", `${object.label} sent off ${boarded.length} guests.`);
    }
  }
}
