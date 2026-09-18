"use client";

// 다른 사용자의 위시리스트를 읽기 전용으로 본다. 로그인 여부와 무관하게 공개.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { REASON_CODE_LABEL, type ReasonCode } from "@/lib/store";

type ViewItem = {
  id: string;
  name: string;
  price: number;
  reason_code: ReasonCode;
  custom_reason: string | null;
  image_url: string | null;
  status: string;
};

export default function UserWishlistPage() {
  const params = useParams<{ nickname: string }>();
  const nickname = decodeURIComponent(params.nickname);

  const [state, setState] = useState<"loading" | "not_found" | "empty" | "ready">("loading");
  const [goalType, setGoalType] = useState<string | null>(null);
  const [items, setItems] = useState<ViewItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("nickname", nickname).maybeSingle();
      if (!profile) {
        setState("not_found");
        return;
      }
      const { data: session } = await supabase
        .from("sessions")
        .select("id, goal_type")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!session) {
        setState("empty");
        return;
      }
      setGoalType(session.goal_type);
      const { data: itemRows } = await supabase
        .from("items")
        .select("id, name, price, reason_code, custom_reason, image_url, status")
        .eq("session_id", session.id)
        .in("status", ["cart", "buy", "purchased"])
        .order("created_at", { ascending: true });
      setItems(itemRows ?? []);
      setState("ready");
    })();
  }, [nickname]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col gap-4">
      <Link href="/wishlists" className="text-sm underline text-[var(--text-sub)]">
        ← 목록으로
      </Link>
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        👤 {nickname}님의 위시리스트
      </h1>
      {goalType && <p className="text-sm text-[var(--text-sub)]">목표: {goalType}</p>}

      {state === "loading" && <p className="text-sm text-[var(--text-sub)]">불러오는 중...</p>}
      {state === "not_found" && <p className="text-sm text-[var(--text-sub)]">그런 닉네임이 없어요.</p>}
      {state === "empty" && <p className="text-sm text-[var(--text-sub)]">아직 아무것도 없어요.</p>}

      {state === "ready" && (
        <div className="flex flex-col gap-3">
          {items.length === 0 && <p className="text-sm text-[var(--text-sub)]">아직 아무것도 없어요.</p>}
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-[20px] border-2 p-3.5 flex items-center gap-3"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            >
              {it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image_url}
                  alt=""
                  className="w-14 h-14 object-cover rounded-2xl border shrink-0"
                  style={{ borderColor: "var(--border)" }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: "var(--surface-alt)", borderColor: "var(--border)" }}
                >
                  🛍️
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold truncate">{it.name}</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-extrabold">{it.price.toLocaleString()}원</span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--surface-alt)", color: "var(--text-sub)" }}
                  >
                    #{it.reason_code === "other" && it.custom_reason ? it.custom_reason : REASON_CODE_LABEL[it.reason_code]}
                  </span>
                  <span className="text-[11px] text-[var(--text-sub)]">
                    {it.status === "cart" ? "장바구니" : it.status === "buy" ? "진짜 살 물건" : "구매 완료"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
