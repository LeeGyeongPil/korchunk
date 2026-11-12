// AC-3: chunk packing, overlap, oversize sentences and token budgets.
import test from "node:test";
import assert from "node:assert/strict";
import { chunk, splitSentences } from "../dist/index.js";
import { loadGold, assertChunkInvariants } from "./helpers.mjs";

const DOC = [
  "오늘 회의는 3시에 시작합니다. 자료는 미리 읽어 주세요. 질문이 있으면 말해 주세요.",
  "어제 배포했어요 그런데 로그가 안 쌓이더라고요 그래서 롤백했습니다. 지금은 정상이에요.",
  "다음 회의는 목요일입니다. 준비할 것은 세 가지예요. 감사합니다.",
].join(" ");

test("every chunk stays within maxChars and ends at a sentence end", () => {
  for (const maxChars of [40, 60, 90, 150]) {
    const chunks = chunk(DOC, { maxChars });
    assertChunkInvariants(DOC, chunks);
    const sentenceEnds = new Set(splitSentences(DOC).map((s) => s.end));
    for (const c of chunks) {
      assert.ok(c.size <= maxChars, `size ${c.size} > ${maxChars}`);
      assert.equal(c.size, c.end - c.start);
      assert.equal(c.split, undefined);
      assert.ok(sentenceEnds.has(c.end), "chunk must end at a sentence end");
    }
    // without overlap every sentence appears exactly once, in order
    const flat = chunks.flatMap((c) => c.sentences.map((s) => s.start));
    assert.deepEqual(flat, splitSentences(DOC).map((s) => s.start));
  }
});

test("chunks fill greedily: the next sentence would not have fit", () => {
  const chunks = chunk(DOC, { maxChars: 60 });
  const sentences = splitSentences(DOC);
  for (let i = 0; i + 1 < chunks.length; i++) {
    const next = sentences.find((s) => s.start >= chunks[i].end);
    assert.ok(next.end - chunks[i].start > 60);
  }
});

test("overlapSentences: 1 repeats the previous chunk's last sentence", () => {
  const chunks = chunk(DOC, { maxChars: 60, overlapSentences: 1 });
  assert.ok(chunks.length > 2);
  assertChunkInvariants(DOC, chunks);
  for (let i = 1; i < chunks.length; i++) {
    const prevLast = chunks[i - 1].sentences.at(-1);
    assert.deepEqual(chunks[i].sentences[0], prevLast);
    assert.ok(chunks[i].size <= 60);
  }
});

test("overlap is dropped when it would break the budget", () => {
  const text = "가나다라마바사아자차. 카타파하거너더러머버.";
  // each sentence is 11 chars; two do not fit in 12, so no overlap is possible
  const chunks = chunk(text, { maxChars: 12, overlapSentences: 1 });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[1].sentences.length, 1);
  assert.equal(chunks[1].text, "카타파하거너더러머버.");
});

test("overlapSentences larger than needed is reduced until the budget holds", () => {
  const chunks = chunk(DOC, { maxChars: 70, overlapSentences: 5 });
  assertChunkInvariants(DOC, chunks);
  for (const c of chunks) assert.ok(c.size <= 70);
  assert.ok(chunks.length >= 2);
});

test("a sentence longer than the budget is cut at clause boundaries first", () => {
  const text = "비가 오는데 우산이 없어서 집에 가지 못했고, 그래서 한참을 기다리다가 결국 택시를 탔습니다.";
  const chunks = chunk(text, { maxChars: 24 });
  assertChunkInvariants(text, chunks);
  assert.ok(chunks.length >= 3);
  for (const c of chunks) {
    assert.ok(c.size <= 24, `size ${c.size}`);
    assert.ok(c.split, "every piece is marked");
  }
  assert.equal(chunks[0].split, "clause");
  assert.match(chunks[0].text, /(?:는데|어서|고,)$/);
});

test("without clause boundaries the cut falls back to spaces, then characters", () => {
  const bySpace = chunk("가나다 라마바 사아자 차카타 파하", { maxChars: 8 });
  assert.ok(bySpace.every((c) => c.split === "space" && c.size <= 8));
  assert.deepEqual(
    bySpace.map((c) => c.text),
    ["가나다 라마바", "사아자 차카타", "파하"],
  );
  const hard = chunk("가나다라마바사아자차카타", { maxChars: 5 });
  assert.ok(hard.every((c) => c.split === "hard" && c.size <= 5));
  assert.equal(hard.map((c) => c.text).join(""), "가나다라마바사아자차카타");
});

test("hard cuts never split a surrogate pair", () => {
  const text = "😀".repeat(9);
  for (const maxChars of [3, 4, 5, 7]) {
    const chunks = chunk(text, { maxChars });
    assert.equal(chunks.map((c) => c.text).join(""), text);
    for (const c of chunks) {
      assert.ok(c.size <= maxChars);
      assert.equal([...c.text].length * 2, c.text.length, "whole code points only");
    }
  }
});

test("a short sentence after an oversize one starts a fresh chunk", () => {
  const text = "가나다라마바사아자차카타파하 거너더러머버서어저처. 짧은 문장이에요.";
  const chunks = chunk(text, { maxChars: 15, overlapSentences: 1 });
  assertChunkInvariants(text, chunks);
  const last = chunks.at(-1);
  assert.equal(last.text, "짧은 문장이에요.");
  assert.equal(last.split, undefined);
});

test("maxTokens with countTokens: every chunk stays within the token budget", () => {
  const calls = [];
  const countTokens = (s) => {
    calls.push(s);
    return s.split(/\s+/).filter(Boolean).length; // word count as a stand-in tokenizer
  };
  const chunks = chunk(DOC, { maxTokens: 10, countTokens, overlapSentences: 1 });
  assertChunkInvariants(DOC, chunks);
  assert.ok(chunks.length >= 3);
  for (const c of chunks) {
    assert.ok(c.size <= 10, `tokens ${c.size}`);
    assert.equal(c.size, countTokens(c.text));
  }
  assert.ok(calls.every((s) => typeof s === "string"));
});

test("token budget: an oversize sentence is cut by tokens too", () => {
  const countTokens = (s) => s.split(/\s+/).filter(Boolean).length;
  const text = "하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열 열하나 열둘";
  const chunks = chunk(text, { maxTokens: 5, countTokens });
  assertChunkInvariants(text, chunks);
  assert.deepEqual(
    chunks.map((c) => c.size),
    [5, 5, 2],
  );
  assert.ok(chunks.every((c) => c.split === "space"));
});

test("gold documents chunk without losing text", () => {
  for (const g of loadGold()) {
    const chunks = chunk(g.text, { ...g.options, maxChars: 20 });
    assertChunkInvariants(g.text, chunks);
    for (const c of chunks) assert.ok(c.size <= 20);
    const covered = chunks.map((c) => c.text.replace(/\s+/g, "")).join("");
    assert.equal(covered, g.text.replace(/\s+/g, ""));
  }
});

test("empty input gives no chunks", () => {
  assert.deepEqual(chunk("", { maxChars: 10 }), []);
  assert.deepEqual(chunk(" \n ", { maxChars: 10 }), []);
});
