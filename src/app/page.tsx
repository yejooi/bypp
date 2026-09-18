"use client";

// ① 목표 선택 (§4). 하이브리드: 고정 3개 + 기타 직접입력 (wayfinder #3 결정).
// 스타일은 임시. 나중에 Stitch 결과로 교체.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

const FIXED_GOALS = ["1억 모으기", "내집마련", "여행 자금"];

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
      <h1 className="text-xl font-bold">① 목표를 골라주세요</h1>

      <div className="flex flex-col gap-2">
        {[...FIXED_GOALS, "기타"].map((g) => (
          <button
            key={g}
            onClick={() => setSelected(g)}
            className={`border rounded px-4 py-3 text-left ${
              selected === g ? "border-black font-semibold" : "border-gray-300"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {selected === "기타" && (
        <input
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value)}
          placeholder="목표 이름을 입력하세요"
          className="border border-gray-300 rounded px-3 py-2"
        />
      )}

      {selected && (
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="목표 금액 (원)"
          className="border border-gray-300 rounded px-3 py-2"
        />
      )}

      <button
        disabled={!canSubmit}
        onClick={() => {
          setGoal(goalType!, Number(amount));
          router.push("/budget");
        }}
        className="mt-auto bg-black text-white rounded px-4 py-3 disabled:opacity-30"
      >
        다음
      </button>
    </main>
  );
}
