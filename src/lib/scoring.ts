// §6: AI 판정 로직. Phase 1(scripts/phase1-llm-check.mjs)에서 검증한 공식을 그대로 옮긴 것.
// LLM은 3개(satisfaction_months/usage_frequency/cart_duplication)만 추정, 나머지 2개는 규칙 기반 (§6-1 결정).

import type { ReasonCode } from "@/lib/store";

export type EvalInput = {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  reasonCode: ReasonCode;
  customReason?: string | null;
};

export type LlmEstimate = {
  id: string;
  satisfaction_months: number;
  usage_frequency: number;
  cart_duplication: number;
  reasoning: string;
};

export type ScoredItem = EvalInput &
  LlmEstimate & {
    price_volatility: number;
    inconvenience_if_not: number;
    monthlyOpportunityCost: number;
    qualitativeScore: number;
    finalScore: number;
  };

// "other"는 중립(1.0/0.5) -- 자유 입력 이유는 가중치에 가산/감산 없이, LLM 프롬프트에 보조 맥락으로만 전달한다.
const REASON_CODE_MULTIPLIER: Record<ReasonCode, number> = {
  long_wanted: 1.2,
  urgent_need: 1.3,
  broke_replace: 1.25,
  on_sale: 0.8,
  social_proof: 0.75,
  mood_boost: 0.7,
  other: 1.0,
};

const INCONVENIENCE_IF_NOT: Record<ReasonCode, number> = {
  urgent_need: 0.9,
  broke_replace: 0.85,
  long_wanted: 0.4,
  on_sale: 0.3,
  social_proof: 0.25,
  mood_boost: 0.2,
  other: 0.5,
};

function priceVolatility(category: string | null | undefined): number {
  if (!category) return 0.2;
  if (category.startsWith("전자기기")) return 0.8;
  if (category.startsWith("의류") || category.startsWith("아우터")) return 0.6;
  return 0.2;
}

// wayfinder #4 결정: 수익률 평균 7%, wayfinder #5 결정: 가중치 기본값 65 (0~100, 30~100 범위).
const ANNUAL_RETURN = 0.07;
const MONTHLY_RETURN = Math.pow(1 + ANNUAL_RETURN, 1 / 12) - 1;
export const DEFAULT_QUAL_WEIGHT = 0.65;

export function computeScores(
  items: EvalInput[],
  llmResults: LlmEstimate[],
  qualWeight: number = DEFAULT_QUAL_WEIGHT
): ScoredItem[] {
  const byId = new Map(llmResults.map((r) => [r.id, r]));

  const rows = items.map((item) => {
    const llm = byId.get(item.id);
    if (!llm) throw new Error(`missing LLM estimate for item ${item.id}`);

    const opportunityCost = item.price * Math.pow(1 + MONTHLY_RETURN, llm.satisfaction_months);
    const monthlyOpportunityCost = opportunityCost / llm.satisfaction_months;

    const qualitativeScore =
      llm.satisfaction_months *
      llm.usage_frequency *
      REASON_CODE_MULTIPLIER[item.reasonCode] *
      (1 - 0.5 * llm.cart_duplication);

    return {
      ...item,
      ...llm,
      price_volatility: priceVolatility(item.category),
      inconvenience_if_not: INCONVENIENCE_IF_NOT[item.reasonCode],
      monthlyOpportunityCost,
      qualitativeScore,
    };
  });

  const quantValues = rows.map((r) => 1 / r.monthlyOpportunityCost);
  const qualValues = rows.map((r) => r.qualitativeScore);
  const norm = (arr: number[]) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return arr.map((v) => (max === min ? 0.5 : (v - min) / (max - min)));
  };
  const quantNorm = norm(quantValues);
  const qualNorm = norm(qualValues);

  return rows
    .map((r, i) => ({
      ...r,
      finalScore: qualWeight * qualNorm[i] + (1 - qualWeight) * quantNorm[i],
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

// wayfinder #6 결정: 문구는 템플릿이고 숫자는 실제 계산값으로 채운다.
function formatManWon(won: number): string {
  return `${Math.max(1, Math.ceil(won / 10000))}만원`;
}

export function positiveMessage(): string {
  return "예산 안에서 여유 있게 들어와요. 편하게 담아도 돼요";
}

export function smallGapMessage(gapWon: number): string {
  return `${formatManWon(gapWon)}만 더 있으면 이번 달 예산 안에 들어와요`;
}

export function bigGapMessage(removeCount: number): string {
  return `지금 순위 그대로면 ${removeCount}개 정도는 빼야 넉넉해져요`;
}
