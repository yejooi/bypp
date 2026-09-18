"use client";

// ① 목표 선택 (§4). 하이브리드: 고정 3개 + 기타 직접입력 (wayfinder #3 결정).
// 비주얼: stitch_custom_ui_design_system/goal_selection.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

const FIXED_GOALS = [
  { label: "1억 모으기", desc: "든든한 목돈의 첫 시작!", icon: "💰" },
  { label: "내집마련", desc: "따뜻하고 아늑한 나만의 보금자리", icon: "🏡" },
  { label: "여행 자금", desc: "새로운 곳으로 떠나는 두근두근 힐링", icon: "✈️" },
  { label: "기타", desc: "나만의 특별한 버킷리스트", icon: "🎁" },
];

export default function GoalPage() {
  const router = useRouter();
  const { setGoal } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [amount, setAmount] = useState("");

  const goalType = selected === "기타" ? customGoal : selected;
  const canSubmit = !!goalType && !!amount && Number(amount) > 0;

  return (
    <main className="flex-1 flex flex-col gap-6 p-6 max-w-md mx-auto w-full">
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
              onClick={() => setSelected(g.label)}
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
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="목표 금액 (원)"
          className="border-2 border-[var(--border)] bg-[var(--surface)] rounded-2xl px-4 py-3 focus:border-[var(--primary)] focus:outline-none"
        />
      )}

      <button
        disabled={!canSubmit}
        onClick={() => {
          setGoal(goalType!, Number(amount));
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
