#!/usr/bin/env node
// korchunk CLI: a thin shell around the library so you can see the result right away.
// Exit codes: 0 success, 1 input error (file missing or unreadable), 2 usage error.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolveLang, t } from "./i18n.mjs";
// The library itself (../dist/index.js) is loaded in loadLibrary() below, so a missing build
// can be reported with a clear message instead of a raw ERR_MODULE_NOT_FOUND stack trace.

const OPTIONS = {
  "max-chars": { type: "string" },
  overlap: { type: "string" },
  sentences: { type: "boolean" },
  compare: { type: "boolean" },
  json: { type: "boolean" },
  newline: { type: "string" },
  ellipsis: { type: "string" },
  lang: { type: "string" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
};

/** Finds --lang before the real parse, so even parse errors are shown in the chosen language. */
function preScanLang(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lang") return argv[i + 1];
    if (typeof a === "string" && a.startsWith("--lang=")) return a.slice("--lang=".length);
  }
  return undefined;
}

function fail(lang, code, key, params) {
  process.stderr.write(t(lang, key, params) + "\n");
  process.exitCode = code;
}

function helpText(lang) {
  return [
    t(lang, "help.usage"),
    "",
    t(lang, "help.intro"),
    "",
    t(lang, "help.options"),
    ...["maxChars", "overlap", "sentences", "compare", "json", "newline", "ellipsis", "lang", "help", "version"].map((k) => t(lang, `help.${k}`)),
    "",
    t(lang, "help.offsets"),
  ].join("\n");
}

/** Maps node:util parseArgs errors (ERR_PARSE_ARGS_*) to localized messages. */
function parseArgsMessage(lang, err) {
  const option = /'(--?[\w-]+)/.exec(String(err.message))?.[1] ?? "?";
  switch (err.code) {
    case "ERR_PARSE_ARGS_UNKNOWN_OPTION":
      return t(lang, "err.unknownOption", { option });
    case "ERR_PARSE_ARGS_INVALID_OPTION_VALUE":
      return t(lang, "err.missingValue", { option });
    case "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL": {
      const arg = /'([^']*)'/.exec(String(err.message))?.[1] ?? "?";
      return t(lang, "err.tooManyArgs", { arg });
    }
    default:
      return t(lang, "err.usage", { detail: String(err.message) });
  }
}

function toInt(value, min) {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min ? n : null;
}

function readInput(file, lang) {
  if (file === undefined || file === "-") {
    if (file === undefined && process.stdin.isTTY) {
      fail(lang, 2, "err.noInput");
      return null;
    }
    try {
      return readFileSync(0, "utf8");
    } catch (e) {
      fail(lang, 1, "err.fileRead", { path: "-", reason: e.code ?? e.message });
      return null;
    }
  }
  try {
    return readFileSync(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") fail(lang, 1, "err.fileNotFound", { path: file });
    else fail(lang, 1, "err.fileRead", { path: file, reason: e.code ?? e.message });
    return null;
  }
}

function preview(text, max = 36) {
  const flat = text.replace(/\s+/g, " ");
  return flat.length > max ? flat.slice(0, max) + "…" : flat;
}

/** Intl.Segmenter result in the same shape as korchunk sentences (outer whitespace trimmed). */
function intlSentences(text) {
  const seg = new Intl.Segmenter("ko", { granularity: "sentence" });
  const out = [];
  for (const { segment, index } of seg.segment(text)) {
    const lead = segment.length - segment.trimStart().length;
    const body = segment.trim();
    if (body !== "") out.push({ text: body, start: index + lead, end: index + lead + body.length });
  }
  return out;
}

function sentenceLine(s) {
  const reason = s.reason === undefined ? "" : `${s.reason.padEnd(7)}  `;
  return `[${s.start},${s.end})  ${reason}${preview(s.text, 60)}`;
}

/**
 * Loads the built library. dist/ is not in git: a git install builds it with the "prepare" script,
 * and npm can skip that script when install scripts are not allowed. Returns null (exit 1) then.
 */
async function loadLibrary(argv, env) {
  try {
    return await import("../dist/index.js");
  } catch (e) {
    // dist/index.js 자체가 없을 때만 안내한다. 다른 오류는 그대로 던져 원인을 숨기지 않는다.
    const missingDist = e && e.code === "ERR_MODULE_NOT_FOUND" && String(e.message).includes("dist");
    if (!missingDist) throw e;
    fail(resolveLang(preScanLang(argv), env), 1, "err.notBuilt");
    return null;
  }
}

function main(argv, env, lib) {
  const { chunk, splitSentences, KorchunkOptionError, version } = lib;
  const flagLang = preScanLang(argv);
  let lang = resolveLang(flagLang, env);

  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    if (e && typeof e.code === "string" && e.code.startsWith("ERR_PARSE_ARGS_")) {
      fail(lang, 2, "err.usage", { detail: parseArgsMessage(lang, e) });
      return;
    }
    throw e;
  }
  const { values, positionals } = parsed;

  if (values.lang !== undefined && values.lang !== "en" && values.lang !== "ko") {
    fail(lang, 2, "err.lang");
    return;
  }
  lang = resolveLang(values.lang, env);

  if (values.help) {
    process.stdout.write(helpText(lang) + "\n");
    return;
  }
  if (values.version) {
    process.stdout.write(`korchunk ${version}\n`);
    return;
  }
  if (positionals.length > 1) {
    fail(lang, 2, "err.tooManyArgs", { arg: positionals[1] });
    return;
  }

  let maxChars = 500;
  if (values["max-chars"] !== undefined) {
    maxChars = toInt(values["max-chars"], 1);
    if (maxChars === null) return fail(lang, 2, "err.maxChars");
  }
  let overlap = 0;
  if (values.overlap !== undefined) {
    overlap = toInt(values.overlap, 0);
    if (overlap === null) return fail(lang, 2, "err.overlap");
  }
  if (values.newline !== undefined && values.newline !== "paragraph" && values.newline !== "break") return fail(lang, 2, "err.newline");
  if (values.ellipsis !== undefined && values.ellipsis !== "break" && values.ellipsis !== "keep") return fail(lang, 2, "err.ellipsis");

  const text = readInput(positionals[0], lang);
  if (text === null) return;
  if (text.trim() === "") process.stderr.write(t(lang, "err.emptyInput") + "\n"); // exit code stays 0

  const splitOptions = {};
  if (values.newline) splitOptions.newline = values.newline;
  if (values.ellipsis) splitOptions.ellipsis = values.ellipsis;

  try {
    const wantSentences = values.sentences || values.compare;
    if (wantSentences) {
      const sentences = splitSentences(text, splitOptions);
      if (values.compare) {
        const intl = intlSentences(text);
        if (values.json) {
          process.stdout.write(JSON.stringify({ node: process.version, icu: process.versions.icu, intl, korchunk: sentences }, null, 2) + "\n");
          return;
        }
        const out = [t(lang, "compare.env", { node: process.version, icu: process.versions.icu }), ""];
        out.push(t(lang, "compare.intl", { count: intl.length }));
        for (const s of intl) out.push(`  ${sentenceLine(s)}`);
        out.push("", t(lang, "compare.korchunk", { count: sentences.length }));
        out.push("  " + t(lang, "table.sentencesHeader"));
        for (const s of sentences) out.push(`  ${sentenceLine(s)}`);
        process.stdout.write(out.join("\n") + "\n");
        return;
      }
      if (values.json) {
        process.stdout.write(JSON.stringify(sentences, null, 2) + "\n");
        return;
      }
      const out = [t(lang, "table.sentenceCount", { count: sentences.length }), t(lang, "table.sentencesHeader")];
      for (const s of sentences) out.push(sentenceLine(s));
      process.stdout.write(out.join("\n") + "\n");
      return;
    }

    const chunks = chunk(text, { ...splitOptions, maxChars, overlapSentences: overlap });
    if (values.json) {
      process.stdout.write(JSON.stringify(chunks, null, 2) + "\n");
      return;
    }
    const out = [t(lang, "table.chunks", { count: chunks.length, max: maxChars, overlap }), t(lang, "table.chunkHeader")];
    for (const c of chunks) {
      const mark = c.split ? ` (${c.split})` : "";
      out.push(`${String(c.index).padStart(5)}  [${c.start},${c.end})  ${String(c.size).padStart(4)}  ${String(c.sentences.length).padStart(9)}${mark}  ${preview(c.text)}`);
    }
    process.stdout.write(out.join("\n") + "\n");
  } catch (e) {
    if (e instanceof KorchunkOptionError) fail(lang, 2, "err.option", { message: e.message });
    else fail(lang, 1, "err.unexpected", { message: e instanceof Error ? e.message : String(e) });
  }
}

const lib = await loadLibrary(process.argv.slice(2), process.env);
if (lib !== null) main(process.argv.slice(2), process.env, lib);
