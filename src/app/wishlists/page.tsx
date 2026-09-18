"use client";

// 다른 사용자들의 위시리스트를 볼 수 있는 목록. 로그인 여부와 무관하게 공개.
// 동물의 숲 스킨: 이웃 카드(아바타 + 닉네임 + 목표)를 잔디밭 위 나무 간판 아래에 늘어놓는다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Avatar, WoodSign, SHADOW_AC, HAND } from "@/components/neighbor-ui";

type Neighbor = { id: string; nickname: string; goal: string | null; avatar: string | null };

export default function WishlistsPage() {
  const { goalType } = useApp();
  const { user } = useAuth();
  const [neighbors, setNeighbors] = useState<Neighbor[] | null>(null);

  useEffect(() => {
    (async () => {
      let { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, created_at")
        .order("created_at", { ascending: false });
      if (pErr) {
        // avatar_url 컬럼이 아직 없으면 사진 없이 불러온다.
        const basic = await supabase.from("profiles").select("id, nickname, created_at").order("created_at", { ascending: false });
        profiles = (basic.data ?? []).map((r) => ({ ...r, avatar_url: null }));
      }
      const [{ data: sessions }] = await Promise.all([
        supabase.from("sessions").select("user_id, goal_type, created_at").order("created_at", { ascending: false }),
      ]);
      // 사용자별 가장 최근의 "실제 목표" (미정은 건너뜀).
      const goalByUser = new Map<string, string>();
      for (const s of sessions ?? []) {
        if (s.user_id && s.goal_type && s.goal_type !== "미정" && !goalByUser.has(s.user_id)) {
          goalByUser.set(s.user_id, s.goal_type);
        }
      }
      setNeighbors(
        (profiles ?? [])
          .filter((p) => p.id !== user?.id) // 나 자신은 이웃 목록에서 뺀다
          .map((p) => ({ id: p.id, nickname: p.nickname, goal: goalByUser.get(p.id) ?? null, avatar: p.avatar_url ?? null }))
      );
    })();
  }, [user?.id]);

  return (
    <div className="flex-1 bg-[#E8EDD6] text-[#4A3324]">
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-16 pb-16 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <WoodSign>🏡 이웃 위시리스트</WoodSign>
          <Link href={goalType ? "/board" : "/"} className="inline-flex items-center gap-1 text-sm font-black text-[#FFF9EC] bg-[#57351F] border-2 border-[#8C5D35] rounded-full px-4 py-1.5 shadow-[0_3px_0_rgba(74,46,53,0.16)] hover:bg-[#6B4526] active:translate-y-0.5 transition">
            🏠 내 보드로
          </Link>
        </div>
        <div className="flex flex-col gap-2 items-start -mt-3">
          <p className="text-base font-bold text-[#2F5B1C] bg-[#FFF9EC]/90 border-2 border-[#D6C2A5] rounded-full px-4 py-1" style={HAND}>
            이웃의 주머니와 가판대를 구경해 보세요. 눌러서 들어가요!
          </p>
        </div>

        {neighbors === null && <p className="text-sm font-bold text-[#7A5B3E]">불러오는 중...</p>}
        {neighbors?.length === 0 && (
          <div className={`rounded-[28px] border-[3px] border-[#D6C2A5] bg-[#FFF9EC] p-6 text-center font-bold ${SHADOW_AC}`}>
            아직 이웃이 없어요. 첫 이웃이 되어 보세요!
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {neighbors?.map((n) => (
            <Link
              key={n.id}
              href={`/u/${encodeURIComponent(n.nickname)}`}
              className={`group rounded-[28px] border-[3px] border-[#D6C2A5] bg-[#FFF9EC] p-4 flex items-center gap-3.5 ${SHADOW_AC} hover:-translate-y-1 active:translate-y-0.5 transition-transform`}
            >
              <Avatar name={n.nickname} size={52} src={n.avatar} />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-[#5B3E29] truncate" style={HAND}>
                  {n.nickname}
                </p>
                {n.goal ? (
                  <span className="inline-flex max-w-full items-center px-2.5 py-0.5 bg-[#5D8A37] text-white text-xs font-black rounded-full truncate">
                    🍃 {n.goal}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#8C6D53]">목표를 고르는 중</span>
                )}
              </div>
              <span className="text-2xl text-[#B89A72] group-hover:translate-x-1 transition-transform">›</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
