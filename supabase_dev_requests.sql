-- ============================================================
-- 솔라핏 '개발 요청' 게시판 테이블 + 권한(RLS)
-- Supabase 대시보드 → SQL Editor → New query → 아래 전체 붙여넣기 → Run (1회)
-- (실행 전에는 개발요청 화면이 저장/조회되지 않습니다. 실행하면 즉시 활성화)
--
-- 규칙:
--  - 작성자는 '자기 요청'만 조회 가능(남의 것 안 보임 — DB단에서 차단)
--  - 관리자(profiles.is_admin=true, 예: chmd20@gmail.com)는 '모두의 요청' 조회 가능
--  - 작성은 본인만, 반영처리(상태·코멘트 수정)는 관리자만
-- ============================================================

-- 현재 로그인 사용자가 관리자인지 (profiles RLS 우회, 안전)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create table if not exists public.dev_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  content     text not null,
  shot        text,                                  -- 스크린샷(압축 base64 data URL)
  status      text not null default 'open',          -- open(검토중) | done(반영됨)
  admin_note  text,                                   -- 관리자 코멘트
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.dev_requests enable row level security;

-- 조회: 본인 요청 또는 관리자
drop policy if exists dev_sel on public.dev_requests;
create policy dev_sel on public.dev_requests for select
  using (auth.uid() = user_id or public.is_admin());

-- 작성: 본인 명의만
drop policy if exists dev_ins on public.dev_requests;
create policy dev_ins on public.dev_requests for insert
  with check (auth.uid() = user_id);

-- 수정(반영처리·코멘트): 관리자만
drop policy if exists dev_upd on public.dev_requests;
create policy dev_upd on public.dev_requests for update
  using (public.is_admin()) with check (public.is_admin());

-- 삭제: 본인 또는 관리자
drop policy if exists dev_del on public.dev_requests;
create policy dev_del on public.dev_requests for delete
  using (auth.uid() = user_id or public.is_admin());

notify pgrst, 'reload schema';
