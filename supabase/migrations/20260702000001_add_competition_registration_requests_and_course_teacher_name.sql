-- Migration: Add competition levels, registration requests table, and course teacher name
-- Target: hzealjrdtlfhkqhszkta

-- 1. Extend public.quran_competitions with available_levels
alter table public.quran_competitions
  add column if not exists available_levels jsonb not null default '[]'::jsonb;

-- 2. Create public.competition_registration_requests table
create table if not exists public.competition_registration_requests (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.quran_competitions(id) on delete cascade,
  student_id uuid references public.student_profiles(id) on delete set null,
  student_name text not null check (char_length(btrim(student_name)) >= 2),
  student_phone text not null check (student_phone ~ '^\d{10,15}$'),
  country text not null check (char_length(btrim(country)) >= 2),
  age integer not null check (age between 3 and 120),
  level text not null check (char_length(btrim(level)) >= 1),
  created_at timestamptz not null default now()
);

-- 3. Create indexes for foreign keys and creation time
create index if not exists crr_competition_idx
  on public.competition_registration_requests(competition_id);

create index if not exists crr_student_idx
  on public.competition_registration_requests(student_id);

create index if not exists crr_created_at_idx
  on public.competition_registration_requests(created_at desc);

-- 4. Enable Row Level Security
alter table public.competition_registration_requests enable row level security;

-- 5. Drop policies if they exist (to ensure idempotency)
drop policy if exists competition_registration_requests_public_insert on public.competition_registration_requests;
drop policy if exists competition_registration_requests_admin_select on public.competition_registration_requests;
drop policy if exists competition_registration_requests_admin_delete on public.competition_registration_requests;

-- 6. Recreate policies
create policy competition_registration_requests_public_insert
  on public.competition_registration_requests
  for insert
  to public
  with check (
    competition_id is not null
    and char_length(btrim(student_name)) >= 2
    and student_phone ~ '^\d{10,15}$'
    and char_length(btrim(country)) >= 2
    and age between 3 and 120
    and char_length(btrim(level)) >= 1
    and (
      student_id is null
      or (auth.uid() is not null and student_id = auth.uid())
    )
  );

create policy competition_registration_requests_admin_select
  on public.competition_registration_requests
  for select
  to authenticated
  using ((select private.is_admin()));

create policy competition_registration_requests_admin_delete
  on public.competition_registration_requests
  for delete
  to authenticated
  using ((select private.is_admin()));

-- 7. Extend public.quran_courses with teacher_name
alter table public.quran_courses
  add column if not exists teacher_name text;
