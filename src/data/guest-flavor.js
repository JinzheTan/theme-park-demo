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

export function pickThought(key, label = "") {
  const pool = THOUGHTS[key];
  if (!pool || !pool.length) return null;
  const index = Math.floor(Math.random() * pool.length);
  const template = pool[index];
  return { icon: template.icon, text: template.text.replace("{label}", label) };
}
