// AC-6: CLI output, JSON, compare, stdin and exit codes. The language is pinned to English.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "./helpers.mjs";

const BIN = join(ROOT, "bin/korchunk.mjs");
const ENV = { ...process.env, KORCHUNK_LANG: "en", LC_ALL: "", LC_MESSAGES: "", LANG: "C" };

function run(args, input) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, env: ENV, encoding: "utf8", input });
}

test("chunk table for an example file", () => {
  const r = run(["examples/meeting.ko.txt", "--max-chars", "120", "--overlap", "1", "--lang", "en"]);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trimEnd().split("\n");
  assert.match(lines[0], /^chunks: \d+ {2}\(max 120 chars, overlap 1\)$/);
  assert.match(lines[1], /^chunk {2}\[start,end\) {2}size/);
  assert.ok(lines.length >= 4);
  assert.match(lines[2], /^ {4}0 {2}\[0,\d+\)/);
});

test("--json prints chunks whose offsets match the original text", () => {
  const file = "examples/chat.ko.txt";
  const r = run([file, "--max-chars", "80", "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const chunks = JSON.parse(r.stdout);
  const original = readFileSync(join(ROOT, file), "utf8");
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    for (const key of ["index", "start", "end", "size", "text", "sentences"]) assert.ok(key in c, `missing ${key}`);
    assert.equal(original.slice(c.start, c.end), c.text);
    assert.ok(c.size <= 80);
  }
});

test("--sentences --compare shows Intl.Segmenter next to korchunk", () => {
  const r = run(["--sentences", "--compare"], "어제 배포했어요 그런데 로그가 안 쌓이더라고요 그래서 롤백했습니다\n");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Intl\.Segmenter: 1 sentences/);
  assert.match(r.stdout, /korchunk: 3 sentences/);
  assert.match(r.stdout, /^node v/);
  const json = run(["--compare", "--json"], "확인했습니다\n내일 볼게요\n");
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.korchunk.length, 2);
  assert.ok(Array.isArray(parsed.intl));
});

test("--sentences lists sentences with offsets and reasons", () => {
  const r = run(["--sentences"], "안녕하세요. 반갑습니다");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /sentences: 2/);
  assert.match(r.stdout, /\[0,6\) {2}punct/);
});

test("standard input works, also with '-'", () => {
  const a = run(["--sentences", "--json"], "하나입니다. 둘입니다.");
  const b = run(["-", "--sentences", "--json"], "하나입니다. 둘입니다.");
  assert.equal(JSON.parse(a.stdout).length, 2);
  assert.deepEqual(JSON.parse(a.stdout), JSON.parse(b.stdout));
});

test("--newline and --ellipsis are passed through", () => {
  const nl = run(["--sentences", "--json", "--newline", "break"], "회의록\n참석자\n");
  assert.equal(JSON.parse(nl.stdout).length, 2);
  const el = run(["--sentences", "--json", "--ellipsis", "keep"], "글쎄요... 모르겠어요.");
  assert.equal(JSON.parse(el.stdout).length, 1);
});

test("missing file gives exit code 1", () => {
  const r = run(["no-such-file.txt"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /File not found: no-such-file\.txt/);
});

test("usage errors give exit code 2", () => {
  for (const args of [["--bogus"], ["--max-chars"], ["--max-chars", "0", "x"], ["--max-chars", "abc"], ["--overlap", "-1"], ["--newline", "x"], ["--ellipsis", "x"], ["a.txt", "b.txt"], ["--lang", "fr"]]) {
    const r = run(args, "텍스트입니다.");
    assert.equal(r.status, 2, `args ${args.join(" ")}: ${r.stderr}`);
    assert.ok(r.stderr.trim().length > 0);
  }
});

test("--help and --version exit 0", () => {
  const h = run(["--help"]);
  assert.equal(h.status, 0);
  assert.match(h.stdout, /^Usage: korchunk/);
  const v = run(["--version"]);
  assert.equal(v.status, 0);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(v.stdout.trim(), `korchunk ${pkg.version}`);
});

test("chunking a long sentence marks the pieces", () => {
  const r = run(["--max-chars", "10", "--json"], "가나다라마바사아자차카타파하");
  const chunks = JSON.parse(r.stdout);
  assert.ok(chunks.every((c) => c.split === "hard"));
});

test("empty stdin warns on stderr, exit 0; usage errors point to --help", () => {
  const bin = join(ROOT, "bin", "korchunk.mjs");
  const empty = spawnSync(process.execPath, [bin, "--lang", "en"], { input: "  \n", encoding: "utf8" });
  assert.equal(empty.status, 0);
  assert.match(empty.stderr, /empty/);
  const bad = spawnSync(process.execPath, [bin, "--bogus", "--lang", "ko"], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /korchunk --help/);
});

test("a missing build (dist/ skipped by npm) gives exit code 1 and how to fix it, in both languages", () => {
  // bin/ 만 dist 없는 임시 폴더에 복사해, prepare 가 건너뛰어진 git 설치 상태를 흉내 낸다.
  const dir = mkdtempSync(join(tmpdir(), "korchunk-nodist-"));
  try {
    cpSync(join(ROOT, "bin"), join(dir, "bin"), { recursive: true });
    const bin = join(dir, "bin", "korchunk.mjs");
    const en = spawnSync(process.execPath, [bin, "--sentences", "--lang", "en"], { input: "안녕하세요.", encoding: "utf8", env: ENV });
    assert.equal(en.status, 1, en.stderr);
    assert.match(en.stderr, /^korchunk is not built: dist\/index\.js is missing\./);
    assert.match(en.stderr, /npm uninstall korchunk && npm install github:LeeGyeongPil\/korchunk/);
    assert.match(en.stderr, /npm run build/);
    assert.doesNotMatch(en.stderr, /ERR_MODULE_NOT_FOUND|at async/); // 스택 트레이스 대신 안내문만
    const ko = spawnSync(process.execPath, [bin, "--sentences"], { input: "안녕하세요.", encoding: "utf8", env: { ...ENV, KORCHUNK_LANG: "ko" } });
    assert.equal(ko.status, 1);
    assert.match(ko.stderr, /^korchunk 가 빌드되지 않았습니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
