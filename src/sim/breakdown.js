// Ride wear, breakdowns, and repair. Rides lose condition as they run; at zero
// they break down and stop until a Mechanic reaches them — or, so a player with
// no mechanic is never soft-locked, until an external crew auto-repairs after a
// downtime window (slower and with the lost income as the real penalty).
// Mechanics also do preventive servicing on healthy-but-worn rides.

import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { addEvent } from "./events.js";

const WEAR_RUNNING_PER_S = 0.7;
const WEAR_IDLE_PER_S = 0.12;
const AUTO_RECOVER_S = 28;
const SERVICE_THRESHOLD = 55;
const SERVICE_AMOUNT = 55;

export function isRideBroken(object) {
  return Boolean(object?.broken);
}

export function wearRide(state, object, deltaTime) {
  if (object.category !== "ride") return;
  if (object.condition == null) object.condition = 100;

  if (object.broken) {
    object.downtime = (object.downtime ?? 0) + deltaTime;
    if (object.downtime >= AUTO_RECOVER_S) {
      object.broken = false;
      object.downtime = 0;
      object.condition = 50;
      addEvent(state, "Back in service", `${object.label} reopened after an external repair crew visit.`);
      markUiDirty();
    }
    return;
  }

  const running = object.riders.length > 0;
  object.condition = Math.max(0, object.condition - deltaTime * (running ? WEAR_RUNNING_PER_S : WEAR_IDLE_PER_S));

  if (object.condition <= 0) {
    object.broken = true;
    object.downtime = 0;
    object.riders = [];
    object.cycleRemaining = 0;
    state.pendingToasts.push({
      kind: "milestone",
      icon: "⚠️",
      title: `${object.label} broke down`,
      detail: "Hire a Mechanic to fix it fast, or wait for the repair crew.",
    });
    playSfx("error");
    addEvent(state, "Breakdown", `${object.label} broke down and stopped running.`);
    markUiDirty();
  }
}

// What a free Mechanic should head toward: any broken ride first, else the most
// worn ride that's worth a preventive service.
export function repairTarget(state) {
  let broken = null;
  let worst = null;
  for (const object of state.objects.values()) {
    if (object.category !== "ride" || !object.entry) continue;
    if (object.broken) {
      if (!broken) broken = object;
    } else if ((object.condition ?? 100) < SERVICE_THRESHOLD) {
      if (!worst || object.condition < worst.condition) worst = object;
    }
  }
  return broken ?? worst;
}

export function serviceRide(state, id) {
  const object = state.objects.get(id);
  if (!object || object.category !== "ride") return;
  if (object.broken) {
    object.broken = false;
    object.downtime = 0;
    object.condition = 100;
    playSfx("cash");
    addEvent(state, "Repaired", `A mechanic got ${object.label} running again.`);
    markUiDirty();
  } else {
    object.condition = Math.min(100, (object.condition ?? 100) + SERVICE_AMOUNT);
  }
}
