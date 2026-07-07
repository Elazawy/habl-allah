begin;

do $$
begin
  if to_regprocedure('private.is_admin()') is null then
    raise exception 'private.is_admin() is required before running this migration.';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() is required before running this migration.';
  end if;
end $$;

create table if not exists public.student_course_lecture_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  lecture_id uuid not null references public.quran_course_lectures(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_course_lecture_completions_student_lecture_key unique (student_id, lecture_id)
);

create index if not exists sclc_lecture_idx
  on public.student_course_lecture_completions (lecture_id);

revoke all on table public.student_course_lecture_completions from anon;
grant select, insert, update, delete on table public.student_course_lecture_completions to authenticated;
grant select, insert, update, delete on table public.student_course_lecture_completions to service_role;

alter table public.student_course_lecture_completions enable row level security;

drop policy if exists sclc_student_select on public.student_course_lecture_completions;
create policy sclc_student_select
  on public.student_course_lecture_completions
  for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists sclc_student_insert on public.student_course_lecture_completions;
create policy sclc_student_insert
  on public.student_course_lecture_completions
  for insert
  to authenticated
  with check (
    (
      student_id = (select auth.uid())
      and exists (
        select 1
        from public.quran_course_lectures l
        join public.quran_courses c on c.id = l.course_id
        where l.id = lecture_id
          and l.is_published = true
          and c.is_published = true
          and (
            c.is_free = true
            or exists (
              select 1
              from public.student_course_subscriptions scs
              where scs.course_id = c.id
                and scs.student_id = (select auth.uid())
                and scs.is_active = true
            )
          )
      )
    )
    or (select private.is_admin())
  );

drop policy if exists sclc_student_update on public.student_course_lecture_completions;
create policy sclc_student_update
  on public.student_course_lecture_completions
  for update
  to authenticated
  using (
    student_id = (select auth.uid())
    or (select private.is_admin())
  )
  with check (
    (
      student_id = (select auth.uid())
      and exists (
        select 1
        from public.quran_course_lectures l
        join public.quran_courses c on c.id = l.course_id
        where l.id = lecture_id
          and l.is_published = true
          and c.is_published = true
          and (
            c.is_free = true
            or exists (
              select 1
              from public.student_course_subscriptions scs
              where scs.course_id = c.id
                and scs.student_id = (select auth.uid())
                and scs.is_active = true
            )
          )
      )
    )
    or (select private.is_admin())
  );

drop policy if exists sclc_student_delete on public.student_course_lecture_completions;
create policy sclc_student_delete
  on public.student_course_lecture_completions
  for delete
  to authenticated
  using (
    student_id = (select auth.uid())
    or (select private.is_admin())
  );

drop trigger if exists student_course_lecture_completions_set_updated_at on public.student_course_lecture_completions;
create trigger student_course_lecture_completions_set_updated_at
  before update on public.student_course_lecture_completions
  for each row execute function public.set_updated_at();

commit;
