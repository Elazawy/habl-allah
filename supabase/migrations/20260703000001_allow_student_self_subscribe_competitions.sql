-- Migration: Allow students to self-subscribe to competitions
-- Target: hzealjrdtlfhkqhszkta

drop policy if exists scmp_admin_insert on public.student_competition_subscriptions;

create policy scmp_student_insert
  on public.student_competition_subscriptions
  for insert
  to authenticated
  with check (student_id = auth.uid() or (select private.is_admin()));
