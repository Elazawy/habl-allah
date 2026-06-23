-- Reviews + Admin authorization setup for Habl Allah
-- Run in Supabase SQL editor.

begin;

-- 1) Admin users table
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'admin_users_self_read'
  ) then
    create policy admin_users_self_read
      on public.admin_users
      for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;
end $$;

-- 2) Helper function used by RLS policies
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

-- 3) Extend existing teacher_reviews for image-only model
alter table public.teacher_reviews
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists alt_text text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.teacher_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_reviews'
      and policyname = 'teacher_reviews_public_read_published'
  ) then
    create policy teacher_reviews_public_read_published
      on public.teacher_reviews
      for select
      to public
      using (is_published = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_reviews'
      and policyname = 'teacher_reviews_admin_select'
  ) then
    create policy teacher_reviews_admin_select
      on public.teacher_reviews
      for select
      to authenticated
      using (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_reviews'
      and policyname = 'teacher_reviews_admin_insert'
  ) then
    create policy teacher_reviews_admin_insert
      on public.teacher_reviews
      for insert
      to authenticated
      with check (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_reviews'
      and policyname = 'teacher_reviews_admin_update'
  ) then
    create policy teacher_reviews_admin_update
      on public.teacher_reviews
      for update
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_reviews'
      and policyname = 'teacher_reviews_admin_delete'
  ) then
    create policy teacher_reviews_admin_delete
      on public.teacher_reviews
      for delete
      to authenticated
      using (private.is_admin());
  end if;
end $$;

-- 4) Quran homepage reviews table
create table if not exists public.quran_reviews (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text,
  alt_text text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quran_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_reviews'
      and policyname = 'quran_reviews_public_read_published'
  ) then
    create policy quran_reviews_public_read_published
      on public.quran_reviews
      for select
      to public
      using (is_published = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_reviews'
      and policyname = 'quran_reviews_admin_select'
  ) then
    create policy quran_reviews_admin_select
      on public.quran_reviews
      for select
      to authenticated
      using (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_reviews'
      and policyname = 'quran_reviews_admin_insert'
  ) then
    create policy quran_reviews_admin_insert
      on public.quran_reviews
      for insert
      to authenticated
      with check (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_reviews'
      and policyname = 'quran_reviews_admin_update'
  ) then
    create policy quran_reviews_admin_update
      on public.quran_reviews
      for update
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quran_reviews'
      and policyname = 'quran_reviews_admin_delete'
  ) then
    create policy quran_reviews_admin_delete
      on public.quran_reviews
      for delete
      to authenticated
      using (private.is_admin());
  end if;
end $$;

-- 5) Storage bucket for review images
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'review_images_admin_insert'
  ) then
    create policy review_images_admin_insert
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'review-images' and private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'review_images_admin_update'
  ) then
    create policy review_images_admin_update
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'review-images' and private.is_admin())
      with check (bucket_id = 'review-images' and private.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'review_images_admin_delete'
  ) then
    create policy review_images_admin_delete
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'review-images' and private.is_admin());
  end if;
end $$;

commit;

-- After running this migration, insert your admin user UID:
-- insert into public.admin_users (id, email, is_active)
-- values ('YOUR_AUTH_USER_UUID', 'admin@example.com', true)
-- on conflict (id) do update set is_active = true, email = excluded.email;
