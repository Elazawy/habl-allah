-- ─────────────────────────────────────────────────────────────
-- Table: student_quran_lessons
-- Each row = one Quran session record for a student.
-- All fields mirror the Telegram bot message format exactly.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_quran_lessons (
  id                        uuid        primary key default gen_random_uuid(),
  student_id                uuid        not null references public.student_profiles(id) on delete cascade,

  -- التاريخ
  lesson_date               date        not null,
  hijri_date                text,           -- e.g. "٢٣ ذو الحجة ١٤٤٧ هـ"

  -- تسميع الحاضر
  recitation_today_surah    text,           -- "الطلاق"
  recitation_today_from     text,           -- "١" (stored as text to support Arabic numerals)
  recitation_today_to       text,           -- "٢"
  recitation_today_level    text,           -- "جيد جداً"

  -- تسميع الماضي
  recitation_past_surah     text,           -- "القلم"
  recitation_past_level     text,

  -- القراءة
  reading_surah             text,
  reading_from              text,
  reading_to                text,
  reading_level             text,

  -- التجويد
  tajweed_lesson            text,           -- "تحفة الأطفال"

  -- ملاحظات عامة
  general_notes             text,

  -- التفاعل
  interaction_level         text,           -- "ممتاز"

  -- الواجبات
  homework_today_surah      text,
  homework_today_from       text,
  homework_today_to         text,
  homework_past_surah       text,

  -- metadata
  created_by                uuid        references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists sql_student_date_idx
  on public.student_quran_lessons(student_id, lesson_date desc);

alter table public.student_quran_lessons enable row level security;

-- Student can only read their own lessons
create policy sql_student_select
  on public.student_quran_lessons for select
  to authenticated
  using (student_id = auth.uid() or (select private.is_admin()));

-- Only admin can write
create policy sql_admin_insert
  on public.student_quran_lessons for insert
  to authenticated
  with check ((select private.is_admin()));

create policy sql_admin_update
  on public.student_quran_lessons for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy sql_admin_delete
  on public.student_quran_lessons for delete
  to authenticated
  using ((select private.is_admin()));

drop trigger if exists student_quran_lessons_set_updated_at on public.student_quran_lessons;
create trigger student_quran_lessons_set_updated_at
  before update on public.student_quran_lessons
  for each row execute function public.set_updated_at();
