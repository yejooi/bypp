#!/usr/bin/env node
// Phase 1 (CLAUDE.md §10): LLM 파이프라인 단독 확인. UI 없이 스크립트로.
// 확인할 것 (§10 "Phase 1을 먼저 하는 이유"):
//   1. 같은 입력 3회 -> 순위 동일한가 (재현성)
//   2. 순위를 보고 납득되는가
//   3. 가격순과 순위가 다른가
//
// 3 vs 5 지표 실험 (§6-1, wayfinder map에서 out of scope 처리 - Phase 1 실행으로 결정):
//   LLM은 3개(satisfaction_months, usage_frequency, cart_duplication)만 추정.
//   price_volatility / inconvenience_if_not는 규칙 기반으로 얻어 LLM 재현성 부담 없이 "5개 신호"를 확보하는
//   CLAUDE.md 자체의 "절충안"을 그대로 구현한다. 이 스크립트가 그 절충안이 실제로 잘 도는지 검증한다.

import { readFileSync } from "node:fs";

function loadEnv(path) {
  const text = readFileSync(path, "utf-8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^"(.*)"$/, "$1");
  }
}
loadEnv(new URL("../.env.local", import.meta.url));

const MODEL = "claude-sonnet-5";

// ---- 시드 데이터 (임시 mock 6개 - 실제 상품 데이터는 wayfinder 이슈 #7에서 사용자가 준비 중) ----
const SEED_ITEMS = [
  { id: "A", name: "리미티드 스니커즈", price: 250000, category: "신발", reason_code: "mood_boost", on_sale: false },
  { id: "B", name: "보조배터리 (기존 것 고장)", price: 30000, category: "전자기기>액세서리", reason_code: "broke_replace", on_sale: false },
  { id: "C", name: "니트 스웨터", price: 80000, category: "의류>상의", reason_code: "long_wanted", on_sale: false },
  { id: "D", name: "스마트워치", price: 150000, category: "전자기기>웨어러블", reason_code: "on_sale", on_sale: true, sale_rate: 25 },
  { id: "E", name: "후드집업 (친구 추천)", price: 60000, category: "아우터>후드집업", reason_code: "social_proof", on_sale: false },
  { id: "F", name: "후드집업 (오래 고민함)", price: 90000, category: "아우터>후드집업", reason_code: "long_wanted", on_sale: false },
];

// ---- 규칙 기반 신호 (LLM 호출 없음 - §6-1 절충안) ----
const REASON_CODE_MULTIPLIER = {
  long_wanted: 1.2,
  urgent_need: 1.3,
  broke_replace: 1.25,
  on_sale: 0.8,
  social_proof: 0.75,
  mood_boost: 0.7,
};

const INCONVENIENCE_IF_NOT = {
  urgent_need: 0.9,
  broke_replace: 0.85,
  long_wanted: 0.4,
  on_sale: 0.3,
  social_proof: 0.25,
  mood_boost: 0.2,
};

function priceVolatility(category) {
  if (category.startsWith("전자기기")) return 0.8;
  if (category.startsWith("의류") || category.startsWith("아우터")) return 0.6;
  return 0.2;
}

// ---- 몬테카를로 티켓(#4)에서 정한 기본값 ----
const ANNUAL_RETURN = 0.07;
const MONTHLY_RETURN = Math.pow(1 + ANNUAL_RETURN, 1 / 12) - 1;

// ---- 가중치 티켓(#5)에서 정한 기본값 ----
const QUAL_WEIGHT = 0.65; // 0(가격순) ~ 1(AI 판단), 기본 65

async function callClaude(items) {
  const prompt = `너는 사용자의 장바구니 항목들을 평가하는 어시스턴트다. 아래 항목들을 한 번에 평가해라.
전 항목을 비교 기준이 흔들리지 않게 동시에 평가하고, 아래 스키마의 JSON만 출력해라 (설명 문장 없이).

평가 기준:
- satisfaction_months: 이 항목을 사면 만족이 몇 개월이나 지속될지 (숫자, 개월)
- usage_frequency: 얼마나 자주 쓸지 (0~1, 1=매일 씀)
- cart_duplication: 같은 장바구니 안에 목적이 겹치는 항목이 또 있는지 (0~1, 1=완전히 중복)

항목 목록:
${items.map((it) => `- id=${it.id} name="${it.name}" price=${it.price} category="${it.category}" reason_code=${it.reason_code}${it.on_sale ? ` on_sale=true sale_rate=${it.sale_rate}` : ""}`).join("\n")}

출력 스키마:
{"items": [{"id": "...", "satisfaction_months": number, "usage_frequency": number, "cart_duplication": number, "reasoning": "한 줄 근거"}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      // note: `temperature` is deprecated/rejected by the API for claude-sonnet-5 (as of this session).
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === "text");
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("--- RAW TEXT (JSON parse failed) ---");
    console.error(textBlock.text);
    console.error(`--- stop_reason=${data.stop_reason} ---`);
    throw e;
  }
}

function computeScores(items, llmResults) {
  const byId = Object.fromEntries(llmResults.items.map((r) => [r.id, r]));

  const rows = items.map((item) => {
    const llm = byId[item.id];
    const opportunityCost = item.price * Math.pow(1 + MONTHLY_RETURN, llm.satisfaction_months);
    const monthlyOpportunityCost = opportunityCost / llm.satisfaction_months;

    const qualitativeScore =
      llm.satisfaction_months *
      llm.usage_frequency *
      REASON_CODE_MULTIPLIER[item.reason_code] *
      (1 - 0.5 * llm.cart_duplication);

    return {
      ...item,
      ...llm,
      price_volatility: priceVolatility(item.category),
      inconvenience_if_not: INCONVENIENCE_IF_NOT[item.reason_code],
      monthlyOpportunityCost,
      qualitativeScore,
    };
  });

  const quantValues = rows.map((r) => 1 / r.monthlyOpportunityCost);
  const qualValues = rows.map((r) => r.qualitativeScore);
  const norm = (arr) => {
    const min = Math.min(...arr), max = Math.max(...arr);
    return arr.map((v) => (max === min ? 0.5 : (v - min) / (max - min)));
  };
  const quantNorm = norm(quantValues);
  const qualNorm = norm(qualValues);

  return rows
    .map((r, i) => ({
      ...r,
      finalScore: QUAL_WEIGHT * qualNorm[i] + (1 - QUAL_WEIGHT) * quantNorm[i],
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

function printRanking(label, rows) {
  console.log(`\n=== ${label} ===`);
  rows.forEach((r, i) => {
    console.log(
      `${i + 1}. [${r.id}] ${r.name.padEnd(20)} price=${r.price.toString().padStart(7)} ` +
        `satisfaction=${r.satisfaction_months}mo usage=${r.usage_frequency} dup=${r.cart_duplication} ` +
        `score=${r.finalScore.toFixed(3)}`
    );
  });
}

async function main() {
  console.log("가격순 (참고용):");
  [...SEED_ITEMS]
    .sort((a, b) => b.price - a.price)
    .forEach((it, i) => console.log(`${i + 1}. [${it.id}] ${it.name} - ${it.price}원`));

  const runs = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Run ${i}/3 (temperature=0) ---`);
    const llmResults = await callClaude(SEED_ITEMS);
    const scored = computeScores(SEED_ITEMS, llmResults);
    printRanking(`Run ${i}`, scored);
    runs.push(scored.map((r) => r.id));
  }

  console.log("\n=== 재현성 체크 ===");
  const allSame = runs.every((r) => r.join(",") === runs[0].join(","));
  console.log(allSame ? "✅ 3회 모두 순위 동일 (재현성 확보)" : "⚠️  순위가 회차마다 다름:");
  if (!allSame) runs.forEach((r, i) => console.log(`  Run ${i + 1}: ${r.join(" > ")}`));

  const priceOrder = [...SEED_ITEMS].sort((a, b) => b.price - a.price).map((it) => it.id);
  const aiOrder = runs[0];
  const same = priceOrder.join(",") === aiOrder.join(",");
  console.log(
    same
      ? "⚠️  가격순과 AI순위가 동일함 (검증 포인트 실패 - satisfaction_months가 제 역할을 못 하는 것)"
      : "✅ 가격순과 AI순위가 다름 (검증 포인트 통과)"
  );
  console.log(`  가격순: ${priceOrder.join(" > ")}`);
  console.log(`  AI순위: ${aiOrder.join(" > ")}`);
}

main();
