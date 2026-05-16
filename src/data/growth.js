export const GROWTH_MILESTONES = [
  {
    id: "buzzing",
    score: 170,
    label: "Buzzing",
    reward: 240,
    detail: "Reach a lively early-park rhythm with dependable guest circulation.",
  },
  {
    id: "signature",
    score: 320,
    label: "Signature",
    reward: 420,
    detail: "Sustain a destination-worthy mix of rides, scenery, and service coverage.",
  },
  {
    id: "destination",
    score: 520,
    label: "Destination",
    reward: 680,
    detail: "Operate a premium park guests happily explore for multiple stops.",
  },
];

export function growthLabel(growthScore) {
  if (growthScore < 170) return "Budding";
  if (growthScore < 320) return "Buzzing";
  if (growthScore < 520) return "Signature";
  return "Destination";
}
