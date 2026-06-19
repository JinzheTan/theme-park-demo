import { dom } from "./dom.js";
import { el, setText } from "./diff.js";

const VISIBLE_MS = 4600;
const MAX_VISIBLE = 3;

function makeToast(toast) {
  const node = el("article", `toast glass glass--depth-2 toast--${toast.kind ?? "info"}`);
  node.setAttribute("role", "status");

  const icon = el("span", "toast__icon");
  setText(icon, toast.icon ?? "✨");

  const body = el("div", "toast__body");
  const title = el("strong");
  const detail = el("span");
  setText(title, toast.title ?? "");
  setText(detail, toast.detail ?? "");
  body.appendChild(title);
  body.appendChild(detail);

  node.appendChild(icon);
  node.appendChild(body);
  return node;
}

function dismiss(node) {
  if (!node.isConnected) return;
  node.classList.add("toast--leaving");
  window.setTimeout(() => node.remove(), 260);
}

// Drains state.pendingToasts into the on-screen stack. Called from the UI
// refresh path so it shares the panel cadence and never fires mid-frame twice.
export function flushToasts(state) {
  const host = dom.toastStack;
  if (!host || !state.pendingToasts.length) return;

  const batch = state.pendingToasts.splice(0, state.pendingToasts.length);
  for (const toast of batch) {
    const node = makeToast(toast);
    host.appendChild(node);
    // Trigger the enter transition on the next frame.
    requestAnimationFrame(() => node.classList.add("toast--in"));
    window.setTimeout(() => dismiss(node), VISIBLE_MS);
  }

  while (host.children.length > MAX_VISIBLE) {
    dismiss(host.firstElementChild);
    host.firstElementChild?.remove();
  }
}
