import { MAX_SPAN, PAIRS, URL_RE, URL_TRAILING } from "./rules.js";

/**
 * Computes which cut positions are forbidden. A cut position `p` sits between
 * `t[p - 1]` and `t[p]`; `result[p] === 1` means no sentence may end there.
 * Protected: the inside of URLs, e-mail addresses, user `protect` patterns and
 * matched quote / bracket pairs (including the cut right before the closer).
 */
export function computeProtected(t: string, userPatterns: RegExp[], newline: "paragraph" | "break"): Uint8Array {
  const n = t.length;
  const diff = new Int32Array(n + 2);
  const mark = (lo: number, hi: number): void => {
    if (hi < lo) return;
    diff[lo]++;
    diff[hi + 1]--;
  };

  const markMatches = (re: RegExp, trim: boolean): void => {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const g = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = g.exec(t)) !== null) {
      if (m[0].length === 0) {
        g.lastIndex++;
        continue;
      }
      let len = m[0].length;
      if (trim) len -= (URL_TRAILING.exec(m[0]) ?? [""])[0].length;
      // cuts strictly inside the match are forbidden; the cut right after it stays allowed
      mark(m.index + 1, m.index + len - 1);
    }
  };
  markMatches(URL_RE, true);
  markEmails(t, mark);
  for (const re of userPatterns) markMatches(re, false);

  markPairs(t, newline, mark);

  const out = new Uint8Array(n + 1);
  let depth = 0;
  for (let p = 0; p <= n; p++) {
    depth += diff[p] as number;
    out[p] = depth > 0 ? 1 : 0;
  }
  return out;
}

/** Matches quotes and brackets inside one paragraph (or one line in `break` mode). */
function markPairs(t: string, newline: "paragraph" | "break", mark: (lo: number, hi: number) => void): void {
  const closers = new Map<string, string>();
  for (const [o, c] of Object.entries(PAIRS)) closers.set(c, o);
  const stack: { ch: string; pos: number }[] = [];
  let dq = -1; // straight double quote waiting for its partner
  const n = t.length;
  for (let i = 0; i < n; i++) {
    const ch = t[i] as string;
    if (ch === "\n") {
      let boundary = newline === "break";
      if (!boundary) {
        let j = i + 1;
        while (j < n && (t[j] === " " || t[j] === "\t" || t[j] === "\r")) j++;
        boundary = t[j] === "\n";
      }
      if (boundary) {
        stack.length = 0;
        dq = -1;
      }
    } else if (ch === '"') {
      if (dq < 0) dq = i;
      else {
        if (i - dq <= MAX_SPAN) mark(dq + 1, i);
        dq = -1;
      }
    } else if (ch in PAIRS) {
      stack.push({ ch, pos: i });
    } else if (closers.has(ch)) {
      const want = closers.get(ch) as string;
      let k = stack.length - 1;
      while (k >= 0 && (stack[k] as { ch: string }).ch !== want) k--;
      if (k >= 0) {
        const open = stack[k] as { pos: number };
        stack.length = k;
        if (i - open.pos <= MAX_SPAN) mark(open.pos + 1, i);
      }
    }
  }
}

const isLocal = (c: number): boolean => isWordChar(c) || c === 0x2b || c === 0x2e || c === 0x2d; // [\w.+-]
const isLabel = (c: number): boolean => isWordChar(c) || c === 0x2d; // [\w-]

function isWordChar(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

/**
 * E-mail addresses (local@label.label...), found by scanning around each "@".
 * A single regex backtracks quadratically on long runs such as "a.a.a.a...".
 */
function markEmails(t: string, mark: (lo: number, hi: number) => void): void {
  const n = t.length;
  let lastEnd = 0;
  let at = t.indexOf("@");
  while (at >= 0) {
    let s = at;
    while (s > lastEnd && isLocal(t.charCodeAt(s - 1))) s--;
    let e = at + 1;
    let dots = 0;
    let labelLen = 0;
    while (e < n) {
      const c = t.charCodeAt(e);
      if (isLabel(c)) {
        labelLen++;
        e++;
      } else if (c === 0x2e && labelLen > 0 && e + 1 < n && isLabel(t.charCodeAt(e + 1))) {
        dots++;
        labelLen = 0;
        e++;
      } else break;
    }
    if (s < at && dots > 0) {
      mark(s + 1, e - 1);
      lastEnd = e;
      at = t.indexOf("@", e);
    } else {
      at = t.indexOf("@", at + 1);
    }
  }
}
