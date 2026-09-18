"use client";

// Supabase에 실제로 저장한다 (§9-3 스키마). 새로고침해도 세션 id를 localStorage에 들고 있다가
// 그걸로 다시 불러온다. DB 쓰기가 실패해도 로컬 상태로는 계속 동작시키고 에러만 배너로 띄운다 (§9-2).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type ReasonCode =
  | "long_wanted"
  | "urgent_need"
  | "broke_replace"
  | "on_sale"
  | "social_proof"
  | "mood_boost"
  | "other";

export const REASON_CODE_LABEL: Record<ReasonCode, string> = {
  long_wanted: "오래전부터 갖고 싶었음",
  urgent_need: "지금 당장 필요함",
  broke_replace: "쓰던 게 망가짐/떨어짐",
  on_sale: "세일 중이라서",
  social_proof: "남들이 좋다고 해서",
  mood_boost: "그냥 기분전환",
  other: "기타 (직접 입력)",
};

export type ItemStatus = "cart" | "buy" | "removed" | "purchased";

export type Item = {
  id: string;
  name: string;
  price: number;
  reasonCode: ReasonCode;
  // reasonCode가 "other"일 때의 자유 입력 텍스트. 점수 가중치엔 영향 없음(중립 1.0),
  // LLM 프롬프트에 보조 맥락으로만 전달한다 (원래 6개 선택지가 다양성을 못 담는 문제 보완).
  customReason?: string | null;
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
  customReason?: string | null;
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
  dbError: string | null;
  setGoal: (goalType: string, goalAmount: number) => void;
  setBudget: (monthlyBudget: number) => void;
  addItem: (input: NewItemInput) => void;
  moveItem: (id: string, status: ItemStatus) => void;
};

const AppContext = createContext<AppState | null>(null);

const SESSION_STORAGE_KEY = "bypp_session_id";

// items 행을 DB 컬럼(snake_case) <-> 앱 모델(camelCase)로 변환.
function rowToItem(row: {
  id: string;
  name: string;
  price: number;
  reason_code: ReasonCode;
  custom_reason?: string | null;
  status: ItemStatus;
  image_url?: string | null;
  category?: string | null;
  brand?: string | null;
  normal_price?: number | null;
  sale_rate?: number | null;
  source_url?: string | null;
}): Item {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    reasonCode: row.reason_code,
    customReason: row.custom_reason ?? null,
    status: row.status,
    imageUrl: row.image_url ?? null,
    category: row.category ?? null,
    brand: row.brand ?? null,
    normalPrice: row.normal_price != null ? Number(row.normal_price) : null,
    saleRate: row.sale_rate != null ? Number(row.sale_rate) : null,
    sourceUrl: row.source_url ?? null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<string | null>(null);
  const [goalAmount, setGoalAmount] = useState<number | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // 새로고침 시 이전 세션 복원 (§9-2: DB 연결 실패해도 로컬 상태로는 동작).
  useEffect(() => {
    const savedId = typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (!savedId) return;

    (async () => {
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", savedId)
        .maybeSingle();
      if (sessionErr || !session) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      setSessionId(session.id);
      setGoalType(session.goal_type);
      setGoalAmount(Number(session.goal_amount));
      setMonthlyBudget(session.monthly_budget != null ? Number(session.monthly_budget) : null);

      const { data: itemRows, error: itemsErr } = await supabase
        .from("items")
        .select("*")
        .eq("session_id", savedId)
        .order("created_at", { ascending: true });
      if (itemsErr) {
        setDbError("저장 안 됨 (항목을 불러오지 못했어요)");
        return;
      }
      setItems((itemRows ?? []).map(rowToItem));
    })();
  }, []);

  const setGoal = (newGoalType: string, newGoalAmount: number) => {
    setGoalType(newGoalType);
    setGoalAmount(newGoalAmount);

    (async () => {
      if (sessionId) {
        const { error } = await supabase
          .from("sessions")
          .update({ goal_type: newGoalType, goal_amount: newGoalAmount })
          .eq("id", sessionId);
        if (error) setDbError("저장 안 됨 (목표 업데이트 실패)");
        return;
      }
      const { data, error } = await supabase
        .from("sessions")
        .insert({ goal_type: newGoalType, goal_amount: newGoalAmount })
        .select()
        .single();
      if (error || !data) {
        setDbError("저장 안 됨 (세션 생성 실패) — 그래도 계속 쓸 수 있어요");
        return;
      }
      setSessionId(data.id);
      localStorage.setItem(SESSION_STORAGE_KEY, data.id);
    })();
  };

  const setBudget = (newBudget: number) => {
    setMonthlyBudget(newBudget);
    if (!sessionId) return;
    (async () => {
      const { error } = await supabase
        .from("sessions")
        .update({ monthly_budget: newBudget })
        .eq("id", sessionId);
      if (error) setDbError("저장 안 됨 (예산 업데이트 실패)");
    })();
  };

  const addItem = (input: NewItemInput) => {
    const tempId = crypto.randomUUID();
    setItems((prev) => [...prev, { id: tempId, status: "cart", ...input }]);

    if (!sessionId) {
      setDbError("저장 안 됨 (세션 없음) — 이 항목은 새로고침하면 사라져요");
      return;
    }

    (async () => {
      const fullPayload = {
        session_id: sessionId,
        name: input.name,
        price: input.price,
        reason_code: input.reasonCode,
        custom_reason: input.customReason ?? null,
        image_url: input.imageUrl ?? null,
        category: input.category ?? null,
        brand: input.brand ?? null,
        normal_price: input.normalPrice ?? null,
        sale_rate: input.saleRate ?? null,
        source_url: input.sourceUrl ?? null,
      };

      let { data, error } = await supabase.from("items").insert(fullPayload).select().single();

      if (error) {
        // custom_reason/source_url 컬럼이 아직 없는 DB(마이그레이션 전)일 수 있으니 그 두 개만 빼고 재시도.
        // supabase/migrations/0001_add_other_reason_and_urls.sql 을 SQL Editor에서 실행하면 이 fallback이 필요 없어진다.
        const { custom_reason, source_url, ...reducedPayload } = fullPayload;
        void custom_reason;
        void source_url;
        const retry = await supabase.from("items").insert(reducedPayload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) {
        setDbError("저장 안 됨 (항목 추가 실패) — 새로고침하면 사라질 수 있어요");
        return;
      }
      // 서버가 발급한 실제 id로 교체 (temp id로 만들어둔 로컬 항목을 대체).
      setItems((prev) => prev.map((it) => (it.id === tempId ? rowToItem(data) : it)));
    })();
  };

  const moveItem = (id: string, status: ItemStatus) => {
    const persist = () => {
      supabase
        .from("items")
        .update({ status })
        .eq("id", id)
        .then(({ error }) => {
          if (error) setDbError("저장 안 됨 (상태 변경 실패)");
        });
    };

    if (status === "removed" || status === "purchased") {
      const exiting = status === "removed" ? "toss" : "flush";
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, exiting } : it)));
      const durationMs = exiting === "toss" ? 380 : 420;
      setTimeout(() => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status, exiting: null } : it)));
        persist();
      }, durationMs);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
    persist();
  };

  return (
    <AppContext.Provider
      value={{
        goalType,
        goalAmount,
        monthlyBudget,
        items,
        dbError,
        setGoal,
        setBudget,
        addItem,
        moveItem,
      }}
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
