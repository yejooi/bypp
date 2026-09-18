"use client";

// §8-2 ①: 진행률 러너. 화면 하단 고정. 후퇴 없음(원칙②).
// 비주얼: stitch_custom_ui_design_system-2 SignatureGoalRunnerBar (원화 유지).

import { useApp } from "@/lib/store";

export function ProgressRunner() {
  const { goalType, goalAmount, monthlyBudget, items } = useApp();

  if (!goalType || !goalAmount) return null;

  // 이번 달 저축액 = 예산 - 이미 산 금액. 예산을 다 지키면 예산 전액이 기준(시작값)이고,
  // 사는 만큼 줄고 안 쓴 만큼 남는다. 후퇴 연출은 없으니 0 미만은 0으로 둔다 (원칙 ②).
  const spent = items.filter((it) => it.status === "purchased").reduce((sum, it) => sum + it.price, 0);
  const savedThisMonth = Math.max(0, (monthlyBudget ?? 0) - spent);
  const progressPct = goalAmount > 0 ? Math.min(100, (savedThisMonth / goalAmount) * 100) : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#FFFDF5]/95 backdrop-blur-md border-t-[3px] border-[#D6C2A0] py-2.5 px-4 sm:px-8 shadow-2xl z-40 text-[#4A3324]">
      <div className="max-w-[1400px] mx-auto flex items-center gap-4 sm:gap-6">
        <div className="shrink-0 flex flex-col leading-tight">
          <span className="text-xs font-bold text-[#7A5B40]">나의 절약 여정</span>
          <span className="text-lg font-black text-[#2D6C2A]">{progressPct.toFixed(1)}%</span>
        </div>
        <div className="relative flex-1 h-4 bg-[#EADDC6] rounded-full p-0.5 border-2 border-[#C9B390] overflow-visible">
          <div
            className="h-full bg-gradient-to-r from-[#8BC34A] to-[#4CAF50] rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute -top-4 -ml-4 flex flex-col items-center animate-ac-float transition-all duration-700"
            style={{ left: `${progressPct}%` }}
          >
              <div className="w-8 h-8 rounded-full bg-[#FFF0D4] border-2 border-[#69421A] shadow-[0_3px_0_rgba(74,46,53,0.16)] flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" fill="#FFDFBA" r="9" />
                  <circle cx="9" cy="11" fill="#4A2810" r="1.5" />
                  <circle cx="15" cy="11" fill="#4A2810" r="1.5" />
                  <path d="M10 15c.6 1 3.4 1 4 0" fill="none" stroke="#B85D3B" strokeLinecap="round" strokeWidth="1.5" />
                  <circle cx="7" cy="13" fill="#FF8C94" r="1.2" />
                  <circle cx="17" cy="13" fill="#FF8C94" r="1.2" />
                </svg>
              </div>
          </div>
        </div>
        <div className="hidden sm:block shrink-0 max-w-[9rem] truncate text-xs font-bold text-[#7A5B40]">
          🏁 {goalType}
        </div>
        <div className="shrink-0 flex flex-col leading-tight text-right">
          <span className="text-xs font-bold text-[#7A5B40]">이번 달 저축액</span>
          <span className="text-base font-black text-[#2D6C2A]">{savedThisMonth.toLocaleString()}원</span>
        </div>
      </div>
    </footer>
  );
}
