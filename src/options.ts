import { KorchunkOptionError } from "./errors.js";
import type { ChunkOptions, SplitOptions } from "./types.js";

export interface ResolvedSplitOptions {
  newline: "paragraph" | "break";
  ellipsis: "break" | "keep";
  endings: "default" | "punct-only";
  abbreviations: string[];
  protect: RegExp[];
}

export interface ResolvedChunkOptions extends ResolvedSplitOptions {
  unit: "chars" | "tokens";
  budget: number;
  countTokens: ((text: string) => number) | null;
  overlapSentences: number;
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new KorchunkOptionError(
    "E_OPTION",
    `Option "${name}" must be one of ${allowed.map((a) => JSON.stringify(a)).join(", ")}, got ${JSON.stringify(value)}.`,
  );
}

function assertObject(options: unknown): asserts options is Record<string, unknown> {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new KorchunkOptionError("E_OPTION", "Options must be a plain object, for example { maxChars: 500 }.");
  }
}

/** Default abbreviations that never end a sentence (Latin titles and the like). */
export const DEFAULT_ABBREVIATIONS: readonly string[] = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "vs.", "e.g.", "i.e."];

export function resolveSplitOptions(options: SplitOptions | undefined): ResolvedSplitOptions {
  const o: Record<string, unknown> = options === undefined ? {} : (assertObject(options), options as Record<string, unknown>);
  rejectUnknownKeys(o, KNOWN_KEYS);
  const abbreviations = o.abbreviations;
  if (abbreviations !== undefined && (!Array.isArray(abbreviations) || abbreviations.some((a) => typeof a !== "string" || a === ""))) {
    throw new KorchunkOptionError("E_OPTION", 'Option "abbreviations" must be an array of non-empty strings, for example ["No.", "Dr."].');
  }
  const protect = o.protect;
  if (protect !== undefined && (!Array.isArray(protect) || protect.some((r) => !(r instanceof RegExp)))) {
    throw new KorchunkOptionError("E_OPTION", 'Option "protect" must be an array of RegExp objects, for example [/#\\d+\\.\\d+/].');
  }
  return {
    newline: oneOf("newline", o.newline, ["paragraph", "break"] as const, "paragraph"),
    ellipsis: oneOf("ellipsis", o.ellipsis, ["break", "keep"] as const, "break"),
    endings: oneOf("endings", o.endings, ["default", "punct-only"] as const, "default"),
    abbreviations: [...DEFAULT_ABBREVIATIONS, ...((abbreviations as string[] | undefined) ?? [])],
    protect: (protect as RegExp[] | undefined) ?? [],
  };
}

/** Shows a value with its type so that "10" (a string) is not mistaken for 10. */
function describe(value: unknown): string {
  const shown = typeof value === "string" ? JSON.stringify(value) : String(value);
  return `${shown} (${value === null ? "null" : typeof value})`;
}

const KNOWN_KEYS: readonly string[] = [
  "newline", "ellipsis", "endings", "abbreviations", "protect",
  "maxChars", "maxTokens", "countTokens", "overlapSentences",
];
const SUGGEST: Record<string, string> = { overlap: "overlapSentences", maxToken: "maxTokens", maxChar: "maxChars", abbreviation: "abbreviations" };

function rejectUnknownKeys(o: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(o)) {
    if (allowed.includes(key)) continue;
    const hint = SUGGEST[key] ?? allowed.find((a) => a.toLowerCase().startsWith(key.toLowerCase()) && key.length >= 3);
    throw new KorchunkOptionError(
      "E_OPTION",
      `Unknown option "${key}"${hint ? `; did you mean "${hint}"?` : ""} Known options: ${allowed.join(", ")}.`,
    );
  }
}

function positiveInt(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new KorchunkOptionError("E_BUDGET_RANGE", `Option "${name}" must be an integer >= 1, got ${describe(value)}.`);
  }
  return value;
}

export function resolveChunkOptions(options: ChunkOptions | undefined): ResolvedChunkOptions {
  if (options === undefined) {
    throw new KorchunkOptionError("E_BUDGET_MISSING", "chunk() needs a budget: pass { maxChars: 500 } or { maxTokens: 256, countTokens }.");
  }
  assertObject(options);
  const o = options as Record<string, unknown>;
  const split = resolveSplitOptions(options);

  const hasChars = o.maxChars !== undefined;
  const hasTokens = o.maxTokens !== undefined;
  if (!hasChars && !hasTokens) {
    throw new KorchunkOptionError("E_BUDGET_MISSING", "chunk() needs a budget: pass { maxChars: 500 } or { maxTokens: 256, countTokens }.");
  }
  if (hasChars && hasTokens) {
    throw new KorchunkOptionError("E_BUDGET_BOTH", 'Pass either "maxChars" or "maxTokens", not both.');
  }
  let unit: "chars" | "tokens" = "chars";
  let budget: number;
  let countTokens: ((text: string) => number) | null = null;
  if (hasChars) {
    budget = positiveInt("maxChars", o.maxChars);
  } else {
    unit = "tokens";
    budget = positiveInt("maxTokens", o.maxTokens);
    if (typeof o.countTokens !== "function") {
      throw new KorchunkOptionError("E_COUNT_TOKENS", 'Option "maxTokens" needs "countTokens": a synchronous function (text) => number, for example from your tokenizer.');
    }
    countTokens = o.countTokens as (text: string) => number;
  }

  let overlapSentences = 0;
  if (o.overlapSentences !== undefined) {
    const v = o.overlapSentences;
    if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) {
      throw new KorchunkOptionError("E_OVERLAP", `Option "overlapSentences" must be an integer >= 0, got ${describe(v)}.`);
    }
    overlapSentences = v;
  }
  return { ...split, unit, budget, countTokens, overlapSentences };
}
