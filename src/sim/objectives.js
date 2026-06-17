import { OBJECTIVES } from "../data/objectives.js";
import { UNLOCKS, isToolUnlocked } from "../data/unlocks.js";
import { TOOLS } from "../data/tools.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { addEvent } from "./events.js";

// Record everything already available so we only celebrate *new* unlocks during
// play (not the ones a fresh/restored park starts with).
export function primeUnlocks(state) {
  for (const toolId of Object.keys(UNLOCKS)) {
    if (isToolUnlocked(state, toolId)) state.announcedUnlocks.add(toolId);
  }
}

export function evaluateUnlocks(state) {
  for (const toolId of Object.keys(UNLOCKS)) {
    if (state.announcedUnlocks.has(toolId) || !isToolUnlocked(state, toolId)) continue;
    state.announcedUnlocks.add(toolId);
    const label = TOOLS.find((t) => t.id === toolId)?.label ?? toolId;
    state.pendingToasts.push({
      kind: "award",
      icon: "🔓",
      title: `${label} unlocked!`,
      detail: "A new build is available in your palette.",
    });
    playSfx("achievement");
    addEvent(state, "Unlocked", `${label} is now available to build.`);
    markUiDirty();
  }
}

export function evaluateObjectives(state) {
  const done = state.completedObjectives;
  let changed = false;

  for (const objective of OBJECTIVES) {
    if (done.has(objective.id)) continue;
    let passed = false;
    try {
      passed = objective.test(state);
    } catch {
      passed = false;
    }
    if (!passed) continue;

    done.add(objective.id);
    state.money += objective.reward;
    state.pendingToasts.push({
      kind: "milestone",
      icon: "✅",
      title: `Objective: ${objective.label}`,
      detail: `Complete! +$${objective.reward}.`,
    });
    playSfx("milestone");
    addEvent(state, "Objective complete", `${objective.label} — earned a $${objective.reward} bonus.`);
    changed = true;
  }

  if (changed) markUiDirty();
}
