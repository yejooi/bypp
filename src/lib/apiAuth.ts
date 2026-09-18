// 서버 라우트 보호: 로그인한 사용자(Supabase access token)만 API를 부를 수 있게 하고,
// LLM을 부르는 라우트에는 사용자별로 간단한 호출 횟수 제한을 건다 (비용 폭주 방지).
// 제한은 서버 인스턴스 메모리 기준이라 서버리스에서는 대략적인 안전장치다.

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function requireUser(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

const hits = new Map<string, number[]>();

// windowMs 안에 max번까지만 허용. 넘으면 false.
export function withinRateLimit(key: string, max = 30, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
