#!/usr/bin/env node
// 복사 모드 왕복 성질 검사. 자세한 설명과 알려진 발견은 SKILL.md.
//
// 성질 P: 모든 손님 g ∈ GUESTS, attend ∈ {"참석",""}, 다듬어진(trim) 문자열 cantEat·wantEat(한 줄)·note(여러 줄) 에 대해
//   parseManual(asText(d)) 는 원소 하나짜리 배열이고 그 원소의 guestId·name·attend·cantEat·wantEat·note 가 d 와 같다.
//
// 검사 대상은 저장소의 실제 함수다. assets/invite.js 의 asText 와 assets/admin.js 의 parseManual 소스를 이름으로 잘라 와서 실행한다.
// 모델이 아니라 코드 그 자체이므로, 함수 이름이 바뀌면 이 검사는 "함수를 찾지 못함" 으로 실패한다.
//
//   node .claude/skills/verify-rsvp-roundtrip/check.mjs            # 알려진 발견만 있으면 종료 코드 0, 새 반례가 있으면 1
//   node .claude/skills/verify-rsvp-roundtrip/check.mjs --strict   # 반례가 하나라도 있으면 1
//   node .claude/skills/verify-rsvp-roundtrip/check.mjs --seed 7 --random 50000

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1] === undefined || argv[i + 1].startsWith("--") ? true : argv[i + 1]; };
const STRICT = !!flag("strict", false), SEED = Number(flag("seed", 20261121)), RANDOM = Number(flag("random", 20000));

// ---------- 실제 코드 불러오기 ----------
function extractFunction(file, name) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const head = src.indexOf("function " + name + "(");
  if (head < 0) throw new Error(`${file} 에 function ${name}( 가 없다. 이름이 바뀌었으면 SKILL.md 의 적용 범위를 갱신하라.`);
  let i = src.indexOf("{", head), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}" && --depth === 0) break; }
  return src.slice(head, i + 1);
}
const windowObj = {}; new Function("window", fs.readFileSync(path.join(ROOT, "config.js"), "utf8"))(windowObj);
const GUESTS = windowObj.GUESTS;
const asText = new Function(extractFunction("assets/invite.js", "asText") + "; return asText;")();
const parseManual = new Function("GUESTS", extractFunction("assets/admin.js", "parseManual") + "; return parseManual;")(GUESTS);

// ---------- 성질 ----------
const FIELDS = ["guestId", "name", "attend", "cantEat", "wantEat", "note"];
function check(d) {
  const out = parseManual(asText(d));
  if (out.length !== 1) return { d, got: out, why: `원소 ${out.length}개` };
  const bad = FIELDS.filter((k) => out[0][k] !== d[k]);
  return bad.length ? { d, got: out[0], why: bad.map((k) => `${k}: ${JSON.stringify(d[k])} → ${JSON.stringify(out[0][k])}`).join(", ") } : null;
}
// 알려진 발견의 분류. 새 범주의 반례는 "new" 로 보고된다.
function classify(d) {
  const vals = [d.cantEat, d.wantEat, d.note];
  if (vals.some((v) => v.includes("[초대장 답변]"))) return "marker-in-field";
  if (vals.some((v) => v.includes("\n"))) return "multiline-note";
  if (vals.some((v) => v === "없음" || v === "미응답")) return "none-literal";
  return "new";
}

// ---------- 입력 생성 ----------
const TOK_LINE = ["a", "b", " ", ":", "없음", "미응답", "[초대장 답변]", "메모", "이름", "참석"];
const TOK_ALL = TOK_LINE.concat(["\n"]);
const trimmed = (s) => s.trim();
function* sequences(tokens, maxLen) { // 길이 0..maxLen 의 모든 토큰열
  const rec = function* (prefix, n) { yield prefix.join(""); if (n === 0) return; for (const t of tokens) yield* rec(prefix.concat(t), n - 1); };
  yield* rec([], maxLen);
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const RICH = TOK_ALL.concat(["고수", "새우", "전골", ",", ".", "!", "?", "(", ")", "-", "·", "  ", "\t", "😀", "없", "음", "[", "]", "초대장 답변", ":\n", "\n\n"]);
function randomField(multiline) {
  const n = Math.floor(rnd() * 12); let s = "";
  for (let i = 0; i < n; i++) { const t = pick(RICH); if (!multiline && t.includes("\n")) continue; s += t; }
  return trimmed(s);
}

// ---------- 실행 ----------
const results = { cases: 0, failures: 0, byCategory: {}, examples: {} };
const seen = new Set();
function run(d) {
  const key = JSON.stringify(d); if (seen.has(key)) return; seen.add(key);
  results.cases++;
  const f = check(d); if (!f) return;
  results.failures++;
  const cat = classify(d);
  results.byCategory[cat] = (results.byCategory[cat] || 0) + 1;
  const size = d.cantEat.length + d.wantEat.length + d.note.length;
  if (!results.examples[cat] || size < results.examples[cat].size) results.examples[cat] = { ...f, size };
}
const base = (g, attend, cantEat, wantEat, note) => ({ guestId: g.id, name: g.name, attend, cantEat, wantEat, note });

// 1) 전수 열거: 필드 하나씩 길이 0..3 토큰열 전부, 나머지는 "x". 손님 전원, 참석 둘 다.
for (const g of GUESTS) for (const attend of ["참석", ""]) {
  for (const s of sequences(TOK_LINE, 3)) { run(base(g, attend, trimmed(s), "x", "x")); run(base(g, attend, "x", trimmed(s), "x")); }
  for (const s of sequences(TOK_ALL, 3)) run(base(g, attend, "x", "x", trimmed(s)));
}
const exhaustive = results.cases;
// 2) 시드 난수: 세 필드를 동시에 넓은 알파벳으로.
for (let i = 0; i < RANDOM; i++) run(base(pick(GUESTS), pick(["참석", ""]), randomField(false), randomField(false), randomField(true)));

// ---------- 보고 ----------
const cats = Object.keys(results.byCategory).sort();
console.log(`verify-rsvp-roundtrip: ${results.cases} 경우 검사 (전수 ${exhaustive}, 난수 ${results.cases - exhaustive}, seed ${SEED})`);
console.log(`실패 ${results.failures}건` + (cats.length ? `: ${cats.map((c) => `${c}=${results.byCategory[c]}`).join(", ")}` : ""));
for (const c of cats) {
  const e = results.examples[c];
  console.log(`\n[${c === "new" ? "새 반례" : "알려진 발견"}] ${c}\n  입력 d = ${JSON.stringify({ attend: e.d.attend, cantEat: e.d.cantEat, wantEat: e.d.wantEat, note: e.d.note })}\n  asText(d) 는\n${asText(e.d).split("\n").map((l) => "    | " + l).join("\n")}\n  parseManual 결과: ${e.why}`);
}
const hasNew = !!results.byCategory.new;
if (hasNew) console.log("\n결론: 알려진 분류에 없는 반례가 있다. 코드 변경이 왕복을 새로 깨뜨렸는지 확인하라.");
else if (results.failures) console.log("\n결론: 실패는 모두 SKILL.md 에 기록된 알려진 발견이다. 새 반례 없음.");
else console.log("\n결론: 모든 경우 통과. 알려진 발견이 고쳐졌다면 SKILL.md 에서 해당 항목을 지워라.");
process.exit(hasNew || (STRICT && results.failures) ? 1 : 0);
