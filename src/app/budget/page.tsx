"use client";

// ② 예산 설정 (§4, §7). "안다" -> 직접 입력. "모른다" -> 수입/소비로 몬테카를로 역산.
// 비주얼: stitch_custom_ui_design_system/budget_setup.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { WoodSign, HAND } from "@/components/neighbor-ui";
import { GoalIcon } from "@/components/GoalIcon";
import { Mascot, SpeechBubble } from "@/components/Mascot";
import { runMonteCarlo, DEFAULT_ASSUMPTIONS, type MonteCarloAssumptions } from "@/lib/montecarlo";

// 화면 입력과 표시는 모두 만원 단위. 내부 계산/저장은 원 단위.
const MAN = 10000;
const man = (won: number) => `${Math.round(won / MAN).toLocaleString()}만원`;

export default function BudgetPage() {
  const router = useRouter();
  const { goalType, goalAmount, setBudget } = useApp();
  const [mode, setMode] = useState<"direct" | "montecarlo">("montecarlo");
  const [amount, setAmount] = useState("");

  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [months, setMonths] = useState("24");
  const [assumptions, setAssumptions] = useState<MonteCarloAssumptions>(DEFAULT_ASSUMPTIONS);

  const canRunMc = !!income && !!expense && !!months && !!goalAmount;
  const mc =
    canRunMc && mode === "montecarlo"
      ? runMonteCarlo({
          goalAmount: goalAmount!,
          monthlyIncome: Number(income) * MAN,
          monthlyExpense: Number(expense) * MAN,
          months: Number(months),
          assumptions,
        })
      : null;

  const finalAmount =
    mode === "direct" ? Number(amount) * MAN : mc ? Math.round(mc.recommendedBudget / MAN) * MAN : 0;
  const canSubmit = finalAmount > 0;

  return (
    <main className="flex-1 flex flex-col gap-4 p-6 pt-24 pb-10 max-w-md mx-auto w-full">
      <div className="flex flex-col items-start gap-3">
        <WoodSign>
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#4F8B33] border-2 border-[#BEE88A] text-white text-2xl font-bold leading-none shrink-0"
            style={HAND}
          >
            2
          </span>
          월 예산을 정해주세요
        </WoodSign>
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#F0C77A] bg-[#FFF0D4] px-4 py-1.5 text-sm font-black text-[#7A4A00]">
          <GoalIcon goal={goalType} className="w-4 h-4 text-[#C9820F]" />
          <span>{goalType ?? "(미설정)"}</span>
          <span className="opacity-50">·</span>
          <span>{goalAmount != null ? man(goalAmount) : ""}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["montecarlo", "모르겠다"],
            ["direct", "안다"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-2 rounded-2xl text-xl ${
              mode === m
                ? "btn-soft-green"
                : "border-2 border-[#D4C3A3] bg-[#EFE8D6] text-[#694D36] font-black shadow-[0_3px_0_rgba(74,46,53,0.12)] active:translate-y-0.5 transition"
            }`}
            style={HAND}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="relative flex flex-col gap-3 rounded-[28px] border-4 border-[#D6C2A5] bg-[#FFFBF2] p-5 shadow-[0_6px_0_rgba(74,46,53,0.18)]">
        {mode === "direct" ? (
          <>
            <Field label="월 예산" suffix="만원" value={amount} onChange={setAmount} placeholder="예: 30" />
            <Tip>대략적인 한 달 생활비나 용돈 기준으로 편하게 넣어 보세요!</Tip>
          </>
        ) : (
          <>
            <Field label="월 수입" suffix="만원" value={income} onChange={setIncome} placeholder="예: 300" />
            <Field label="월 고정 소비 (쇼핑 제외)" suffix="만원" value={expense} onChange={setExpense} placeholder="예: 200" />
            <Field label="목표 달성 기한" suffix="개월" value={months} onChange={setMonths} placeholder="24" />

            <details className="text-xs text-[#6F523A]">
              <summary className="cursor-pointer font-black">가정값 (조정 가능)</summary>
              <div className="flex flex-col gap-2 pt-2">
                {(
                  [
                    ["연 수익률 평균", "annualReturnMean"],
                    ["연 수익률 표준편차", "annualReturnStdev"],
                    ["연 물가상승률", "annualInflation"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex items-center justify-between gap-2 font-bold">
                    {label}
                    <input
                      type="number"
                      step="0.01"
                      value={assumptions[key]}
                      onChange={(e) => setAssumptions({ ...assumptions, [key]: Number(e.target.value) })}
                      className="w-24 rounded-xl border-2 border-[#D6C2A5] bg-white px-2 py-1 text-right font-black focus:outline-none focus:border-[#6FAE4A]"
                    />
                  </label>
                ))}
                <p className="font-medium opacity-80">출처: wayfinder #4 (60/40 포트폴리오 장기실적, 한국은행 물가안정목표)</p>
              </div>
            </details>

            {mc && (
              <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#AED48C] bg-[#F4FBEA] p-3.5 text-sm text-[#2D6C2A]">
                <Row label="가용 자금 (수입 - 소비)" value={man(mc.available)} />
                <Row label="권장 저축액" value={man(mc.recommendedSavings)} />
                <p className="text-[11px] font-medium opacity-80 -mt-1">1,000번 시뮬레이션 중 70%에서 충분한 값이에요.</p>
                <div className="h-px bg-[#CDE8B4]" />
                <Row label="추천 월 예산" value={man(mc.recommendedBudget)} big />
              </div>
            )}
          </>
        )}
      </section>

      <button
        disabled={!canSubmit}
        onClick={() => {
          setBudget(finalAmount, mode === "direct" || !mc ? null : Math.round(mc.recommendedSavings / MAN) * MAN);
          router.push("/board");
        }}
        className="btn-soft-green mt-2 mx-auto w-fit px-14 py-1.5 rounded-2xl text-xl flex items-center gap-2"
        style={HAND}
      >
        다음
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </main>
  );
}

// 라벨은 위, 입력은 아래, 단위는 입력 안 오른쪽. 모든 칸이 같은 높이와 왼쪽 선을 쓴다.
function Field({
  label,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-black text-[#6F523A]">{label}</span>
      <span className="flex items-center gap-2 rounded-2xl border-2 border-[#D6C2A5] bg-white px-4 h-12 focus-within:border-[#6FAE4A] transition-colors">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-lg font-black text-[#4A3324] focus:outline-none placeholder:font-medium placeholder:text-[#B8A88E]"
        />
        <span className="shrink-0 text-sm font-black text-[#8A7460]">{suffix}</span>
      </span>
    </label>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-bold">{label}</span>
      <span className={big ? "text-xl font-black" : "font-black"} style={big ? HAND : undefined}>
        {value}
      </span>
    </div>
  );
}

// 냥이가 말해 주는 안내 (전구 이모지 대신).
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Mascot size={40} mood="idle" />
      <SpeechBubble className="flex-1">{children}</SpeechBubble>
    </div>
  );
}
