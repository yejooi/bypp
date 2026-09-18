"use client";

// 닉네임 + 비밀번호 로그인. Supabase Auth를 그대로 쓰지만, 이메일 형식 제약을 사용자에게
// 노출하지 않기 위해 닉네임 <-> 내부용 합성 이메일(무작위 ascii)을 profiles 테이블에서 매핑한다.
// 이 덕분에 닉네임은 한국어든 영어든 자유롭게 쓸 수 있다 (이메일 정규식 제약을 안 타므로).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  user: User | null;
  nickname: string | null;
  loading: boolean;
  signUp: (nickname: string, password: string) => Promise<{ error: string | null }>;
  signIn: (nickname: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNickname(null);
      return;
    }
    supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setNickname(data?.nickname ?? null));
  }, [user]);

  async function signUp(newNickname: string, password: string): Promise<{ error: string | null }> {
    const trimmed = newNickname.trim();
    if (!trimmed) return { error: "닉네임을 입력해주세요" };
    if (password.length < 4) return { error: "비밀번호는 4자 이상이어야 해요" };

    const { data: existing } = await supabase.from("profiles").select("id").eq("nickname", trimmed).maybeSingle();
    if (existing) return { error: "이미 사용 중인 닉네임이에요" };

    const email = `${crypto.randomUUID()}@bypp.local`;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) return { error: error?.message ?? "가입에 실패했어요" };

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: data.user.id, nickname: trimmed, email });
    if (profileError) return { error: profileError.message };

    return { error: null };
  }

  async function signIn(existingNickname: string, password: string): Promise<{ error: string | null }> {
    const trimmed = existingNickname.trim();
    const { data: profile, error: lookupError } = await supabase
      .from("profiles")
      .select("email")
      .eq("nickname", trimmed)
      .maybeSingle();
    if (lookupError || !profile) return { error: "닉네임을 찾을 수 없어요" };

    const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password });
    if (error) return { error: "비밀번호가 맞지 않아요" };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, nickname, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
