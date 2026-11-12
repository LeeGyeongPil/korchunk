// Token budget: korchunk does not bundle a tokenizer, you pass your own synchronous counter.
// Here a toy counter (1 token per 2 characters). With js-tiktoken it would look like:
//   import { getEncoding } from "js-tiktoken";
//   const enc = getEncoding("cl100k_base");
//   const countTokens = (s) => enc.encode(s).length;
import { chunk } from "korchunk";

const countTokens = (s) => Math.ceil(s.length / 2);
const text = "회의 시작할게요 자료 공유해 주세요 오늘 안건은 세 가지입니다. 첫째는 로그 수집이에요. 둘째는 검색 품질입니다.";

for (const c of chunk(text, { maxTokens: 14, countTokens })) {
  console.log(`chunk ${c.index} tokens=${c.size}: ${c.text}`);
}
