-- ─────────────────────────────────────────────────────────────
-- Table: student_course_subscriptions
-- Tracks which students have been granted access to which courses.
-- is_active = true means access is open. Admin toggles this.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_course_subscriptions (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references public.student_profiles(id) on delete cascade,
  course_id     uuid        not null references public.quran_courses(id) on delete cascade,
  is_active     boolean     not null default true,
  subscribed_at timestamptz not null default now(),
  expires_at    timestamptz,
  unique (student_id, course_id)
);

create index if not exists scs_student_idx on public.student_course_subscriptions(student_id);
create index if not exists scs_course_idx  on public.student_course_subscriptions(course_id);

alter table public.student_course_subscriptions enable row level security;

create policy scs_student_select
  on public.student_course_subscriptions for select
  to authenticated
  using (student_id = auth.uid() or (select private.is_admin()));

create policy scs_admin_insert
  on public.student_course_subscriptions for insert
  to authenticated
  with check ((select private.is_admin()));

create policy scs_admin_update
  on public.student_course_subscriptions for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy scs_admin_delete
  on public.student_course_subscriptions for delete
  to authenticated
  using ((select private.is_admin()));

-- ─────────────────────────────────────────────────────────────
-- Table: student_competition_subscriptions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_competition_subscriptions (
  id               uuid        primary key default gen_random_uuid(),
  student_id       uuid        not null references public.student_profiles(id) on delete cascade,
  competition_id   uuid        not null references public.quran_competitions(id) on delete cascade,
  is_active        boolean     not null default true,
  subscribed_at    timestamptz not null default now(),
  unique (student_id, competition_id)
);

create index if not exists scmp_student_idx on public.student_competition_subscriptions(student_id);

alter table public.student_competition_subscriptions enable row level security;

create policy scmp_student_select
  on public.student_competition_subscriptions for select
  to authenticated
  using (student_id = auth.uid() or (select private.is_admin()));

create policy scmp_admin_insert
  on public.student_competition_subscriptions for insert
  to authenticated
  with check ((select private.is_admin()));

create policy scmp_admin_update
  on public.student_competition_subscriptions for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy scmp_admin_delete
  on public.student_competition_subscriptions for delete
  to authenticated
  using ((select private.is_admin()));
