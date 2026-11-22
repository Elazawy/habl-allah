-- Migration: Add English & Turkish content translation columns
--
-- Adds nullable per-language translation columns (*_en, *_tr) and shared Latin
-- name columns (name_latin / teacher_name_latin) to the 7 translatable content
-- tables, and updates public.published_quran_course_lectures to expose the new
-- translated course/lecture fields while preserving all existing columns and grants.

BEGIN;

-- ─── 1. public.teachers ──────────────────────────────────────────────────────

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS name_latin text,
  ADD COLUMN IF NOT EXISTS bio_en text,
  ADD COLUMN IF NOT EXISTS bio_tr text;

-- ─── 2. public.quran_courses ─────────────────────────────────────────────────

ALTER TABLE public.quran_courses
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_tr text,
  ADD COLUMN IF NOT EXISTS short_description_en text,
  ADD COLUMN IF NOT EXISTS short_description_tr text,
  ADD COLUMN IF NOT EXISTS long_description_en text,
  ADD COLUMN IF NOT EXISTS long_description_tr text,
  ADD COLUMN IF NOT EXISTS price_en text,
  ADD COLUMN IF NOT EXISTS price_tr text,
  ADD COLUMN IF NOT EXISTS teacher_name_latin text,
  ADD COLUMN IF NOT EXISTS learning_outcomes_en jsonb
    CONSTRAINT quran_courses_learning_outcomes_en_check
    CHECK (learning_outcomes_en IS NULL OR jsonb_typeof(learning_outcomes_en) = 'array'),
  ADD COLUMN IF NOT EXISTS learning_outcomes_tr jsonb
    CONSTRAINT quran_courses_learning_outcomes_tr_check
    CHECK (learning_outcomes_tr IS NULL OR jsonb_typeof(learning_outcomes_tr) = 'array');

-- ─── 3. public.quran_course_lectures ─────────────────────────────────────────

ALTER TABLE public.quran_course_lectures
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_tr text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_tr text;

-- ─── 4. View: public.published_quran_course_lectures ─────────────────────────
-- Preserves all existing columns in exact order and appends translation columns
-- so existing grants remain intact.

CREATE OR REPLACE VIEW public.published_quran_course_lectures
  WITH (security_invoker = true) AS
SELECT
  l.id,
  l.course_id,
  c.slug AS course_slug,
  c.name AS course_name,
  c.is_free AS course_is_free,
  l.slug,
  l.title,
  l.description,
  l.sort_order,
  l.is_published,
  CASE
    WHEN c.is_free THEN l.youtube_url
    ELSE NULL::text
  END AS youtube_url,
  l.created_at,
  l.updated_at,
  c.name_en AS course_name_en,
  c.name_tr AS course_name_tr,
  l.title_en,
  l.title_tr,
  l.description_en,
  l.description_tr
FROM public.quran_course_lectures l
JOIN public.quran_courses c ON c.id = l.course_id
WHERE c.is_published = true AND l.is_published = true;

-- ─── 5. public.quran_competitions ────────────────────────────────────────────

ALTER TABLE public.quran_competitions
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_tr text,
  ADD COLUMN IF NOT EXISTS short_description_en text,
  ADD COLUMN IF NOT EXISTS short_description_tr text,
  ADD COLUMN IF NOT EXISTS complete_description_en text,
  ADD COLUMN IF NOT EXISTS complete_description_tr text,
  ADD COLUMN IF NOT EXISTS awards_short_description_en text,
  ADD COLUMN IF NOT EXISTS awards_short_description_tr text,
  ADD COLUMN IF NOT EXISTS awards_complete_description_en text,
  ADD COLUMN IF NOT EXISTS awards_complete_description_tr text,
  ADD COLUMN IF NOT EXISTS participation_terms_en text,
  ADD COLUMN IF NOT EXISTS participation_terms_tr text,
  ADD COLUMN IF NOT EXISTS available_levels_en jsonb
    CONSTRAINT quran_competitions_available_levels_en_check
    CHECK (available_levels_en IS NULL OR jsonb_typeof(available_levels_en) = 'array'),
  ADD COLUMN IF NOT EXISTS available_levels_tr jsonb
    CONSTRAINT quran_competitions_available_levels_tr_check
    CHECK (available_levels_tr IS NULL OR jsonb_typeof(available_levels_tr) = 'array');

-- ─── 6. public.competition_stages ────────────────────────────────────────────

ALTER TABLE public.competition_stages
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_tr text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_tr text;

-- ─── 7. public.faqs ──────────────────────────────────────────────────────────

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS question_en text,
  ADD COLUMN IF NOT EXISTS question_tr text,
  ADD COLUMN IF NOT EXISTS answer_en text,
  ADD COLUMN IF NOT EXISTS answer_tr text;

-- ─── 8. public.pages ─────────────────────────────────────────────────────────

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_tr text,
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS content_tr text;

COMMIT;
