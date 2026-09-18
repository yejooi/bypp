// §6-2: 전 항목 한 번에 평가, 서버 라우트에서만 호출.
// temperature는 claude-sonnet-5에서 거부됨 (Phase 1에서 확인) -> 보내지 않는다.

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

항목 목록:
${items
  .map((it) => {
    const custom = it.reasonCode === "other" && it.customReason ? ` 사용자가 적은 이유="${it.customReason}"` : "";
    return `- id=${it.id} name="${it.name}" price=${it.price} category="${it.category ?? "미분류"}" reason_code=${it.reasonCode}(${REASON_LABEL[it.reasonCode]})${custom}`;
  })
  .join("\n")}

출력 스키마:
{"items": [{"id": "...", "satisfaction_months": number, "usage_frequency": number, "cart_duplication": number, "reasoning": "한 줄 근거"}]}`;
}

export async function POST(req: NextRequest) {
  const { items } = (await req.json()) as { items: EvalInput[] };
  if (!items?.length) {
    return NextResponse.json({ error: "no_items" }, { status: 400 });
  }

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

  if (!res.ok) {
    return NextResponse.json({ error: "llm_call_failed", detail: await res.text() }, { status: 502 });
  }

  const data = await res.json();
  const textBlock = data.content.find((b: { type: string }) => b.type === "text");
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "no_json_in_response" }, { status: 502 });
  }

  let parsed: { items: LlmEstimate[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "json_parse_failed" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
