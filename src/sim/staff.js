import { SPAWN_TILE } from "../core/constants.js";
import { STAFF_TYPES } from "../data/staff.js";
import { ECONOMY } from "../data/tuning.js";
import { clamp, rand } from "../util/math.js";
import { getTile } from "../util/grid.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { pathfind, randomWalkableTile } from "./pathfinding.js";
import { repairTarget, serviceRide } from "./breakdown.js";
import { addEvent } from "./events.js";

export function hireStaff(state, typeId) {
  const def = STAFF_TYPES[typeId];
  const spawn = getTile(state, SPAWN_TILE.x, SPAWN_TILE.y);
  if (!def || !spawn?.path || state.money < def.hire) return false;

  state.money -= def.hire;
  state.staff.push({
    id: state.nextStaffId++,
    type: typeId,
    role: def.role,
    color: def.color,
    speed: def.speed,
    x: SPAWN_TILE.x,
    y: SPAWN_TILE.y,
    route: [],
    targetTile: null,
    idleClock: rand(0.2, 1.2),
    upkeepClock: 0,
  });
  playSfx("place");
  addEvent(state, "New hire", `A ${def.label} joined the team and is reporting for duty.`);
  markUiDirty();
  return true;
}

export function fireStaff(state, typeId) {
  const index = [...state.staff].reverse().findIndex((s) => s.type === typeId);
  if (index === -1) return false;
  const realIndex = state.staff.length - 1 - index;
  const [removed] = state.staff.splice(realIndex, 1);
  addEvent(state, "Off the clock", `A ${STAFF_TYPES[removed.type]?.label ?? "worker"} was let go.`);
  markUiDirty();
  return true;
}

export function staffCountsByType(state) {
  const counts = {};
  for (const worker of state.staff) counts[worker.type] = (counts[worker.type] ?? 0) + 1;
  return counts;
}

export function totalStaffWage(state) {
  return state.staff.reduce((sum, worker) => sum + (STAFF_TYPES[worker.type]?.wage ?? 0), 0);
}

function nearestLitterTile(state, fromX, fromY) {
  let best = null;
  let bestDist = Infinity;
  for (const row of state.tiles) {
    for (const tile of row) {
      if (!tile.path || tile.litter <= 0) continue;
      const dist = Math.abs(tile.x - fromX) + Math.abs(tile.y - fromY);
      if (dist < bestDist) {
        best = tile;
        bestDist = dist;
      }
    }
  }
  return best;
}

function assignTarget(state, worker, def) {
  const from = { x: Math.round(worker.x), y: Math.round(worker.y) };

  if (worker.role === "clean") {
    const litter = nearestLitterTile(state, from.x, from.y);
    if (litter) {
      const route = pathfind(state, from, { x: litter.x, y: litter.y });
      if (route) {
        worker.route = route;
        worker.targetTile = { x: litter.x, y: litter.y };
        return;
      }
    }
  }

  if (worker.role === "repair") {
    const ride = repairTarget(state);
    if (ride?.entry) {
      const route = pathfind(state, from, ride.entry);
      if (route) {
        worker.route = route;
        worker.targetTile = { ...ride.entry, repairId: ride.id };
        return;
      }
    }
  }

  // Default: wander to a random reachable path tile.
  const wander = randomWalkableTile(state, from);
  if (wander) {
    const route = pathfind(state, from, wander);
    if (route) {
      worker.route = route;
      worker.targetTile = null;
    }
  }
}

function applyArrival(state, worker, def) {
  if (worker.role === "clean") {
    let cleaned = 0;
    for (let dy = -def.radius; dy <= def.radius; dy += 1) {
      for (let dx = -def.radius; dx <= def.radius; dx += 1) {
        const tile = getTile(state, Math.round(worker.x) + dx, Math.round(worker.y) + dy);
        if (tile?.litter > 0) {
          cleaned += tile.litter;
          tile.litter = 0;
        }
      }
    }
    if (cleaned > 0) markUiDirty();
  } else if (worker.role === "repair" && worker.targetTile?.repairId) {
    serviceRide(state, worker.targetTile.repairId);
  }
}

function applyAura(state, worker, def, deltaTime) {
  if (worker.role !== "cheer" && worker.role !== "order") return;
  for (const guest of state.guests) {
    if (guest.state === "riding") continue;
    const dist = Math.abs(guest.x - worker.x) + Math.abs(guest.y - worker.y);
    if (dist > def.radius) continue;
    if (worker.role === "cheer") {
      guest.happiness = clamp(guest.happiness + deltaTime * def.cheer, 0, 100);
    } else {
      guest.patience = clamp(guest.patience + deltaTime * 0.7, 0, 100);
    }
  }
}

export function updateStaff(state, deltaTime) {
  for (const worker of state.staff) {
    const def = STAFF_TYPES[worker.type];
    if (!def) continue;

    worker.upkeepClock += deltaTime;
    if (worker.upkeepClock >= ECONOMY.UPKEEP_INTERVAL_S) {
      worker.upkeepClock -= ECONOMY.UPKEEP_INTERVAL_S;
      state.money -= def.wage;
      state.totalUpkeep += def.wage;
    }

    applyAura(state, worker, def, deltaTime);

    if (!worker.route.length) {
      worker.idleClock -= deltaTime;
      if (worker.idleClock <= 0) {
        applyArrival(state, worker, def);
        assignTarget(state, worker, def);
        worker.idleClock = rand(0.4, 1.6);
      }
      continue;
    }

    const next = worker.route[0];
    if (!getTile(state, next.x, next.y)?.path) {
      worker.route = [];
      continue;
    }
    const stepX = next.x - worker.x;
    const stepY = next.y - worker.y;
    const distance = Math.hypot(stepX, stepY);
    const move = deltaTime * worker.speed;
    if (distance <= move) {
      worker.x = next.x;
      worker.y = next.y;
      worker.route.shift();
      if (!worker.route.length) applyArrival(state, worker, def);
    } else {
      worker.x += (stepX / distance) * move;
      worker.y += (stepY / distance) * move;
    }
  }
}
