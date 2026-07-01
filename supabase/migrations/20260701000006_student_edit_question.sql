-- ─────────────────────────────────────────────────────────────
-- Update select and update policies for course_lecture_questions
-- ─────────────────────────────────────────────────────────────

-- 1. Allow all authenticated users to read all questions (for sharing benefit)
drop policy if exists clq_student_select on public.course_lecture_questions;

create policy clq_student_select
  on public.course_lecture_questions for select
  to authenticated
  using (true);

-- 2. Allow students to edit/update their own questions if they are not answered yet
drop policy if exists clq_student_update on public.course_lecture_questions;

create policy clq_student_update
  on public.course_lecture_questions for update
  to authenticated
  using (student_id = auth.uid() and is_answered = false)
  with check (student_id = auth.uid() and is_answered = false);

-- 3. Allow students to delete their own questions
drop policy if exists clq_student_delete on public.course_lecture_questions;

create policy clq_student_delete
  on public.course_lecture_questions for delete
  to authenticated
  using (student_id = auth.uid());

-- 4. Allow all authenticated users to read student profiles so names are visible in questions
drop policy if exists student_profiles_self_select on public.student_profiles;

create policy student_profiles_all_select
  on public.student_profiles for select
  to authenticated
  using (true);
