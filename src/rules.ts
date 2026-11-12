/**
 * Rule tables for Korean sentence boundaries. Every rule has an example in a comment.
 * Words are whitespace-delimited tokens of the NFC working copy.
 */

/** Same set as the regex `\s`. */
export function isWs(c: number): boolean {
  return (
    c === 32 || (c >= 9 && c <= 13) || c === 0xa0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000 || c === 0xfeff
  );
}

/** Sentence-final punctuation: . ? ! … and the full-width forms 。 ！ ？ */
export function isPunct(ch: string): boolean {
  return ch === "." || ch === "?" || ch === "!" || ch === "…" || ch === "。" || ch === "！" || ch === "？";
}

/** Quote closers absorbed after punctuation: 그는 "가요?" 하고 */
export const QUOTE_CLOSERS = new Set(['"', "”", "’", "'", "」", "』"]);
/** Bracket closers absorbed after punctuation: 좋았다(표 3 참고). */
export const BRACKET_CLOSERS = new Set([")", "]", "}", "〉", "》", "】", "）"]);

export function isCloser(ch: string): boolean {
  return QUOTE_CLOSERS.has(ch) || BRACKET_CLOSERS.has(ch);
}

/** Opener -> closer pairs used to keep text inside quotes and brackets together. */
export const PAIRS: Record<string, string> = {
  "(": ")", "[": "]", "{": "}", "“": "”", "‘": "’", "「": "」", "『": "』", "〈": "〉", "《": "》", "【": "】", "（": "）",
};

/**
 * A quoted span longer than this is not treated as one unit, so a stray quote
 * mark cannot swallow the rest of a long document.
 */
export const MAX_SPAN = 1000;

/** Quotation particle right after a closing quote: "가요?" 하고 물었다 */
export const QUOTE_PARTICLE = /^(?:이?라고|이?라며|하고|이?라는)(?![가-힣])/;

/** Connective endings: the clause continues, so these never end a sentence (used when re-splitting long sentences). */
export const CONNECTIVE = /(?:는데|은데|ㄴ데|지만|면서|어서|아서|으니|니까|려고|거나|든지|도록|다가|면|고|며|서)$/;

const SYL_BASE = 0xac00;
const SYL_END = 0xd7a3;
const JONG_N = 4; // ㄴ  한다, 간다
const JONG_SS = 20; // ㅆ  했다, 갔어, 있다
const JONG_BS = 18; // ㅄ  없다, 없어
const JONG_B = 17; // ㅂ  합니다 -> 합니까

function isSyllable(c: number): boolean {
  return c >= SYL_BASE && c <= SYL_END;
}

function jong(c: number): number {
  return (c - SYL_BASE) % 28;
}

/** Nouns that end in 요 but are not a polite ending: 중요 안건, 필요 인원 */
const NOUN_YO = /(?:중요|필요|주요|개요|긴요|수요|소요|불요)$/;

/** Emoticon-style tails glued to a final ending: 끝났어요ㅋㅋ, 감사합니다~ */
const TAIL = new Set(["ㅋ", "ㅎ", "ㅠ", "ㅜ", "~", "^"]);

/**
 * Does this word look like the last word of a sentence?
 * Matches a closed table of endings, never a bare "다":
 *   -니다 / -습니까   합니다, 갑니까
 *   -요 / -죠          했어요, 그렇죠
 *   -ㅆ다 -ㄴ다 -이다  했다, 한다, 학생이다
 *   -ㅆ어 / -거야 / -구나 / -잖아
 * Connective words (-는데, -지만, -면서, -어서, -고 ...) are not in the table, so they never end a sentence.
 */
export function isSentenceFinal(rawWord: string): boolean {
  let end = rawWord.length;
  while (end > 0) {
    const ch = rawWord[end - 1] as string;
    if (TAIL.has(ch) || QUOTE_CLOSERS.has(ch)) end--;
    else if (BRACKET_CLOSERS.has(ch)) return false; // (… 합니다) 널리 쓰인다: the bracket continues the sentence
    else break;
  }
  if (end < 2) return false;
  const w = rawWord.slice(0, end);
  const last = w.charCodeAt(end - 1);
  if (!isSyllable(last)) return false;
  const lastCh = w[end - 1];
  const prev = w.charCodeAt(end - 2);

  if (lastCh === "다") {
    if (w[end - 2] === "니") return true; // 합니다, 아닙니다
    if (!isSyllable(prev)) return false;
    const j = jong(prev);
    return j === JONG_SS || j === JONG_N || j === JONG_BS || w[end - 2] === "이"; // 했다 한다 없다 이다
  }
  if (lastCh === "까" && w[end - 2] === "니") {
    return end >= 3 && isSyllable(w.charCodeAt(end - 3)) && jong(w.charCodeAt(end - 3)) === JONG_B; // 합니까, 습니까
  }
  if (lastCh === "요") return !NOUN_YO.test(w); // 했어요, 볼게요, 감사해요
  if (lastCh === "죠") return true; // 그렇죠
  if (lastCh === "아" && w[end - 2] === "잖") return true; // 알잖아
  if ((lastCh === "어" || lastCh === "아") && isSyllable(prev)) {
    const j = jong(prev);
    return j === JONG_SS || j === JONG_BS; // 갔어, 알았어, 없어
  }
  if (lastCh === "야") return w[end - 2] === "거"; // 괜찮을 거야
  if (lastCh === "나") return w[end - 2] === "구"; // 그렇구나
  return false;
}

/** Emoji and similar symbol-only tokens that stick to the previous sentence: 수고했어요 😀 */
export const SYMBOL_ONLY = /^[\p{Extended_Pictographic}‍️~^]+$/u;

/** URLs and e-mail addresses are never cut inside. */
export const URL_RE = /(?:https?:\/\/|www\.)[^\s]+/g;
/** Characters trimmed from the end of a URL match: 보세요 https://a.b/c. */
export const URL_TRAILING = /[.,;:!?)\]"'”’」』]+$/;
