-- ─────────────────────────────────────────────────────────────
-- Table: course_lecture_questions
-- Students submit a question title per lecture.
-- Admin replies once with a text response.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.course_lecture_questions (
  id              uuid        primary key default gen_random_uuid(),
  lecture_id      uuid        not null references public.quran_course_lectures(id) on delete cascade,
  student_id      uuid        not null references public.student_profiles(id) on delete cascade,
  question_title  text        not null check (char_length(btrim(question_title)) >= 3),
  admin_reply     text,
  replied_at      timestamptz,
  is_answered     boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists clq_lecture_idx  on public.course_lecture_questions(lecture_id);
create index if not exists clq_student_idx  on public.course_lecture_questions(student_id);
create index if not exists clq_answered_idx on public.course_lecture_questions(is_answered, created_at);

alter table public.course_lecture_questions enable row level security;

-- Student can read their own questions and submit new ones
create policy clq_student_select
  on public.course_lecture_questions for select
  to authenticated
  using (student_id = auth.uid() or (select private.is_admin()));

create policy clq_student_insert
  on public.course_lecture_questions for insert
  to authenticated
  with check (student_id = auth.uid());

-- Only admin can reply (update) or delete
create policy clq_admin_update
  on public.course_lecture_questions for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy clq_admin_delete
  on public.course_lecture_questions for delete
  to authenticated
  using ((select private.is_admin()));

drop trigger if exists clq_set_updated_at on public.course_lecture_questions;
create trigger clq_set_updated_at
  before update on public.course_lecture_questions
  for each row execute function public.set_updated_at();
