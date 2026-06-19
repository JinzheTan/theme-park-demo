import { dom } from "./dom.js";
import { el, setText, setClass } from "./diff.js";
import { ECONOMY } from "../data/tuning.js";
import { setPriceMultiplier, setEntryFee, takeLoan, repayLoan } from "../sim/finance.js";

let mounted = false;
let stateRef = null;
let refs = {};

function rangeRow(label, min, max, step, key) {
  const row = el("div", "finance-row");
  const head = el("div", "finance-row__head");
  const title = el("strong");
  setText(title, label);
  const value = el("span", "finance-row__value");
  head.appendChild(title);
  head.appendChild(value);
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.dataset.finance = key;
  row.appendChild(head);
  row.appendChild(input);
  return { row, input, value };
}

function mount() {
  const host = dom.financePanel;
  if (!host) return;
  host.replaceChildren();

  const summary = el("div", "finance-summary");
  const cash = el("div", "finance-stat");
  const cashLabel = el("span"); setText(cashLabel, "Cash");
  const cashValue = el("strong");
  cash.appendChild(cashLabel); cash.appendChild(cashValue);
  const debt = el("div", "finance-stat");
  const debtLabel = el("span"); setText(debtLabel, "Debt");
  const debtValue = el("strong");
  debt.appendChild(debtLabel); debt.appendChild(debtValue);
  summary.appendChild(cash); summary.appendChild(debt);
  host.appendChild(summary);

  const price = rangeRow("Ticket pricing", 60, 160, 5, "price");
  const entry = rangeRow("Park entry fee", ECONOMY.ENTRY_FEE_RANGE[0], ECONOMY.ENTRY_FEE_RANGE[1], 2, "entry");
  host.appendChild(price.row);
  host.appendChild(entry.row);

  const loans = el("div", "finance-loans");
  const loansHeading = el("p", "finance-loans__heading eyebrow");
  setText(loansHeading, "Loans");
  loans.appendChild(loansHeading);

  const borrowRow = el("div", "finance-loans__row");
  const borrowButtons = ECONOMY.LOAN_OPTIONS.map((amount) => {
    const btn = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
    btn.type = "button";
    btn.dataset.loan = String(amount);
    setText(btn, `Borrow $${amount}`);
    borrowRow.appendChild(btn);
    return btn;
  });
  loans.appendChild(borrowRow);

  const repayRow = el("div", "finance-loans__row");
  const repaySmall = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
  repaySmall.type = "button";
  repaySmall.dataset.repay = "500";
  setText(repaySmall, "Repay $500");
  const repayAll = el("button", "pill pill--action glass glass--depth-1 glass-hoverable");
  repayAll.type = "button";
  repayAll.dataset.repay = "all";
  setText(repayAll, "Repay all");
  repayRow.appendChild(repaySmall);
  repayRow.appendChild(repayAll);
  loans.appendChild(repayRow);
  host.appendChild(loans);

  host.addEventListener("input", (event) => {
    if (!stateRef) return;
    const target = event.target;
    if (target.dataset.finance === "price") setPriceMultiplier(stateRef, Number(target.value) / 100);
    if (target.dataset.finance === "entry") setEntryFee(stateRef, Number(target.value));
    renderFinance(stateRef);
  });
  host.addEventListener("click", (event) => {
    if (!stateRef) return;
    const loanTarget = event.target.closest("[data-loan]");
    if (loanTarget) { takeLoan(stateRef, Number(loanTarget.dataset.loan)); renderFinance(stateRef); return; }
    const repayTarget = event.target.closest("[data-repay]");
    if (repayTarget) {
      const amount = repayTarget.dataset.repay === "all" ? (stateRef.debt ?? 0) : Number(repayTarget.dataset.repay);
      repayLoan(stateRef, amount);
      renderFinance(stateRef);
    }
  });

  refs = { cashValue, debtValue, price, entry, borrowButtons, repaySmall, repayAll };
  mounted = true;
}

export function bindFinancePanel(state) {
  stateRef = state;
  if (!mounted) mount();
  renderFinance(state);
}

export function renderFinance(state) {
  if (!mounted) mount();
  setText(refs.cashValue, `$${Math.round(state.money)}`);
  setClass(refs.cashValue, "warn", state.money < 0);
  const debt = Math.round(state.debt ?? 0);
  setText(refs.debtValue, `$${debt}`);
  setClass(refs.debtValue, "warn", debt > 0);

  const pricePct = Math.round((state.priceMultiplier ?? 1) * 100);
  refs.price.input.value = pricePct;
  setText(refs.price.value, `${pricePct}%`);
  refs.entry.input.value = state.entryFee ?? 0;
  setText(refs.entry.value, `$${state.entryFee ?? 0}`);

  const canRepay = debt > 0 && state.money > 0;
  refs.repaySmall.disabled = !canRepay;
  refs.repayAll.disabled = !canRepay;
}
