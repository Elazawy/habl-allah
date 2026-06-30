begin;

do $$
begin
  if to_regprocedure('private.is_admin()') is null then
    raise exception 'private.is_admin() is required before running this migration.';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.quran_course_lectures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.quran_courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  youtube_url text,
  r2_object_key text,
  original_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quran_course_lectures_course_slug_key unique (course_id, slug),
  constraint quran_course_lectures_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint quran_course_lectures_sort_order_check check (sort_order >= 0),
  constraint quran_course_lectures_single_media_check check (num_nonnulls(youtube_url, r2_object_key) <= 1)
);

create index if not exists quran_course_lectures_course_sort_idx
  on public.quran_course_lectures (course_id, sort_order, created_at, id);

create index if not exists quran_course_lectures_course_published_sort_idx
  on public.quran_course_lectures (course_id, is_published, sort_order, created_at, id);

alter table public.quran_course_lectures enable row level security;

create or replace function public.validate_quran_course_lecture()
returns trigger
language plpgsql
set search_path = public, private
as $$
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
$$;

create or replace function public.prevent_quran_course_mode_change_after_lectures()
returns trigger
language plpgsql
set search_path = public
as $$
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
$$;

drop trigger if exists quran_course_lectures_validate_before_write on public.quran_course_lectures;
create trigger quran_course_lectures_validate_before_write
before insert or update on public.quran_course_lectures
for each row
execute function public.validate_quran_course_lecture();

drop trigger if exists quran_courses_prevent_mode_change on public.quran_courses;
create trigger quran_courses_prevent_mode_change
before update of is_free on public.quran_courses
for each row
execute function public.prevent_quran_course_mode_change_after_lectures();

drop policy if exists "Public can read published courses" on public.quran_courses;
drop policy if exists "Authenticated users can manage courses" on public.quran_courses;
drop policy if exists quran_courses_public_read_published on public.quran_courses;
drop policy if exists quran_courses_authenticated_read_published_or_admin on public.quran_courses;
drop policy if exists quran_courses_admin_insert on public.quran_courses;
drop policy if exists quran_courses_admin_update on public.quran_courses;
drop policy if exists quran_courses_admin_delete on public.quran_courses;

create policy quran_courses_public_read_published
  on public.quran_courses
  for select
  to anon
  using (is_published = true);

create policy quran_courses_authenticated_read_published_or_admin
  on public.quran_courses
  for select
  to authenticated
  using (is_published = true or (select private.is_admin()));

create policy quran_courses_admin_insert
  on public.quran_courses
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy quran_courses_admin_update
  on public.quran_courses
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy quran_courses_admin_delete
  on public.quran_courses
  for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists quran_course_lectures_admin_select on public.quran_course_lectures;
drop policy if exists quran_course_lectures_admin_insert on public.quran_course_lectures;
drop policy if exists quran_course_lectures_admin_update on public.quran_course_lectures;
drop policy if exists quran_course_lectures_admin_delete on public.quran_course_lectures;

create policy quran_course_lectures_admin_select
  on public.quran_course_lectures
  for select
  to authenticated
  using ((select private.is_admin()));

create policy quran_course_lectures_admin_insert
  on public.quran_course_lectures
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy quran_course_lectures_admin_update
  on public.quran_course_lectures
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy quran_course_lectures_admin_delete
  on public.quran_course_lectures
  for delete
  to authenticated
  using ((select private.is_admin()));

-- Public reads intentionally go through this filtered view so the raw R2 object key
-- stays admin-only on the base table.
create or replace view public.published_quran_course_lectures
with (security_barrier = true)
as
select
  l.id,
  l.course_id,
  c.slug as course_slug,
  c.name as course_name,
  c.is_free as course_is_free,
  l.slug,
  l.title,
  l.description,
  l.sort_order,
  l.is_published,
  case when c.is_free then l.youtube_url else null end as youtube_url,
  l.created_at,
  l.updated_at
from public.quran_course_lectures l
join public.quran_courses c on c.id = l.course_id
where c.is_published = true
  and l.is_published = true;

grant select on public.published_quran_course_lectures to anon, authenticated;

commit;
