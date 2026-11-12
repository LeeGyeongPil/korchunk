// AC-4: option validation and empty input.
import test from "node:test";
import assert from "node:assert/strict";
import { chunk, splitSentences, KorchunkOptionError } from "../dist/index.js";

function expectCode(fn, code) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof KorchunkOptionError, "KorchunkOptionError expected");
    assert.ok(err instanceof RangeError, "must inherit RangeError");
    assert.equal(err.code, code);
    assert.ok(err.message.length > 10, "message should explain how to fix it");
    return true;
  });
}

const tok = (s) => s.length;

test("budget: missing, both, or out of range", () => {
  expectCode(() => chunk("가나다.", {}), "E_BUDGET_MISSING");
  expectCode(() => chunk("가나다.", undefined), "E_BUDGET_MISSING");
  expectCode(() => chunk("가나다.", { maxChars: 10, maxTokens: 5, countTokens: tok }), "E_BUDGET_BOTH");
  for (const bad of [0, -1, 1.5, NaN, Infinity, "10"]) {
    expectCode(() => chunk("가나다.", { maxChars: bad }), "E_BUDGET_RANGE");
    expectCode(() => chunk("가나다.", { maxTokens: bad, countTokens: tok }), "E_BUDGET_RANGE");
  }
});

test("maxTokens needs a countTokens function that returns a valid number", () => {
  expectCode(() => chunk("가나다.", { maxTokens: 5 }), "E_COUNT_TOKENS");
  expectCode(() => chunk("가나다.", { maxTokens: 5, countTokens: "nope" }), "E_COUNT_TOKENS");
  expectCode(() => chunk("가나다.", { maxTokens: 5, countTokens: () => NaN }), "E_COUNT_TOKENS");
  expectCode(() => chunk("가나다.", { maxTokens: 5, countTokens: () => -1 }), "E_COUNT_TOKENS");
});

test("overlapSentences must be an integer >= 0", () => {
  for (const bad of [-1, 0.5, NaN, "1"]) {
    expectCode(() => chunk("가나다.", { maxChars: 10, overlapSentences: bad }), "E_OVERLAP");
  }
  assert.doesNotThrow(() => chunk("가나다.", { maxChars: 10, overlapSentences: 0 }));
});

test("unknown enum values and malformed option objects", () => {
  expectCode(() => splitSentences("가나다.", { newline: "wrap" }), "E_OPTION");
  expectCode(() => splitSentences("가나다.", { ellipsis: "drop" }), "E_OPTION");
  expectCode(() => splitSentences("가나다.", { endings: "all" }), "E_OPTION");
  expectCode(() => chunk("가나다.", { maxChars: 10, newline: "x" }), "E_OPTION");
  expectCode(() => splitSentences("가나다.", { abbreviations: "No." }), "E_OPTION");
  expectCode(() => splitSentences("가나다.", { abbreviations: [""] }), "E_OPTION");
  expectCode(() => splitSentences("가나다.", { protect: ["a"] }), "E_OPTION");
  expectCode(() => splitSentences("가나다.", 5), "E_OPTION");
  expectCode(() => splitSentences("가나다.", []), "E_OPTION");
});

test("options are validated even when the text is empty", () => {
  expectCode(() => chunk("", {}), "E_BUDGET_MISSING");
  expectCode(() => splitSentences("", { newline: "x" }), "E_OPTION");
});

test("empty and whitespace-only input give empty results", () => {
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences(" \n\t "), []);
  assert.deepEqual(chunk("", { maxChars: 10 }), []);
  assert.deepEqual(chunk("   ", { maxTokens: 3, countTokens: tok }), []);
});

test("KorchunkOptionError has a name and code", () => {
  try {
    chunk("가", {});
    assert.fail("should throw");
  } catch (e) {
    assert.equal(e.name, "KorchunkOptionError");
    assert.equal(e.code, "E_BUDGET_MISSING");
  }
});

test("option errors show the type and reject unknown keys", () => {
  assert.throws(() => chunk("가나다.", { maxChars: "10" }), /"10" \(string\)/);
  assert.throws(() => chunk("가나다.", { maxChars: 500, overlap: 1 }), /Unknown option "overlap"; did you mean "overlapSentences"/);
  assert.throws(() => splitSentences("가나다.", { bogus: 1 }), (e) => e.code === "E_OPTION");
});
