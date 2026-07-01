-- ─────────────────────────────────────────────────────────────
-- Table: student_profiles
-- Linked 1-to-1 with auth.users via the same UUID.
-- phone is stored here as the canonical identifier.
-- In auth.users the email is stored as {phone}@habl-allah.app
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null check (char_length(btrim(full_name)) >= 2),
  phone       text        not null unique check (phone ~ '^\d{10,15}$'),
  teacher_id  uuid        references public.teachers(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists student_profiles_teacher_idx on public.student_profiles(teacher_id);
create index if not exists student_profiles_phone_idx   on public.student_profiles(phone);

alter table public.student_profiles enable row level security;

-- Students can read and update only their own row
create policy student_profiles_self_select
  on public.student_profiles for select
  to authenticated
  using (id = auth.uid() or (select private.is_admin()));

create policy student_profiles_self_update
  on public.student_profiles for update
  to authenticated
  using (id = auth.uid() or (select private.is_admin()))
  with check (id = auth.uid() or (select private.is_admin()));

-- Only admin can insert / delete
create policy student_profiles_admin_insert
  on public.student_profiles for insert
  to authenticated
  with check ((select private.is_admin()));

create policy student_profiles_admin_delete
  on public.student_profiles for delete
  to authenticated
  using ((select private.is_admin()));

-- Auto-update updated_at
drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();
