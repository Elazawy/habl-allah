-- ============================================================
-- Courses Feature — Supabase Schema Setup
-- ============================================================
-- Run this in the Supabase SQL Editor (or via MCP apply_migration).
-- The Storage bucket "quran-courses" must be created separately
-- in the Supabase dashboard: Storage → New Bucket → "quran-courses" (Public).
-- ============================================================

-- ──────────────────────────────────────────
-- Table: quran_courses
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quran_courses (
  id                    uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                  text            NOT NULL UNIQUE,
  name                  text            NOT NULL,
  short_description     text            NOT NULL,
  long_description      text,
  price                 text,                         -- null or empty = free; text for Arabic formatting e.g. "٢٥٠ جنيه"
  is_free               boolean         NOT NULL DEFAULT false,
  image_url             text,                         -- public URL (from Storage or external)
  image_path            text,                         -- Supabase Storage path (used for deletion)
  learning_outcomes     jsonb           NOT NULL DEFAULT '[]'::jsonb,  -- array of strings
  number_of_subscribers integer         NOT NULL DEFAULT 0,            -- reserved; hidden in UI for now
  is_published          boolean         NOT NULL DEFAULT true,
  sort_order            integer         NOT NULL DEFAULT 0,
  teacher_name          text,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS quran_courses_slug_idx        ON public.quran_courses (slug);
CREATE INDEX IF NOT EXISTS quran_courses_published_idx   ON public.quran_courses (is_published);
CREATE INDEX IF NOT EXISTS quran_courses_sort_order_idx  ON public.quran_courses (sort_order, created_at);

-- ──────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────
ALTER TABLE public.quran_courses ENABLE ROW LEVEL SECURITY;

-- Anyone can read published courses (public listing + detail pages)
CREATE POLICY "Public can read published courses"
  ON public.quran_courses
  FOR SELECT
  USING (is_published = true);

-- Authenticated admin users can do anything (full CRUD)
CREATE POLICY "Authenticated users can manage courses"
  ON public.quran_courses
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────
-- Auto-update updated_at on row changes
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Only create the trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'quran_courses_set_updated_at'
  ) THEN
    CREATE TRIGGER quran_courses_set_updated_at
      BEFORE UPDATE ON public.quran_courses
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- ──────────────────────────────────────────
-- Storage bucket: quran-courses
-- ──────────────────────────────────────────
-- The Supabase storage.buckets table may not be accessible via plain SQL in all setups.
-- If the INSERT below fails, create the bucket manually in the Supabase dashboard:
--   Storage → New Bucket → Name: "quran-courses" → Public: ON
INSERT INTO storage.buckets (id, name, public)
VALUES ('quran-courses', 'quran-courses', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads on the bucket
CREATE POLICY "Public can read course images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'quran-courses');

-- Allow authenticated users to upload/delete course images
CREATE POLICY "Authenticated users can upload course images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'quran-courses' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete course images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'quran-courses' AND auth.role() = 'authenticated');

-- ──────────────────────────────────────────
-- Table: quran_course_lectures
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quran_course_lectures (
  id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id         uuid          NOT NULL REFERENCES public.quran_courses(id) ON DELETE CASCADE,
  slug              text          NOT NULL,
  title             text          NOT NULL,
  description       text,
  youtube_url       text,          -- for free courses
  r2_object_key     text,          -- for paid courses (Cloudflare R2)
  original_file_name text,
  video_status      text,
  sort_order        integer       NOT NULL DEFAULT 0,
  is_published      boolean       NOT NULL DEFAULT false,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);

ALTER TABLE public.quran_course_lectures ENABLE ROW LEVEL SECURITY;

-- Allow public reads on lectures
CREATE POLICY "Public can read published lectures"
  ON public.quran_course_lectures
  FOR SELECT
  USING (is_published = true);

-- Authenticated users can manage lectures
CREATE POLICY "Authenticated users can manage lectures"
  ON public.quran_course_lectures FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- View used by the public watch page
CREATE OR REPLACE VIEW public.published_quran_course_lectures AS
  SELECT * FROM public.quran_course_lectures WHERE is_published = true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS quran_course_lectures_course_id_idx
  ON public.quran_course_lectures(course_id);
CREATE INDEX IF NOT EXISTS quran_course_lectures_sort_order_idx
  ON public.quran_course_lectures(course_id, sort_order, created_at);

-- Trigger for updating updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'quran_course_lectures_set_updated_at'
  ) THEN
    CREATE TRIGGER quran_course_lectures_set_updated_at
      BEFORE UPDATE ON public.quran_course_lectures
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
