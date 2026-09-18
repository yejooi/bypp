-- bypp DB schema (CLAUDE.md §9-3)
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create extension if not exists "pgcrypto";

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
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
  -- reason_code: §5 객관식 6개 중 하나
  reason_code text not null check (reason_code in (
    'long_wanted',      -- 오래전부터 갖고 싶었음
    'urgent_need',      -- 지금 당장 필요함
    'broke_replace',    -- 쓰던 게 망가짐/떨어짐
    'on_sale',          -- 세일 중이라서
    'social_proof',     -- 남들이 좋다고 해서
    'mood_boost'        -- 그냥 기분전환
  )),
  status text not null default 'cart' check (status in ('cart', 'buy', 'removed', 'purchased')),
  -- OG 파싱으로 가져온 보조 필드 (§5) — 판정 정확도에 직접 쓰임
  category text,
  normal_price numeric,
  sale_rate numeric,
  brand text,
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
