import { CONNECTIVE, isWs } from "./rules.js";

export type SplitLevel = "clause" | "space" | "hard";

export interface Piece {
  start: number;
  end: number;
  level: SplitLevel;
}

/** How the chunker measures text: `size(a, b)` is the size of `text.slice(a, b)`. */
export interface Measure {
  size(a: number, b: number): number;
  /** True when size is just `b - a`, which allows a shortcut. */
  chars: boolean;
}

const MARK = /\p{M}/u;

function isHigh(c: number): boolean {
  return c >= 0xd800 && c <= 0xdbff;
}
function isLow(c: number): boolean {
  return c >= 0xdc00 && c <= 0xdfff;
}

/** A cut before `text[p]` is unsafe inside a surrogate pair or before a combining mark / Hangul jamo vowel or final. */
function unsafeCut(text: string, p: number): boolean {
  const c = text.charCodeAt(p);
  if (isLow(c) && isHigh(text.charCodeAt(p - 1))) return true;
  if ((c >= 0x1160 && c <= 0x11ff) || (c >= 0xd7b0 && c <= 0xd7ff)) return true;
  return c >= 0x300 && MARK.test(text[p] as string);
}

/** Length of the first cluster at `a` (one code point plus combining marks), at least 1. */
function clusterLength(text: string, a: number, limit: number): number {
  let p = a + (isHigh(text.charCodeAt(a)) && a + 1 < limit ? 2 : 1);
  while (p < limit && unsafeCut(text, p)) p++;
  return p - a;
}

/**
 * Cuts one sentence `[s, e)` that is longer than the budget into pieces that each fit.
 * Preference order for every cut: clause boundary (comma or connective ending
 * such as -는데, -지만, -어서), then any space, then a hard cut between characters
 * (never inside a surrogate pair or a combining sequence).
 * A piece always holds at least one character, even if that alone exceeds the budget.
 */
export function splitOversize(text: string, s: number, e: number, budget: number, m: Measure): Piece[] {
  const pieces: Piece[] = [];
  let a = s;
  let lastLevel: SplitLevel = "hard";
  while (a < e) {
    while (a < e && isWs(text.charCodeAt(a))) a++;
    if (a >= e) break;
    const p = maxFit(a, e, budget, m);
    if (p >= e) {
      let end = e;
      while (end > a && isWs(text.charCodeAt(end - 1))) end--;
      pieces.push({ start: a, end, level: lastLevel });
      break;
    }
    let cut = -1;
    let level: SplitLevel = "hard";
    if (p > a) {
      let space = -1;
      let clause = -1;
      for (let q = p; q > a; q--) {
        if (!isWs(text.charCodeAt(q))) continue;
        if (space < 0) space = q;
        if (isClauseEnd(text, a, q)) {
          clause = q;
          break;
        }
      }
      // a clause cut is used only if it keeps a reasonable share of the room
      if (clause >= 0 && clause - a >= (p - a) * 0.3) {
        cut = clause;
        level = "clause";
      } else if (space >= 0) {
        cut = space;
        level = "space";
      }
    }
    if (cut < 0) {
      cut = p;
      while (cut > a && unsafeCut(text, cut)) cut--;
      if (cut <= a) cut = a + clusterLength(text, a, e);
      level = "hard";
    }
    let end = cut;
    while (end > a && isWs(text.charCodeAt(end - 1))) end--;
    pieces.push({ start: a, end, level });
    lastLevel = level;
    a = cut;
  }
  return pieces;
}

/** Is the word that ends right before whitespace at `q` a clause (comma or connective ending)? */
function isClauseEnd(text: string, a: number, q: number): boolean {
  const prev = text[q - 1];
  if (prev === "," || prev === ";" || prev === "、" || prev === "，") return true;
  return CONNECTIVE.test(text.slice(Math.max(a, q - 6), q));
}

/** Largest end `p` in (a, e] such that `size(a, p) <= budget`; `a` itself when even one unit does not fit. */
function maxFit(a: number, e: number, budget: number, m: Measure): number {
  if (m.chars) return Math.min(e, a + budget);
  if (m.size(a, e) <= budget) return e;
  let lo = a; // fits (empty)
  let hi = e; // does not fit
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (m.size(a, mid) <= budget) lo = mid;
    else hi = mid;
  }
  return lo;
}
