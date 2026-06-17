// Park star rating — a single 0–5 quality score blended from the signals that
// matter most to guests: how happy and well-served they are, how clean and
// varied the park is, and how far it has grown. Shown in the HUD and used as a
// target by several objectives.

import { clamp } from "../util/math.js";

export function computeParkRating(state) {
  const happiness = (state.averageHappiness ?? 0) / 100;
  const clean = (state.cleanliness ?? 0) / 100;
  const growth = Math.min(1, (state.growthScore ?? 0) / 600);

  const objects = [...state.objects.values()];
  const rideCount = objects.filter((o) => o.category === "ride").length;
  const facilityKinds = new Set(objects.filter((o) => o.category === "facility").map((o) => o.stats.serves));
  const variety = Math.min(1, rideCount / 4) * 0.6 + Math.min(1, facilityKinds.size / 4) * 0.4;

  const score = happiness * 0.4 + clean * 0.2 + growth * 0.25 + variety * 0.15;
  return clamp(score * 5, 0, 5);
}

// "★★★★☆" string rounded to the nearest whole star (decimal shown separately).
export function starString(rating) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}
