// 우리 API 라우트를 부를 때 로그인 토큰을 붙여서 보낸다.
import { supabase } from "@/lib/supabase";

export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
}
