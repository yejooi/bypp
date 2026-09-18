"use client";

// 로그인이 필요한 페이지를 감싼다. /login, /wishlists, /u/[nickname](다른 사람 위시리스트 보기)는
// 로그인 없이도 볼 수 있어야 하니 여기서 뺀다.

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/wishlists", "/u/"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
    }
  }, [loading, user, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (loading) return null;
  if (!user) return null;
  return <>{children}</>;
}
