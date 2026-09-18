// §6-2: 전 항목 한 번에 평가, 서버 라우트에서만 호출.
// temperature는 claude-sonnet-5에서 거부됨 (Phase 1에서 확인) -> 보내지 않는다.
// §9-2: JSON 파싱 실패 시 1회 재시도 -> 그래도 실패하면 에러로 폴백 (클라이언트가 가격순으로 대체).

import { NextRequest, NextResponse } from "next/server";
import type { EvalInput, LlmEstimate } from "@/lib/scoring";

const MODEL = "claude-sonnet-5";

const REASON_LABEL: Record<string, string> = {
  long_wanted: "오래전부터 갖고 싶었음",
  urgent_need: "지금 당장 필요함",
  broke_replace: "쓰던 게 망가짐/떨어짐",
  on_sale: "세일 중이라서",
  social_proof: "남들이 좋다고 해서",
  mood_boost: "그냥 기분전환",
  other: "기타 (아래 직접 입력한 이유 참고)",
};

function buildPrompt(items: EvalInput[]): string {
  return `너는 사용자의 장바구니 항목들을 평가하는 어시스턴트다. 아래 항목들을 한 번에 평가해라.
전 항목을 비교 기준이 흔들리지 않게 동시에 평가하고, 아래 스키마의 JSON만 출력해라 (설명 문장 없이).

평가 기준:
- satisfaction_months: 이 항목을 사면 만족이 몇 개월이나 지속될지 (숫자, 개월)
- usage_frequency: 얼마나 자주 쓸지 (0~1, 1=매일 씀)
- cart_duplication: 같은 장바구니 안에 목적이 겹치는 항목이 또 있는지 (0~1, 1=완전히 중복)

reason_code가 "other"인 항목은 사용자가 직접 적은 이유가 따로 붙어있다. 그 문장을 참고해서
satisfaction_months/usage_frequency를 판단해라 (이 이유 자체가 점수 가중치를 결정하진 않는다, 참고만).

각 항목에는 사용자가 직접 매긴 1~5 평가(3=보통)가 붙어있다. 이 값을 무시하지 말고 상품 정보와 통합해서
satisfaction_months/usage_frequency를 판단해라. 사용자 평가와 네 판단이 크게 다르면 reasoning 한 줄에 그 이유를 적어라.

항목 목록:
${items
  .map((it) => {
    const custom = it.reasonCode === "other" && it.customReason ? ` 사용자가 적은 이유="${it.customReason}"` : "";
    const ratings = ` 사용자 평가(1~5): 급한 정도=${it.urgency ?? 3}, 갖고 싶은 정도=${it.desire ?? 3}, 오래 쓸 것 같은 정도=${it.longevity ?? 3}`;
    return `- id=${it.id} name="${it.name}" price=${it.price} category="${it.category ?? "미분류"}" reason_code=${it.reasonCode}(${REASON_LABEL[it.reasonCode]})${ratings}${custom}`;
  })
  .join("\n")}

모든 항목의 id에 대해 결과를 빠짐없이 채워라. 출력 스키마 (설명 없이 이 JSON만):
{"items": [{"id": "...", "satisfaction_months": number, "usage_frequency": number, "cart_duplication": number, "reasoning": "한 줄 근거"}]}`;
}

async function callClaudeOnce(items: EvalInput[]): Promise<{ items: LlmEstimate[] } | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(items) }],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const textBlock = data.content.find((b: { type: string }) => b.type === "text");
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// §9-2: LLM 응답에 항목이 누락되면 그 항목만 기본값(중립)으로 채우고 나머지는 정상 표시.
function fillMissing(items: EvalInput[], parsed: { items: LlmEstimate[] } | null): LlmEstimate[] {
  const byId = new Map((parsed?.items ?? []).map((r) => [r.id, r]));
  return items.map((item) => {
    const found = byId.get(item.id);
    if (found) return found;
    return {
      id: item.id,
      satisfaction_months: 6,
      usage_frequency: 0.5,
      cart_duplication: 0,
      reasoning: "판정 실패 - 기본값 사용",
    };
  });
}

export async function POST(req: NextRequest) {
  const { items } = (await req.json()) as { items: EvalInput[] };
  if (!items?.length) {
    return NextResponse.json({ error: "no_items" }, { status: 400 });
  }

  let parsed = await callClaudeOnce(items);
  if (!parsed) {
    parsed = await callClaudeOnce(items); // 1회 재시도
  }

  if (!parsed) {
    return NextResponse.json({ error: "llm_call_failed" }, { status: 502 });
  }

  // 응답에서 빠진 항목만 한 번 더 물어본다. 그래도 없으면 기본값으로 채운다.
  const got = new Set(parsed.items.map((r) => r.id));
  const missing = items.filter((it) => !got.has(it.id));
  if (missing.length > 0) {
    const again = await callClaudeOnce(missing);
    if (again?.items?.length) parsed = { items: [...parsed.items, ...again.items] };
  }

  return NextResponse.json({ items: fillMissing(items, parsed) });
}
