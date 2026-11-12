// Package smoke test: what `npm pack` would publish, runtime dependencies, ESM import and CJS require.
// Prints "smoke ok" as the last line when everything holds.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
check(Object.keys(pkg.dependencies ?? {}).length === 0, "package.json must have no runtime dependencies");
check(pkg.type === "module", 'package.json "type" must be "module"');
check(pkg.engines?.node === ">=20.19", 'engines.node must be ">=20.19" (require(esm) support)');
// Node 20 does not expand globs given to `node --test`, so no npm script may rely on one
for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) check(!cmd.includes("*"), `npm script "${name}" uses a glob, which Node 20 does not expand: ${cmd}`);

// 1) pack contents (dry run, no files are written)
const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const packed = JSON.parse(out)[0].files.map((f) => f.path);
const required = ["dist/index.js", "dist/index.d.ts", "bin/korchunk.mjs", "bin/i18n.mjs", "package.json", "LICENSE"];
// READMEs are written by the release step; once they exist in the working tree they must be packed
for (const readme of ["README.md", "README.en.md"]) if (existsSync(join(ROOT, readme))) required.push(readme);
for (const f of required) check(packed.includes(f), `pack is missing ${f}`);
for (const f of packed) {
  check(!f.startsWith("test/"), `pack must not include tests: ${f}`);
  check(!f.startsWith("src/"), `pack must not include sources: ${f}`);
  check(!f.startsWith("scripts/"), `pack must not include scripts: ${f}`);
}

// 2) ESM import and CJS require (require(esm)) through the package name
const esm = spawnSync(
  process.execPath,
  ["--input-type=module", "-e", 'import { splitSentences, chunk } from "korchunk"; if (typeof splitSentences !== "function" || typeof chunk !== "function") process.exit(3);'],
  { cwd: ROOT, encoding: "utf8" },
);
check(esm.status === 0, `ESM import failed: ${esm.stderr}`);
const cjs = spawnSync(
  process.execPath,
  ["-e", 'const k = require("korchunk"); if (typeof k.splitSentences !== "function" || k.splitSentences("안녕하세요. 반갑습니다.").length !== 2) process.exit(3);'],
  { cwd: ROOT, encoding: "utf8" },
);
check(cjs.status === 0, `CJS require failed (needs Node 20.19+ / 22.12+): ${cjs.stderr}`);

if (problems.length > 0) {
  for (const p of problems.filter(Boolean)) console.error(`smoke problem: ${p}`);
  process.exit(1);
}
console.log(`packed files: ${packed.length}`);
console.log("smoke ok");
