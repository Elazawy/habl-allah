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

commit;
