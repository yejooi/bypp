-- bypp DB schema (CLAUDE.md §9-3)
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- 이후 변경분은 supabase/migrations/*.sql 로 누적된다 (0001: RLS 수정 + other 컬럼,
-- 0002: 로그인/닉네임/프로필). 처음 세팅이면 이 파일 다음에 migrations를 순서대로 실행.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  -- goal_type: 고정 선택지("1억 모으기" | "내집마련" | "여행 자금") 또는 "기타"로 자유 입력된 텍스트.
  -- 정책은 이슈 #3에서 하이브리드로 결정됨 — DB 단에서는 enum 제약을 두지 않는다.
  goal_type text not null,
  goal_amount numeric not null,
  monthly_budget numeric,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  price numeric not null,
  image_url text,
  -- reason_code: §5 객관식 6개 + "other"(기타, 자유입력 -- 이슈: 6개가 다양성을 못 담는 문제 보완)
  reason_code text not null check (reason_code in (
    'long_wanted',      -- 오래전부터 갖고 싶었음
    'urgent_need',      -- 지금 당장 필요함
    'broke_replace',    -- 쓰던 게 망가짐/떨어짐
    'on_sale',          -- 세일 중이라서
    'social_proof',     -- 남들이 좋다고 해서
    'mood_boost',       -- 그냥 기분전환
    'other'             -- 기타 (자유 입력, custom_reason 참고)
  )),
  -- reason_code가 'other'일 때의 자유 입력 텍스트. 점수 가중치엔 영향 없음, LLM 프롬프트 보조 맥락으로만 씀.
  custom_reason text,
  status text not null default 'cart' check (status in ('cart', 'buy', 'removed', 'purchased')),
  -- OG 파싱으로 가져온 보조 필드 (§5) — 판정 정확도에 직접 쓰임
  category text,
  normal_price numeric,
  sale_rate numeric,
  brand text,
  -- 원본 상품 링크 (§5). 링크로 등록한 항목만 값이 있고, 스크린샷/수동입력은 null.
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists evaluations (
  item_id uuid primary key references items(id) on delete cascade,
  -- 확정된 필드 (§6-1)
  satisfaction_months numeric not null,
  -- 유력 후보 필드 (§6-1) — 3개 vs 5개 지표 여부는 Phase 1 실험 결과로 결정 (out of scope for wayfinder map).
  -- 쓰지 않는 지표는 null로 남긴다.
  usage_frequency numeric,
  cart_duplication numeric,
  price_volatility numeric,
  inconvenience_if_not numeric,
  score numeric not null,
  reasoning text,
  evaluated_at timestamptz not null default now()
);

create index if not exists items_session_id_idx on items(session_id);

-- RLS: 로그인 없이 UUID 링크로만 세션을 구분하는 구조라(§9-3) 사용자별 정책이 없다.
-- Supabase 대시보드의 "RLS 꺼짐" 경고를 피하면서, anon key로의 전체 접근은 계속 허용한다.
alter table sessions enable row level security;
alter table items enable row level security;
alter table evaluations enable row level security;

create policy "anon full access" on sessions for all to anon using (true) with check (true);
create policy "anon full access" on items for all to anon using (true) with check (true);
create policy "anon full access" on evaluations for all to anon using (true) with check (true);
