-- ============================================================
-- 솔라핏 회원 담당자/회사/연락처 컬럼 추가 마이그레이션
-- Supabase 대시보드 → SQL Editor → New query → 아래 전체 붙여넣기 → Run (1회)
-- (기존에 base supabase_setup.sql만 실행한 경우 profiles에 name 컬럼이 없어서
--  admin 이름 수정 / 가입 시 이름 저장이 실패함 → 이걸 실행하면 해결)
-- ============================================================

-- 1) 컬럼 추가 (없을 때만)
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists name    text;
alter table public.profiles add column if not exists phone   text;

-- 2) 회원가입 시 이름/회사/연락처(메타데이터)를 profiles로 복사하도록 트리거 갱신
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_admin, company, name, phone)
  values (new.id, new.email, new.email = 'chmd20@gmail.com',   -- 전용 관리자 이메일
          new.raw_user_meta_data->>'company',
          new.raw_user_meta_data->>'name',
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) 이미 가입한 회원의 이름/회사/연락처를 가입 당시 입력값에서 백필
update public.profiles p set
  name    = coalesce(p.name,    u.raw_user_meta_data->>'name'),
  company = coalesce(p.company, u.raw_user_meta_data->>'company'),
  phone   = coalesce(p.phone,   u.raw_user_meta_data->>'phone')
from auth.users u
where u.id = p.id;

-- 4) PostgREST 스키마 캐시 새로고침(즉시 반영)
notify pgrst, 'reload schema';
