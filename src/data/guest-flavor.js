// Flavor data that gives guests a face: names for the inspector and a library
// of short thoughts they surface as speech bubbles. Thoughts are grouped by
// trigger key; the sim picks one at random when the matching moment happens.

export const GUEST_FIRST_NAMES = [
  "Ava", "Leo", "Mia", "Noah", "Zoe", "Eli", "Luna", "Max", "Iris", "Theo",
  "Nora", "Finn", "Ruby", "Owen", "Cleo", "Sam", "Hazel", "Jude", "Maya", "Cole",
  "Ivy", "Asa", "Lila", "Reid", "Esme", "Kai", "Wren", "Dean", "Pia", "Rex",
  "Juno", "Beau", "Faye", "Otis", "Tess", "Hugo", "Nell", "Cy", "Bex", "Arlo",
];

export const GUEST_LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW".split("");

// Each entry: { icon, text }. `{label}` is substituted with a ride/food name.
export const THOUGHTS = {
  rideLoved: [
    { icon: "😍", text: "That was amazing!" },
    { icon: "🤩", text: "Let's ride {label} again!" },
    { icon: "🎉", text: "Best ride here!" },
  ],
  rideOkay: [
    { icon: "🙂", text: "That was fun." },
    { icon: "😌", text: "Nice and relaxing." },
  ],
  ate: [
    { icon: "😋", text: "Yum, needed that!" },
    { icon: "🍔", text: "Tasty snack." },
  ],
  hungry: [
    { icon: "🍟", text: "I'm getting hungry..." },
    { icon: "😟", text: "Where's the food?" },
  ],
  thirsty: [
    { icon: "🥤", text: "So thirsty..." },
    { icon: "😓", text: "I need a drink." },
  ],
  drank: [
    { icon: "😎", text: "Ahh, refreshing!" },
    { icon: "🥤", text: "Much better." },
  ],
  relief: [
    { icon: "🚻", text: "I need a restroom!" },
    { icon: "😬", text: "Where's the restroom?" },
  ],
  relieved: [
    { icon: "😌", text: "Phew, much better." },
  ],
  tired: [
    { icon: "🥱", text: "My feet are aching." },
    { icon: "😮‍💨", text: "I need to sit down." },
  ],
  rested: [
    { icon: "😊", text: "That bench was nice." },
    { icon: "💺", text: "Feeling recharged." },
  ],
  queueLong: [
    { icon: "😤", text: "This line is too long!" },
    { icon: "⏳", text: "Still waiting..." },
    { icon: "😒", text: "Ugh, so crowded." },
  ],
  scenery: [
    { icon: "😊", text: "So pretty here!" },
    { icon: "🌸", text: "Lovely gardens." },
    { icon: "📸", text: "Picture perfect!" },
  ],
  dirty: [
    { icon: "🤢", text: "It's a bit messy..." },
    { icon: "🗑️", text: "Needs a clean-up." },
  ],
  leavingHappy: [
    { icon: "😄", text: "Best day ever!" },
    { icon: "👋", text: "I'll be back!" },
  ],
  leavingSad: [
    { icon: "😞", text: "Heading home early." },
    { icon: "😕", text: "Not my favorite trip." },
  ],
  bored: [
    { icon: "😐", text: "What should I do?" },
    { icon: "🤔", text: "Where to next?" },
  ],
};

// Guest archetypes. excitementBias skews ride choice (thrill-seekers chase big
// rides, families prefer gentle ones); foodBias makes some guests seek food
// sooner. weight controls how common each type is at the gate.
export const GUEST_KINDS = [
  { id: "family", label: "Family", icon: "👨‍👩‍👧", weight: 4, excitementBias: -5, foodBias: 6 },
  { id: "thrill", label: "Thrill-seeker", icon: "🎢", weight: 3, excitementBias: 9, foodBias: -2 },
  { id: "tourist", label: "Tourist", icon: "📷", weight: 3, excitementBias: 0, foodBias: 2 },
  { id: "foodie", label: "Foodie", icon: "🍦", weight: 2, excitementBias: -1, foodBias: 13 },
];

export function pickGuestKind() {
  const total = GUEST_KINDS.reduce((sum, kind) => sum + kind.weight, 0);
  let roll = Math.random() * total;
  for (const kind of GUEST_KINDS) {
    roll -= kind.weight;
    if (roll <= 0) return kind;
  }
  return GUEST_KINDS[0];
}

export function guestKind(id) {
  return GUEST_KINDS.find((kind) => kind.id === id) ?? GUEST_KINDS[0];
}

export function pickThought(key, label = "") {
  const pool = THOUGHTS[key];
  if (!pool || !pool.length) return null;
  const index = Math.floor(Math.random() * pool.length);
  const template = pool[index];
  return { icon: template.icon, text: template.text.replace("{label}", label) };
}
