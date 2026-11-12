import { splitOversize, type Measure } from "./clause.js";
import { KorchunkOptionError } from "./errors.js";
import { resolveChunkOptions } from "./options.js";
import { splitSentences } from "./split.js";
import type { Chunk, ChunkOptions, Sentence } from "./types.js";

/**
 * Packs sentences into chunks that stay within the budget.
 *
 * Sentences are added in order; a chunk closes right before the sentence that
 * would exceed `maxChars` / `maxTokens`. `overlapSentences` repeats the last N
 * sentences of a chunk at the start of the next one (fewer if the budget
 * would be exceeded). A sentence longer than the whole budget is cut into
 * pieces by clause, then space, then character, and its chunks carry `split`.
 * Every chunk satisfies `chunk.text === text.slice(chunk.start, chunk.end)`.
 */
export function chunk(text: string, options: ChunkOptions): Chunk[] {
  const opts = resolveChunkOptions(options);
  if (typeof text !== "string") throw new TypeError("chunk() expects a string.");
  const sentences = splitSentences(text, options);
  if (sentences.length === 0) return [];

  const countTokens = opts.countTokens;
  const measure: Measure =
    countTokens === null
      ? { chars: true, size: (a, b) => b - a }
      : {
          chars: false,
          size: (a, b) => {
            const v = countTokens(text.slice(a, b));
            if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
              throw new KorchunkOptionError("E_COUNT_TOKENS", `"countTokens" must return a finite number >= 0, got ${String(v)}.`);
            }
            return v;
          },
        };
  const budget = opts.budget;

  const chunks: Chunk[] = [];
  const emit = (members: Sentence[], split?: Chunk["split"]): void => {
    const first = members[0] as Sentence;
    const last = members[members.length - 1] as Sentence;
    const c: Chunk = {
      index: chunks.length,
      text: text.slice(first.start, last.end),
      start: first.start,
      end: last.end,
      size: measure.size(first.start, last.end),
      sentences: members,
    };
    if (split !== undefined) c.split = split;
    chunks.push(c);
  };

  let cur: Sentence[] = [];
  let fresh = 0; // sentences in `cur` that are not overlap
  const fits = (members: Sentence[], next: Sentence): boolean =>
    measure.size((members[0] ?? next).start, next.end) <= budget;

  for (const s of sentences) {
    if (measure.size(s.start, s.end) > budget) {
      if (fresh > 0) emit(cur);
      cur = [];
      fresh = 0;
      const pieces = splitOversize(text, s.start, s.end, budget, measure);
      for (const p of pieces) {
        emit([{ text: text.slice(p.start, p.end), start: p.start, end: p.end, reason: s.reason }], p.level);
      }
      continue;
    }
    if (cur.length > 0 && !fits(cur, s)) {
      if (fresh > 0) emit(cur);
      let carry = opts.overlapSentences > 0 ? cur.slice(-opts.overlapSentences) : [];
      while (carry.length > 0 && !fits(carry, s)) carry = carry.slice(1);
      cur = carry;
      fresh = 0;
    }
    cur.push(s);
    fresh++;
  }
  if (fresh > 0) emit(cur);
  return chunks;
}
