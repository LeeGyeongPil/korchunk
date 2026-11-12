// Quick start: split Korean text into sentences, then pack them into chunks.
// `npm start` runs this file. Offsets are UTF-16 code units: text.slice(start, end).
import { splitSentences, chunk } from "korchunk";

const text = "어제 배포했어요 그런데 로그가 안 쌓이더라고요 그래서 롤백했습니다. 오늘은 원인을 찾았어요!";

// 1) Sentences with offsets into the original text
for (const s of splitSentences(text)) {
  console.log(`[${s.start},${s.end}) ${s.reason.padEnd(6)} ${s.text}`);
}

// 2) Chunks of at most 40 characters; the last sentence of a chunk repeats in the next one
for (const c of chunk(text, { maxChars: 40, overlapSentences: 1 })) {
  console.log(`chunk ${c.index} [${c.start},${c.end}) size=${c.size} sentences=${c.sentences.length}: ${c.text}`);
}
