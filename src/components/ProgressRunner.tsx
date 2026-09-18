"use client";

// §8-2 ①: 진행률 러너. 화면 하단 고정. 후퇴 없음(원칙②).
// 비주얼: stitch_custom_ui_design_system-2 SignatureGoalRunnerBar (원화 유지).

import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { Mascot, SpeechBubble } from "@/components/Mascot";
import { GoalIcon } from "@/components/GoalIcon";

export function ProgressRunner() {
  const pathname = usePathname();
  const { goalType, goalAmount, monthlyBudget, monthlySaving, items } = useApp();

  // 목표/예산을 정하는 화면에서는 하단 바가 버튼을 가리므로 숨긴다.
  if (pathname === "/" || pathname.startsWith("/budget")) return null;
  if (!goalType || !goalAmount) return null;

  // 이번 달 저축액 = 권장 월 저축액(몬테카를로) + (예산 - 이미 산 금액).
  // 예산을 딱 맞추면 권장 저축액 그대로이고, 남기면 늘고 넘기면 준다. 후퇴 연출은 없으니 0 미만은 0 (원칙 ②).
  // 직접 입력한 예산이면 권장 저축액이 없어 0으로 본다.
  const spent = items.filter((it) => it.status === "purchased").reduce((sum, it) => sum + it.price, 0);
  const savedThisMonth = Math.max(0, (monthlySaving ?? 0) + (monthlyBudget ?? 0) - spent);
  // 기준(권장 저축액) 대비 오차: 예산 - 산 금액. 양수면 아낀 만큼, 음수면 넘긴 만큼. 산 게 없으면 표시하지 않는다.
  const delta = (monthlyBudget ?? 0) - spent;
  const deltaPct = goalAmount > 0 ? (Math.abs(delta) / goalAmount) * 100 : 0;
  const progressPct = goalAmount > 0 ? Math.min(100, (savedThisMonth / goalAmount) * 100) : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#FFFDF5]/95 backdrop-blur-md border-t-[3px] border-[#D6C2A0] py-2.5 px-4 sm:px-8 shadow-2xl z-40 text-[#4A3324]">
      <div className="max-w-[1400px] mx-auto flex items-center gap-4 sm:gap-6">
        <div className="shrink-0 flex items-center gap-2.5">
          <Mascot size={44} mood={spent > 0 && delta > 0 ? "happy" : "idle"} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-[#7A5B40]">나의 절약 여정</span>
            <span className="text-lg font-black text-[#2D6C2A]">{progressPct.toFixed(1)}%</span>
          </div>
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
              <Mascot size={32} mood={delta < 0 && spent > 0 ? "idle" : "happy"} />
          </div>
        </div>
        <div className="hidden sm:block shrink-0 max-w-[9rem] truncate text-xs font-bold text-[#7A5B40]">
          <span className="inline-flex items-center gap-1"><GoalIcon goal={goalType} className="w-3.5 h-3.5" />{goalType}</span>
        </div>
        {spent > 0 && delta !== 0 && (
          <div className="hidden md:flex shrink-0 items-center gap-2">
            <Mascot size={28} mood={delta > 0 ? "happy" : "idle"} />
            <SpeechBubble tone={delta > 0 ? "green" : "amber"}>
              {delta > 0
                ? `예산보다 ${Math.abs(delta).toLocaleString()}원 아끼고 있어요!`
                : `예산을 ${Math.abs(delta).toLocaleString()}원 넘었어요. 다음 달 저축으로 채워 봐요`}{" "}
              <span className="opacity-80">
                ({delta > 0 ? "+" : "-"}
                {deltaPct.toFixed(2)}%p)
              </span>
            </SpeechBubble>
          </div>
        )}
        <div className="shrink-0 flex flex-col leading-tight text-right">
          <span className="text-xs font-bold text-[#7A5B40]">이번 달 저축액</span>
          <span className="text-base font-black text-[#2D6C2A]">{savedThisMonth.toLocaleString()}원</span>
        </div>
      </div>
    </footer>
  );
}
