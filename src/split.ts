import { normalize } from "./normalize.js";
import { resolveSplitOptions } from "./options.js";
import { computeProtected } from "./protect.js";
import { isCloser, isPunct, isSentenceFinal, isWs, QUOTE_CLOSERS, QUOTE_PARTICLE, SYMBOL_ONLY } from "./rules.js";
import type { BoundaryReason, Sentence, SplitOptions } from "./types.js";

interface Cut {
  pos: number;
  reason: BoundaryReason;
}

/**
 * Splits Korean text into sentences with offsets into the original string.
 *
 * Boundaries come from sentence punctuation, sentence-final endings followed by
 * whitespace, and line breaks (see `SplitOptions`). Quotes, brackets, URLs,
 * decimals, list numbers and abbreviations are never cut inside.
 */
export function splitSentences(text: string, options?: SplitOptions): Sentence[] {
  if (typeof text !== "string") throw new TypeError("splitSentences() expects a string.");
  const opts = resolveSplitOptions(options);
  if (text.length === 0) return [];

  const nz = normalize(text);
  const t = nz.text;
  const n = t.length;
  const prot = computeProtected(t, opts.protect, opts.newline);
  const cuts: Cut[] = [];
  const addCut = (pos: number, reason: BoundaryReason): void => {
    if (prot[pos]) return;
    const last = cuts[cuts.length - 1];
    if (last && last.pos >= pos) return;
    cuts.push({ pos, reason });
  };

  /** Moves a cut past emoji-only tokens: 수고했어요 😀 stays together. */
  const absorbSymbols = (from: number): number => {
    let q = from;
    for (;;) {
      let r = q;
      while (r < n && (t[r] === " " || t[r] === "\t")) r++;
      let e = r;
      while (e < n && !isWs(t.charCodeAt(e))) e++;
      if (e > r && r > q && SYMBOL_ONLY.test(t.slice(r, e))) q = e;
      else return q;
    }
  };

  /** True when t[wordStart, end) ends with an abbreviation; never copies the word (keeps long tokens linear). */
  const endsWithAbbreviation = (wordStart: number, end: number): boolean =>
    opts.abbreviations.some((a) => end - a.length >= wordStart && t.endsWith(a, end));

  let wordStart = 0;
  let i = 0;
  while (i < n) {
    const c = t.charCodeAt(i);
    const ch = t[i] as string;

    if (isWs(c)) {
      if (ch === "\n" && forcedNewline(t, i, opts.newline)) addCut(i, "newline");
      if (opts.endings === "default" && i > wordStart) {
        const word = t.slice(wordStart, i);
        if (isSentenceFinal(word) && !prot[i] && !endsWithAbbreviation(wordStart, i)) {
          const q = absorbSymbols(i);
          addCut(q, "ending");
          if (q > i) {
            wordStart = q;
            i = q;
            continue;
          }
        }
      }
      wordStart = i + 1;
      i++;
      continue;
    }

    if (isPunct(ch)) {
      // one punctuation run (?!, ..., …) plus the quotes/brackets that close right after it
      let j = i;
      while (j < n && isPunct(t[j] as string)) j++;
      let k = j;
      let quoteClosed = false;
      while (k < n && isCloser(t[k] as string)) {
        if (QUOTE_CLOSERS.has(t[k] as string)) quoteClosed = true;
        k++;
      }
      if (k === n || isWs(t.charCodeAt(k))) {
        if (shouldCut(t, wordStart, i, j, k, quoteClosed, opts.ellipsis, endsWithAbbreviation)) {
          const q = absorbSymbols(k);
          addCut(q, "punct");
          if (q > k) {
            wordStart = q;
            i = q;
            continue;
          }
        }
      }
      i = k;
      continue;
    }
    i++;
  }

  const sentences: Sentence[] = [];
  let prev = 0;
  const emit = (to: number, reason: BoundaryReason): void => {
    let s = prev;
    let e = to;
    while (s < e && isWs(t.charCodeAt(s))) s++;
    while (e > s && isWs(t.charCodeAt(e - 1))) e--;
    prev = to;
    if (e <= s) return;
    const start = nz.toStart(s);
    const end = nz.toEnd(e);
    sentences.push({ text: text.slice(start, end), start, end, reason });
  };
  for (const cut of cuts) emit(cut.pos, cut.reason);
  emit(n, "end");
  return sentences;
}

/** A line break that always ends a sentence: every one in "break" mode, only before a blank line in "paragraph" mode. */
function forcedNewline(t: string, i: number, mode: "paragraph" | "break"): boolean {
  if (mode === "break") return true;
  let j = i + 1;
  while (j < t.length && (t[j] === " " || t[j] === "\t" || t[j] === "\r")) j++;
  return t[j] === "\n";
}

/**
 * Decides whether the punctuation run t[i, j) (closers up to k) ends a sentence.
 * `wordStart` is the start of the whitespace-delimited word that holds the run.
 */
function shouldCut(
  t: string,
  wordStart: number,
  i: number,
  j: number,
  k: number,
  quoteClosed: boolean,
  ellipsis: "break" | "keep",
  endsWithAbbreviation: (wordStart: number, end: number) => boolean,
): boolean {
  const run = t.slice(i, j);
  const dotOnly = run === ".";
  const ellipsisOnly = /^(?:\.{2,}|…+)$/.test(run);
  if (ellipsisOnly && ellipsis === "keep") return false; // 글쎄요... 잘 모르겠어요

  if (dotOnly && k === j) {
    // only short heads can match; slicing a long token here would make the scan quadratic
    const head = i - wordStart <= 4 ? t.slice(wordStart, i) : "";
    if (/^(?:\d{1,2}|[A-Za-z])$/.test(head)) return false; // list number "1." or initial "J."
    if (/^\d{3,4}$/.test(head) && /^\s*\d/.test(t.slice(k, k + 8))) return false; // 2026. 11. 12.
  }
  if (endsWithAbbreviation(wordStart, k)) return false; // Dr. Kim
  if (quoteClosed) {
    let r = k;
    while (r < t.length && isWs(t.charCodeAt(r))) r++;
    if (QUOTE_PARTICLE.test(t.slice(r, r + 6))) return false; // "가요?" 하고 물었다
  }
  return true;
}
