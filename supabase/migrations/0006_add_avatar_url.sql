-- 프로필 사진. 160px로 줄인 JPEG data URL을 그대로 저장한다 (별도 스토리지 없이 동작).
alter table profiles add column if not exists avatar_url text;
