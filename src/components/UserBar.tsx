"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function UserBar() {
  const { user, nickname, signOut } = useAuth();
  if (!user) return null;

  return (
    <div
      className="fixed top-3 left-3 z-50 flex items-center gap-2 bg-[var(--surface)] border-2 border-[var(--border)] rounded-full px-3 py-1.5 shadow-sm text-xs font-bold"
      style={{ color: "var(--text)" }}
    >
      <span>👤 {nickname ?? "..."}</span>
      <Link href="/wishlists" className="underline" style={{ color: "var(--primary-hover)" }}>
        다른 위시리스트
      </Link>
      <button onClick={() => signOut()} className="underline text-[var(--text-sub)]">
        로그아웃
      </button>
    </div>
  );
}
