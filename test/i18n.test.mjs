// AC-7: two screen languages, selection order, and message hygiene.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./helpers.mjs";
import { MESSAGES, langFromValue, resolveLang, t } from "../bin/i18n.mjs";

const BIN = join(ROOT, "bin/korchunk.mjs");
const CLEAN = { ...process.env, KORCHUNK_LANG: "", LC_ALL: "", LC_MESSAGES: "", LANG: "" };

function run(args, env = {}) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, env: { ...CLEAN, ...env }, encoding: "utf8", input: "" });
}

test("en and ko have exactly the same message keys", () => {
  assert.deepEqual(Object.keys(MESSAGES.ko).sort(), Object.keys(MESSAGES.en).sort());
  for (const lang of ["en", "ko"]) {
    for (const [k, v] of Object.entries(MESSAGES[lang])) assert.ok(v.trim() !== "", `${lang}.${k} is empty`);
  }
});

test("both languages use the same placeholders", () => {
  const names = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(MESSAGES.en)) {
    assert.deepEqual(names(MESSAGES.ko[key]), names(MESSAGES.en[key]), key);
  }
});

test("Korean messages never put a particle right after a placeholder", () => {
  const bad = /\{\w+\}\s*(?:은|는|이|가|을|를|의|에|에서|에는|도|와|과|로|으로)(?![가-힣])/;
  for (const [k, v] of Object.entries(MESSAGES.ko)) assert.doesNotMatch(v, bad, `ko.${k}: ${v}`);
});

test("Korean messages use the polite -합니다 style or plain labels, English ones have no Hangul", () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) assert.doesNotMatch(v, /[가-힣]/, `en.${k}`);
  for (const k of ["err.noInput", "err.unexpected", "err.missingValue", "err.tooManyArgs", "err.badValue", "err.fileRead", "err.option"]) {
    assert.match(MESSAGES.ko[k], /(?:습니다|니다)(?:[.:]|\s|$|\{)|[:)]/, k);
  }
});

test("langFromValue: Korean locales only", () => {
  for (const v of ["ko", "ko_KR.UTF-8", "ko-KR", "KO", "ko_KR@x"]) assert.equal(langFromValue(v), "ko", v);
  for (const v of ["en", "en_US.UTF-8", "C", "POSIX", "kok", "", undefined, "ja_JP"]) assert.equal(langFromValue(v), "en", String(v));
});

test("resolveLang order: --lang > KORCHUNK_LANG > LC_ALL > LC_MESSAGES > LANG", () => {
  assert.equal(resolveLang("en", { KORCHUNK_LANG: "ko", LANG: "ko_KR.UTF-8" }), "en");
  assert.equal(resolveLang(undefined, { KORCHUNK_LANG: "ko", LANG: "en_US" }), "ko");
  assert.equal(resolveLang(undefined, { KORCHUNK_LANG: "en", LANG: "ko_KR.UTF-8" }), "en");
  assert.equal(resolveLang(undefined, { LC_ALL: "ko_KR.UTF-8", LC_MESSAGES: "en_US", LANG: "en_US" }), "ko");
  assert.equal(resolveLang(undefined, { LC_ALL: "", LC_MESSAGES: "ko_KR.UTF-8", LANG: "en_US" }), "ko");
  assert.equal(resolveLang(undefined, { LANG: "ko_KR.UTF-8" }), "ko");
  assert.equal(resolveLang(undefined, { LANG: "C" }), "en");
  assert.equal(resolveLang(undefined, {}), "en");
});

test("t() fills placeholders and falls back to English keys", () => {
  assert.equal(t("en", "err.fileNotFound", { path: "a.txt" }), "File not found: a.txt");
  assert.equal(t("ko", "err.fileNotFound", { path: "a.txt" }), "파일 없음: a.txt");
  assert.equal(t("xx", "err.fileNotFound", { path: "a" }), "File not found: a");
});

test("--help is shown in the chosen language", () => {
  assert.match(run(["--help", "--lang", "ko"]).stdout, /^사용법: korchunk/);
  assert.match(run(["--help", "--lang", "en"]).stdout, /^Usage: korchunk/);
  assert.match(run(["--help", "--lang=ko"]).stdout, /^사용법: korchunk/);
});

test("environment decides when --lang is absent", () => {
  assert.match(run(["--help"], { LANG: "ko_KR.UTF-8" }).stdout, /^사용법/);
  assert.match(run(["--help"], { LANG: "ko_KR.UTF-8", KORCHUNK_LANG: "en" }).stdout, /^Usage/);
  assert.match(run(["--help"], { LANG: "en_US.UTF-8", KORCHUNK_LANG: "ko" }).stdout, /^사용법/);
  assert.match(run(["--help", "--lang", "en"], { KORCHUNK_LANG: "ko" }).stdout, /^Usage/);
  assert.match(run(["--help"], { LANG: "C" }).stdout, /^Usage/);
  assert.match(run(["--help"]).stdout, /^Usage/);
});

test("errors are localized, including node:util parseArgs errors", () => {
  const cases = [
    [["--bogus"], /알 수 없는 옵션: --bogus/, /Unknown option: --bogus/],
    [["--max-chars"], /옵션에 값이 필요합니다: --max-chars/, /Option needs a value: --max-chars/],
    [["--max-chars", "0"], /1 이상의 정수/, /integer of 1 or more/],
    [["--overlap", "x"], /0 이상의 정수/, /integer of 0 or more/],
    [["--lang", "fr"], /en 또는 ko/, /en or ko/],
    [["nofile.txt"], /파일 없음: nofile\.txt/, /File not found: nofile\.txt/],
  ];
  for (const [args, ko, en] of cases) {
    assert.match(run(args, { KORCHUNK_LANG: "ko" }).stderr, ko, args.join(" "));
    assert.match(run(args, { KORCHUNK_LANG: "en" }).stderr, en, args.join(" "));
  }
  // a parse error that happens before --lang itself is read still uses the language flag
  assert.match(run(["--bogus", "--lang", "ko"]).stderr, /사용법 오류/);
  assert.match(run(["--lang=ko", "--bogus"], { KORCHUNK_LANG: "en" }).stderr, /알 수 없는 옵션/);
  assert.match(run(["--lang", "en", "--bogus"], { KORCHUNK_LANG: "ko" }).stderr, /Unknown option/);
});

test("two languages give different output for the same table", () => {
  const ko = spawnSync(process.execPath, [BIN, "--lang", "ko"], { cwd: ROOT, env: CLEAN, encoding: "utf8", input: "안녕하세요. 반갑습니다." });
  const en = spawnSync(process.execPath, [BIN, "--lang", "en"], { cwd: ROOT, env: CLEAN, encoding: "utf8", input: "안녕하세요. 반갑습니다." });
  assert.match(ko.stdout, /청크 수: 1/);
  assert.match(en.stdout, /chunks: 1/);
});
