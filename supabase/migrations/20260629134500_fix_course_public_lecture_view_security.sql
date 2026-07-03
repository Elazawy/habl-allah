begin;

drop policy if exists quran_course_lectures_anon_select_published on public.quran_course_lectures;

create policy quran_course_lectures_anon_select_published
  on public.quran_course_lectures
  for select
  to anon
  using (
    is_published = true
    and exists (
      select 1
      from public.quran_courses c
      where c.id = course_id
        and c.is_published = true
    )
  );

grant select on public.quran_course_lectures to anon;
revoke select (r2_object_key, original_file_name) on public.quran_course_lectures from anon;

drop view if exists public.quran_course_public_lectures;
drop view if exists public.published_quran_course_lectures;

create view public.published_quran_course_lectures
with (security_invoker = true, security_barrier = true)
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
