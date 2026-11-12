export { splitSentences } from "./split.js";
export { chunk } from "./chunk.js";
export { KorchunkOptionError } from "./errors.js";
export type { KorchunkErrorCode } from "./errors.js";
export type { BoundaryReason, Chunk, ChunkOptions, Sentence, SplitOptions } from "./types.js";

/** Package version (kept in sync with package.json by a test). */
export const version = "0.1.0";
