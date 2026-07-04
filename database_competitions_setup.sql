-- Quran competitions setup for Habl Allah
-- Mirrors the Supabase migration used for Stage 3.

begin;

do $$
begin
  if to_regclass('public.admin_users') is null then
    raise exception 'public.admin_users is required before running database_competitions_setup.sql. Run database_reviews_setup.sql first.';
  end if;
end $$;

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and a.is_active = true
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create table if not exists public.quran_competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null,
  complete_description text not null,
  start_date date not null,
  registration_deadline date not null,
  awards_short_description text,
  awards_complete_description text,
  participation_terms text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  available_levels jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (registration_deadline <= start_date),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.quran_competitions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_competitions'
      and policyname = 'quran_competitions_public_read_published'
  ) then
    create policy quran_competitions_public_read_published
      on public.quran_competitions
      for select
      to anon
      using (is_published = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_competitions'
      and policyname = 'quran_competitions_admin_select'
  ) then
    create policy quran_competitions_admin_select
      on public.quran_competitions
      for select
      to authenticated
      using (is_published = true or private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_competitions'
      and policyname = 'quran_competitions_admin_insert'
  ) then
    create policy quran_competitions_admin_insert
      on public.quran_competitions
      for insert
      to authenticated
      with check (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_competitions'
      and policyname = 'quran_competitions_admin_update'
  ) then
    create policy quran_competitions_admin_update
      on public.quran_competitions
      for update
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_competitions'
      and policyname = 'quran_competitions_admin_delete'
  ) then
    create policy quran_competitions_admin_delete
      on public.quran_competitions
      for delete
      to authenticated
      using (private.is_admin());
  end if;
end $$;

-- ──────────────────────────────────────────
-- Table: competition_registration_requests
-- ──────────────────────────────────────────
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

create index if not exists crr_competition_idx
  on public.competition_registration_requests(competition_id);

create index if not exists crr_student_idx
  on public.competition_registration_requests(student_id);

create index if not exists crr_created_at_idx
  on public.competition_registration_requests(created_at desc);

alter table public.competition_registration_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_registration_requests'
      and policyname = 'competition_registration_requests_public_insert'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_registration_requests'
      and policyname = 'competition_registration_requests_admin_select'
  ) then
    create policy competition_registration_requests_admin_select
      on public.competition_registration_requests
      for select
      to authenticated
      using ((select private.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_registration_requests'
      and policyname = 'competition_registration_requests_admin_delete'
  ) then
    create policy competition_registration_requests_admin_delete
      on public.competition_registration_requests
      for delete
      to authenticated
      using ((select private.is_admin()));
  end if;
end $$;

commit;
