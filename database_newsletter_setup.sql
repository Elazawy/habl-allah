-- Newsletter subscribers table setup for Habl Allah
-- Run in Supabase SQL editor.

begin;

-- Newsletter subscribers table
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Anyone can insert (public form)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'newsletter_subscribers'
      and policyname = 'newsletter_subscribers_public_insert'
  ) then
    create policy newsletter_subscribers_public_insert
      on public.newsletter_subscribers
      for insert
      to public
      with check (true);
  end if;

  -- Only admins can read
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'newsletter_subscribers'
      and policyname = 'newsletter_subscribers_admin_select'
  ) then
    create policy newsletter_subscribers_admin_select
      on public.newsletter_subscribers
      for select
      to authenticated
      using (private.is_admin());
  end if;

  -- Only admins can delete
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'newsletter_subscribers'
      and policyname = 'newsletter_subscribers_admin_delete'
  ) then
    create policy newsletter_subscribers_admin_delete
      on public.newsletter_subscribers
      for delete
      to authenticated
      using (private.is_admin());
  end if;
end $$;

commit;
