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
    <footer className="fixed bottom-0 left-0 right-0 bg-[#FFFDF5]/95 backdrop-blur-md border-t-[3px] border-[#D6C2A0] py-3 px-4 sm:px-8 shadow-2xl z-40 text-[#4A3324]">
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-2/3 flex items-center gap-3">
          <div className="text-xs font-black text-[#5C3F2B] shrink-0 flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-[#529E2E] flex items-center justify-center text-white">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
              </svg>
            </div>
            <span>나의 절약 여정</span>
            <span className="text-[#E84364] font-black text-sm">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="relative flex-1 h-4 bg-[#EADDC6] rounded-full p-0.5 border-2 border-[#C9B390] overflow-visible">
            <div
              className="h-full bg-gradient-to-r from-[#8BC34A] to-[#4CAF50] rounded-full transition-all duration-700 shadow-inner"
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
          <div className="flex items-center gap-1.5 text-xs font-black text-[#5C3B1E] bg-[#F7E6B8] px-3 py-1 rounded-full border-2 border-[#D6A940] shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#E09D1B] inline-flex items-center justify-center text-white text-[9px]">
              ₩
            </span>
            <span className="max-w-[9rem] truncate">{goalType}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#523B28]">
          <span className="text-[#7A5B40] font-bold">이번 달 저축액:</span>
          <span className="font-black text-[#E84364] text-base">{savedThisMonth.toLocaleString()}원 저축 중!</span>
        </div>
      </div>
    </footer>
  );
}
