"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Avatar, fileToAvatarDataUrl } from "@/components/neighbor-ui";

export function UserBar() {
  const { user, nickname, avatarUrl, setAvatar, signOut } = useAuth();
  const pathname = usePathname();
  const { goalType } = useApp();
  const onNeighborScreen = pathname.startsWith("/wishlists") || pathname.startsWith("/u/");
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
      className="fixed top-3 left-3 z-50 flex items-center gap-2.5 bg-[#FFF9EC] border-[3px] border-[#D6C2A5] rounded-full pl-1.5 pr-2 py-1.5 shadow-[0_3px_0_rgba(74,46,53,0.16)] text-sm font-black text-[#5B3E29]"
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
      <button
        onClick={() => inputRef.current?.click()}
        title="프로필 사진 바꾸기"
        className="relative rounded-full hover:brightness-95 active:scale-95 transition"
      >
        <Avatar name={nickname ?? "?"} size={36} src={avatarUrl} />
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#4F8B33] border-2 border-[#FFF9EC] text-white flex items-center justify-center">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M3 9a2 2 0 012-2h1.5l1-2h9l1 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>
      <span className="max-w-[8rem] truncate">{nickname ?? "..."}</span>
      <Link
        href={onNeighborScreen ? (goalType && goalType !== "미정" ? "/board" : "/") : "/wishlists"}
        className={`px-3 py-1 rounded-full text-white text-xs shadow-[0_2px_0_rgba(0,0,0,0.18)] active:translate-y-0.5 transition ${
          onNeighborScreen ? "bg-[#57351F] border-2 border-[#8C5D35] hover:bg-[#6B4526]" : "bg-[#F6C644] border-2 border-[#C9981A] !text-[#5B3E29] shadow-[0_2px_0_rgba(0,0,0,0.18)] hover:bg-[#F2BB2C] active:translate-y-0.5 transition"
        }`}
      >
        {onNeighborScreen ? "🏠 내 보드로" : "🏡 이웃 구경"}
      </Link>
      <button
        onClick={() => signOut()}
        className="px-3 py-1 rounded-full bg-[#EFE4CF] border-2 border-[#C9B390] text-[#7A5B3E] text-xs hover:bg-[#E5D6B8] active:translate-y-0.5 transition"
      >
        로그아웃
      </button>
      {error && <span className="text-xs text-[#C93B2B]">{error}</span>}
    </div>
  );
}
