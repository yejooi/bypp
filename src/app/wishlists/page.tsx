"use client";

// 다른 사용자들의 위시리스트를 볼 수 있는 목록. 로그인 여부와 무관하게 공개.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ProfileRow = { nickname: string; created_at: string };

export default function WishlistsPage() {
  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("nickname, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setProfiles(data ?? []));
  }, []);

  return (
    <main className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        🧺 다른 사람들의 위시리스트
      </h1>
      <p className="text-sm text-[var(--text-sub)]">닉네임을 눌러서 구경해보세요.</p>

      {profiles === null && <p className="text-sm text-[var(--text-sub)]">불러오는 중...</p>}
      {profiles?.length === 0 && <p className="text-sm text-[var(--text-sub)]">아직 아무도 없어요.</p>}

      <div className="flex flex-col gap-2">
        {profiles?.map((p) => (
          <Link
            key={p.nickname}
            href={`/u/${encodeURIComponent(p.nickname)}`}
            className="rounded-2xl border-2 p-4 font-bold transition-all"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            👤 {p.nickname}
          </Link>
        ))}
      </div>

      <Link href="/" className="text-sm underline text-[var(--text-sub)] mt-2">
        ← 내 목록으로 돌아가기
      </Link>
    </main>
  );
}
