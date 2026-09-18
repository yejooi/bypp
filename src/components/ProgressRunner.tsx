"use client";

// §8-2 ①: 진행률 러너. 화면 하단 고정, 스크롤해도 계속 보임. 후퇴 연출 없음(원칙②) --
// 이번 달 예산 대비 아낀 금액을 목표 금액에 대한 진행률로 보여준다.
// 비주얼: stitch_custom_ui_design_system/main_organizer의 SignatureGoalRunnerBar.

import { useApp } from "@/lib/store";

export function ProgressRunner() {
  const { goalType, goalAmount, monthlyBudget, items } = useApp();

  if (!goalType || !goalAmount) return null;

  const buyTotal = items
    .filter((it) => it.status === "buy" || it.status === "purchased")
    .reduce((sum, it) => sum + it.price, 0);

  // 이번 달 아낀 금액(예산 대비) 만큼 목표에 다가간다고 본다. 후퇴 없음 -> 최소 0.
  const savedThisMonth = Math.max(0, (monthlyBudget ?? 0) - buyTotal);
  const progressPct = goalAmount > 0 ? Math.min(100, (savedThisMonth / goalAmount) * 100) : 0;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 h-8 flex items-center gap-2 px-3 sm:px-6 z-40 border-t-2"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <span className="text-xs font-bold whitespace-nowrap shrink-0">🏃 {goalType}까지</span>
      <div
        className="relative flex-1 h-2.5 rounded-full overflow-visible border"
        style={{ backgroundColor: "var(--surface-alt)", borderColor: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progressPct}%`,
            backgroundImage: `linear-gradient(to right, var(--runner-from), var(--runner-to))`,
          }}
        />
        <div
          className="absolute -top-2 flex items-center justify-center text-xs -translate-x-1/2 transition-all duration-700"
          style={{ left: `${progressPct}%` }}
        >
          🐾
        </div>
      </div>
      <span className="text-xs font-bold whitespace-nowrap shrink-0" style={{ color: "var(--accent)" }}>
        {progressPct.toFixed(1)}%
      </span>
    </footer>
  );
}
