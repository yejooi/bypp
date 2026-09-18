"use client";

// 다른 사용자의 위시리스트를 읽기 전용으로 본다. 로그인 여부와 무관하게 공개.
// 보드와 같은 구조로 보여준다: 장바구니 주머니 / 살 물건 가판대 / 계산 완료.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { REASON_CODE_LABEL, type ReasonCode } from "@/lib/store";
import { Avatar, SectionTitle, SHADOW_AC, SHADOW_AC_SM, HAND } from "@/components/neighbor-ui";

type ViewItem = {
  id: string;
  name: string;
  price: number;
  reason_code: ReasonCode;
  custom_reason: string | null;
  image_url: string | null;
  status: string;
  sort_order?: number | null;
};

const won = (n: number) => `${n.toLocaleString()}원`;

function ItemCard({ it, dim }: { it: ViewItem; dim?: boolean }) {
  const reason = it.reason_code === "other" && it.custom_reason ? it.custom_reason : REASON_CODE_LABEL[it.reason_code];
  return (
    <div className={`rounded-2xl bg-[#FFFDF7] border-2 border-[#D6C2A5] p-2.5 flex flex-col gap-1.5 ${SHADOW_AC_SM} ${dim ? "opacity-70" : ""}`}>
      <div className="pocket-slot aspect-square rounded-xl overflow-hidden flex items-center justify-center">
        {it.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">🛍️</span>
        )}
      </div>
      <p className="text-xs font-black text-[#573A23] leading-snug line-clamp-2 min-h-[2.2em]">{it.name}</p>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-sm font-black text-[#82542B]">{won(it.price)}</span>
        <span className="text-[10px] font-bold text-[#7A5B3E] bg-[#EFE4CF] px-1.5 py-0.5 rounded-full truncate max-w-full">
          #{reason}
        </span>
      </div>
    </div>
  );
}

function Shelf({ items, empty, dim }: { items: ViewItem[]; empty: string; dim?: boolean }) {
  if (items.length === 0) {
    return <p className="text-sm font-bold text-[#8C6D53] bg-[#EFE4CF] rounded-2xl px-4 py-3">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <ItemCard key={it.id} it={it} dim={dim} />
      ))}
    </div>
  );
}

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
      // 목표 없이 만들어진 "미정" 빈 세션이 진짜 세션을 가리지 않게, 최근 것 중 목표가 있는 세션을 우선한다.
      const { data: sessionRows } = await supabase
        .from("sessions")
        .select("id, goal_type")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const session = sessionRows?.find((r) => r.goal_type !== "미정") ?? sessionRows?.[0] ?? null;
      if (!session) {
        setState("empty");
        return;
      }
      setGoalType(session.goal_type !== "미정" ? session.goal_type : null);
      const { data: itemRows } = await supabase
        .from("items")
        .select("*")
        .eq("session_id", session.id)
        .in("status", ["cart", "buy", "purchased"])
        .order("created_at", { ascending: true });
      setItems((itemRows ?? []) as ViewItem[]);
      setState("ready");
    })();
  }, [nickname]);

  const cart = items.filter((i) => i.status === "cart");
  const buy = items
    .filter((i) => i.status === "buy")
    .sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9));
  const done = items.filter((i) => i.status === "purchased");

  return (
    <div className="grass-bg flex-1 text-[#4A3324]">
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-16 pb-16 flex flex-col gap-5">
        <Link
          href="/wishlists"
          className="self-start text-sm font-black text-[#FFF9EC] bg-[#57351F] border-2 border-[#8C5D35] rounded-full px-4 py-1.5"
        >
          ← 이웃 목록
        </Link>

        <header
          className={`flex items-center gap-4 bg-[#FFF9EC]/95 px-5 py-4 rounded-[28px] border-[3px] border-[#D6C2A5] ${SHADOW_AC}`}
        >
          <Avatar name={nickname} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#5B3E29] truncate" style={HAND}>
              {nickname}님의 위시리스트
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {goalType && (
                <span className="inline-flex items-center px-2.5 py-0.5 bg-[#5D8A37] text-white text-xs font-black rounded-full">
                  🍃 목표: {goalType}
                </span>
              )}
              {state === "ready" && (
                <span className="text-xs font-bold text-[#8C6D53]">
                  주머니 {cart.length} · 가판대 {buy.length} · 계산 완료 {done.length}
                </span>
              )}
            </div>
          </div>
        </header>

        {state === "loading" && <p className="text-sm font-bold text-[#FFF9EC]">불러오는 중...</p>}
        {state === "not_found" && (
          <p className="text-sm font-bold bg-[#FFF9EC] rounded-2xl px-4 py-3">그런 닉네임의 이웃이 없어요.</p>
        )}
        {state === "empty" && (
          <p className="text-sm font-bold bg-[#FFF9EC] rounded-2xl px-4 py-3">아직 아무것도 없어요.</p>
        )}

        {state === "ready" && (
          <div className="flex flex-col gap-5">
            <section className={`rounded-[32px] border-4 border-[#85532F] bg-[#FFFDF2] p-5 ${SHADOW_AC} flex flex-col gap-3`}>
              <SectionTitle kind="stall" count={buy.length}>
                살 물건 가판대
              </SectionTitle>
              <Shelf items={buy} empty="아직 가판대에 올린 물건이 없어요." />
            </section>

            <section className={`rounded-[32px] border-4 border-[#C8B693] bg-[#EFE8D6] p-5 ${SHADOW_AC} flex flex-col gap-3`}>
              <SectionTitle kind="pouch" count={cart.length}>
                장바구니 주머니
              </SectionTitle>
              <Shelf items={cart} empty="주머니가 비어 있어요." />
            </section>

            {done.length > 0 && (
              <section className={`rounded-[32px] border-4 border-[#8DBF6A] bg-[#F4FBEA] p-5 ${SHADOW_AC} flex flex-col gap-3`}>
                <SectionTitle kind="checkout" count={done.length}>
                  계산 완료
                </SectionTitle>
                <Shelf items={done} empty="" dim />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
