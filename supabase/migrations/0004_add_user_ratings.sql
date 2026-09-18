-- 사용자가 직접 매기는 1~5 단계 (급한 정도 / 갖고 싶은 정도 / 오래 쓸 것 같은 정도). 기본 3 = 중립.
alter table items add column if not exists urgency smallint default 3;
alter table items add column if not exists desire smallint default 3;
alter table items add column if not exists longevity smallint default 3;
