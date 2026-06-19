// Park staff. Each type is a hired worker that walks the paths and does a job.
// Hiring costs an up-front fee; every worker also draws an ongoing wage on the
// upkeep clock, which is the main running cost the player balances against
// ticket income. Effects are intentionally readable so the roster is a real
// management lever, not a fire-and-forget purchase.

export const STAFF_TYPES = {
  janitor: {
    id: "janitor",
    label: "Janitor",
    icon: "🧹",
    color: "#4f93b0",
    hire: 120,
    wage: 8,
    role: "clean",
    radius: 1,
    speed: 1.6,
    blurb: "Roams the paths picking up litter.",
  },
  mechanic: {
    id: "mechanic",
    label: "Mechanic",
    icon: "🔧",
    color: "#d89d26",
    hire: 180,
    wage: 12,
    role: "repair",
    radius: 1,
    speed: 1.5,
    blurb: "Services rides and fixes breakdowns fast.",
  },
  entertainer: {
    id: "entertainer",
    label: "Entertainer",
    icon: "🤹",
    color: "#ed7f62",
    hire: 160,
    wage: 11,
    role: "cheer",
    radius: 2.6,
    speed: 1.7,
    cheer: 0.8,
    blurb: "Lifts the mood of nearby guests.",
  },
  security: {
    id: "security",
    label: "Security",
    icon: "🛡️",
    color: "#36bca9",
    hire: 140,
    wage: 9,
    role: "order",
    radius: 2.6,
    speed: 1.5,
    blurb: "Calms queues and deters littering nearby.",
  },
};

export const STAFF_ORDER = ["janitor", "mechanic", "entertainer", "security"];
