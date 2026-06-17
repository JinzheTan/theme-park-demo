import { dom } from "./dom.js";
import { el, setText } from "./diff.js";

const METRICS = [
  { key: "money", label: "Cash", line: "#d89d26", fill: "rgba(216, 157, 38, 0.18)", fmt: (v) => `$${v}` },
  { key: "guests", label: "Guests on site", line: "#3daec6", fill: "rgba(61, 174, 198, 0.18)", fmt: (v) => `${v}` },
  { key: "happiness", label: "Happiness", line: "#36bca9", fill: "rgba(54, 188, 169, 0.2)", fmt: (v) => `${v}%` },
  { key: "growth", label: "Growth score", line: "#ed7f62", fill: "rgba(237, 127, 98, 0.18)", fmt: (v) => `${v}` },
];

let mounted = false;
let rows = [];

function mount() {
  const host = dom.statsPanel;
  if (!host) return;
  host.replaceChildren();
  rows = [];

  for (const metric of METRICS) {
    const card = el("article", "stat-trend list-card glass glass--depth-2");
    const head = el("strong");
    const label = document.createTextNode("");
    const value = el("span", "stat-trend__value");
    head.appendChild(label);
    head.appendChild(value);
    const canvas = document.createElement("canvas");
    canvas.className = "stat-trend__chart";
    card.appendChild(head);
    card.appendChild(canvas);
    host.appendChild(card);
    rows.push({ metric, label, value, canvas, ctx: canvas.getContext("2d") });
  }
  mounted = true;
}

function drawSpark(canvas, ctx, values, metric) {
  const w = canvas.clientWidth;
  const h = 46;
  if (!w) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = 5;
  const baseline = h - pad;
  if (values.length < 2) {
    ctx.strokeStyle = "rgba(23, 53, 61, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, baseline);
    ctx.lineTo(w - pad, baseline);
    ctx.stroke();
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  const yFor = (v) => baseline - ((v - min) / range) * (h - pad * 2);

  ctx.beginPath();
  ctx.moveTo(pad, baseline);
  values.forEach((v, i) => ctx.lineTo(pad + i * stepX, yFor(v)));
  ctx.lineTo(pad + (values.length - 1) * stepX, baseline);
  ctx.closePath();
  ctx.fillStyle = metric.fill;
  ctx.fill();

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = yFor(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = metric.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // End dot at the latest sample.
  const lastX = pad + (values.length - 1) * stepX;
  const lastY = yFor(values[values.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = metric.line;
  ctx.fill();
}

export function renderStats(state) {
  if (!mounted) mount();
  const history = state.statsHistory;
  for (const row of rows) {
    const current = history.length ? history[history.length - 1][row.metric.key] : 0;
    row.label.nodeValue = row.metric.label;
    setText(row.value, row.metric.fmt(current));
    drawSpark(row.canvas, row.ctx, history.map((h) => h[row.metric.key]), row.metric);
  }
}
