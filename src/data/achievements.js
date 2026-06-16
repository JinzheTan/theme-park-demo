// Achievements — account-level badges that persist across parks (stored
// separately from the park save). Each has a `test(ctx)` predicate evaluated
// against a lightweight snapshot built once per check, so adding new ones never
// touches the evaluation loop. Keep them aspirational but reachable; they are
// the long-tail retention hook on top of the per-park growth milestones.

export const ACHIEVEMENTS = [
  {
    id: "first-build",
    icon: "🛠️",
    label: "Groundbreaker",
    detail: "Place your first attraction.",
    test: (c) => c.placedByPlayer >= 1,
  },
  {
    id: "first-coaster",
    icon: "🎢",
    label: "Thrill Seeker",
    detail: "Open a Comet Coaster.",
    test: (c) => c.hasType("coaster"),
  },
  {
    id: "full-roster",
    icon: "🎡",
    label: "Full Roster",
    detail: "Run a carousel, wheel, and coaster at once.",
    test: (c) => c.hasType("carousel") && c.hasType("wheel") && c.hasType("coaster"),
  },
  {
    id: "crowd-50",
    icon: "👨‍👩‍👧",
    label: "Drawing a Crowd",
    detail: "Have 50 guests in the park at once.",
    test: (c) => c.guestsInside >= 50,
  },
  {
    id: "served-250",
    icon: "🎟️",
    label: "Showtime",
    detail: "Deliver 250 completed experiences.",
    test: (c) => c.guestsServed >= 250,
  },
  {
    id: "served-1000",
    icon: "🌟",
    label: "Headliner",
    detail: "Deliver 1,000 completed experiences.",
    test: (c) => c.guestsServed >= 1000,
  },
  {
    id: "rich-10k",
    icon: "💰",
    label: "In the Black",
    detail: "Bank $10,000 in cash.",
    test: (c) => c.money >= 10000,
  },
  {
    id: "rich-25k",
    icon: "🏦",
    label: "Tycoon",
    detail: "Bank $25,000 in cash.",
    test: (c) => c.money >= 25000,
  },
  {
    id: "spotless",
    icon: "✨",
    label: "Spotless",
    detail: "Keep the park 100% clean with a real crowd.",
    test: (c) => c.cleanliness >= 100 && c.guestsInside >= 12,
  },
  {
    id: "delighted",
    icon: "😄",
    label: "Crowd Pleaser",
    detail: "Reach 95% average happiness with a real crowd.",
    test: (c) => c.averageHappiness >= 95 && c.guestsInside >= 12,
  },
  {
    id: "garden",
    icon: "🌳",
    label: "Garden Park",
    detail: "Build up 60 points of scenery value.",
    test: (c) => c.sceneryScore >= 60,
  },
  {
    id: "destination",
    icon: "🏰",
    label: "Destination Status",
    detail: "Reach a Destination-tier growth score.",
    test: (c) => c.growthScore >= 520,
  },
  {
    id: "rainmaker",
    icon: "☔",
    label: "Rain or Shine",
    detail: "Keep guests happy (80%+) while it rains.",
    test: (c) => c.weather === "rain" && c.averageHappiness >= 80 && c.guestsInside >= 8,
  },
  {
    id: "fortnight",
    icon: "📅",
    label: "Fortnight",
    detail: "Operate the park into week 14.",
    test: (c) => c.day >= 14,
  },
];
