// Progression gates. A few marquee builds start locked and open up as the park
// matures, so a new operator eases in with the basics before the big-ticket
// rides and premium scenery arrive. Tools not listed here are always available.

export const UNLOCKS = {
  wheel: {
    label: "Serve 40 guests",
    test: (state) => state.guestsServed >= 40,
  },
  fountain: {
    label: "Serve 80 guests",
    test: (state) => state.guestsServed >= 80,
  },
  coaster: {
    label: "Serve 180 guests or earn 4★",
    test: (state) => state.guestsServed >= 180 || (state.parkRating ?? 0) >= 4,
  },
};

export function isToolUnlocked(state, toolId) {
  const gate = UNLOCKS[toolId];
  return !gate || gate.test(state);
}

export function unlockLabel(toolId) {
  return UNLOCKS[toolId]?.label ?? "";
}
