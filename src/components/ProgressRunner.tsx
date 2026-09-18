"use client";

// §8-2 ①: 진행률 러너. 화면 하단 고정, 스크롤해도 계속 보임. 후퇴 연출 없음(원칙②) --
// 이번 달 예산 대비 아낀 금액을 목표 금액에 대한 진행률로 보여준다. 실제 캐릭터 일러스트는
// Stitch 디자인 몫이라, 지금은 막대바 + 텍스트로만 (임시 스타일).

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
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-gray-900 text-white text-xs flex items-center px-3 gap-2 z-40">
      <span className="whitespace-nowrap">{goalType}까지</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <span className="whitespace-nowrap">{progressPct.toFixed(1)}%</span>
    </div>
  );
}
