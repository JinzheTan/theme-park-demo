#!/usr/bin/env node
// Smoke test that exercises the live game's window-globals. Starts a static
// server, navigates to the page, advances time deterministically via the QA
// hooks, and asserts the snapshot has the keys we expect.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const PORT = 5173;
const URL = `http://localhost:${PORT}/`;

function startServer() {
  return spawn("npx", ["--yes", "http-server", "-c-1", "-p", String(PORT), "-s", "."], {
    stdio: ["ignore", "ignore", "inherit"],
  });
}

async function waitForServer(maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error("Server did not come up in time");
}

const server = startServer();
let exitCode = 0;
let browser;

try {
  await waitForServer();

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on("pageerror", (err) => {
    console.error("Page error:", err.message);
    exitCode = 1;
  });

  await page.goto(URL);
  await page.waitForFunction(() => Boolean(window.__wonderloop), null, { timeout: 8000 });

  await page.evaluate(() => window.advanceTime(30_000));
  const snapshot = await page.evaluate(() => window.__wonderloop.snapshot());

  const required = ["mode", "day", "money", "growthScore", "growthLabel", "guestStates", "rides", "recentEvents"];
  const missing = required.filter((k) => !(k in snapshot));
  if (missing.length) throw new Error(`Snapshot missing keys: ${missing.join(", ")}`);
  if (snapshot.rides.length < 3) throw new Error(`Expected >=3 rides/facilities, got ${snapshot.rides.length}`);

  // Pause and verify that guests do not advance.
  await page.evaluate(() => window.__wonderloop.setSpeed(0));
  const before = await page.evaluate(() => window.__wonderloop.state.guests.map((g) => ({ id: g.id, x: g.x, y: g.y })));
  await page.evaluate(() => window.advanceTime(1000));
  const after = await page.evaluate(() => window.__wonderloop.state.guests.map((g) => ({ id: g.id, x: g.x, y: g.y })));
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("Guests moved while paused");
  }

  console.log("QA OK");
  console.log("  guestsInside:", snapshot.guestsInside);
  console.log("  growthScore: ", snapshot.growthScore, `(${snapshot.growthLabel})`);
  console.log("  rides:       ", snapshot.rides.length);
} catch (err) {
  console.error("QA FAILED:", err.message);
  exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}

process.exit(exitCode);
