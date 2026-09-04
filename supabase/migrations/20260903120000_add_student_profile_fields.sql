-- Student profile enhancement: birth_date, gender, country
--
-- Adds the new profile fields, lets students update their own row (with a
-- trigger protecting columns only admins may change), and migrates
-- competition_registration_requests from `age` to `birth_date` + `gender`.
--
-- Note on `competition_registration_requests.age`:
--   The column is NOT dropped here. It is only made nullable so the new code
--   (which writes `birth_date` instead) can insert rows. Drop it in a
--   follow-up migration once every deployed client sends `birth_date`.

-- ─── 1. student_profiles: new columns ────────────────────────────────────────

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text CONSTRAINT student_profiles_gender_check CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS country text;

-- ─── 2. student_profiles: student self-update RLS ────────────────────────────

CREATE POLICY "student_profiles_self_update" ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Column-restriction trigger: students may only update their own row, but
-- teacher_id / phone / gender stay admin-only. Service-role callers (Edge
-- Functions, no auth.uid()) are exempt so admin tooling keeps working.
CREATE OR REPLACE FUNCTION private.restrict_student_self_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (SELECT private.is_admin()) THEN
    NEW.teacher_id := OLD.teacher_id;
    NEW.phone := OLD.phone;
    NEW.gender := OLD.gender;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_profiles_restrict_self_update
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.restrict_student_self_update();

-- ─── 3. competition_registration_requests: birth_date + gender ──────────────

ALTER TABLE public.competition_registration_requests
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text CONSTRAINT competition_registration_requests_gender_check CHECK (gender IN ('male', 'female'));

-- `age` is replaced by `birth_date`: drop its check + NOT NULL so inserts
-- that no longer send `age` are accepted during the transition.
ALTER TABLE public.competition_registration_requests
  DROP CONSTRAINT IF EXISTS competition_registration_requests_age_check;

ALTER TABLE public.competition_registration_requests
  ALTER COLUMN age DROP NOT NULL;

-- Public insert policy: validate birth_date (age 3–120) and gender instead of age.
DROP POLICY IF EXISTS "competition_registration_requests_public_insert" ON public.competition_registration_requests;

CREATE POLICY "competition_registration_requests_public_insert" ON public.competition_registration_requests
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    competition_id IS NOT NULL
    AND char_length(btrim(student_name)) >= 2
    AND student_phone ~ '^\d{10,15}$'
    AND char_length(btrim(country)) >= 2
    AND birth_date IS NOT NULL
    AND birth_date >= (current_date - interval '120 years')
    AND birth_date <= (current_date - interval '3 years')
    AND gender IN ('male', 'female')
    AND char_length(btrim(level)) >= 1
    AND (student_id IS NULL OR ((auth.uid() IS NOT NULL) AND (student_id = auth.uid())))
  );

-- ─── 4. handle_new_student_user: persist new metadata fields ─────────────────

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
BEGIN
  IF new.email IS NULL OR new.email !~ '^s[0-9]+@habl-allah\.app$' THEN
    RETURN new;
  END IF;

  student_phone := substring(new.email FROM '^s([0-9]+)@habl-allah\.app$');
  student_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  student_gender := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'gender', '')), '');
  student_country := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'country', '')), '');

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

  INSERT INTO public.student_profiles (id, full_name, phone, teacher_id, gender, country, birth_date)
  VALUES (new.id, student_full_name, student_phone, NULL, student_gender, student_country, student_birth_date);

  RETURN new;
END;
$$;
