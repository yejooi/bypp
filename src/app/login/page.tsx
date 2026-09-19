"use client";

// 로그인/회원가입. 닉네임 + 비밀번호만 받는다 (이메일 없음, §auth.tsx 참고).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputCls =
    "border-2 rounded-2xl px-4 py-3 bg-[var(--surface)] focus:border-[var(--primary)] focus:outline-none";
  const inputStyle = { borderColor: "var(--border)" } as const;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error } = mode === "login" ? await signIn(nickname, password) : await signUp(nickname, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/");
  }

  return (
    <main className="flex-1 flex flex-col gap-5 p-6 max-w-md mx-auto w-full justify-center">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          🌰 bypp
        </h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">
          {mode === "login" ? "닉네임으로 로그인해주세요" : "닉네임을 만들어주세요"}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setMode("login")}
          className="px-4 py-1.5 text-sm font-bold rounded-full transition-all"
          style={
            mode === "login"
              ? { backgroundColor: "var(--text)", color: "var(--surface)" }
              : { backgroundColor: "var(--surface-alt)", color: "var(--text-sub)" }
          }
        >
          로그인
        </button>
        <button
          onClick={() => setMode("signup")}
          className="px-4 py-1.5 text-sm font-bold rounded-full transition-all"
          style={
            mode === "signup"
              ? { backgroundColor: "var(--text)", color: "var(--surface)" }
              : { backgroundColor: "var(--surface-alt)", color: "var(--text-sub)" }
          }
        >
          회원가입
        </button>
      </div>

      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="닉네임"
        className={inputCls}
        style={inputStyle}
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder={mode === "signup" ? "비밀번호 (6자 이상, 숫자·영어 상관없어요)" : "비밀번호"}
        className={inputCls}
        style={inputStyle}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />

      {error && (
        <p className="text-sm font-medium text-center" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      )}

      <button
        disabled={!nickname || !password || loading}
        onClick={handleSubmit}
        className="w-full py-4 rounded-full text-white text-lg font-bold tracking-wide disabled:opacity-30 transition-all active:translate-y-1"
        style={{
          fontFamily: "var(--font-heading)",
          backgroundColor: "var(--primary)",
          boxShadow: "0 4px 0 var(--primary-hover)",
        }}
      >
        {loading ? "잠시만요..." : mode === "login" ? "로그인" : "가입하고 시작하기"}
      </button>
    </main>
  );
}
