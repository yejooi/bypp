-- REQUIRED before persistence works at all. Run this whole block in the Supabase SQL Editor.
--
-- Found while wiring up real DB persistence: INSERT into sessions/items fails with
-- "new row violates row-level security policy" even though schema.sql's policies looked
-- right. SELECT works (returns rows fine), only INSERT/UPDATE fail -- so the "with check"
-- half of the anon policies isn't actually in effect on this project, whatever the reason.
-- Dropping and recreating them (idempotent, safe to run even if they're fine) fixes it.

drop policy if exists "anon full access" on sessions;
drop policy if exists "anon full access" on items;
drop policy if exists "anon full access" on evaluations;

create policy "anon full access" on sessions for all to anon using (true) with check (true);
create policy "anon full access" on items for all to anon using (true) with check (true);
create policy "anon full access" on evaluations for all to anon using (true) with check (true);

-- Also add the columns Phase 4 needs that schema.sql didn't have when first applied.
alter table items add column if not exists custom_reason text;
alter table items add column if not exists source_url text;

alter table items drop constraint if exists items_reason_code_check;
alter table items add constraint items_reason_code_check check (reason_code in (
  'long_wanted', 'urgent_need', 'broke_replace', 'on_sale', 'social_proof', 'mood_boost', 'other'
));
