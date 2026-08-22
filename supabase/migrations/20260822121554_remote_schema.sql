set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create schema "private";

create extension "pg_net" schema "extensions";

create table "public"."admin_users" (
  "id"         uuid                     not null,
  "created_at" timestamp with time zone default now(),
  "email"      text,
  "is_active"  boolean                  not null default true,
  "updated_at" timestamp with time zone not null default now(),
  constraint "admin_users_pkey" primary key (id)
);

alter table "public"."admin_users"
  enable row level security;

create table "public"."competition_registration_requests" (
  "id"             uuid                     not null default gen_random_uuid(),
  "competition_id" uuid                     not null,
  "student_id"     uuid,
  "student_name"   text                     not null,
  "student_phone"  text                     not null,
  "country"        text                     not null,
  "age"            integer                  not null,
  "level"          text                     not null,
  "created_at"     timestamp with time zone not null default now(),
  constraint "competition_registration_requests_age_check" check (((age >= 3) AND (age <= 120))),
  constraint "competition_registration_requests_country_check" check ((char_length(btrim(country)) >= 2)),
  constraint "competition_registration_requests_level_check" check ((char_length(btrim(level)) >= 1)),
  constraint "competition_registration_requests_pkey" primary key (id),
  constraint "competition_registration_requests_student_name_check" check ((char_length(btrim(student_name)) >= 2)),
  constraint "competition_registration_requests_student_phone_check" check ((student_phone ~ '^\d{10,15}$'::text))
);

alter table "public"."competition_registration_requests"
  enable row level security;

create table "public"."course_lecture_questions" (
  "id"             uuid                     not null default gen_random_uuid(),
  "lecture_id"     uuid                     not null,
  "student_id"     uuid                     not null,
  "question_title" text                     not null,
  "admin_reply"    text,
  "replied_at"     timestamp with time zone,
  "is_answered"    boolean                  not null default false,
  "created_at"     timestamp with time zone not null default now(),
  "updated_at"     timestamp with time zone not null default now(),
  constraint "course_lecture_questions_pkey" primary key (id),
  constraint "course_lecture_questions_question_title_check" check ((char_length(btrim(question_title)) >= 3))
);

alter table "public"."course_lecture_questions"
  enable row level security;

create table "public"."faqs" (
  "id"           uuid                     not null default gen_random_uuid(),
  "platform"     text                     not null default 'general'::text,
  "question"     text                     not null,
  "answer"       text                     not null,
  "sort_order"   integer                  default 0,
  "is_published" boolean                  default true,
  "created_at"   timestamp with time zone default now(),
  "updated_at"   timestamp with time zone default now(),
  constraint "faqs_pkey" primary key (id),
  constraint "faqs_platform_check" check ((platform = ANY (ARRAY['general'::text, 'quran'::text, 'islamic_studies'::text])))
);

alter table "public"."faqs"
  enable row level security;

create table "public"."newsletter_subscribers" (
  "id"         uuid                     not null default gen_random_uuid(),
  "full_name"  text                     not null,
  "phone"      text                     not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "newsletter_subscribers_pkey" primary key (id)
);

alter table "public"."newsletter_subscribers"
  enable row level security;

create table "public"."pages" (
  "id"           uuid                     not null default gen_random_uuid(),
  "slug"         text                     not null,
  "title"        text                     not null,
  "content"      text                     not null,
  "updated_at"   timestamp with time zone default now(),
  "updated_by"   uuid,
  "created_at"   timestamp with time zone default now(),
  "is_published" boolean                  default true,
  constraint "pages_pkey" primary key (id),
  constraint "pages_slug_key" unique (slug)
);

alter table "public"."pages"
  enable row level security;

create table "public"."preference_requests" (
  "id"                uuid                     not null default gen_random_uuid(),
  "student_name"      text,
  "age"               integer,
  "whatsapp"          text,
  "description"       text,
  "gender_preference" text,
  "created_at"        timestamp with time zone default now(),
  constraint "preference_requests_gender_preference_check" check ((gender_preference = ANY (ARRAY['male'::text, 'female'::text, 'any'::text]))),
  constraint "preference_requests_pkey" primary key (id)
);

alter table "public"."preference_requests"
  enable row level security;

create table "public"."quran_competitions" (
  "id"                          uuid                     not null default gen_random_uuid(),
  "slug"                        text                     not null,
  "name"                        text                     not null,
  "short_description"           text                     not null,
  "complete_description"        text                     not null,
  "start_date"                  date                     not null,
  "registration_deadline"       date                     not null,
  "awards_short_description"    text,
  "awards_complete_description" text,
  "participation_terms"         text                     not null,
  "sort_order"                  integer                  not null default 0,
  "is_published"                boolean                  not null default true,
  "created_at"                  timestamp with time zone not null default now(),
  "updated_at"                  timestamp with time zone not null default now(),
  "available_levels"            jsonb                    not null default '[]'::jsonb,
  constraint "quran_competitions_check" check ((registration_deadline <= start_date)),
  constraint "quran_competitions_pkey" primary key (id),
  constraint "quran_competitions_slug_check" check ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  constraint "quran_competitions_slug_key" unique (slug)
);

alter table "public"."quran_competitions"
  enable row level security;

create table "public"."quran_course_lectures" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "course_id"          uuid                     not null,
  "slug"               text                     not null,
  "title"              text                     not null,
  "description"        text,
  "sort_order"         integer                  not null default 0,
  "is_published"       boolean                  not null default false,
  "youtube_url"        text,
  "r2_object_key"      text,
  "original_file_name" text,
  "created_at"         timestamp with time zone not null default now(),
  "updated_at"         timestamp with time zone not null default now(),
  constraint "quran_course_lectures_course_slug_key" unique (course_id, slug),
  constraint "quran_course_lectures_pkey" primary key (id),
  constraint "quran_course_lectures_single_media_check" check ((num_nonnulls(youtube_url, r2_object_key) <= 1)),
  constraint "quran_course_lectures_slug_format" check ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  constraint "quran_course_lectures_sort_order_check" check ((sort_order >= 0))
);

alter table "public"."quran_course_lectures"
  enable row level security;

create table "public"."quran_courses" (
  "id"                    uuid                     not null default gen_random_uuid(),
  "slug"                  text                     not null,
  "name"                  text                     not null,
  "short_description"     text                     not null,
  "long_description"      text,
  "price"                 text,
  "is_free"               boolean                  not null default false,
  "image_url"             text,
  "image_path"            text,
  "learning_outcomes"     jsonb                    not null default '[]'::jsonb,
  "number_of_subscribers" integer                  not null default 0,
  "is_published"          boolean                  not null default true,
  "sort_order"            integer                  not null default 0,
  "created_at"            timestamp with time zone not null default now(),
  "updated_at"            timestamp with time zone not null default now(),
  "teacher_name"          text,
  constraint "quran_courses_pkey" primary key (id),
  constraint "quran_courses_slug_key" unique (slug)
);

alter table "public"."quran_courses"
  enable row level security;

create table "public"."quran_reviews" (
  "id"           uuid                     not null default gen_random_uuid(),
  "image_url"    text,
  "image_path"   text,
  "alt_text"     text,
  "sort_order"   integer                  not null default 0,
  "is_published" boolean                  not null default true,
  "created_at"   timestamp with time zone not null default now(),
  "updated_at"   timestamp with time zone not null default now(),
  constraint "quran_reviews_pkey" primary key (id)
);

alter table "public"."quran_reviews"
  enable row level security;

create table "public"."student_competition_subscriptions" (
  "id"             uuid                     not null default gen_random_uuid(),
  "student_id"     uuid                     not null,
  "competition_id" uuid                     not null,
  "is_active"      boolean                  not null default true,
  "subscribed_at"  timestamp with time zone not null default now(),
  constraint "student_competition_subscriptions_pkey" primary key (id),
  constraint "student_competition_subscriptions_student_id_competition_id_key" unique (student_id, competition_id)
);

alter table "public"."student_competition_subscriptions"
  enable row level security;

create table "public"."student_course_lecture_completions" (
  "id"           uuid                     not null default gen_random_uuid(),
  "student_id"   uuid                     not null,
  "lecture_id"   uuid                     not null,
  "completed_at" timestamp with time zone not null default now(),
  "created_at"   timestamp with time zone not null default now(),
  "updated_at"   timestamp with time zone not null default now(),
  constraint "student_course_lecture_completions_pkey" primary key (id),
  constraint "student_course_lecture_completions_student_lecture_key" unique (student_id, lecture_id)
);

alter table "public"."student_course_lecture_completions"
  enable row level security;

create table "public"."student_course_subscriptions" (
  "id"            uuid                     not null default gen_random_uuid(),
  "student_id"    uuid                     not null,
  "course_id"     uuid                     not null,
  "is_active"     boolean                  not null default true,
  "subscribed_at" timestamp with time zone not null default now(),
  "expires_at"    timestamp with time zone,
  constraint "student_course_subscriptions_pkey" primary key (id),
  constraint "student_course_subscriptions_student_id_course_id_key" unique (student_id, course_id)
);

alter table "public"."student_course_subscriptions"
  enable row level security;

create table "public"."student_profiles" (
  "id"         uuid                     not null,
  "full_name"  text                     not null,
  "phone"      text                     not null,
  "teacher_id" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "student_profiles_full_name_check" check ((char_length(btrim(full_name)) >= 2)),
  constraint "student_profiles_phone_check" check ((phone ~ '^\d{10,15}$'::text)),
  constraint "student_profiles_phone_key" unique (phone),
  constraint "student_profiles_pkey" primary key (id)
);

alter table "public"."student_profiles"
  enable row level security;

create table "public"."student_quran_lessons" (
  "id"                     uuid                     not null default gen_random_uuid(),
  "student_id"             uuid                     not null,
  "lesson_date"            date                     not null,
  "hijri_date"             text,
  "recitation_today_surah" text,
  "recitation_today_from"  text,
  "recitation_today_to"    text,
  "recitation_today_level" text,
  "recitation_past_surah"  text,
  "recitation_past_level"  text,
  "reading_surah"          text,
  "reading_from"           text,
  "reading_to"             text,
  "reading_level"          text,
  "tajweed_lesson"         text,
  "general_notes"          text,
  "interaction_level"      text,
  "homework_today_surah"   text,
  "homework_today_from"    text,
  "homework_today_to"      text,
  "homework_past_surah"    text,
  "created_by"             uuid,
  "created_at"             timestamp with time zone not null default now(),
  "updated_at"             timestamp with time zone not null default now(),
  constraint "student_quran_lessons_pkey" primary key (id)
);

alter table "public"."student_quran_lessons"
  enable row level security;

create table "public"."subscription_requests" (
  "id"           uuid                     not null default gen_random_uuid(),
  "teacher_id"   uuid,
  "teacher_name" text,
  "student_name" text,
  "whatsapp"     text,
  "created_at"   timestamp with time zone default now(),
  constraint "subscription_requests_pkey" primary key (id)
);

alter table "public"."subscription_requests"
  enable row level security;

create table "public"."teacher_reviews" (
  "id"           uuid                     not null default gen_random_uuid(),
  "teacher_id"   uuid,
  "student_name" text                     not null,
  "rating"       integer,
  "text"         text,
  "created_at"   timestamp with time zone default now(),
  "image_url"    text,
  "image_path"   text,
  "alt_text"     text,
  "sort_order"   integer                  not null default 0,
  "is_published" boolean                  not null default true,
  "updated_at"   timestamp with time zone not null default now(),
  constraint "teacher_reviews_pkey" primary key (id),
  constraint "teacher_reviews_rating_check" check (((rating >= 1) AND (rating <= 5)))
);

alter table "public"."teacher_reviews"
  enable row level security;

create table "public"."teachers" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "name"               text                     not null,
  "gender"             text                     not null,
  "bio"                text,
  "photo_url"          text,
  "recitation_url"     text,
  "recitation_type"    text,
  "created_at"         timestamp with time zone default now(),
  "free_trial_enabled" boolean                  not null default false,
  constraint "teachers_gender_check" check ((gender = ANY (ARRAY['male'::text, 'female'::text]))),
  constraint "teachers_pkey" primary key (id),
  constraint "teachers_recitation_type_check" check (((recitation_type = ANY (ARRAY['audio'::text, 'video'::text])) OR (recitation_type IS NULL)))
);

alter table "public"."teachers"
  enable row level security;

create or replace function private.handle_new_student_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
  student_phone text;
  student_full_name text;
begin
  if new.email is null or new.email !~ '^s[0-9]+@habl-allah\.app$' then
    return new;
  end if;

  student_phone := substring(new.email from '^s([0-9]+)@habl-allah\.app$');
  student_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  if student_phone is null or student_phone !~ '^\d{10,15}$' then
    raise exception 'Student auth email must contain a canonical phone number';
  end if;

  if student_full_name is null or char_length(student_full_name) < 2 then
    raise exception 'Student signups require a full_name in user metadata';
  end if;

  insert into public.student_profiles (id, full_name, phone, teacher_id)
  values (new.id, student_full_name, student_phone, null);

  return new;
end;
$function$;

create or replace function private.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public', 'private'
  AS $function$
  select exists (
    select 1
    from public.admin_users a
    where a.id = (select auth.uid())
      and coalesce(a.is_active, true) = true
  );
$function$;

create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
  AS $function$
  select exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and coalesce(a.is_active, true) = true
  );
$function$;

create or replace function public.notify_preference_telegram()
  returns trigger
  language plpgsql
  security definer
  AS $function$
DECLARE
  payload jsonb;
  edge_function_url text;
BEGIN
  -- Build the webhook payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW)::jsonb,
    'old_record', NULL
  );

  edge_function_url := 'https://hzealjrdtlfhkqhszkta.supabase.co/functions/v1/notify-preference-telegram';

  -- Use net.http_post (from pg_net) to make an async HTTP POST
  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$function$;

create or replace function public.prevent_quran_course_mode_change_after_lectures()
  returns trigger
  language plpgsql
  set search_path to 'public'
  AS $function$
begin
  if new.is_free is distinct from old.is_free then
    if exists (
      select 1
      from public.quran_course_lectures l
      where l.course_id = old.id
      limit 1
    ) then
      raise exception 'Course type cannot be changed after the first lecture exists';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path to 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  set search_path to 'public'
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.update_updated_at_column()
  returns trigger
  language plpgsql
  set search_path to 'public'
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.validate_quran_course_lecture()
  returns trigger
  language plpgsql
  set search_path to 'public', 'private'
  AS $function$
declare
  course_is_free boolean;
begin
  new.slug := lower(btrim(new.slug));
  new.title := btrim(new.title);
  new.description := nullif(btrim(coalesce(new.description, '')), '');
  new.youtube_url := nullif(btrim(coalesce(new.youtube_url, '')), '');
  new.r2_object_key := nullif(btrim(coalesce(new.r2_object_key, '')), '');
  new.original_file_name := nullif(btrim(coalesce(new.original_file_name, '')), '');

  if new.slug is null or new.slug = '' then
    raise exception 'Lecture slug is required';
  end if;

  if new.title is null or new.title = '' then
    raise exception 'Lecture title is required';
  end if;

  if new.original_file_name is not null and new.r2_object_key is null then
    raise exception 'original_file_name requires r2_object_key';
  end if;

  if new.youtube_url is not null and new.r2_object_key is not null then
    raise exception 'Lecture rows can only reference one media source';
  end if;

  select c.is_free
    into course_is_free
  from public.quran_courses c
  where c.id = new.course_id
  for key share;

  if not found then
    raise exception 'Course % does not exist', new.course_id using errcode = '23503';
  end if;

  if course_is_free then
    if new.r2_object_key is not null then
      raise exception 'Free-course lectures must use youtube_url';
    end if;

    new.original_file_name := null;

    if new.is_published and new.youtube_url is null then
      raise exception 'Published free-course lectures require youtube_url';
    end if;
  else
    if new.youtube_url is not null then
      raise exception 'Paid-course lectures must use r2_object_key';
    end if;

    if new.is_published and new.r2_object_key is null then
      raise exception 'Published paid-course lectures require r2_object_key';
    end if;
  end if;

  if new.r2_object_key is null then
    new.original_file_name := null;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

alter table "public"."admin_users"
  add constraint "admin_users_id_fkey" foreign key (id) references auth.users(id) on delete cascade;

alter table "public"."pages"
  add constraint "pages_updated_by_fkey" foreign key (updated_by) references auth.users(id);

alter table "public"."competition_registration_requests"
  add constraint "competition_registration_requests_competition_id_fkey" foreign key (competition_id) references public.quran_competitions(id) on delete cascade;

alter table "public"."course_lecture_questions"
  add constraint "course_lecture_questions_lecture_id_fkey" foreign key (lecture_id) references public.quran_course_lectures(id) on delete cascade;

alter table "public"."quran_course_lectures"
  add constraint "quran_course_lectures_course_id_fkey" foreign key (course_id) references public.quran_courses(id) on delete cascade;

alter table "public"."student_competition_subscriptions"
  add constraint "student_competition_subscriptions_competition_id_fkey" foreign key (competition_id) references public.quran_competitions(id) on delete cascade;

alter table "public"."student_course_lecture_completions"
  add constraint "student_course_lecture_completions_lecture_id_fkey" foreign key (lecture_id) references public.quran_course_lectures(id) on delete cascade;

alter table "public"."student_course_subscriptions"
  add constraint "student_course_subscriptions_course_id_fkey" foreign key (course_id) references public.quran_courses(id) on delete cascade;

alter table "public"."student_profiles"
  add constraint "student_profiles_id_fkey" foreign key (id) references auth.users(id) on delete cascade;

alter table "public"."competition_registration_requests"
  add constraint "competition_registration_requests_student_id_fkey" foreign key (student_id) references public.student_profiles(id) on delete set null;

alter table "public"."course_lecture_questions"
  add constraint "course_lecture_questions_student_id_fkey" foreign key (student_id) references public.student_profiles(id) on delete cascade;

alter table "public"."student_competition_subscriptions"
  add constraint "student_competition_subscriptions_student_id_fkey" foreign key (student_id) references public.student_profiles(id) on delete cascade;

alter table "public"."student_course_lecture_completions"
  add constraint "student_course_lecture_completions_student_id_fkey" foreign key (student_id) references public.student_profiles(id) on delete cascade;

alter table "public"."student_course_subscriptions"
  add constraint "student_course_subscriptions_student_id_fkey" foreign key (student_id) references public.student_profiles(id) on delete cascade;

alter table "public"."student_quran_lessons"
  add constraint "student_quran_lessons_created_by_fkey" foreign key (created_by) references auth.users(id) on delete set null;

alter table "public"."student_quran_lessons"
  add constraint "student_quran_lessons_student_id_fkey" foreign key (student_id) references public.student_profiles(id) on delete cascade;

alter table "public"."student_profiles"
  add constraint "student_profiles_teacher_id_fkey" foreign key (teacher_id) references public.teachers(id) on delete set null;

alter table "public"."teacher_reviews"
  add constraint "teacher_reviews_teacher_id_fkey" foreign key (teacher_id) references public.teachers(id) on delete cascade;

create view "public"."published_quran_course_lectures" with (security_invoker=true) AS  SELECT l.id,
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
    l.updated_at
   FROM (public.quran_course_lectures l
     JOIN public.quran_courses c ON ((c.id = l.course_id)))
  WHERE ((c.is_published = true) AND (l.is_published = true));

create index clq_answered_idx on public.course_lecture_questions using btree (is_answered, created_at);

create index clq_lecture_idx on public.course_lecture_questions using btree (lecture_id);

create index clq_student_idx on public.course_lecture_questions using btree (student_id);

create index crr_competition_idx on public.competition_registration_requests using btree (competition_id);

create index crr_created_at_idx on public.competition_registration_requests using btree (created_at desc);

create index crr_student_idx on public.competition_registration_requests using btree (student_id);

create index idx_faqs_platform_published_sort on public.faqs using btree (platform, is_published, sort_order);

create index idx_pages_slug on public.pages using btree (slug);

create index pages_updated_by_idx on public.pages using btree (updated_by);

create index quran_course_lectures_course_published_sort_idx on public.quran_course_lectures using btree (course_id, is_published, sort_order, created_at, id);

create index quran_course_lectures_course_sort_idx on public.quran_course_lectures using btree (course_id, sort_order, created_at, id);

create index quran_course_lectures_pub_view_idx on public.quran_course_lectures using btree (course_id, is_published, sort_order);

create index quran_course_lectures_updated_at_idx on public.quran_course_lectures using btree (updated_at);

create index quran_courses_published_idx on public.quran_courses using btree (is_published);

create index quran_courses_slug_idx on public.quran_courses using btree (slug);

create index quran_courses_sort_order_idx on public.quran_courses using btree (sort_order, created_at);

create index sclc_lecture_idx on public.student_course_lecture_completions using btree (lecture_id);

create index scmp_student_idx on public.student_competition_subscriptions using btree (student_id);

create index scs_course_idx on public.student_course_subscriptions using btree (course_id);

create index scs_student_idx on public.student_course_subscriptions using btree (student_id);

create index sql_student_date_idx on public.student_quran_lessons using btree (student_id, lesson_date desc);

create index student_profiles_phone_idx on public.student_profiles using btree (phone);

create index student_profiles_teacher_idx on public.student_profiles using btree (teacher_id);

create index teacher_reviews_teacher_id_idx on public.teacher_reviews using btree (teacher_id);

create trigger on_auth_student_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_student_user();

create trigger clq_set_updated_at
  before update on public.course_lecture_questions
  for each row
  execute function public.set_updated_at();

create trigger faqs_updated_at
  before update on public.faqs
  for each row
  execute function public.update_updated_at_column();

create trigger pages_updated_at
  before update on public.pages
  for each row
  execute function public.update_updated_at_column();

create trigger on_preference_request_insert
  after insert on public.preference_requests
  for each row
  execute function public.notify_preference_telegram();

create trigger quran_course_lectures_set_updated_at
  before update on public.quran_course_lectures
  for each row
  execute function public.set_updated_at();

create trigger quran_course_lectures_validate_before_write
  before insert or update on public.quran_course_lectures
  for each row
  execute function public.validate_quran_course_lecture();

create trigger quran_courses_prevent_mode_change
  before update of is_free on public.quran_courses
  for each row
  execute function public.prevent_quran_course_mode_change_after_lectures();

create trigger quran_courses_set_updated_at
  before update on public.quran_courses
  for each row
  execute function public.set_updated_at();

create trigger student_course_lecture_completions_set_updated_at
  before update on public.student_course_lecture_completions
  for each row
  execute function public.set_updated_at();

create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row
  execute function public.set_updated_at();

create trigger student_quran_lessons_set_updated_at
  before update on public.student_quran_lessons
  for each row
  execute function public.set_updated_at();

create policy "admin_users_self_read" on "public"."admin_users"
  for select
  to "authenticated"
  using ((( select auth.uid() as uid) = id));

create policy "competition_registration_requests_admin_delete" on "public"."competition_registration_requests"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "competition_registration_requests_admin_select" on "public"."competition_registration_requests"
  for select
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "competition_registration_requests_public_insert" on "public"."competition_registration_requests"
  for insert
  to PUBLIC
  with check (((competition_id IS
    NOT NULL) AND (char_length(btrim(student_name)) >= 2) AND (student_phone ~ '^\d{10,15}$'::text) AND (char_length(btrim(country)) >= 2) AND ((age >= 3) AND (age <= 120)) AND
    (char_length(btrim(level)) >= 1) AND ((student_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (student_id = auth.uid())))));

create policy "clq_admin_delete" on "public"."course_lecture_questions"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "clq_admin_update" on "public"."course_lecture_questions"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "clq_student_delete" on "public"."course_lecture_questions"
  for delete
  to "authenticated"
  using ((student_id = auth.uid()));

create policy "clq_student_insert" on "public"."course_lecture_questions"
  for insert
  to "authenticated"
  with check ((student_id = auth.uid()));

create policy "clq_student_select" on "public"."course_lecture_questions"
  for select
  to "authenticated"
  using (true);

create policy "clq_student_update" on "public"."course_lecture_questions"
  for update
  to "authenticated"
  using (((student_id = auth.uid()) AND (is_answered = false)))
  with check (((student_id = auth.uid()) AND (is_answered = false)));

create policy "faqs_admin_delete" on "public"."faqs"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "faqs_admin_insert" on "public"."faqs"
  for insert
  to "authenticated"
  with check (private.is_admin());

create policy "faqs_admin_select" on "public"."faqs"
  for select
  to "authenticated"
  using (private.is_admin());

create policy "faqs_admin_update" on "public"."faqs"
  for update
  to "authenticated"
  using (private.is_admin())
  with check (private.is_admin());

create policy "faqs_public_read" on "public"."faqs"
  for select
  to PUBLIC
  using ((is_published = true));

create policy "newsletter_subscribers_admin_delete" on "public"."newsletter_subscribers"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "newsletter_subscribers_admin_select" on "public"."newsletter_subscribers"
  for select
  to "authenticated"
  using (private.is_admin());

create policy "newsletter_subscribers_public_insert" on "public"."newsletter_subscribers"
  for insert
  to PUBLIC
  with check (true);

create policy "pages_admin_delete" on "public"."pages"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "pages_admin_insert" on "public"."pages"
  for insert
  to "authenticated"
  with check (private.is_admin());

create policy "pages_admin_update" on "public"."pages"
  for update
  to "authenticated"
  using (private.is_admin())
  with check (private.is_admin());

create policy "pages_public_read" on "public"."pages"
  for select
  to PUBLIC
  using (true);

create policy "authenticated can submit preference" on "public"."preference_requests"
  for insert
  to "authenticated"
  with check (true);

create policy "public can submit preference" on "public"."preference_requests"
  for insert
  to "anon"
  with check (true);

create policy "quran_competitions_admin_delete" on "public"."quran_competitions"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "quran_competitions_admin_insert" on "public"."quran_competitions"
  for insert
  to "authenticated"
  with check (private.is_admin());

create policy "quran_competitions_admin_select" on "public"."quran_competitions"
  for select
  to "authenticated"
  using (((is_published = true) or private.is_admin()));

create policy "quran_competitions_admin_update" on "public"."quran_competitions"
  for update
  to "authenticated"
  using (private.is_admin())
  with check (private.is_admin());

create policy "quran_competitions_public_read_published" on "public"."quran_competitions"
  for select
  to "anon"
  using ((is_published = true));

create policy "Public can read published lectures" on "public"."quran_course_lectures"
  for select
  to "anon", "authenticated"
  using (((is_published = true) AND (exists ( select 1
   from public.quran_courses
  where ((quran_courses.id = quran_course_lectures.course_id) AND (quran_courses.is_published = true))))));

create policy "quran_course_lectures_admin_delete" on "public"."quran_course_lectures"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "quran_course_lectures_admin_insert" on "public"."quran_course_lectures"
  for insert
  to "authenticated"
  with check (( SELECT private.is_admin() AS is_admin));

create policy "quran_course_lectures_admin_update" on "public"."quran_course_lectures"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "quran_course_lectures_student_or_admin_select" on "public"."quran_course_lectures"
  for select
  to "authenticated"
  using ((( select private.is_admin() as is_admin) or (exists ( select 1
   from public.quran_courses c
  where ((c.id = quran_course_lectures.course_id) AND (c.is_published = true) AND ((c.is_free = true) or (exists ( select 1
           from public.student_course_subscriptions scs
          where ((scs.course_id = c.id) AND (scs.student_id = auth.uid()) AND (scs.is_active = true))))))))));

create policy "quran_courses_admin_delete" on "public"."quran_courses"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "quran_courses_admin_insert" on "public"."quran_courses"
  for insert
  to "authenticated"
  with check (( SELECT private.is_admin() AS is_admin));

create policy "quran_courses_admin_update" on "public"."quran_courses"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "quran_courses_authenticated_read_published_or_admin" on "public"."quran_courses"
  for select
  to "authenticated"
  using (((is_published = true) or ( select private.is_admin() as is_admin)));

create policy "quran_courses_public_read_published" on "public"."quran_courses"
  for select
  to "anon"
  using ((is_published = true));

create policy "quran_reviews_admin_delete" on "public"."quran_reviews"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "quran_reviews_admin_insert" on "public"."quran_reviews"
  for insert
  to "authenticated"
  with check (private.is_admin());

create policy "quran_reviews_admin_select" on "public"."quran_reviews"
  for select
  to "authenticated"
  using (private.is_admin());

create policy "quran_reviews_admin_update" on "public"."quran_reviews"
  for update
  to "authenticated"
  using (private.is_admin())
  with check (private.is_admin());

create policy "quran_reviews_public_read_published" on "public"."quran_reviews"
  for select
  to PUBLIC
  using ((COALESCE(is_published, true) = true));

create policy "scmp_admin_delete" on "public"."student_competition_subscriptions"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "scmp_admin_update" on "public"."student_competition_subscriptions"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "scmp_student_insert" on "public"."student_competition_subscriptions"
  for insert
  to "authenticated"
  with check (((student_id = auth.uid()) OR ( SELECT private.is_admin() AS is_admin)));

create policy "scmp_student_select" on "public"."student_competition_subscriptions"
  for select
  to "authenticated"
  using (((student_id = auth.uid()) or ( select private.is_admin() as is_admin)));

create policy "sclc_student_delete" on "public"."student_course_lecture_completions"
  for delete
  to "authenticated"
  using (((student_id = ( select auth.uid() as uid)) or ( select private.is_admin() as is_admin)));

create policy "sclc_student_insert" on "public"."student_course_lecture_completions"
  for insert
  to "authenticated"
  with check ((((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.quran_course_lectures l
     JOIN public.quran_courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = student_course_lecture_completions.lecture_id) AND (l.is_published = true) AND (c.is_published = true) AND ((c.is_free = true) OR (EXISTS ( SELECT 1
           FROM public.student_course_subscriptions scs
          WHERE ((scs.course_id = c.id) AND (scs.student_id = ( SELECT auth.uid() AS uid)) AND (scs.is_active = true))))))))) OR ( SELECT private.is_admin() AS is_admin)));

create policy "sclc_student_select" on "public"."student_course_lecture_completions"
  for select
  to "authenticated"
  using (((student_id = ( select auth.uid() as uid)) or ( select private.is_admin() as is_admin)));

create policy "sclc_student_update" on "public"."student_course_lecture_completions"
  for update
  to "authenticated"
  using (((student_id = ( select auth.uid() as uid)) or ( select private.is_admin() as is_admin)))
  with check ((((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.quran_course_lectures l
     JOIN public.quran_courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = student_course_lecture_completions.lecture_id) AND (l.is_published = true) AND (c.is_published = true) AND ((c.is_free = true) OR (EXISTS ( SELECT 1
           FROM public.student_course_subscriptions scs
          WHERE ((scs.course_id = c.id) AND (scs.student_id = ( SELECT auth.uid() AS uid)) AND (scs.is_active = true))))))))) OR ( SELECT private.is_admin() AS is_admin)));

create policy "scs_admin_delete" on "public"."student_course_subscriptions"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "scs_admin_insert" on "public"."student_course_subscriptions"
  for insert
  to "authenticated"
  with check (( SELECT private.is_admin() AS is_admin));

create policy "scs_admin_update" on "public"."student_course_subscriptions"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "scs_student_select" on "public"."student_course_subscriptions"
  for select
  to "authenticated"
  using (((student_id = auth.uid()) or ( select private.is_admin() as is_admin)));

create policy "student_profiles_admin_delete" on "public"."student_profiles"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "student_profiles_admin_insert" on "public"."student_profiles"
  for insert
  to "authenticated"
  with check (( SELECT private.is_admin() AS is_admin));

create policy "student_profiles_admin_update" on "public"."student_profiles"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "student_profiles_all_select" on "public"."student_profiles"
  for select
  to "authenticated"
  using (true);

create policy "sql_admin_delete" on "public"."student_quran_lessons"
  for delete
  to "authenticated"
  using (( select private.is_admin() as is_admin));

create policy "sql_admin_insert" on "public"."student_quran_lessons"
  for insert
  to "authenticated"
  with check (( SELECT private.is_admin() AS is_admin));

create policy "sql_admin_update" on "public"."student_quran_lessons"
  for update
  to "authenticated"
  using (( select private.is_admin() as is_admin))
  with check (( SELECT private.is_admin() AS is_admin));

create policy "sql_student_select" on "public"."student_quran_lessons"
  for select
  to "authenticated"
  using (((student_id = auth.uid()) or ( select private.is_admin() as is_admin)));

create policy "public can submit subscription" on "public"."subscription_requests"
  for insert
  to "anon"
  with check (true);

create policy "teacher_reviews_admin_delete" on "public"."teacher_reviews"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "teacher_reviews_admin_insert" on "public"."teacher_reviews"
  for insert
  to "authenticated"
  with check (private.is_admin());

create policy "teacher_reviews_admin_select" on "public"."teacher_reviews"
  for select
  to "authenticated"
  using (private.is_admin());

create policy "teacher_reviews_admin_update" on "public"."teacher_reviews"
  for update
  to "authenticated"
  using (private.is_admin())
  with check (private.is_admin());

create policy "teacher_reviews_public_read_published" on "public"."teacher_reviews"
  for select
  to PUBLIC
  using ((COALESCE(is_published, true) = true));

create policy "admin can delete teachers" on "public"."teachers"
  for delete
  to "authenticated"
  using (private.is_admin());

create policy "admin can insert teachers" on "public"."teachers"
  for insert
  to "authenticated"
  with check (private.is_admin());

create policy "admin can update teachers" on "public"."teachers"
  for update
  to "authenticated"
  using (private.is_admin())
  with check (private.is_admin());

create policy "public can read teachers" on "public"."teachers"
  for select
  to PUBLIC
  using (true);

create event trigger "ensure_rls"
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function "public"."rls_auto_enable"();

comment on extension "pg_net" is 'Async HTTP';

revoke all on function "private"."handle_new_student_user"() from public;

grant execute on function "private"."handle_new_student_user"() to "postgres";

grant execute on function "private"."is_admin"() to "authenticated", "postgres";

revoke all on function "public"."is_admin"() from public;

grant execute on function "public"."is_admin"() to "postgres", "service_role";

grant execute on function "public"."notify_preference_telegram"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."prevent_quran_course_mode_change_after_lectures"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."rls_auto_enable"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."set_updated_at"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."update_updated_at_column"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."validate_quran_course_lecture"() to public, "anon", "authenticated", "postgres", "service_role";

grant usage on schema "private" to "authenticated";

grant create, usage on schema "private" to "postgres";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."admin_users" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table "public"."competition_registration_requests"
  to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."course_lecture_questions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."faqs" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."newsletter_subscribers" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."pages" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."preference_requests" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quran_competitions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quran_course_lectures" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quran_courses" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quran_reviews" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table "public"."student_competition_subscriptions"
  to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."student_course_lecture_completions" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table "public"."student_course_subscriptions"
  to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."student_profiles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."student_quran_lessons" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."subscription_requests" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."teacher_reviews" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."teachers" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table "public"."published_quran_course_lectures"
  to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

