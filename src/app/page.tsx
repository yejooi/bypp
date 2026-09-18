"use client";

// ① 목표 선택 (§4). 하이브리드: 고정 3개 + 기타 직접입력 (wayfinder #3 결정).
// 비주얼: stitch_custom_ui_design_system/goal_selection.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";

// defaultManwon: 목표에 금액이 이름에 이미 들어있으면(예: 1억) 자동으로 채워준다 (만원 단위).
const FIXED_GOALS: { label: string; desc: string; icon: string; defaultManwon: number | null }[] = [
  { label: "1억 모으기", desc: "든든한 목돈의 첫 시작!", icon: "💰", defaultManwon: 10000 },
  { label: "내집마련", desc: "따뜻하고 아늑한 나만의 보금자리", icon: "🏡", defaultManwon: 30000 },
  { label: "여행 자금", desc: "새로운 곳으로 떠나는 두근두근 힐링", icon: "✈️", defaultManwon: null },
  { label: "기타", desc: "나만의 특별한 버킷리스트", icon: "🎁", defaultManwon: null },
];

const AMOUNT_STEP_MANWON = 10;

export default function GoalPage() {
  return (
    <Suspense>
      <GoalForm />
    </Suspense>
  );
}

function GoalForm() {
  const router = useRouter();
  const editing = useSearchParams().get("edit") === "1";
  const { setGoal, goalType: savedGoal, monthlyBudget } = useApp();
  // 로그인해서 저장된 목표/예산이 복원되면 다시 묻지 않고 바로 이어간다 (?edit=1이면 수정하러 온 것).
  useEffect(() => {
    if (editing || !savedGoal || savedGoal === "미정") return;
    router.replace(monthlyBudget != null ? "/board" : "/budget");
  }, [editing, savedGoal, monthlyBudget, router]);
  const [selected, setSelected] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  // 목표 금액은 만원 단위로 다룬다 (사용자 요청) -- 저장 시 * 10000.
  const [amountManwon, setAmountManwon] = useState("");

  const goalType = selected === "기타" ? customGoal : selected;
  const canSubmit = !!goalType && !!amountManwon && Number(amountManwon) > 0;

  return (
    <main className="flex-1 flex flex-col gap-6 p-6 pt-24 max-w-md mx-auto w-full">
      <header className="pt-2">
        <div className="inline-flex items-center gap-2 bg-[var(--surface-alt)] px-3.5 py-1.5 rounded-full mb-3 text-xs tracking-wide font-bold border border-[var(--border)]">
          <span>🌰</span>
          <span>자금 마련 퀘스트 · STEP 1</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--text)] text-[var(--surface)] text-base shrink-0">
            1
          </span>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            목표를 골라주세요
          </h1>
        </div>
        <p className="text-sm mt-1.5 ml-11 font-medium text-[var(--text-sub)]">
          어떤 설레는 꿈을 향해 모아볼까요?
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {FIXED_GOALS.map((g) => {
          const isSelected = selected === g.label;
          return (
            <button
              key={g.label}
              onClick={() => {
                setSelected(g.label);
                if (g.defaultManwon != null) setAmountManwon(String(g.defaultManwon));
              }}
              className={`w-full rounded-[22px] p-4 flex items-center justify-between text-left transition-all border-[2.5px] ${
                isSelected
                  ? "bg-[var(--primary-light)] border-[var(--primary)]"
                  : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--text-sub)]"
              }`}
              style={{ boxShadow: isSelected ? "0 4px 0 var(--primary-hover)" : "0 4px 0 var(--border)" }}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center text-2xl shrink-0">
                  {g.icon}
                </div>
                <div>
                  <span className="text-[19px] font-bold block">{g.label}</span>
                  <span className="text-xs font-medium text-[var(--text-sub)]">{g.desc}</span>
                </div>
              </div>
              {isSelected ? (
                <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {selected === "기타" && (
        <input
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value)}
          placeholder="목표 이름을 입력하세요"
          className="border-2 border-[var(--border)] bg-[var(--surface)] rounded-2xl px-4 py-3 focus:border-[var(--primary)] focus:outline-none"
        />
      )}

      {selected && (
        <div
          className="flex items-center gap-2 border-2 border-[var(--border)] bg-[var(--surface)] rounded-2xl px-2 py-1.5 focus-within:border-[var(--primary)]"
        >
          <button
            onClick={() => setAmountManwon(String(Math.max(0, Number(amountManwon || 0) - AMOUNT_STEP_MANWON)))}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg font-bold bg-[var(--surface-alt)] text-[var(--text-sub)]"
          >
            −
          </button>
          <input
            value={amountManwon}
            onChange={(e) => setAmountManwon(e.target.value)}
            type="number"
            placeholder="목표 금액"
            className="flex-1 min-w-0 bg-transparent text-center text-lg font-bold focus:outline-none"
          />
          <span className="text-sm font-medium text-[var(--text-sub)] shrink-0">만원</span>
          <button
            onClick={() => setAmountManwon(String(Number(amountManwon || 0) + AMOUNT_STEP_MANWON))}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg font-bold bg-[var(--surface-alt)] text-[var(--text-sub)]"
          >
            +
          </button>
        </div>
      )}

      <button
        disabled={!canSubmit}
        onClick={() => {
          setGoal(goalType!, Number(amountManwon) * 10000);
          router.push("/budget");
        }}
        className="mt-auto w-full py-4 rounded-full text-white text-lg font-bold tracking-wide flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:translate-y-1"
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
