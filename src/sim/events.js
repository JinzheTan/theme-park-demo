import { SIM } from "../data/tuning.js";
import { markUiDirty } from "../core/state.js";

export function addEvent(state, title, description) {
  state.feed.unshift({
    id: state.nextEventId++,
    title,
    description,
  });
  state.feed = state.feed.slice(0, SIM.MAX_EVENTS);
  markUiDirty();
}
