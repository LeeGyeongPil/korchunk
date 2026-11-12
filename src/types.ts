/** Why a sentence ended. */
export type BoundaryReason = "punct" | "ending" | "newline" | "end";

/**
 * A sentence found in the original text.
 * `start` and `end` are UTF-16 code unit offsets (the same unit as
 * `String.prototype.slice`), `end` is exclusive, and
 * `text === original.slice(start, end)`.
 */
export interface Sentence {
  text: string;
  start: number;
  end: number;
  reason: BoundaryReason;
}

export interface SplitOptions {
  /**
   * `"paragraph"` (default): only a blank line forces a boundary; a single line
   * break counts as whitespace (a sentence ending right before it still splits).
   * `"break"`: every line break is a boundary.
   */
  newline?: "paragraph" | "break";
  /** `"break"` (default): `...` / `…` followed by whitespace ends a sentence. `"keep"`: it does not. */
  ellipsis?: "break" | "keep";
  /** `"default"`: use sentence-final endings (e.g. -습니다, -어요). `"punct-only"`: punctuation and newlines only. */
  endings?: "default" | "punct-only";
  /** Extra abbreviations that must not end a sentence, e.g. `["No.", "Dr."]`. */
  abbreviations?: string[];
  /** Spans that are never cut inside. Matches are found with the `g` flag. */
  protect?: RegExp[];
}

export interface ChunkOptions extends SplitOptions {
  /** Budget in UTF-16 code units of `text.slice(start, end)`. Exactly one of `maxChars` / `maxTokens`. */
  maxChars?: number;
  /** Budget in tokens, measured with `countTokens`. */
  maxTokens?: number;
  /** Synchronous token counter, required with `maxTokens`. Must be monotonic: longer text never counts fewer tokens. */
  countTokens?: (text: string) => number;
  /** How many trailing sentences of a chunk repeat at the start of the next one. Default 0. */
  overlapSentences?: number;
}

export interface Chunk {
  index: number;
  /** Always `original.slice(start, end)` (whitespace and line breaks between sentences are kept). */
  text: string;
  start: number;
  end: number;
  /** Size in budget units (characters or tokens). */
  size: number;
  sentences: Sentence[];
  /** Present only when a sentence longer than the budget was cut into pieces. */
  split?: "clause" | "space" | "hard";
}
