#!/usr/bin/env node
// Smoke test that exercises the live game's window-globals. Starts a static
// server, navigates to the page, advances time deterministically via the QA
// hooks, and asserts the snapshot has the keys we expect.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, sep, resolve as resolvePath } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const PORT = 5173;
const APP_URL = `http://127.0.0.1:${PORT}/`;
const ROOT = resolvePath(fileURLToPath(new URL("..", import.meta.url)));

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function filePathFor(requestUrl) {
  const url = new URL(requestUrl, APP_URL);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const fullPath = resolvePath(ROOT, `.${pathname}`);
  return fullPath === ROOT || fullPath.startsWith(`${ROOT}${sep}`) ? fullPath : null;
}

function startServer() {
  const server = createServer(async (req, res) => {
    const filePath = filePathFor(req.url ?? "/");
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const data = await readFile(filePath);
      res.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function waitForServer(maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(APP_URL);
      if (res.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error("Server did not come up in time");
}

const server = await startServer();
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

  await page.goto(APP_URL);
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
  server.close();
}

process.exit(exitCode);
