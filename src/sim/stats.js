// Time-series sampler for the Trends dashboard. Pushes a compact snapshot into
// a capped ring buffer on a fixed sim-time cadence so the charts scroll left as
// the park runs. Sampling on sim time means a paused park doesn't accumulate
// flat points.

const SAMPLE_INTERVAL_S = 2;
const MAX_SAMPLES = 80;

export function sampleStats(state, deltaTime) {
  state.statsClock += deltaTime;
  if (state.statsClock < SAMPLE_INTERVAL_S) return;
  state.statsClock = 0;

  state.statsHistory.push({
    money: Math.round(state.money),
    guests: state.guests.length,
    happiness: state.averageHappiness,
    growth: state.growthScore,
  });

  if (state.statsHistory.length > MAX_SAMPLES) {
    state.statsHistory.splice(0, state.statsHistory.length - MAX_SAMPLES);
  }
}
