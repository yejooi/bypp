-- 쇼케이스 안 사용자 지정 순서. 없어도 앱은 동작하지만 새로고침하면 순서가 초기화된다.
alter table items add column if not exists sort_order integer;
