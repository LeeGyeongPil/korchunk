/**
 * NFC working copy of the input plus a map from copy indices back to the original.
 * Sentence rules run on the NFC copy (so decomposed Hangul is judged like composed
 * Hangul) while offsets are always reported against the original string.
 */
export interface Normalized {
  /** The text the rules look at. */
  text: string;
  /** Original start offset of the cluster that contains copy index `i`. */
  toStart(i: number): number;
  /** Original end offset (exclusive) of the cluster that contains copy index `e - 1`. */
  toEnd(e: number): number;
}

const MARK = /\p{M}/u;

/** Combining marks and Hangul conjoining vowels/finals continue the previous cluster. */
function continuesCluster(cp: number, ch: string): boolean {
  if ((cp >= 0x1160 && cp <= 0x11ff) || (cp >= 0xd7b0 && cp <= 0xd7ff)) return true;
  return cp >= 0x300 && MARK.test(ch);
}

export function normalize(original: string): Normalized {
  const nfc = original.normalize("NFC");
  if (nfc === original) {
    return { text: original, toStart: (i) => i, toEnd: (e) => e };
  }
  const starts: number[] = [];
  const ends: number[] = [];
  let out = "";
  const n = original.length;
  let i = 0;
  while (i < n) {
    const segStart = i;
    let cp = original.codePointAt(i) as number;
    i += cp > 0xffff ? 2 : 1;
    while (i < n) {
      cp = original.codePointAt(i) as number;
      const ch = String.fromCodePoint(cp);
      if (!continuesCluster(cp, ch)) break;
      i += ch.length;
    }
    const piece = original.slice(segStart, i).normalize("NFC");
    for (let k = 0; k < piece.length; k++) {
      starts.push(segStart);
      ends.push(i);
    }
    out += piece;
  }
  return { text: out, toStart: (idx) => starts[idx] as number, toEnd: (e) => ends[e - 1] as number };
}
