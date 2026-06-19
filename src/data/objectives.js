// Park objectives — a campaign-style checklist layered on top of the growth
// tiers and account-level achievements. These are per-park (they reset with a
// new park), pay a cash reward, and chart a path toward a 5-star resort.

export const OBJECTIVES = [
  {
    id: "open-second-ride",
    label: "Run two rides at once",
    detail: "Give guests a choice with a second attraction.",
    reward: 180,
    test: (state) => [...state.objects.values()].filter((o) => o.category === "ride").length >= 2,
  },
  {
    id: "comforts",
    label: "Cover the basics",
    detail: "Offer food, a drink kiosk, and a restroom.",
    reward: 220,
    test: (state) => {
      const types = new Set([...state.objects.values()].map((o) => o.type));
      return types.has("food") && types.has("drink") && types.has("restroom");
    },
  },
  {
    id: "crowd-40",
    label: "Host 40 guests at once",
    detail: "Build the draw to pull a real crowd.",
    reward: 280,
    test: (state) => state.guests.length >= 40,
  },
  {
    id: "three-star",
    label: "Earn a 3-star park",
    detail: "Balance happiness, cleanliness, and variety.",
    reward: 400,
    test: (state) => (state.parkRating ?? 0) >= 3,
  },
  {
    id: "served-600",
    label: "Deliver 600 experiences",
    detail: "Keep the rides and stalls busy.",
    reward: 380,
    test: (state) => state.guestsServed >= 600,
  },
  {
    id: "five-star",
    label: "Build a 5-star resort",
    detail: "The ultimate goal — a flawless park.",
    reward: 1200,
    test: (state) => (state.parkRating ?? 0) >= 4.6,
  },
];
