-- 로그인(닉네임+비밀번호) + 다른 사용자 위시리스트 보기. SQL Editor에서 실행.
-- 전체를 몇 번이든 다시 실행해도 안전하다 (모든 policy 앞에 drop if exists).
--
-- 설계: Supabase Auth를 그대로 쓰되(비밀번호 해싱/세션 관리를 직접 만들지 않음),
-- 사용자가 쓰는 "닉네임"은 이메일 형식 제약이 없는 profiles.nickname에 저장하고,
-- 실제 로그인은 profiles에서 nickname -> email(내부용, 무작위 ascii)을 찾아 그 email로 한다.
-- 이 덕분에 닉네임은 한국어든 영어든 이메일 형식과 무관하게 자유롭게 쓸 수 있다.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  email text not null unique, -- 내부용 합성 이메일. 사용자에게 보여줄 일 없음.
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
drop policy if exists "profiles readable by all" on profiles;
create policy "profiles readable by all" on profiles for select using (true);
drop policy if exists "profiles insertable by owner" on profiles;
create policy "profiles insertable by owner" on profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles updatable by owner" on profiles;
create policy "profiles updatable by owner" on profiles for update to authenticated using (auth.uid() = id);

-- sessions/items에 소유자 컬럼 추가. 기존(로그인 없이 만들어진) 행은 null로 남고, 그 행들은 이제
-- 아무도 못 쓰게(soft) 된다 -- 데모 재시작 전이라 데이터 이전은 신경 쓰지 않는다.
alter table sessions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table items add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists items_user_id_idx on items(user_id);

-- 기존 "anon 전체 허용" 정책을 걷어내고, 읽기는 전체 공개(다른 사람 위시리스트 보기), 쓰기는 본인만.
drop policy if exists "anon full access" on sessions;
drop policy if exists "sessions readable by all" on sessions;
create policy "sessions readable by all" on sessions for select using (true);
drop policy if exists "sessions writable by owner" on sessions;
create policy "sessions writable by owner" on sessions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "sessions updatable by owner" on sessions;
create policy "sessions updatable by owner" on sessions for update to authenticated using (auth.uid() = user_id);
drop policy if exists "sessions deletable by owner" on sessions;
create policy "sessions deletable by owner" on sessions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "anon full access" on items;
drop policy if exists "items readable by all" on items;
create policy "items readable by all" on items for select using (true);
drop policy if exists "items writable by owner" on items;
create policy "items writable by owner" on items for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "items updatable by owner" on items;
create policy "items updatable by owner" on items for update to authenticated using (auth.uid() = user_id);
drop policy if exists "items deletable by owner" on items;
create policy "items deletable by owner" on items for delete to authenticated using (auth.uid() = user_id);

-- evaluations는 소유자 컬럼이 없다 (item_id를 통해서만 연결). AI 판정 결과라 민감하지 않으므로
-- 읽기는 전체 공개, 쓰기는 로그인한 사용자면 누구나 허용 (item 자체의 쓰기 권한이 이미 소유자로 막혀 있음).
drop policy if exists "anon full access" on evaluations;
drop policy if exists "evaluations readable by all" on evaluations;
create policy "evaluations readable by all" on evaluations for select using (true);
drop policy if exists "evaluations writable by authenticated" on evaluations;
create policy "evaluations writable by authenticated" on evaluations for all to authenticated using (true) with check (true);
