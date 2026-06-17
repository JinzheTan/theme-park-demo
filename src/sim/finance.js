// Finance: ticket pricing with demand elasticity, a park entry fee, loans with
// weekly interest, and a cushioned bankruptcy backstop. Per the "balanced
// challenge" tuning, going broke never ends the run — if cash stays deep in the
// red, an investor bailout floats the park back up, but piles on debt and dents
// the growth score, so it stings without being a wall.

import { ECONOMY } from "../data/tuning.js";
import { clamp } from "../util/math.js";
import { markUiDirty } from "../core/state.js";
import { playSfx } from "../core/audio.js";
import { addEvent } from "./events.js";

// Ticket actually charged for a ride/paid facility, after the global pricing
// strategy multiplier.
export function effectiveTicket(state, object) {
  const base = object.stats.ticket ?? 0;
  if (!base) return 0;
  return Math.max(0, Math.round(base * (state.priceMultiplier ?? 1)));
}

// How off-putting the current price is for a ride, used to damp demand. At or
// below "fair value" it's 0; above, it climbs.
export function pricePenalty(state, object) {
  if (!object.stats.ticket) return 0;
  const fair = (object.stats.excitement ?? 10) * 0.85;
  return Math.max(0, effectiveTicket(state, object) - fair) * 0.35;
}

export function setPriceMultiplier(state, value) {
  state.priceMultiplier = clamp(value, ECONOMY.PRICE_MULT_RANGE[0], ECONOMY.PRICE_MULT_RANGE[1]);
  markUiDirty();
}

export function setEntryFee(state, value) {
  state.entryFee = clamp(Math.round(value), ECONOMY.ENTRY_FEE_RANGE[0], ECONOMY.ENTRY_FEE_RANGE[1]);
  markUiDirty();
}

export function takeLoan(state, amount) {
  state.money += amount;
  state.debt = (state.debt ?? 0) + amount;
  playSfx("cash");
  addEvent(state, "Loan taken", `Borrowed $${amount}. Outstanding debt is now $${Math.round(state.debt)}.`);
  markUiDirty();
  return true;
}

export function repayLoan(state, amount) {
  const pay = Math.min(amount, Math.max(0, state.money), state.debt ?? 0);
  if (pay <= 0) return false;
  state.money -= pay;
  state.debt -= pay;
  playSfx("click");
  addEvent(state, "Debt repaid", `Repaid $${Math.round(pay)}. Remaining debt $${Math.round(state.debt)}.`);
  markUiDirty();
  return true;
}

// Called at each weekly rollover from the economy.
export function accrueWeeklyInterest(state) {
  if ((state.debt ?? 0) <= 0) return;
  const interest = Math.round(state.debt * ECONOMY.LOAN_INTEREST_WEEKLY);
  if (interest <= 0) return;
  state.debt += interest;
  addEvent(state, "Interest accrued", `$${interest} interest added — debt is now $${Math.round(state.debt)}.`);
}

// Cushioned bankruptcy. Runs on sim time so a paused park never bails.
export function updateFinanceSafety(state, deltaTime) {
  if (state.money >= ECONOMY.BANKRUPTCY_FLOOR) {
    state.lowCashClock = 0;
    return;
  }
  state.lowCashClock = (state.lowCashClock ?? 0) + deltaTime;
  if (state.lowCashClock < ECONOMY.BANKRUPTCY_GRACE_S) return;

  state.lowCashClock = 0;
  state.bailoutCount = (state.bailoutCount ?? 0) + 1;
  state.money = ECONOMY.BAILOUT_CASH;
  state.debt = (state.debt ?? 0) + ECONOMY.BAILOUT_DEBT;
  state.growthScore = Math.max(0, state.growthScore - ECONOMY.BAILOUT_GROWTH_PENALTY);
  state.pendingToasts.push({
    kind: "milestone",
    icon: "🏧",
    title: "Emergency bailout",
    detail: `Investors covered the shortfall but added $${ECONOMY.BAILOUT_DEBT} of debt.`,
  });
  playSfx("error");
  addEvent(state, "Bailout", "An emergency investor bailout kept the park afloat — at a cost.");
  markUiDirty();
}
