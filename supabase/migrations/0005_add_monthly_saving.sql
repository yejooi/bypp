-- 몬테카를로로 역산한 권장 월 저축액. 직접 입력한 예산이면 null.
alter table sessions add column if not exists monthly_saving numeric;
ㅇ