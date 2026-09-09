-- ============================================================
-- 솔라핏(SolarFit) — 회원(profiles) 테이블 + 자동생성 트리거 + 보안정책(RLS)
-- Supabase 대시보드 → 왼쪽 "SQL Editor" → New query → 아래 전체 붙여넣기 → Run
-- (1회만 실행하면 됩니다)
-- ============================================================

-- 1) 회원 프로필 테이블
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  plan       text    not null default 'free',      -- 'free' | 'paid'
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) 회원가입 시 profiles 행 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) 관리자 판별 함수 (RLS 무한재귀 방지용)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 4) 행 수준 보안(RLS) 켜기 + 정책
alter table public.profiles enable row level security;

drop policy if exists "own_or_admin_select" on public.profiles;
create policy "own_or_admin_select" on public.profiles
  for select using ( auth.uid() = id or public.is_admin() );

drop policy if exists "own_insert" on public.profiles;
create policy "own_insert" on public.profiles
  for insert with check ( auth.uid() = id );

-- 요금제/관리자 변경은 관리자만 (일반 회원은 자기 plan 못 바꿈)
drop policy if exists "admin_update" on public.profiles;
create policy "admin_update" on public.profiles
  for update using ( public.is_admin() ) with check ( public.is_admin() );

-- ============================================================
-- 위 실행 후: 솔라핏 앱에서 chmd20@gmail.com 으로 "회원가입"을 먼저 한 번 하고,
-- 그 다음 아래 한 줄을 실행해 본인을 관리자로 지정하세요.
-- (가입을 먼저 해야 profiles 행이 생겨서 관리자 지정이 됩니다)
-- ============================================================
-- update public.profiles set is_admin = true where email = 'chmd20@gmail.com';
