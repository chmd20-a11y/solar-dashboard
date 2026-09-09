-- ============================================================
-- 솔라핏 사용자별 설정(⚙️ 7탭) 클라우드 저장 테이블
-- Supabase → SQL Editor → New query → 붙여넣기 → Run (1회)
-- (실행 전에도 설정은 브라우저에 저장돼 동작함. 실행하면 계정별 클라우드 저장·기기간 동기화 활성화)
-- ============================================================

create table if not exists public.user_settings (
  id         uuid primary key references auth.users(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

-- 본인 설정만 읽기/쓰기 (다른 사람 설정 접근 불가)
drop policy if exists "own_settings_sel" on public.user_settings;
create policy "own_settings_sel" on public.user_settings for select using (auth.uid() = id);

drop policy if exists "own_settings_ins" on public.user_settings;
create policy "own_settings_ins" on public.user_settings for insert with check (auth.uid() = id);

drop policy if exists "own_settings_upd" on public.user_settings;
create policy "own_settings_upd" on public.user_settings for update using (auth.uid() = id) with check (auth.uid() = id);

notify pgrst, 'reload schema';
