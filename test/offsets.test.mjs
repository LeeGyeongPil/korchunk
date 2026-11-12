// AC-2: offsets point into the original text (UTF-16), also for emoji, NFD and CRLF.
import test from "node:test";
import assert from "node:assert/strict";
import { splitSentences, chunk } from "../dist/index.js";
import { loadGold, assertSentenceInvariants, assertChunkInvariants } from "./helpers.mjs";

test("gold corpus: sentence and chunk invariants hold for every case", () => {
  for (const g of loadGold()) {
    const sentences = splitSentences(g.text, g.options);
    assertSentenceInvariants(g.text, sentences);
    for (const maxChars of [5, 12, 30, 200]) {
      assertChunkInvariants(g.text, chunk(g.text, { ...g.options, maxChars, overlapSentences: 1 }));
    }
  }
});

test("emoji (surrogate pairs) count as two UTF-16 units", () => {
  const text = "😀 배포 끝났어요 😀 다음은 내일이에요.";
  const s = splitSentences(text);
  assertSentenceInvariants(text, s);
  assert.equal(s[0].text, "😀 배포 끝났어요 😀");
  assert.equal(s[0].start, 0);
  assert.equal(s[0].end, "😀 배포 끝났어요 😀".length);
});

test("NFD input is judged like NFC but offsets refer to the original string", () => {
  const nfc = "어제 배포했어요 그런데 로그가 안 쌓이더라고요. 그래서 롤백했습니다.";
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd.length, nfc.length);
  const a = splitSentences(nfc);
  const b = splitSentences(nfd);
  assertSentenceInvariants(nfd, b);
  assert.deepEqual(
    b.map((s) => s.text.normalize("NFC")),
    a.map((s) => s.text),
  );
  assert.deepEqual(
    b.map((s) => s.reason),
    a.map((s) => s.reason),
  );
  assertChunkInvariants(nfd, chunk(nfd, { maxChars: 60, overlapSentences: 1 }));
});

test("NFD text that mixes Latin combining marks keeps offsets exact", () => {
  const text = "Café 열었어요 그리고 résumé 도 썼어요. 끝났습니다.";
  const s = splitSentences(text);
  assertSentenceInvariants(text, s);
  assert.equal(s.length, 3);
});

test("CRLF line breaks: outer whitespace is excluded", () => {
  const text = "확인했습니다\r\n내일 다시 볼게요\r\n\r\n고마워요\r\n";
  const s = splitSentences(text);
  assertSentenceInvariants(text, s);
  assert.deepEqual(
    s.map((x) => x.text),
    ["확인했습니다", "내일 다시 볼게요", "고마워요"],
  );
});

test("offsets stay exact with leading and trailing whitespace", () => {
  const text = "   \n  안녕하세요. 반갑습니다.   \n\n";
  const s = splitSentences(text);
  assertSentenceInvariants(text, s);
  assert.equal(s[0].start, text.indexOf("안녕"));
  assert.equal(s[1].end, text.indexOf("반갑습니다.") + "반갑습니다.".length);
});

test("chunk text is the original slice with whitespace between sentences kept", () => {
  const text = "첫째입니다.\n\n둘째입니다.   셋째입니다.";
  const [c] = chunk(text, { maxChars: 100 });
  assert.equal(c.text, text);
  assert.equal(c.start, 0);
  assert.equal(c.end, text.length);
});
