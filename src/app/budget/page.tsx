"use client";

// ② 예산 설정 (§4). 직접 입력 경로만 구현 — 몬테카를로 산출 경로는 Phase 6.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export default function BudgetPage() {
  const router = useRouter();
  const { goalType, goalAmount, setBudget } = useApp();
  const [amount, setAmount] = useState("");

  return (
    <main className="flex-1 flex flex-col gap-6 p-6 max-w-md mx-auto w-full">
      <h1 className="text-xl font-bold">② 월 예산을 정해주세요</h1>
      <p className="text-sm text-gray-500">
        목표: {goalType ?? "(미설정)"} · {goalAmount?.toLocaleString()}원
      </p>

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        placeholder="월 예산 (원)"
        className="border border-gray-300 rounded px-3 py-2"
      />
      <p className="text-xs text-gray-400">
        (모르겠다 → 몬테카를로로 산출하는 경로는 아직 안 만들었어요. Phase 6에서 추가)
      </p>

      <button
        disabled={!amount || Number(amount) <= 0}
        onClick={() => {
          setBudget(Number(amount));
          router.push("/board");
        }}
        className="mt-auto bg-black text-white rounded px-4 py-3 disabled:opacity-30"
      >
        다음
      </button>
    </main>
  );
}
