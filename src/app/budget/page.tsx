"use client";

// ② 예산 설정 (§4, §7). "안다" -> 직접 입력. "모른다" -> 수입/소비로 몬테카를로 역산.
// 비주얼: stitch_custom_ui_design_system/budget_setup.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { runMonteCarlo, DEFAULT_ASSUMPTIONS, type MonteCarloAssumptions } from "@/lib/montecarlo";

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
          monthlyIncome: Number(income),
          monthlyExpense: Number(expense),
          months: Number(months),
          assumptions,
        })
      : null;

  const finalAmount = mode === "direct" ? Number(amount) : mc ? Math.round(mc.recommendedBudget) : 0;
  const canSubmit = finalAmount > 0;

  const inputClass =
    "w-full bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none";

  return (
    <main className="flex-1 flex flex-col gap-5 p-6 pb-28 max-w-md mx-auto w-full">
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-white text-lg shrink-0"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ②
          </span>
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            월 예산을 정해주세요
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] px-3.5 py-1.5 rounded-2xl mt-1">
          <span className="text-base">🎯</span>
          <p className="text-xs text-[var(--text-sub)] font-medium">
            목표: <strong className="text-[var(--text)] font-bold">{goalType ?? "(미설정)"}</strong>{" "}
            <span>·</span>{" "}
            <span className="text-[var(--primary-hover)] font-bold">
              {goalAmount?.toLocaleString()}원
            </span>
          </p>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("montecarlo")}
          className={`text-sm px-4 py-1.5 rounded-full font-bold transition-all ${
            mode === "montecarlo" ? "text-white" : "bg-[var(--surface-alt)] text-[var(--text-sub)]"
          }`}
          style={mode === "montecarlo" ? { backgroundColor: "var(--text)" } : undefined}
        >
          모르겠다
        </button>
        <button
          onClick={() => setMode("direct")}
          className={`text-sm px-4 py-1.5 rounded-full font-bold transition-all ${
            mode === "direct" ? "text-white" : "bg-[var(--surface-alt)] text-[var(--text-sub)]"
          }`}
          style={mode === "direct" ? { backgroundColor: "var(--text)" } : undefined}
        >
          내가 안다
        </button>
      </div>

      {mode === "direct" ? (
        <div className="flex flex-col gap-3">
          <div className="relative bg-[var(--surface)] rounded-[18px] border-2 border-[var(--border)] focus-within:border-[var(--primary)] transition-all p-1">
            <div className="flex items-center px-4 py-3.5 gap-2">
              <span className="font-bold text-lg text-[var(--text-sub)]">₩</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                placeholder="월 예산 (원)"
                className="w-full bg-transparent border-0 p-0 text-lg font-bold focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          <div className="bg-[var(--surface-alt)] rounded-2xl p-3 border border-[var(--border)] flex items-start gap-2.5">
            <span className="text-base mt-0.5">💡</span>
            <p className="text-[11px] font-medium text-[var(--primary-hover)]">
              대략적인 한 달 생활비나 용돈 기준으로 편하게 입력해보세요!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            type="number"
            placeholder="월 수입 (원)"
            className={inputClass}
          />
          <input
            value={expense}
            onChange={(e) => setExpense(e.target.value)}
            type="number"
            placeholder="월 고정 소비 (원, 쇼핑 제외)"
            className={inputClass}
          />
          <label className="text-xs text-[var(--text-sub)] flex flex-col gap-1">
            목표 달성 기한 (개월)
            <input
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              type="number"
              className={inputClass}
            />
          </label>

          <details className="text-xs text-[var(--text-sub)]">
            <summary className="cursor-pointer font-bold">가정값 (조정 가능)</summary>
            <div className="flex flex-col gap-2 pt-2">
              <label className="flex items-center justify-between gap-2">
                연 수익률 평균
                <input
                  type="number"
                  step="0.01"
                  value={assumptions.annualReturnMean}
                  onChange={(e) =>
                    setAssumptions({ ...assumptions, annualReturnMean: Number(e.target.value) })
                  }
                  className="border-2 border-[var(--border)] rounded-lg px-2 py-1 w-20 bg-[var(--surface)]"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                연 수익률 표준편차
                <input
                  type="number"
                  step="0.01"
                  value={assumptions.annualReturnStdev}
                  onChange={(e) =>
                    setAssumptions({ ...assumptions, annualReturnStdev: Number(e.target.value) })
                  }
                  className="border-2 border-[var(--border)] rounded-lg px-2 py-1 w-20 bg-[var(--surface)]"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                연 물가상승률
                <input
                  type="number"
                  step="0.01"
                  value={assumptions.annualInflation}
                  onChange={(e) =>
                    setAssumptions({ ...assumptions, annualInflation: Number(e.target.value) })
                  }
                  className="border-2 border-[var(--border)] rounded-lg px-2 py-1 w-20 bg-[var(--surface)]"
                />
              </label>
              <p>출처: wayfinder #4 (60/40 포트폴리오 장기실적, 한국은행 물가안정목표)</p>
            </div>
          </details>

          {mc && (
            <div className="border-2 border-[var(--border)] bg-[var(--surface)] rounded-2xl p-3.5 text-sm">
              <p>
                가용 자금(수입-소비): <b>{mc.available.toLocaleString()}원</b>
              </p>
              <p>
                권장 저축액: <b>{Math.round(mc.recommendedSavings).toLocaleString()}원</b> (1,000회
                시뮬레이션 중 70%의 경우에서 충분한 값)
              </p>
              <p className="mt-1">
                → 추천 월 예산:{" "}
                <b className="text-base text-[var(--primary-hover)]">
                  {Math.round(mc.recommendedBudget).toLocaleString()}원
                </b>
              </p>
            </div>
          )}
        </div>
      )}

      <button
        disabled={!canSubmit}
        onClick={() => {
          setBudget(finalAmount, mode === "direct" || !mc ? null : Math.round(mc.recommendedSavings));
          router.push("/board");
        }}
        className="mt-auto w-full py-4 rounded-full text-white text-lg tracking-wide flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:translate-y-1"
        style={{
          fontFamily: "var(--font-heading)",
          backgroundColor: "var(--primary)",
          boxShadow: "0 4px 0 var(--primary-hover)",
        }}
      >
        <span>다음</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </main>
  );
}
