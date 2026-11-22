-- Migration: Add preferred_language across student accounts, requests, and competition registrations
--
-- Stores the active UI language ('ar' | 'en' | 'tr', default 'ar') when students
-- sign up, submit teacher subscription/preference requests, or register for a
-- competition. Updates the relevant triggers and RPCs to normalize and persist it
-- while keeping backwards compatibility for callers that omit the parameter.

BEGIN;

-- ─── 1. Add preferred_language columns ───────────────────────────────────────

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar'
    CONSTRAINT student_profiles_preferred_language_check
    CHECK (preferred_language IN ('ar', 'en', 'tr'));

ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar'
    CONSTRAINT subscription_requests_preferred_language_check
    CHECK (preferred_language IN ('ar', 'en', 'tr'));

ALTER TABLE public.preference_requests
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar'
    CONSTRAINT preference_requests_preferred_language_check
    CHECK (preferred_language IN ('ar', 'en', 'tr'));

ALTER TABLE public.competition_guest_participants
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar'
    CONSTRAINT competition_guest_participants_preferred_language_check
    CHECK (preferred_language IN ('ar', 'en', 'tr'));

-- ─── 2. handle_new_student_user: persist preferred_language metadata ─────────

CREATE OR REPLACE FUNCTION private.handle_new_student_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  student_phone text;
  student_full_name text;
  student_gender text;
  student_country text;
  student_birth_date date;
  student_preferred_language text;
BEGIN
  IF new.email IS NULL OR new.email !~ '^s[0-9]+@habl-allah\.app$' THEN
    RETURN new;
  END IF;

  student_phone := substring(new.email FROM '^s([0-9]+)@habl-allah\.app$');
  student_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  student_gender := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'gender', '')), '');
  student_country := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'country', '')), '');
  student_preferred_language := lower(btrim(coalesce(new.raw_user_meta_data ->> 'preferred_language', '')));
  IF student_preferred_language NOT IN ('ar', 'en', 'tr') THEN
    student_preferred_language := 'ar';
  END IF;

  BEGIN
    student_birth_date := (new.raw_user_meta_data ->> 'birth_date')::date;
  EXCEPTION WHEN OTHERS THEN
    student_birth_date := NULL;
  END;

  IF student_phone IS NULL OR student_phone !~ '^\d{10,15}$' THEN
    RAISE EXCEPTION 'Student auth email must contain a canonical phone number';
  END IF;

  IF student_full_name IS NULL OR char_length(student_full_name) < 2 THEN
    RAISE EXCEPTION 'Student signups require a full_name in user metadata';
  END IF;

  IF student_gender IS NOT NULL AND student_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'Student signups require gender to be male or female';
  END IF;

  INSERT INTO public.student_profiles (
    id, full_name, phone, teacher_id, gender, country, birth_date, preferred_language
  )
  VALUES (
    new.id, student_full_name, student_phone, NULL, student_gender, student_country, student_birth_date, student_preferred_language
  );

  RETURN new;
END;
$$;

-- ─── 3. prepare_student_request: normalize preferred_language ────────────────

CREATE OR REPLACE FUNCTION private.prepare_student_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_name text;
  v_phone text;
  v_teacher_name text;
  v_preferred_language text;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN new;
  END IF;

  -- Admin-managed fields may only hold their defaults on a public insert.
  IF new.status IS DISTINCT FROM 'new'
     OR new.notes IS DISTINCT FROM ''
     OR new.history IS DISTINCT FROM '[]'::jsonb
     OR new.processed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Student request admin fields cannot be set by clients'
      USING errcode = '42501';
  END IF;

  -- Public callers can never create an administrative link to an account.
  IF new.student_id IS NOT NULL THEN
    RAISE EXCEPTION 'Student request student account cannot be linked by clients'
      USING errcode = '42501';
  END IF;

  -- Never trust client-supplied identifiers or timestamps.
  new.id := gen_random_uuid();
  new.created_at := now();

  v_name := btrim(coalesce(new.student_name, ''));
  IF char_length(v_name) < 1 OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'Student request name must be between 1 and 200 characters'
      USING errcode = '22023';
  END IF;
  new.student_name := v_name;

  -- Shared canonical shape: localized digits are translated, non-digits are
  -- removed, and a local leading zero gains the Egypt country prefix. A leading
  -- '+' keeps the digits as-is.
  v_phone := private.normalize_phone_digits(new.whatsapp);
  new.whatsapp := v_phone;
  IF new.whatsapp !~ '^\d{10,15}$' THEN
    RAISE EXCEPTION 'Student request WhatsApp must contain 10 to 15 digits'
      USING errcode = '22023';
  END IF;

  v_preferred_language := lower(btrim(coalesce(new.preferred_language, '')));
  IF v_preferred_language NOT IN ('ar', 'en', 'tr') THEN
    v_preferred_language := 'ar';
  END IF;
  new.preferred_language := v_preferred_language;

  IF tg_table_name = 'preference_requests' THEN
    IF new.age IS NOT NULL AND (new.age < 5 OR new.age > 99) THEN
      RAISE EXCEPTION 'Student request age must be between 5 and 99'
        USING errcode = '22023';
    END IF;
    new.description := nullif(btrim(coalesce(new.description, '')), '');
    IF char_length(coalesce(new.description, '')) > 4000 THEN
      RAISE EXCEPTION 'Student request description is too long'
        USING errcode = '22023';
    END IF;
  ELSE
    -- A subscription request targets a real teacher. Derive the historical
    -- display name from that teacher instead of trusting client text.
    IF new.teacher_id IS NULL THEN
      RAISE EXCEPTION 'A teacher is required for a subscription request'
        USING errcode = '22023';
    END IF;

    SELECT t.name INTO v_teacher_name
    FROM public.teachers t
    WHERE t.id = new.teacher_id;

    IF v_teacher_name IS NULL THEN
      RAISE EXCEPTION 'Teacher not found' USING errcode = '22023';
    END IF;

    new.teacher_name := btrim(v_teacher_name);
  END IF;

  -- Neutralize values whose defaults are indistinguishable from explicit input.
  new.status := 'new';
  new.notes := '';
  new.history := '[]'::jsonb;
  new.processed_by := NULL;
  new.updated_at := now();

  RETURN new;
END;
$function$;

REVOKE ALL ON FUNCTION private.prepare_student_request() FROM PUBLIC;

-- ─── 4. Competition participant submission RPCs ──────────────────────────────
-- Drop the 4-argument overloads first so PostgREST sees a single 5-argument
-- function with DEFAULT 'ar' (unambiguous for both 4-arg and 5-arg callers).

DROP FUNCTION IF EXISTS public.submit_competition_guest_participant(uuid, text, text, text);
DROP FUNCTION IF EXISTS private.submit_linked_competition_participant(uuid, text, text, text);

CREATE FUNCTION private.submit_linked_competition_participant(
  p_competition_id uuid,
  p_student_name text,
  p_student_phone text,
  p_level text,
  p_preferred_language text DEFAULT 'ar'
)
RETURNS SETOF public.competition_guest_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text;
  v_student uuid;
  v_preferred_language text;
  v_row public.competition_guest_participants;
BEGIN
  SELECT p.id, p.phone INTO v_student, v_phone
  FROM public.student_profiles p
  WHERE p.id = auth.uid();

  v_phone := private.normalize_phone_digits(coalesce(v_phone, p_student_phone));
  IF char_length(btrim(coalesce(p_student_name, ''))) < 2
     OR char_length(btrim(coalesce(p_level, ''))) < 1
     OR v_phone !~ '^\d{10,15}$' THEN
    RAISE EXCEPTION 'يرجى التحقق من الاسم ورقم الهاتف والمستوى.';
  END IF;

  v_preferred_language := lower(btrim(coalesce(p_preferred_language, '')));
  IF v_preferred_language NOT IN ('ar', 'en', 'tr') THEN
    v_preferred_language := 'ar';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_phone, 0));

  SELECT g.* INTO v_row
  FROM public.competition_guest_participants g
  WHERE g.competition_id = p_competition_id AND g.normalized_phone = v_phone;
  IF FOUND THEN
    RETURN NEXT v_row;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.quran_competitions c
    WHERE c.id = p_competition_id AND c.is_published
      AND (c.registration_deadline IS NULL OR c.registration_deadline >= current_date)
  ) THEN
    RAISE EXCEPTION 'المسابقة غير متاحة للتسجيل.';
  END IF;

  INSERT INTO public.competition_guest_participants
    (competition_id, student_id, student_name, student_phone, normalized_phone, level, preferred_language)
  VALUES
    (p_competition_id, v_student, btrim(p_student_name), v_phone, v_phone, btrim(p_level), v_preferred_language)
  ON CONFLICT ON CONSTRAINT cgparticipants_unique_competition_phone DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT g.* INTO v_row
    FROM public.competition_guest_participants g
    WHERE g.competition_id = p_competition_id AND g.normalized_phone = v_phone;
  END IF;

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION private.submit_linked_competition_participant(uuid, text, text, text, text) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.submit_linked_competition_participant(uuid, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_competition_guest_participant(
  p_competition_id uuid,
  p_student_name text,
  p_student_phone text,
  p_level text,
  p_preferred_language text DEFAULT 'ar'
)
RETURNS TABLE (
  id uuid,
  competition_id uuid,
  student_name text,
  student_phone text,
  level text,
  status text,
  current_stage_id uuid,
  final_rank integer,
  public_access_token uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT g.id, g.competition_id, g.student_name, g.student_phone, g.level, g.status,
    g.current_stage_id, g.final_rank, g.public_access_token, g.created_at, g.updated_at
  FROM private.submit_linked_competition_participant(
    p_competition_id, p_student_name, p_student_phone, p_level, p_preferred_language
  ) g;
$$;

REVOKE ALL ON FUNCTION public.submit_competition_guest_participant(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_competition_guest_participant(uuid, text, text, text, text) TO anon, authenticated;

COMMIT;
