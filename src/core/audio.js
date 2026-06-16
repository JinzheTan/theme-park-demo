// Tiny synthesized sound engine. No audio assets — every cue is a short
// oscillator envelope generated on the fly, so it stays in the "no build, no
// downloads" spirit of the project. Audio context is created lazily on the
// first real user gesture to satisfy browser autoplay policies.

let ctx = null;
let master = null;
let enabled = false;
let unlocked = false;

// name -> array of {freq, type, dur, gain, delay, slideTo}
const CUES = {
  click: [{ freq: 520, type: "triangle", dur: 0.06, gain: 0.18 }],
  place: [
    { freq: 440, type: "triangle", dur: 0.08, gain: 0.22 },
    { freq: 660, type: "triangle", dur: 0.1, gain: 0.18, delay: 0.05 },
  ],
  remove: [{ freq: 300, type: "sawtooth", dur: 0.12, gain: 0.16, slideTo: 150 }],
  error: [{ freq: 180, type: "square", dur: 0.14, gain: 0.14, slideTo: 120 }],
  cash: [
    { freq: 880, type: "sine", dur: 0.07, gain: 0.16 },
    { freq: 1320, type: "sine", dur: 0.12, gain: 0.14, delay: 0.06 },
  ],
  dispatch: [
    { freq: 392, type: "triangle", dur: 0.1, gain: 0.16 },
    { freq: 587, type: "triangle", dur: 0.12, gain: 0.14, delay: 0.08 },
  ],
  milestone: [
    { freq: 523, type: "sine", dur: 0.14, gain: 0.2 },
    { freq: 659, type: "sine", dur: 0.14, gain: 0.2, delay: 0.12 },
    { freq: 784, type: "sine", dur: 0.22, gain: 0.2, delay: 0.24 },
  ],
  achievement: [
    { freq: 659, type: "triangle", dur: 0.12, gain: 0.2 },
    { freq: 988, type: "triangle", dur: 0.12, gain: 0.2, delay: 0.1 },
    { freq: 1319, type: "triangle", dur: 0.26, gain: 0.18, delay: 0.2 },
  ],
};

function ensureContext() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  return ctx;
}

// Call from a user-gesture handler so the context can start in browsers that
// block autoplay. Safe to call repeatedly.
export function unlockAudio() {
  if (unlocked) return;
  const context = ensureContext();
  if (!context) return;
  if (context.state === "suspended") context.resume();
  unlocked = true;
}

export function setAudioEnabled(value) {
  enabled = Boolean(value);
  if (enabled) ensureContext();
}

function playTone(note) {
  const start = ctx.currentTime + (note.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = note.type ?? "sine";
  osc.frequency.setValueAtTime(note.freq, start);
  if (note.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, note.slideTo), start + note.dur);
  }
  const peak = note.gain ?? 0.18;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + note.dur + 0.02);
}

export function playSfx(name) {
  if (!enabled) return;
  const cue = CUES[name];
  if (!cue) return;
  const context = ensureContext();
  if (!context || context.state !== "running") return;
  for (const note of cue) playTone(note);
}
