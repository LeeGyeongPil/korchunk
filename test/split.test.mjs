// AC-1: sentence boundary rules against expected sentence lists.
import test from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "../dist/index.js";
import { loadGold } from "./helpers.mjs";

const texts = (input, options) => splitSentences(input, options).map((s) => s.text);

test("every gold case splits exactly as expected", () => {
  for (const g of loadGold()) {
    assert.deepEqual(texts(g.text, g.options), g.sentences, `gold case ${g.id}`);
  }
});

test("probe cases: punctuation, spoken endings, chat lines", () => {
  assert.deepEqual(texts("오늘 회의는 3시에 시작합니다. 자료는 미리 읽어 주세요! 질문 있나요?").length, 3);
  assert.deepEqual(texts("어제 배포했어요 그런데 로그가 안 쌓이더라고요 그래서 롤백했습니다"), [
    "어제 배포했어요",
    "그런데 로그가 안 쌓이더라고요",
    "그래서 롤백했습니다",
  ]);
  assert.deepEqual(texts("확인했습니다\n내일 다시 볼게요\n고마워요"), ["확인했습니다", "내일 다시 볼게요", "고마워요"]);
});

test("decimals, versions, list numbers and URLs are not boundaries", () => {
  assert.equal(texts("버전 3.11.2 에서 고쳐졌다. 정확도는 92.5% 였다.").length, 2);
  assert.deepEqual(texts("1. 설치한다 2. 실행한다 3. 확인한다"), ["1. 설치한다", "2. 실행한다", "3. 확인한다"]);
  assert.equal(texts("자세한 내용은 https://example.com/a.b 를 보세요. 예: 서울시 등.").length, 2);
});

test("quotes and brackets keep their inside together", () => {
  assert.equal(texts('그는 "내일 오겠다. 꼭 기다려라."라고 말했다. 나는 기다렸다.').length, 2);
  assert.equal(texts("결과는 좋았다(표 3 참고). 다음 단계로 간다.").length, 2);
});

test("reason tells why a sentence ended", () => {
  const s = splitSentences("확인했습니다\n내일 볼게요. 그래서 저는 갔어요 끝");
  assert.deepEqual(
    s.map((x) => x.reason),
    ["ending", "punct", "ending", "end"],
  );
  const nl = splitSentences("제목\n\n본문");
  assert.deepEqual(
    nl.map((x) => [x.text, x.reason]),
    [
      ["제목", "newline"],
      ["본문", "end"],
    ],
  );
});

test('option endings: "punct-only" ignores spoken endings', () => {
  const input = "어제 배포했어요 그런데 안 쌓여요. 롤백했습니다";
  assert.deepEqual(texts(input, { endings: "punct-only" }), ["어제 배포했어요 그런데 안 쌓여요.", "롤백했습니다"]);
  assert.equal(texts(input).length, 3);
});

test('option newline: "break" cuts at every line break, "paragraph" only at blank lines', () => {
  const input = "회의록\n참석자 세 명\n\n결정 사항";
  assert.deepEqual(texts(input), ["회의록\n참석자 세 명", "결정 사항"]);
  assert.deepEqual(texts(input, { newline: "break" }), ["회의록", "참석자 세 명", "결정 사항"]);
});

test('option ellipsis: "keep" does not cut at ...', () => {
  const input = "글쎄요... 잘 모르겠어요.";
  assert.equal(texts(input).length, 2);
  assert.equal(texts(input, { ellipsis: "keep" }).length, 1);
});

test("abbreviations and protect patterns suppress boundaries", () => {
  assert.equal(texts("No. 5 모델이 빠르다. 좋다.").length, 3);
  assert.equal(texts("No. 5 모델이 빠르다. 좋다.", { abbreviations: ["No."] }).length, 2);
  assert.equal(texts("티켓 AB. 12 처리했다. 끝.", { protect: [/AB\. 12/] }).length, 2);
});

test("connective endings and noun-like words do not end a sentence", () => {
  assert.equal(texts("비가 오는데 우산이 없어서 젖었지만 괜찮았다").length, 1);
  assert.equal(texts("필요 인원을 확인하면서 중요 사항도 적고").length, 1);
});

test("an unmatched quote cannot swallow the rest of the text", () => {
  assert.equal(texts('그가 "안녕이라고 했다. 그리고 갔다.').length, 2);
});

test("empty and whitespace-only input", () => {
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences("  \n\t \r\n "), []);
});

test("a non-string input is rejected", () => {
  assert.throws(() => splitSentences(42), TypeError);
});

test("same input gives the same output (deterministic, no hidden state)", () => {
  const input = "어제 배포했어요 그런데 안 쌓여요. 롤백했습니다";
  assert.deepEqual(splitSentences(input), splitSentences(input));
});
