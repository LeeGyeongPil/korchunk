// Compares korchunk with Intl.Segmenter on the hand-written gold corpus (test/fixtures/gold.jsonl).
// Metrics: exact = share of cases whose sentence list matches exactly,
// precision / recall = sentence-end boundaries over all cases (micro average).
// Exit code 0 and a final "PASS" line when the thresholds below hold.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { splitSentences } from "../dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const THRESHOLDS = { exact: 0.9, precision: 0.95, recall: 0.9, margin: 0.2 };

const cases = readFileSync(join(ROOT, "test/fixtures/gold.jsonl"), "utf8")
  .split("\n")
  .filter((l) => l.trim() !== "")
  .map((l) => JSON.parse(l));

/** End offsets of the gold sentences, found by walking through the text. */
function goldEnds(c) {
  const ends = [];
  let cursor = 0;
  for (const s of c.sentences) {
    const at = c.text.indexOf(s, cursor);
    if (at < 0) throw new Error(`gold case ${c.id}: sentence not found in text: ${s}`);
    cursor = at + s.length;
    ends.push(cursor);
  }
  return ends;
}

function intlSentences(text) {
  const seg = new Intl.Segmenter("ko", { granularity: "sentence" });
  const out = [];
  for (const { segment, index } of seg.segment(text)) {
    const lead = segment.length - segment.trimStart().length;
    const body = segment.trim();
    if (body !== "") out.push({ text: body, end: index + lead + body.length });
  }
  return out;
}

function score(name, predict) {
  let exact = 0;
  let tp = 0;
  let predicted = 0;
  let gold = 0;
  const misses = [];
  for (const c of cases) {
    const got = predict(c);
    const want = goldEnds(c);
    const gotEnds = got.map((s) => s.end);
    if (JSON.stringify(got.map((s) => s.text)) === JSON.stringify(c.sentences)) exact++;
    else misses.push(c.id);
    const wantSet = new Set(want);
    tp += gotEnds.filter((e) => wantSet.has(e)).length;
    predicted += gotEnds.length;
    gold += want.length;
  }
  return { name, exact: exact / cases.length, precision: tp / predicted, recall: tp / gold, misses };
}

const categories = new Set(cases.map((c) => c.category));
const perCategory = new Map();
for (const c of cases) perCategory.set(c.category, (perCategory.get(c.category) ?? 0) + 1);

console.log(`node ${process.version}, ICU ${process.versions.icu}`);
console.log(`gold: ${cases.length} hand-written cases, ${categories.size} categories`);

const rows = [
  score("korchunk", (c) => splitSentences(c.text, c.options)),
  score("Intl.Segmenter", (c) => intlSentences(c.text)),
];

const pct = (v) => v.toFixed(3);
console.log("");
console.log(`${"splitter".padEnd(16)}${"exact".padStart(8)}${"precision".padStart(11)}${"recall".padStart(9)}`);
for (const r of rows) {
  console.log(`${r.name.padEnd(16)}${pct(r.exact).padStart(8)}${pct(r.precision).padStart(11)}${pct(r.recall).padStart(9)}`);
}
console.log("");
console.log(`korchunk misses: ${rows[0].misses.join(", ") || "none"}`);
console.log(`Intl.Segmenter misses: ${rows[1].misses.length} of ${cases.length} cases`);

const [k, intl] = rows;
const checks = [
  [`cases >= 40`, cases.length >= 40],
  [`categories >= 10, each with >= 2 cases`, categories.size >= 10 && [...perCategory.values()].every((n) => n >= 2)],
  [`exact >= ${THRESHOLDS.exact}`, k.exact >= THRESHOLDS.exact],
  [`precision >= ${THRESHOLDS.precision}`, k.precision >= THRESHOLDS.precision],
  [`recall >= ${THRESHOLDS.recall}`, k.recall >= THRESHOLDS.recall],
  [`exact margin over Intl.Segmenter >= ${THRESHOLDS.margin}`, k.exact - intl.exact >= THRESHOLDS.margin],
];
console.log("");
for (const [label, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${label}`);

const pass = checks.every(([, ok]) => ok);
console.log(pass ? "PASS" : "FAIL");
process.exitCode = pass ? 0 : 1;
