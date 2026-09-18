"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Avatar, fileToAvatarDataUrl } from "@/components/neighbor-ui";

export function UserBar() {
  const { user, nickname, avatarUrl, setAvatar, signOut } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function onPick(file: File) {
    setError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const { error: err } = await setAvatar(dataUrl);
      if (err) setError("사진을 저장하지 못했어요");
    } catch {
      setError("사진을 읽지 못했어요");
    }
  }

  return (
    <div
      className="fixed top-3 left-3 z-50 flex items-center gap-2 bg-[var(--surface)] border-2 border-[var(--border)] rounded-full pl-1.5 pr-3 py-1 shadow-sm text-xs font-bold"
      style={{ color: "var(--text)" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <button onClick={() => inputRef.current?.click()} title="프로필 사진 바꾸기" className="rounded-full hover:brightness-95">
        <Avatar name={nickname ?? "?"} size={28} src={avatarUrl} />
      </button>
      <span>{nickname ?? "..."}</span>
      <Link href="/wishlists" className="underline" style={{ color: "var(--primary-hover)" }}>
        이웃 구경
      </Link>
      <button onClick={() => signOut()} className="underline text-[var(--text-sub)]">
        로그아웃
      </button>
      {error && <span className="text-[#C93B2B]">{error}</span>}
    </div>
  );
}
