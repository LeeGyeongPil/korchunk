export type KorchunkErrorCode =
  | "E_BUDGET_MISSING"
  | "E_BUDGET_BOTH"
  | "E_BUDGET_RANGE"
  | "E_COUNT_TOKENS"
  | "E_OVERLAP"
  | "E_OPTION";

/** Thrown when options are invalid. Inherits from `RangeError`; check `code` to react programmatically. */
export class KorchunkOptionError extends RangeError {
  readonly code: KorchunkErrorCode;

  constructor(code: KorchunkErrorCode, message: string) {
    super(message);
    this.name = "KorchunkOptionError";
    this.code = code;
  }
}
