"use client";

// PROTOTYPE 상태 저장소 — 구조 확인용. 인메모리만, 새로고침하면 날아간다.
// DB/실제 링크 파싱/AI 판정은 Phase 2~4에서 이 자리를 교체한다.

import { createContext, useContext, useState, type ReactNode } from "react";

export type ReasonCode =
  | "long_wanted"
  | "urgent_need"
  | "broke_replace"
  | "on_sale"
  | "social_proof"
  | "mood_boost";

export const REASON_CODE_LABEL: Record<ReasonCode, string> = {
  long_wanted: "오래전부터 갖고 싶었음",
  urgent_need: "지금 당장 필요함",
  broke_replace: "쓰던 게 망가짐/떨어짐",
  on_sale: "세일 중이라서",
  social_proof: "남들이 좋다고 해서",
  mood_boost: "그냥 기분전환",
};

export type ItemStatus = "cart" | "buy" | "removed" | "purchased";

export type Item = {
  id: string;
  name: string;
  price: number;
  reasonCode: ReasonCode;
  status: ItemStatus;
  imageUrl?: string | null;
  category?: string | null;
  brand?: string | null;
  normalPrice?: number | null;
  saleRate?: number | null;
  sourceUrl?: string | null;
  // §8-1 연출: 빼기/내리기 애니메이션이 도는 동안 실제 status 변경을 미룬다.
  exiting?: "toss" | "flush" | null;
};

export type NewItemInput = {
  name: string;
  price: number;
  reasonCode: ReasonCode;
  imageUrl?: string | null;
  category?: string | null;
  brand?: string | null;
  normalPrice?: number | null;
  saleRate?: number | null;
  sourceUrl?: string | null;
};

type AppState = {
  goalType: string | null;
  goalAmount: number | null;
  monthlyBudget: number | null;
  items: Item[];
  setGoal: (goalType: string, goalAmount: number) => void;
  setBudget: (monthlyBudget: number) => void;
  addItem: (input: NewItemInput) => void;
  moveItem: (id: string, status: ItemStatus) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [goalType, setGoalType] = useState<string | null>(null);
  const [goalAmount, setGoalAmount] = useState<number | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const setGoal = (goalType: string, goalAmount: number) => {
    setGoalType(goalType);
    setGoalAmount(goalAmount);
  };

  const setBudget = (monthlyBudget: number) => setMonthlyBudget(monthlyBudget);

  const addItem = (input: NewItemInput) => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), status: "cart", ...input },
    ]);
  };

  const moveItem = (id: string, status: ItemStatus) => {
    if (status === "removed" || status === "purchased") {
      const exiting = status === "removed" ? "toss" : "flush";
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, exiting } : it)));
      const durationMs = exiting === "toss" ? 380 : 420;
      setTimeout(() => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status, exiting: null } : it)));
      }, durationMs);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  };

  return (
    <AppContext.Provider
      value={{ goalType, goalAmount, monthlyBudget, items, setGoal, setBudget, addItem, moveItem }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
