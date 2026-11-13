// The version exported by the library must match package.json and the lockfile.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./helpers.mjs";

test("src/index.ts version equals package.json and package-lock.json", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8"));
  const src = readFileSync(join(ROOT, "src/index.ts"), "utf8");
  const m = /export const version = "([^"]+)"/.exec(src);
  assert.ok(m, "src/index.ts must export a version constant");
  assert.equal(m[1], pkg.version);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
});
