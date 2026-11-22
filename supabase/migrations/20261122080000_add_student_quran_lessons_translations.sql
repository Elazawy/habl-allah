-- Migration: Add English & Turkish translation columns for student Quran lesson reports
--
-- Adds nullable per-language free-text translation columns (*_en, *_tr) on
-- public.student_quran_lessons. Standard Surah names and rating levels are
-- translated deterministically in the frontend, while explicit *_en / *_tr
-- columns allow admins to override Surah text and translate notes, Tajweed
-- topics, and Hijri dates when needed.

BEGIN;

ALTER TABLE public.student_quran_lessons
  ADD COLUMN IF NOT EXISTS hijri_date_en text,
  ADD COLUMN IF NOT EXISTS hijri_date_tr text,
  ADD COLUMN IF NOT EXISTS recitation_today_surah_en text,
  ADD COLUMN IF NOT EXISTS recitation_today_surah_tr text,
  ADD COLUMN IF NOT EXISTS recitation_past_surah_en text,
  ADD COLUMN IF NOT EXISTS recitation_past_surah_tr text,
  ADD COLUMN IF NOT EXISTS reading_surah_en text,
  ADD COLUMN IF NOT EXISTS reading_surah_tr text,
  ADD COLUMN IF NOT EXISTS tajweed_lesson_en text,
  ADD COLUMN IF NOT EXISTS tajweed_lesson_tr text,
  ADD COLUMN IF NOT EXISTS general_notes_en text,
  ADD COLUMN IF NOT EXISTS general_notes_tr text,
  ADD COLUMN IF NOT EXISTS homework_today_surah_en text,
  ADD COLUMN IF NOT EXISTS homework_today_surah_tr text,
  ADD COLUMN IF NOT EXISTS homework_past_surah_en text,
  ADD COLUMN IF NOT EXISTS homework_past_surah_tr text;

COMMIT;
