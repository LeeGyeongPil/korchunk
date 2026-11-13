# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-11-14

### Fixed
- README (both languages): corrected the "no Korean npm package" statement; the punctuation-based splitter `kr-sentence` exists on npm.

## [0.1.1] - 2026-11-14

### Fixed
- README: the `examples/` note now matches the files that exist (example 1 is `examples/tokens.mjs`).
- README: usage examples 2-4 (both languages) are now self-contained (import added; example 3 prints with `console.log`; example 4 defines `text`) and produce the documented output when copied and run.

## [0.1.0] - 2026-11-12

### Added
- `splitSentences(text, options?)`: rule-based Korean sentence boundaries from punctuation, sentence-final endings
  (-습니다, -어요, -죠, -ㅆ다 ...) and line breaks, with a `reason` per sentence and UTF-16 offsets into the original text.
- Suppression rules for decimals and versions, list numbers, dates, URLs, e-mail addresses, abbreviations,
  quotes and brackets (matched pairs), quotation particles after a closing quote, and user `protect` patterns.
- NFC working copy with an index map, so NFD input is judged like NFC while offsets stay exact.
- `chunk(text, options)`: sentence-aware packing by `maxChars` or `maxTokens` + `countTokens`, `overlapSentences`,
  and clause / space / character re-splitting of a sentence longer than the budget (never inside a surrogate pair).
- `KorchunkOptionError` (a `RangeError`) with a `code` for every invalid option.
- `korchunk` CLI: chunk table, `--sentences`, `--compare` with `Intl.Segmenter`, `--json`, `--newline`, `--ellipsis`,
  English and Korean screens (`--lang` > `KORCHUNK_LANG` > `LC_ALL` / `LC_MESSAGES` / `LANG`).
  When a git install skipped the `prepare` build, the CLI says how to rebuild instead of printing a stack trace.
- `npm run eval`: exact-match, precision and recall against a hand-written gold corpus, compared with `Intl.Segmenter`.

[Unreleased]: https://github.com/LeeGyeongPil/korchunk/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/LeeGyeongPil/korchunk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/LeeGyeongPil/korchunk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/LeeGyeongPil/korchunk/releases/tag/v0.1.0
