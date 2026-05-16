#!/usr/bin/env node
// Walk src/, parse static `import` statements, BFS from src/main.js, and
// report files that are not reachable. Catches leftover modules after a
// refactor without needing any heavy tooling.

import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const srcRoot = resolve(root, "src");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const IMPORT_RE = /import\s+(?:[\s\S]+?\s+from\s+)?["']([^"']+)["']/g;

async function findImports(file) {
  const text = await readFile(file, "utf8");
  const imports = [];
  let m;
  while ((m = IMPORT_RE.exec(text))) imports.push(m[1]);
  return imports;
}

async function exists(p) {
  try { await stat(p); return true; }
  catch { return false; }
}

async function resolveImport(from, spec) {
  if (!spec.startsWith(".")) return null;
  const fullSpec = resolve(dirname(from), spec);
  if (await exists(fullSpec)) return fullSpec;
  if (await exists(fullSpec + ".js")) return fullSpec + ".js";
  if (await exists(join(fullSpec, "index.js"))) return join(fullSpec, "index.js");
  throw new Error(`Cannot resolve "${spec}" from ${relative(root, from)}`);
}

const allFiles = new Set((await walk(srcRoot)).map((p) => resolve(p)));
const entry = resolve(srcRoot, "main.js");
if (!allFiles.has(entry)) {
  console.error("Missing entry:", entry);
  process.exit(2);
}

const reached = new Set([entry]);
const queue = [entry];
while (queue.length) {
  const current = queue.shift();
  for (const spec of await findImports(current)) {
    const target = await resolveImport(current, spec);
    if (target && !reached.has(target)) {
      reached.add(target);
      queue.push(target);
    }
  }
}

const orphans = [...allFiles].filter((p) => !reached.has(p)).sort();
if (orphans.length) {
  console.error("Unreferenced source files:");
  for (const file of orphans) console.error("  -", relative(root, file));
  process.exit(1);
}
console.log(`OK: ${reached.size} files reachable from src/main.js`);
