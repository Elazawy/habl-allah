-- Migration: Mix lecture media types (YouTube / R2 video / R2 audio), add test_url,
-- unlock course is_free switching, and enforce paid lecture access gating.

BEGIN;

-- ─── 1. Schema additions on public.quran_course_lectures ──────────────────────

ALTER TABLE public.quran_course_lectures
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS r2_content_type text,
  ADD COLUMN IF NOT EXISTS test_url text;

ALTER TABLE public.quran_course_lectures
  DROP CONSTRAINT IF EXISTS quran_course_lectures_media_type_check,
  ADD CONSTRAINT quran_course_lectures_media_type_check
    CHECK (media_type IN ('youtube', 'r2_video', 'r2_audio'));

ALTER TABLE public.quran_course_lectures
  DROP CONSTRAINT IF EXISTS quran_course_lectures_test_url_check,
  ADD CONSTRAINT quran_course_lectures_test_url_check
    CHECK (test_url IS NULL OR test_url ~* '^https?://[^\s]+$');

-- ─── 2. Remove Free <-> Paid lock after lectures exist ────────────────────────

DROP TRIGGER IF EXISTS quran_courses_prevent_mode_change ON public.quran_courses;
DROP FUNCTION IF EXISTS public.prevent_quran_course_mode_change_after_lectures();

-- ─── 3. Replace lecture validation trigger (decoupled from course.is_free) ───

CREATE OR REPLACE FUNCTION public.validate_quran_course_lecture()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public', 'private'
  AS $function$
declare
  v_course_exists boolean;
begin
  new.slug := lower(btrim(new.slug));
  new.title := btrim(new.title);
  new.description := nullif(btrim(coalesce(new.description, '')), '');
  new.youtube_url := nullif(btrim(coalesce(new.youtube_url, '')), '');
  new.r2_object_key := nullif(btrim(coalesce(new.r2_object_key, '')), '');
  new.original_file_name := nullif(btrim(coalesce(new.original_file_name, '')), '');
  new.r2_content_type := nullif(lower(btrim(coalesce(new.r2_content_type, ''))), '');
  new.test_url := nullif(btrim(coalesce(new.test_url, '')), '');
  new.media_type := lower(btrim(coalesce(new.media_type, 'youtube')));

  if new.slug is null or new.slug = '' then
    raise exception 'Lecture slug is required';
  end if;

  if new.title is null or new.title = '' then
    raise exception 'Lecture title is required';
  end if;

  if new.media_type not in ('youtube', 'r2_video', 'r2_audio') then
    raise exception 'Unsupported media_type: %', new.media_type;
  end if;

  if new.test_url is not null and new.test_url !~* '^https?://[^\s]+$' then
    raise exception 'test_url must be a valid http(s) URL';
  end if;

  if new.original_file_name is not null and new.r2_object_key is null then
    raise exception 'original_file_name requires r2_object_key';
  end if;

  if new.youtube_url is not null and new.r2_object_key is not null then
    raise exception 'Lecture rows can only reference one media source';
  end if;

  select exists (
    select 1
    from public.quran_courses c
    where c.id = new.course_id
  ) into v_course_exists;

  if not v_course_exists then
    raise exception 'Course % does not exist', new.course_id using errcode = '23503';
  end if;

  if new.media_type = 'youtube' then
    if new.r2_object_key is not null then
      raise exception 'YouTube lectures cannot set r2_object_key';
    end if;

    new.original_file_name := null;
    new.r2_content_type := null;

    if new.is_published and new.youtube_url is null then
      raise exception 'Published YouTube lectures require youtube_url';
    end if;
  else
    if new.youtube_url is not null then
      raise exception 'R2 lectures cannot set youtube_url';
    end if;

    if new.is_published and new.r2_object_key is null then
      raise exception 'Published R2 lectures require an uploaded file';
    end if;

    if new.r2_object_key is null then
      new.original_file_name := null;
      new.r2_content_type := null;
    elsif new.r2_content_type is null then
      new.r2_content_type := case
        when new.media_type = 'r2_audio' then 'audio/mpeg'
        else 'video/mp4'
      end;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

-- ─── 4. Backfill existing lectures ────────────────────────────────────────────

UPDATE public.quran_course_lectures l
SET
  media_type = CASE
    WHEN l.r2_object_key IS NOT NULL THEN 'r2_video'
    WHEN l.youtube_url IS NOT NULL THEN 'youtube'
    WHEN c.is_free THEN 'youtube'
    ELSE 'r2_video'
  END,
  r2_content_type = CASE
    WHEN l.r2_object_key IS NOT NULL THEN coalesce(nullif(btrim(l.r2_content_type), ''), 'video/mp4')
    ELSE NULL
  END
FROM public.quran_courses c
WHERE c.id = l.course_id
  AND (
    l.r2_object_key IS NOT NULL
    OR l.youtube_url IS NOT NULL
    OR c.is_free = false
  );

-- ─── 5. Access control helper, RLS hardening, view & safe RPC ─────────────────

CREATE OR REPLACE FUNCTION public.can_access_course_content(p_course_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.quran_courses c
    WHERE c.id = p_course_id
      AND (
        (c.is_published = true AND c.is_free = true)
        OR (
          auth.uid() IS NOT NULL
          AND (
            private.is_admin()
            OR (
              c.is_published = true
              AND EXISTS (
                SELECT 1
                FROM public.student_course_subscriptions scs
                WHERE scs.course_id = c.id
                  AND scs.student_id = auth.uid()
                  AND scs.is_active = true
              )
            )
          )
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_access_course_content(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course_content(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can read published lectures" ON public.quran_course_lectures;
DROP POLICY IF EXISTS "quran_course_lectures_student_or_admin_select" ON public.quran_course_lectures;

CREATE POLICY "quran_course_lectures_student_or_admin_select"
  ON public.quran_course_lectures
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin() AS is_admin)
    OR (
      is_published = true
      AND EXISTS (
        SELECT 1
        FROM public.quran_courses c
        WHERE c.id = quran_course_lectures.course_id
          AND c.is_published = true
          AND (
            c.is_free = true
            OR EXISTS (
              SELECT 1
              FROM public.student_course_subscriptions scs
              WHERE scs.course_id = c.id
                AND scs.student_id = (SELECT auth.uid() AS uid)
                AND scs.is_active = true
            )
          )
      )
    )
  );

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
    WHEN public.can_access_course_content(c.id) AND l.media_type = 'youtube' THEN l.youtube_url
    ELSE NULL::text
  END AS youtube_url,
  l.created_at,
  l.updated_at,
  c.name_en AS course_name_en,
  c.name_tr AS course_name_tr,
  l.title_en,
  l.title_tr,
  l.description_en,
  l.description_tr,
  l.media_type,
  CASE
    WHEN public.can_access_course_content(c.id) THEN l.test_url
    ELSE NULL::text
  END AS test_url,
  (l.r2_object_key IS NOT NULL) AS has_r2_asset
FROM public.quran_course_lectures l
JOIN public.quran_courses c ON c.id = l.course_id
WHERE c.is_published = true AND l.is_published = true;

CREATE OR REPLACE FUNCTION public.get_published_course_lectures(p_course_id uuid)
  RETURNS TABLE (
    id uuid,
    course_id uuid,
    course_slug text,
    course_name text,
    course_name_en text,
    course_name_tr text,
    course_is_free boolean,
    slug text,
    title text,
    title_en text,
    title_tr text,
    description text,
    description_en text,
    description_tr text,
    sort_order integer,
    is_published boolean,
    media_type text,
    has_r2_asset boolean,
    youtube_url text,
    test_url text,
    created_at timestamptz,
    updated_at timestamptz
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
declare
  v_can_access boolean := false;
begin
  if p_course_id is null then
    return;
  end if;

  v_can_access := public.can_access_course_content(p_course_id);

  return query
  select
    l.id,
    l.course_id,
    c.slug as course_slug,
    c.name as course_name,
    c.name_en as course_name_en,
    c.name_tr as course_name_tr,
    c.is_free as course_is_free,
    l.slug,
    l.title,
    l.title_en,
    l.title_tr,
    l.description,
    l.description_en,
    l.description_tr,
    l.sort_order,
    l.is_published,
    l.media_type,
    (l.r2_object_key is not null) as has_r2_asset,
    case
      when v_can_access and l.media_type = 'youtube' then l.youtube_url
      else null::text
    end as youtube_url,
    case
      when v_can_access then l.test_url
      else null::text
    end as test_url,
    l.created_at,
    l.updated_at
  from public.quran_course_lectures l
  join public.quran_courses c on c.id = l.course_id
  where l.course_id = p_course_id
    and c.is_published = true
    and l.is_published = true
  order by l.sort_order asc, l.created_at asc;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_published_course_lectures(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_course_lectures(uuid) TO anon, authenticated, service_role;

COMMIT;
