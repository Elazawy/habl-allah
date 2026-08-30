-- Migration: Add flexible competition stages
-- Adds competition_stages table, student_stage_assignments table,
-- and a status column to competition_registration_requests for rejection tracking.

begin;

-- ──────────────────────────────────────────
-- 1. Add status column to competition_registration_requests
--    'pending' = awaiting admin review (default, backward compatible)
--    'rejected' = admin rejected the request
-- ──────────────────────────────────────────
alter table public.competition_registration_requests
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'rejected'));

-- Allow students to read their own rejected requests
-- (so the student UI can show the rejection message)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_registration_requests'
      and policyname = 'competition_registration_requests_student_select_own'
  ) then
    create policy competition_registration_requests_student_select_own
      on public.competition_registration_requests
      for select
      to authenticated
      using (
        student_id = auth.uid()
      );
  end if;
end $$;

-- Allow admin to update requests (for changing status to 'rejected')
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_registration_requests'
      and policyname = 'competition_registration_requests_admin_update'
  ) then
    create policy competition_registration_requests_admin_update
      on public.competition_registration_requests
      for update
      to authenticated
      using ((select private.is_admin()))
      with check ((select private.is_admin()));
  end if;
end $$;

-- ──────────────────────────────────────────
-- 2. Table: competition_stages
-- ──────────────────────────────────────────
create table if not exists public.competition_stages (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.quran_competitions(id) on delete cascade,
  name text not null check (char_length(btrim(name)) >= 1),
  description text,
  deadline date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cs_competition_idx
  on public.competition_stages(competition_id);

alter table public.competition_stages enable row level security;

do $$
begin
  -- Public can read stages for published competitions
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_stages'
      and policyname = 'cs_public_read'
  ) then
    create policy cs_public_read
      on public.competition_stages
      for select
      to anon
      using (exists (
        select 1 from public.quran_competitions
        where id = competition_id and is_published = true
      ));
  end if;

  -- Authenticated: student reads published, admin reads all
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_stages'
      and policyname = 'cs_authenticated_select'
  ) then
    create policy cs_authenticated_select
      on public.competition_stages
      for select
      to authenticated
      using (
        exists (
          select 1 from public.quran_competitions
          where id = competition_id and is_published = true
        )
        or (select private.is_admin())
      );
  end if;

  -- Admin insert
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_stages'
      and policyname = 'cs_admin_insert'
  ) then
    create policy cs_admin_insert
      on public.competition_stages
      for insert
      to authenticated
      with check ((select private.is_admin()));
  end if;

  -- Admin update
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_stages'
      and policyname = 'cs_admin_update'
  ) then
    create policy cs_admin_update
      on public.competition_stages
      for update
      to authenticated
      using ((select private.is_admin()))
      with check ((select private.is_admin()));
  end if;

  -- Admin delete
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_stages'
      and policyname = 'cs_admin_delete'
  ) then
    create policy cs_admin_delete
      on public.competition_stages
      for delete
      to authenticated
      using ((select private.is_admin()));
  end if;
end $$;

-- ──────────────────────────────────────────
-- 3. Table: student_stage_assignments
-- ──────────────────────────────────────────
create table if not exists public.student_stage_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  competition_id uuid not null references public.quran_competitions(id) on delete cascade,
  current_stage_id uuid not null references public.competition_stages(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'failed', 'completed')),
  final_rank integer,
  level text,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ssa_unique_student_competition unique (student_id, competition_id)
);

create index if not exists ssa_competition_idx
  on public.student_stage_assignments(competition_id);

create index if not exists ssa_stage_idx
  on public.student_stage_assignments(current_stage_id);

create index if not exists ssa_student_idx
  on public.student_stage_assignments(student_id);

alter table public.student_stage_assignments enable row level security;

do $$
begin
  -- Student can read own assignment, admin can read all
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_stage_assignments'
      and policyname = 'ssa_student_select'
  ) then
    create policy ssa_student_select
      on public.student_stage_assignments
      for select
      to authenticated
      using (student_id = auth.uid() or (select private.is_admin()));
  end if;

  -- Admin insert
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_stage_assignments'
      and policyname = 'ssa_admin_insert'
  ) then
    create policy ssa_admin_insert
      on public.student_stage_assignments
      for insert
      to authenticated
      with check ((select private.is_admin()));
  end if;

  -- Admin update
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_stage_assignments'
      and policyname = 'ssa_admin_update'
  ) then
    create policy ssa_admin_update
      on public.student_stage_assignments
      for update
      to authenticated
      using ((select private.is_admin()))
      with check ((select private.is_admin()));
  end if;

  -- Admin delete
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_stage_assignments'
      and policyname = 'ssa_admin_delete'
  ) then
    create policy ssa_admin_delete
      on public.student_stage_assignments
      for delete
      to authenticated
      using ((select private.is_admin()));
  end if;
end $$;

-- ──────────────────────────────────────────
-- 4. Grant access to new tables
-- ──────────────────────────────────────────
grant select on public.competition_stages to anon;
grant select, insert, update, delete on public.competition_stages to authenticated;

grant select, insert, update, delete on public.student_stage_assignments to authenticated;

-- Grant update on competition_registration_requests (for status column)
grant update on public.competition_registration_requests to authenticated;

commit;
