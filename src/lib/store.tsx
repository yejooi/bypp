"use client";

// Supabase에 실제로 저장한다 (§9-3 스키마). 세션은 로그인한 계정(user_id)에 묶여서,
// 로그인만 하면 어느 기기에서든 최근 세션을 그대로 이어서 쓸 수 있다 (로그인 도입 후
// localStorage 기반 복원은 폐기 -- 계정이 그 역할을 대신한다).
// DB 쓰기가 실패해도 로컬 상태로는 계속 동작시키고 에러만 배너로 띄운다 (§9-2).
//
// 세션 생성은 ensureSession()으로 일원화한다: setGoal이 만든 세션이 아직 서버 응답을 못 받은 채로
// addItem/setBudget이 먼저 불려도(경합), sessionIdRef를 통해 최신 값을 보고 없으면 그 자리에서
// 만들어버려서 "세션 없음" 때문에 저장이 통째로 실패하는 경우를 없앤다.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

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
  const { user } = useAuth();
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<string | null>(null);
  const [goalAmount, setGoalAmount] = useState<number | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // 렌더 사이 타이밍 경합 없이 항상 최신 session id를 읽기 위한 ref (ensureSession의 핵심).
  const sessionIdRef = useRef<string | null>(null);
  const pendingSessionRef = useRef<Promise<string | null> | null>(null);
  const goalRef = useRef<{ type: string | null; amount: number | null }>({ type: null, amount: null });
  goalRef.current = { type: goalType, amount: goalAmount };
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  function setSessionId(id: string | null) {
    sessionIdRef.current = id;
    setSessionIdState(id);
  }

  // 세션이 없으면 그 자리에서 만든다. 동시에 여러 곳(addItem, setBudget)에서 불러도
  // pendingSessionRef로 하나의 insert만 나가게 막는다. 로그인 안 했으면 만들 수 없다 (RLS가 막음).
  async function ensureSession(overrideGoalType?: string, overrideGoalAmount?: number): Promise<string | null> {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (pendingSessionRef.current) return pendingSessionRef.current;
    if (!userIdRef.current) {
      setDbError("저장 안 됨 (로그인이 필요해요)");
      return null;
    }

    const gt = overrideGoalType ?? goalRef.current.type ?? "미정";
    const ga = overrideGoalAmount ?? goalRef.current.amount ?? 0;

    const promise = (async () => {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ user_id: userIdRef.current, goal_type: gt, goal_amount: ga })
        .select()
        .single();
      if (error || !data) {
        console.error("[bypp] session create failed:", error);
        setDbError(`저장 안 됨 (세션 생성 실패: ${error?.message ?? "unknown"})`);
        return null;
      }
      setSessionId(data.id);
      return data.id as string;
    })();

    pendingSessionRef.current = promise;
    try {
      return await promise;
    } finally {
      pendingSessionRef.current = null;
    }
  }

  // 로그인하면(또는 계정이 바뀌면) 그 계정의 가장 최근 세션을 불러온다.
  // 로그아웃하면 로컬 상태를 비운다. (§9-2: DB 연결 실패해도 로컬 상태로는 동작)
  useEffect(() => {
    if (!user) {
      setSessionId(null);
      setGoalType(null);
      setGoalAmount(null);
      setMonthlyBudget(null);
      setItems([]);
      return;
    }

    (async () => {
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sessionErr) {
        console.error("[bypp] session restore failed:", sessionErr);
        setDbError(`저장 안 됨 (세션을 불러오지 못했어요: ${sessionErr.message})`);
        return;
      }
      if (!session) return; // 이 계정으로 아직 세션을 만든 적 없음 -- ensureSession이 나중에 만든다.

      setSessionId(session.id);
      setGoalType(session.goal_type);
      setGoalAmount(Number(session.goal_amount));
      setMonthlyBudget(session.monthly_budget != null ? Number(session.monthly_budget) : null);

      const { data: itemRows, error: itemsErr } = await supabase
        .from("items")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });
      if (itemsErr) {
        console.error("[bypp] items restore failed:", itemsErr);
        setDbError(`저장 안 됨 (항목을 불러오지 못했어요: ${itemsErr.message})`);
        return;
      }
      setItems((itemRows ?? []).map(rowToItem));
    })();
  }, [user]);

  const setGoal = (newGoalType: string, newGoalAmount: number) => {
    setGoalType(newGoalType);
    setGoalAmount(newGoalAmount);

    (async () => {
      if (sessionIdRef.current) {
        const { error } = await supabase
          .from("sessions")
          .update({ goal_type: newGoalType, goal_amount: newGoalAmount })
          .eq("id", sessionIdRef.current);
        if (error) {
          console.error("[bypp] goal update failed:", error);
          setDbError(`저장 안 됨 (목표 업데이트 실패: ${error.message})`);
        }
        return;
      }
      // 방금 정한 값으로 곧바로 세션을 만든다 (goalRef가 아직 안 갱신됐을 수 있어 override로 넘긴다).
      await ensureSession(newGoalType, newGoalAmount);
    })();
  };

  const setBudget = (newBudget: number) => {
    setMonthlyBudget(newBudget);
    (async () => {
      const id = await ensureSession();
      if (!id) return;
      const { error } = await supabase.from("sessions").update({ monthly_budget: newBudget }).eq("id", id);
      if (error) {
        console.error("[bypp] budget update failed:", error);
        setDbError(`저장 안 됨 (예산 업데이트 실패: ${error.message})`);
      }
    })();
  };

  const addItem = (input: NewItemInput) => {
    const tempId = crypto.randomUUID();
    setItems((prev) => [...prev, { id: tempId, status: "cart", ...input }]);

    (async () => {
      const sid = await ensureSession();
      if (!sid) {
        setDbError("저장 안 됨 (세션 생성 실패) — 이 항목은 새로고침하면 사라져요");
        return;
      }

      const fullPayload = {
        session_id: sid,
        user_id: userIdRef.current,
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
        console.error("[bypp] item insert failed, retrying without custom_reason/source_url:", error);
        const { custom_reason, source_url, ...reducedPayload } = fullPayload;
        void custom_reason;
        void source_url;
        const retry = await supabase.from("items").insert(reducedPayload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) {
        console.error("[bypp] item insert failed:", error);
        setDbError(`저장 안 됨 (항목 추가 실패: ${error?.message ?? "unknown"})`);
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
          if (error) {
            console.error("[bypp] status update failed:", error);
            setDbError(`저장 안 됨 (상태 변경 실패: ${error.message})`);
          }
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
