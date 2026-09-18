"use client";

// ② 예산 설정 (§4, §7). "안다" -> 직접 입력. "모른다" -> 수입/소비로 몬테카를로 역산.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { runMonteCarlo, DEFAULT_ASSUMPTIONS, type MonteCarloAssumptions } from "@/lib/montecarlo";

export default function BudgetPage() {
  const router = useRouter();
  const { goalType, goalAmount, setBudget } = useApp();
  const [mode, setMode] = useState<"direct" | "montecarlo">("direct");
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

  return (
    <main className="flex-1 flex flex-col gap-6 p-6 pb-10 max-w-md mx-auto w-full">
      <h1 className="text-xl font-bold">② 월 예산을 정해주세요</h1>
      <p className="text-sm text-gray-500">
        목표: {goalType ?? "(미설정)"} · {goalAmount?.toLocaleString()}원
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("direct")}
          className={`text-sm px-3 py-1 rounded ${mode === "direct" ? "bg-black text-white" : "border border-gray-300"}`}
        >
          내가 안다
        </button>
        <button
          onClick={() => setMode("montecarlo")}
          className={`text-sm px-3 py-1 rounded ${mode === "montecarlo" ? "bg-black text-white" : "border border-gray-300"}`}
        >
          모르겠다
        </button>
      </div>

      {mode === "direct" ? (
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="월 예산 (원)"
          className="border border-gray-300 rounded px-3 py-2"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            type="number"
            placeholder="월 수입 (원)"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            value={expense}
            onChange={(e) => setExpense(e.target.value)}
            type="number"
            placeholder="월 고정 소비 (원, 쇼핑 제외)"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            목표 달성 기한 (개월)
            <input
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              type="number"
              className="border border-gray-300 rounded px-3 py-2"
            />
          </label>

          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">가정값 (조정 가능)</summary>
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
                  className="border border-gray-300 rounded px-2 py-1 w-20"
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
                  className="border border-gray-300 rounded px-2 py-1 w-20"
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
                  className="border border-gray-300 rounded px-2 py-1 w-20"
                />
              </label>
              <p>출처: wayfinder #4 (60/40 포트폴리오 장기실적, 한국은행 물가안정목표)</p>
            </div>
          </details>

          {mc && (
            <div className="border border-gray-200 rounded p-3 text-sm">
              <p>
                가용 자금(수입-소비): <b>{mc.available.toLocaleString()}원</b>
              </p>
              <p>
                권장 저축액: <b>{Math.round(mc.recommendedSavings).toLocaleString()}원</b> (1,000회
                시뮬레이션 중 70%의 경우에서 충분한 값)
              </p>
              <p className="mt-1">
                → 추천 월 예산:{" "}
                <b className="text-base">{Math.round(mc.recommendedBudget).toLocaleString()}원</b>
              </p>
            </div>
          )}
        </div>
      )}

      <button
        disabled={!canSubmit}
        onClick={() => {
          setBudget(finalAmount);
          router.push("/board");
        }}
        className="mt-auto bg-black text-white rounded px-4 py-3 disabled:opacity-30"
      >
        다음
      </button>
    </main>
  );
}
