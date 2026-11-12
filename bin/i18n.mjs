// Messages for the korchunk CLI in English and Korean.
// Rules for the Korean strings: polite "-합니다" style, and no particle right after a {placeholder}
// (write "파일 없음: {path}", never "{path}를"), because the value can end in any sound.

export const SUPPORTED_LANGS = ["en", "ko"];

export const MESSAGES = {
  en: {
    "help.usage": "Usage: korchunk [file] [options]",
    "help.intro":
      "Split Korean text into sentences and pack them into chunks for RAG.\nReads the file, or standard input when no file (or \"-\") is given.",
    "help.options": "Options:",
    "help.maxChars": "  --max-chars <N>     chunk size in characters (default 500)",
    "help.overlap": "  --overlap <N>       repeat the last N sentences in the next chunk (default 0)",
    "help.sentences": "  --sentences         print sentences instead of chunks",
    "help.compare": "  --compare           with --sentences: show Intl.Segmenter next to korchunk",
    "help.json": "  --json              print JSON",
    "help.newline": "  --newline <mode>    paragraph (default) | break",
    "help.ellipsis": "  --ellipsis <mode>   break (default) | keep",
    "help.lang": "  --lang <en|ko>      screen language (also KORCHUNK_LANG, LC_ALL, LC_MESSAGES, LANG)",
    "help.help": "  -h, --help          show this help",
    "help.version": "  -v, --version       show the version",
    "help.offsets": "Offsets are UTF-16 code units of the original text: text.slice(start, end).",
    "table.chunks": "chunks: {count}  (max {max} chars, overlap {overlap})",
    "table.chunkHeader": "chunk  [start,end)  size  sentences  text",
    "table.sentencesHeader": "[start,end)  reason  text",
    "table.sentenceCount": "sentences: {count}",
    "compare.env": "node {node}, ICU {icu}",
    "compare.intl": "Intl.Segmenter: {count} sentences",
    "compare.korchunk": "korchunk: {count} sentences",
    "err.usage": "Usage error: {detail}\nRun \"korchunk --help\" to see the options.",
    "err.emptyInput": "The input is empty or only whitespace; nothing to split.",
    "err.unknownOption": "Unknown option: {option}",
    "err.missingValue": "Option needs a value: {option}",
    "err.tooManyArgs": "Too many arguments: {arg}",
    "err.badValue": "Invalid value for {option}: {value}",
    "err.maxChars": "--max-chars needs an integer of 1 or more",
    "err.overlap": "--overlap needs an integer of 0 or more",
    "err.newline": "--newline must be paragraph or break",
    "err.ellipsis": "--ellipsis must be break or keep",
    "err.lang": "--lang must be en or ko",
    "err.noInput": "No input: pass a file or pipe text to standard input",
    "err.fileNotFound": "File not found: {path}",
    "err.fileRead": "Cannot read file: {path} ({reason})",
    "err.option": "Invalid option: {message}",
    "err.unexpected": "Unexpected error: {message}",
    "err.notBuilt":
      "korchunk is not built: dist/index.js is missing.\nA git install builds it with the \"prepare\" script, and npm skipped that script\n(--ignore-scripts, ignore-scripts=true in .npmrc, or allowScripts set to false).\nReinstall with install scripts allowed:\n  npm uninstall korchunk && npm install github:LeeGyeongPil/korchunk\nIn a cloned repo, run: npm run build",
  },
  ko: {
    "help.usage": "사용법: korchunk [파일] [옵션]",
    "help.intro":
      "한국어 텍스트를 문장으로 나누고 RAG 용 청크로 묶습니다.\n파일을 읽고, 파일이 없거나 \"-\" 이면 표준 입력을 읽습니다.",
    "help.options": "옵션:",
    "help.maxChars": "  --max-chars <N>     청크 크기(글자 수, 기본 500)",
    "help.overlap": "  --overlap <N>       다음 청크에 반복할 마지막 문장 수(기본 0)",
    "help.sentences": "  --sentences         청크 대신 문장을 출력합니다",
    "help.compare": "  --compare           --sentences 와 함께 쓰면 Intl.Segmenter 결과와 나란히 보여 줍니다",
    "help.json": "  --json              JSON 으로 출력합니다",
    "help.newline": "  --newline <모드>    paragraph(기본) | break",
    "help.ellipsis": "  --ellipsis <모드>   break(기본) | keep",
    "help.lang": "  --lang <en|ko>      화면 언어(KORCHUNK_LANG, LC_ALL, LC_MESSAGES, LANG 도 인식합니다)",
    "help.help": "  -h, --help          이 도움말을 보여 줍니다",
    "help.version": "  -v, --version       버전을 보여 줍니다",
    "help.offsets": "오프셋은 원문의 UTF-16 코드 단위입니다: text.slice(start, end).",
    "table.chunks": "청크 수: {count}  (최대 {max}자, 겹침 {overlap})",
    "table.chunkHeader": "청크  [시작,끝)  크기  문장 수  텍스트",
    "table.sentencesHeader": "[시작,끝)  이유  텍스트",
    "table.sentenceCount": "문장 수: {count}",
    "compare.env": "node {node}, ICU {icu}",
    "compare.intl": "Intl.Segmenter: {count}문장",
    "compare.korchunk": "korchunk: {count}문장",
    "err.usage": "사용법 오류: {detail}\n옵션은 \"korchunk --help\" 로 확인하세요.",
    "err.emptyInput": "입력이 비어 있거나 공백뿐입니다. 나눌 내용이 없습니다.",
    "err.unknownOption": "알 수 없는 옵션: {option}",
    "err.missingValue": "옵션에 값이 필요합니다: {option}",
    "err.tooManyArgs": "인자가 너무 많습니다: {arg}",
    "err.badValue": "옵션 값이 올바르지 않습니다: {option} = {value}",
    "err.maxChars": "--max-chars 에는 1 이상의 정수를 넣어 주세요",
    "err.overlap": "--overlap 에는 0 이상의 정수를 넣어 주세요",
    "err.newline": "--newline 에는 paragraph 또는 break 를 넣어 주세요",
    "err.ellipsis": "--ellipsis 에는 break 또는 keep 을 넣어 주세요",
    "err.lang": "--lang 에는 en 또는 ko 를 넣어 주세요",
    "err.noInput": "입력이 없습니다. 파일을 지정하거나 표준 입력으로 텍스트를 넘겨 주세요",
    "err.fileNotFound": "파일 없음: {path}",
    "err.fileRead": "파일을 읽을 수 없습니다: {path} ({reason})",
    "err.option": "옵션이 올바르지 않습니다: {message}",
    "err.unexpected": "예상하지 못한 오류가 발생했습니다: {message}",
    "err.notBuilt":
      "korchunk 가 빌드되지 않았습니다: dist/index.js 가 없습니다.\ngit 으로 설치하면 \"prepare\" 스크립트가 빌드하는데, npm 이 이 스크립트를 건너뛰었습니다\n(--ignore-scripts, .npmrc 의 ignore-scripts=true, allowScripts 의 false 설정).\n설치 스크립트를 허용한 상태로 다시 설치하세요:\n  npm uninstall korchunk && npm install github:LeeGyeongPil/korchunk\n레포를 clone 했다면: npm run build",
  },
};

/** "ko", "ko_KR.UTF-8" and "KO" mean Korean; everything else is English. */
export function langFromValue(value) {
  return typeof value === "string" && /^ko(?:[_.@-]|$)/i.test(value.trim()) ? "ko" : "en";
}

/**
 * Picks the screen language: --lang > KORCHUNK_LANG > LC_ALL > LC_MESSAGES > LANG.
 * The first of the environment variables that is set (non-empty) decides.
 * `flag` is the already-validated --lang value or undefined.
 */
export function resolveLang(flag, env) {
  if (flag === "en" || flag === "ko") return flag;
  for (const name of ["KORCHUNK_LANG", "LC_ALL", "LC_MESSAGES", "LANG"]) {
    const v = env[name];
    if (typeof v === "string" && v.trim() !== "") return langFromValue(v);
  }
  return "en";
}

/** Looks up a message and fills {placeholders}. */
export function t(lang, key, params = {}) {
  const table = MESSAGES[lang] ?? MESSAGES.en;
  const template = table[key] ?? MESSAGES.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
}
