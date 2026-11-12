// AC-10: 200k characters must split and chunk within 2 seconds, with offsets intact.
import test from "node:test";
import assert from "node:assert/strict";
import { chunk, splitSentences } from "../dist/index.js";
import { assertSentenceInvariants, assertChunkInvariants } from "./helpers.mjs";

function makeText(minLength) {
  const parts = [
    "어제 배포했어요 그런데 로그가 안 쌓이더라고요 그래서 롤백했습니다.",
    "버전 3.11.2 에서 고쳐졌다. 정확도는 92.5% 였다.",
    '그는 "내일 오겠다. 꼭 기다려라."라고 말했다.',
    "결과는 좋았다(표 3 참고). 자세한 내용은 https://example.com/a.b 를 보세요.",
    "확인했습니다\n내일 다시 볼게요\n고마워요",
    "1. 설치한다 2. 실행한다 3. 확인한다",
    "글쎄요... 잘 모르겠어요 😀 다시 볼게요.\n\n",
  ];
  let out = "";
  let i = 0;
  while (out.length < minLength) out += parts[i++ % parts.length] + " ";
  return out;
}

test("200k characters: split + chunk in under 2 seconds", () => {
  const text = makeText(200_000);
  assert.ok(text.length >= 200_000);
  const started = performance.now();
  const sentences = splitSentences(text);
  const chunks = chunk(text, { maxChars: 500, overlapSentences: 1 });
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 2000, `took ${elapsed.toFixed(0)} ms`);
  assert.ok(sentences.length > 5000);
  assertSentenceInvariants(text, sentences);
  assertChunkInvariants(text, chunks);
  for (const c of chunks) assert.ok(c.size <= 500);
});

test("200k characters of NFD text stay fast too", () => {
  const text = makeText(200_000).normalize("NFD");
  const started = performance.now();
  const sentences = splitSentences(text);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 2000, `took ${elapsed.toFixed(0)} ms`);
  assertSentenceInvariants(text, sentences);
});

test("a long text without any boundary does not blow up", () => {
  const text = "가나다 ".repeat(40_000);
  const started = performance.now();
  const chunks = chunk(text, { maxChars: 500 });
  assert.ok(performance.now() - started < 2000);
  assertChunkInvariants(text, chunks);
});

// Q-1 regression: one huge whitespace-free token used to be quadratic (slice per punctuation mark).
test("400k-char tokens without whitespace stay linear", () => {
  const dots = "1.".repeat(200_000);
  const url = "https://example.com/?q=" + "a.".repeat(200_000);
  for (const text of [dots, url, "가.".repeat(200_000)]) {
    const started = performance.now();
    const sentences = splitSentences(text);
    const chunks = chunk(text, { maxChars: 500 });
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 2000, `took ${elapsed.toFixed(0)} ms`);
    assertSentenceInvariants(text, sentences);
    assertChunkInvariants(text, chunks);
  }
});
