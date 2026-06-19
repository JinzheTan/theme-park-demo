import { ECONOMY, SIM, GUEST } from "../data/tuning.js";
import { clamp } from "../util/math.js";
import { getTile } from "../util/grid.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { isObjectOperational } from "./park.js";
import { setThought } from "./guests.js";
import { wearRide } from "./breakdown.js";
import { effectiveTicket } from "./finance.js";
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
      const restore = object.stats.restore ?? 0;
      switch (object.stats.serves) {
        case "thirst":
          guest.thirst = clamp((guest.thirst ?? 0) - restore, 0, 100);
          setThought(guest, "drank", object.label, { force: true });
          break;
        case "relief":
          guest.relief = 0;
          setThought(guest, "relieved", object.label, { force: true });
          break;
        case "energy":
          guest.energy = clamp((guest.energy ?? 100) + restore, 0, 100);
          setThought(guest, "rested", object.label, { force: true });
          break;
        default:
          guest.hunger = clamp(guest.hunger - restore, 0, 100);
          setThought(guest, "ate", object.label, { force: true });
          break;
      }
      guest.happiness = clamp(guest.happiness + GUEST.FACILITY_POST_HAPPY_BOOST, 0, 100);
    } else {
      guest.hunger = clamp(guest.hunger + GUEST.POST_RIDE_HUNGER_TICK, 0, 100);
      guest.energy = clamp((guest.energy ?? 100) - 6, 0, 100);
      setThought(guest, object.stats.excitement >= 18 ? "rideLoved" : "rideOkay", object.label, { force: true });
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

    if (object.category === "ride") {
      wearRide(state, object, deltaTime);
      if (object.broken) {
        if (object.queue.length) {
          for (const id of object.queue) {
            const guest = state.guests.find((g) => g.id === id);
            if (guest) {
              guest.waitingAt = null;
              guest.state = "thinking";
            }
          }
          object.queue = [];
        }
        continue;
      }
    }

    if (object.riders.length > 0) {
      object.cycleRemaining -= deltaTime;
      if (object.cycleRemaining <= 0) finishRideCycle(state, object);
      continue;
    }

    if (object.queue.length > 0) {
      const boarded = object.queue.splice(0, object.stats.capacity);
      object.riders = boarded;
      object.cycleRemaining = object.stats.cycle;

      const revenue = boarded.length * effectiveTicket(state, object);
      state.money += revenue;
      state.totalRevenue += revenue;
      playSfx("dispatch");

      for (const guestId of boarded) {
        const guest = state.guests.find((entry) => entry.id === guestId);
        if (!guest) continue;
        guest.state = "riding";
        // Only rides advance the "had enough fun, time to leave" counter, so
        // guests still pause for food/drink/restroom/rest without rushing out.
        if (object.category === "ride") guest.activities += 1;
      }

      // Rides announce dispatches; quiet free amenities (benches, restrooms)
      // don't clutter the feed.
      if (object.category === "ride") {
        addEvent(state, "Ride dispatch", `${object.label} sent off ${boarded.length} guests.`);
      }
    }
  }
}
