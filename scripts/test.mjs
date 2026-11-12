// Test runner used by `npm test`.
// Why a script and not `node --test "test/*.test.mjs"`: Node 20 does not expand glob patterns
// given to --test (that arrived in Node 21), and shell expansion does not happen on Windows.
// Listing the files here works the same on every Node version in "engines" (>=20.19) and every OS.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_DIR = join(ROOT, "test");

// test/*.test.mjs 만 고른다(helpers.mjs·fixtures 는 테스트가 아니다). 정렬해 실행 순서를 고정한다.
const files = readdirSync(TEST_DIR)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => join("test", name));

if (files.length === 0) {
  console.error("no test files found in test/ (expected *.test.mjs)");
  process.exit(1);
}

// 같은 node 실행 파일로 내장 테스트 러너를 띄우고, 종료 코드를 그대로 돌려준다.
const result = spawnSync(process.execPath, ["--test", ...files], { cwd: ROOT, stdio: "inherit" });
if (result.error) {
  console.error(`could not start the test runner: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
