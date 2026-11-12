// Shared test helpers: load the gold corpus and assert offset invariants.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadGold() {
  const raw = readFileSync(join(ROOT, "test/fixtures/gold.jsonl"), "utf8");
  return raw
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
}

/** Offsets point at the original text, have no outer whitespace, do not overlap, and ascend. */
export function assertSentenceInvariants(text, sentences) {
  let prevEnd = 0;
  for (const s of sentences) {
    assert.equal(text.slice(s.start, s.end), s.text, "text must equal original.slice(start, end)");
    assert.ok(s.text.length > 0, "empty sentence");
    assert.equal(s.text, s.text.trim(), "sentence must not carry outer whitespace");
    assert.ok(s.start >= prevEnd, `sentences overlap or go backwards at ${s.start} < ${prevEnd}`);
    assert.ok(["punct", "ending", "newline", "end"].includes(s.reason), `bad reason ${s.reason}`);
    prevEnd = s.end;
  }
}

export function assertChunkInvariants(text, chunks) {
  chunks.forEach((c, i) => {
    assert.equal(c.index, i);
    assert.equal(text.slice(c.start, c.end), c.text);
    assert.ok(c.sentences.length > 0);
    assert.equal(c.sentences[0].start, c.start);
    assert.equal(c.sentences[c.sentences.length - 1].end, c.end);
    assertSentenceInvariants(text, c.sentences);
  });
}
