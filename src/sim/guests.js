import { SPAWN_TILE } from "../core/constants.js";
import { GUEST_COLORS } from "../data/objects.js";
import { GUEST } from "../data/tuning.js";
import { GUEST_FIRST_NAMES, GUEST_LAST_INITIALS, pickThought } from "../data/guest-flavor.js";
import { clamp, rand, sample, manhattan } from "../util/math.js";
import { getTile } from "../util/grid.js";
import { markUiDirty } from "../core/state.js";
import { isObjectOperational } from "./park.js";
import { pathfind, randomWalkableTile } from "./pathfinding.js";
import { getAtmosphereModifiers } from "./atmosphere.js";
import { addEvent } from "./events.js";

// Give a guest a short-lived speech bubble. `force` lets high-priority moments
// (loved a ride, bailed a queue) override an ambient thought; otherwise a small
// cooldown keeps bubbles from spamming.
export function setThought(guest, key, label = "", { ttl = 3.4, force = false } = {}) {
  if (!guest) return;
  if (!force && (guest.thoughtCooldown > 0 || guest.thoughtTtl > 0)) return;
  const thought = pickThought(key, label);
  if (!thought) return;
  guest.thought = thought;
  guest.thoughtTtl = ttl;
  guest.thoughtCooldown = ttl + rand(2.5, 5.5);
}

export function createGuest(state) {
  const spawnTile = getTile(state, SPAWN_TILE.x, SPAWN_TILE.y);
  if (!spawnTile?.path) return;

  const guest = {
    id: state.nextGuestId++,
    x: SPAWN_TILE.x,
    y: SPAWN_TILE.y,
    state: "thinking",
    route: [],
    color: GUEST_COLORS[(state.nextGuestId - 2) % GUEST_COLORS.length],
    targetId: null,
    waitingAt: null,
    queueOffset: 0,
    happiness: clamp(rand(...GUEST.INITIAL_HAPPINESS), 0, 100),
    hunger: rand(...GUEST.INITIAL_HUNGER),
    thirst: rand(...GUEST.INITIAL_THIRST),
    relief: rand(...GUEST.INITIAL_RELIEF),
    energy: rand(...GUEST.INITIAL_ENERGY),
    patience: rand(...GUEST.INITIAL_PATIENCE),
    activities: 0,
    lingerClock: rand(...GUEST.INITIAL_LINGER),
    litterClock: rand(...GUEST.INITIAL_LITTER_CLOCK),
    speed: rand(...GUEST.SPEED_RANGE),
    name: `${sample(GUEST_FIRST_NAMES)} ${sample(GUEST_LAST_INITIALS)}.`,
    partySize: Math.random() < 0.45 ? 1 : Math.ceil(rand(2, 4)),
    spend: 0,
    thought: null,
    thoughtTtl: 0,
    thoughtCooldown: rand(1, 4),
  };

  state.guests.push(guest);
  state.totalGuestCount += 1;
}

export function binNear(state, x, y) {
  for (const object of state.objects.values()) {
    if (object.type !== "bin") continue;
    const radius = object.stats.binRadius ?? 2;
    if (Math.abs(object.x - x) <= radius && Math.abs(object.y - y) <= radius) return true;
  }
  return false;
}

export function scenicValueAt(state, x, y) {
  let score = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const tile = getTile(state, x + dx, y + dy);
      if (!tile?.objectId) continue;
      const object = state.objects.get(tile.objectId);
      if (!object) continue;
      score += (object.stats.scenery ?? 0) / (Math.abs(dx) + Math.abs(dy) + 1);
    }
  }
  return score;
}

export function chooseGuestDestination(state, guest) {
  const accessibleObjects = [...state.objects.values()].filter(
    (object) => object.type !== "gate" && isObjectOperational(state, object),
  );

  const rides = accessibleObjects.filter((object) => object.category === "ride");
  const facilities = accessibleObjects.filter((object) => object.category === "facility");
  const atmosphere = getAtmosphereModifiers(state);
  const foodPriorityThreshold = GUEST.HUNGER_TO_PRIORITIZE_FOOD - atmosphere.foodPull;

  if (
    guest.activities >= rand(...GUEST.ACTIVITIES_BEFORE_LEAVING) ||
    guest.happiness < GUEST.LEAVE_HAPPINESS_THRESHOLD
  ) {
    const routeHome = pathfind(state, { x: Math.round(guest.x), y: Math.round(guest.y) }, SPAWN_TILE);
    if (routeHome) {
      guest.route = routeHome;
      guest.state = "leaving";
      guest.targetId = null;
      setThought(guest, guest.happiness >= 55 ? "leavingHappy" : "leavingSad", "", { force: true });
      return;
    }
  }

  let target = null;

  // Needs come first: find the most pressing unmet need that an accessible
  // facility can actually serve, then head to the best one of that kind.
  const needs = [
    { serves: "relief", urgency: guest.relief ?? 0, threshold: GUEST.RELIEF_TO_PRIORITIZE },
    { serves: "thirst", urgency: guest.thirst ?? 0, threshold: GUEST.THIRST_TO_PRIORITIZE },
    { serves: "hunger", urgency: guest.hunger, threshold: foodPriorityThreshold },
    { serves: "energy", urgency: 100 - (guest.energy ?? 100), threshold: 100 - GUEST.ENERGY_LOW_PRIORITIZE },
  ];
  const pressing = needs
    .filter((need) => need.urgency >= need.threshold && facilities.some((f) => f.stats.serves === need.serves))
    .sort((a, b) => (b.urgency - b.threshold) - (a.urgency - a.threshold))[0];

  if (pressing) {
    const pull = pressing.serves === "hunger" ? atmosphere.foodPull : 0;
    target = facilities
      .filter((object) => object.stats.serves === pressing.serves)
      .map((object) => ({
        object,
        score: 30 + pull - object.queue.length * 4 - manhattan(object.entry, guest),
      }))
      .sort((a, b) => b.score - a.score)[0]?.object;
  }

  if (!target && rides.length) {
    target = rides
      .map((object) => ({
        object,
        score:
          object.stats.excitement +
          rand(-3, 6) -
          object.queue.length * 2.2 -
          manhattan(object.entry, guest) * 0.5,
      }))
      .sort((a, b) => b.score - a.score)[0]?.object;
  }

  if (target) {
    const route = pathfind(state, { x: Math.round(guest.x), y: Math.round(guest.y) }, target.entry);
    if (route) {
      guest.route = route;
      guest.state = "walking";
      guest.targetId = target.id;
      return;
    }
  }

  const strollTile = randomWalkableTile(state, { x: Math.round(guest.x), y: Math.round(guest.y) });
  if (strollTile) {
    const route = pathfind(state, { x: Math.round(guest.x), y: Math.round(guest.y) }, strollTile);
    if (route) {
      guest.route = route;
      guest.state = "strolling";
      guest.targetId = null;
      return;
    }
  }

  guest.state = "idle";
  guest.route = [];
  setThought(guest, "bored");
}

export function joinQueue(state, guest, object) {
  if (!object.entry) {
    guest.state = "thinking";
    guest.targetId = null;
    return;
  }
  if (object.queue.length >= object.stats.queueLimit) {
    guest.happiness = clamp(guest.happiness - GUEST.QUEUE_OVERFLOW_HAPPY_HIT, 0, 100);
    guest.patience = clamp(guest.patience - GUEST.QUEUE_OVERFLOW_PATIENCE_HIT, 0, 100);
    guest.state = "thinking";
    guest.targetId = null;
    setThought(guest, "queueLong", "", { force: true });
    addEvent(state, "Queue overflow", `${object.label} feels too crowded and guests are peeling away.`);
    return;
  }

  object.queue.push(guest.id);
  guest.waitingAt = object.id;
  guest.state = "queuing";
  guest.route = [];
}

export function leavePark(state, guest) {
  state.guests = state.guests.filter((entry) => entry.id !== guest.id);
  if (state.selectedGuestId === guest.id) {
    state.selectedGuestId = null;
    markUiDirty();
  }
}

export function updateGuests(state, deltaTime) {
  const atmosphere = getAtmosphereModifiers(state);
  for (const guest of [...state.guests]) {
    guest.hunger = clamp(guest.hunger + deltaTime * GUEST.HUNGER_RATE, 0, 100);
    guest.thirst = clamp((guest.thirst ?? 0) + deltaTime * GUEST.THIRST_RATE, 0, 100);
    guest.relief = clamp((guest.relief ?? 0) + deltaTime * GUEST.RELIEF_RATE, 0, 100);
    guest.energy = clamp((guest.energy ?? 100) - deltaTime * GUEST.ENERGY_RATE, 0, 100);
    guest.patience = clamp(guest.patience - deltaTime * GUEST.PATIENCE_DECAY, 0, 100);
    guest.litterClock -= deltaTime;

    // Each unmet need chips away at happiness; multiple unmet needs stack so a
    // neglected guest sours quickly. With everything satisfied, only the gentle
    // baseline decay applies.
    const discomfort =
      (guest.hunger > 72 ? GUEST.HAPPY_DECAY_HUNGRY : 0) +
      (guest.thirst > GUEST.THIRST_DISCOMFORT ? GUEST.HAPPY_DECAY_THIRSTY : 0) +
      (guest.relief > GUEST.RELIEF_DISCOMFORT ? GUEST.HAPPY_DECAY_RELIEF : 0) +
      (guest.energy < GUEST.ENERGY_DISCOMFORT ? GUEST.HAPPY_DECAY_TIRED : 0);
    guest.happiness = clamp(
      guest.happiness
        - deltaTime * (discomfort || GUEST.HAPPY_DECAY_BASE)
        - deltaTime * (100 - state.cleanliness) * 0.01
        + deltaTime * atmosphere.happyDrift,
      0,
      100,
    );

    if (guest.litterClock <= 0) {
      const tile = getTile(state, Math.round(guest.x), Math.round(guest.y));
      let chance = GUEST.LITTER_BASE_CHANCE + (100 - state.cleanliness) / 320;
      if (binNear(state, Math.round(guest.x), Math.round(guest.y))) chance *= 0.3;
      if (tile?.path && Math.random() < chance) {
        tile.litter = clamp(tile.litter + 1, 0, 4);
        markUiDirty();
      }
      guest.litterClock = rand(...GUEST.LITTER_INTERVAL_S);
    }

    // Speech-bubble lifecycle + ambient thoughts.
    if (guest.thoughtTtl > 0) {
      guest.thoughtTtl -= deltaTime;
      if (guest.thoughtTtl <= 0) guest.thought = null;
    }
    if (guest.thoughtCooldown > 0) guest.thoughtCooldown -= deltaTime;
    if (guest.thoughtCooldown <= 0 && !guest.thought) {
      if (guest.thirst > 66 && Math.random() < deltaTime * 0.25) {
        setThought(guest, "thirsty");
      } else if (guest.hunger > 64 && Math.random() < deltaTime * 0.22) {
        setThought(guest, "hungry");
      } else if (guest.relief > 76 && Math.random() < deltaTime * 0.22) {
        setThought(guest, "relief");
      } else if (guest.energy < 26 && Math.random() < deltaTime * 0.2) {
        setThought(guest, "tired");
      } else if (state.cleanliness < 62 && Math.random() < deltaTime * 0.16) {
        setThought(guest, "dirty");
      }
    }

    if (guest.state === "thinking" || guest.state === "idle") {
      guest.lingerClock -= deltaTime;
      if (guest.lingerClock <= 0) {
        chooseGuestDestination(state, guest);
        guest.lingerClock = rand(...GUEST.RELINGER_DURATION);
      }
      continue;
    }

    if (guest.state === "walking" || guest.state === "strolling" || guest.state === "leaving") {
      if (!guest.route.length) {
        if (guest.state === "leaving") {
          leavePark(state, guest);
          continue;
        }
        if (guest.targetId) {
          const object = state.objects.get(guest.targetId);
          if (object) {
            joinQueue(state, guest, object);
            continue;
          }
        }
        guest.state = "thinking";
        guest.targetId = null;
        continue;
      }

      const next = guest.route[0];
      if (!getTile(state, next.x, next.y)?.path) {
        guest.route = [];
        guest.state = "thinking";
        guest.targetId = null;
        guest.waitingAt = null;
        continue;
      }
      const stepX = next.x - guest.x;
      const stepY = next.y - guest.y;
      const distance = Math.hypot(stepX, stepY);
      const move = deltaTime * guest.speed;

      if (distance <= move) {
        guest.x = next.x;
        guest.y = next.y;
        guest.route.shift();
        const sceneryBoost = scenicValueAt(state, Math.round(guest.x), Math.round(guest.y));
        if (sceneryBoost > 0) {
          guest.happiness = clamp(guest.happiness + sceneryBoost * 0.008, 0, 100);
          if (sceneryBoost > 3 && Math.random() < 0.05) setThought(guest, "scenery");
        }
      } else {
        guest.x += (stepX / distance) * move;
        guest.y += (stepY / distance) * move;
      }
      continue;
    }

    if (guest.state === "queuing") {
      const object = state.objects.get(guest.waitingAt);
      if (!object || !isObjectOperational(state, object)) {
        guest.waitingAt = null;
        guest.state = "thinking";
        continue;
      }
      guest.happiness = clamp(guest.happiness - deltaTime * 0.5, 0, 100);
      if (guest.patience < GUEST.CHURN_PATIENCE_THRESHOLD) {
        object.queue = object.queue.filter((id) => id !== guest.id);
        guest.waitingAt = null;
        guest.state = "thinking";
        guest.happiness = clamp(guest.happiness - GUEST.QUEUE_CHURN_HAPPY_HIT, 0, 100);
        setThought(guest, "queueLong", "", { force: true });
        addEvent(state, "Guest churn", "A guest bailed from a long wait and went looking elsewhere.");
      }
      continue;
    }
  }
}
