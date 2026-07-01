-- Drop old lecture select policy if it exists
drop policy if exists quran_course_lectures_admin_select on public.quran_course_lectures;

-- Create updated select policy for quran_course_lectures
create policy quran_course_lectures_student_or_admin_select
  on public.quran_course_lectures for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.quran_courses c
      where c.id = course_id
        and c.is_published = true
        and (
          c.is_free = true
          or exists (
            select 1 from public.student_course_subscriptions scs
            where scs.course_id = c.id
              and scs.student_id = auth.uid()
              and scs.is_active = true
          )
        )
    )
  );
