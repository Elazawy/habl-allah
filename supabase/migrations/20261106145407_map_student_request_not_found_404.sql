-- Map missing student-request resources to HTTP 404 in PostgREST.
--
-- PostgREST maps SQLSTATE P0002 to HTTP 500, while its PTxyz convention maps
-- PT404 to HTTP 404. Only the missing-resource SQLSTATE changes here; function
-- bodies, active-admin checks, SECURITY DEFINER/search_path settings, existing
-- grants and comments are preserved by CREATE OR REPLACE.

begin;

create or replace function public.admin_update_student_request(
  p_type text,
  p_id uuid,
  p_status text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_entry jsonb;
  v_updated uuid;
begin
  if not private.is_admin() then
    raise exception 'Active admin access required' using errcode = '42501';
  end if;

  if p_type is null or p_type not in ('subscription', 'preference') then
    raise exception 'Invalid student request type' using errcode = '22023';
  end if;

  if p_id is null then
    raise exception 'Student request id is required' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('new', 'contacted') then
    raise exception 'Invalid student request status' using errcode = '22023';
  end if;

  if char_length(coalesce(p_notes, '')) > 4000 then
    raise exception 'Student request notes are too long' using errcode = '22023';
  end if;

  v_entry := jsonb_build_object(
    'at', now(),
    'by', auth.uid(),
    'action', 'status_update',
    'status', p_status,
    'notes', coalesce(p_notes, '')
  );

  if p_type = 'subscription' then
    update public.subscription_requests
    set status = p_status,
        notes = coalesce(p_notes, ''),
        processed_by = auth.uid(),
        updated_at = now(),
        history = private.append_student_request_history(history, v_entry)
    where id = p_id
    returning id into v_updated;
  else
    update public.preference_requests
    set status = p_status,
        notes = coalesce(p_notes, ''),
        processed_by = auth.uid(),
        updated_at = now(),
        history = private.append_student_request_history(history, v_entry)
    where id = p_id
    returning id into v_updated;
  end if;

  if v_updated is null then
    raise exception 'Student request not found' using errcode = 'PT404';
  end if;
end;
$function$;

create or replace function public.admin_fulfill_student_request(
  p_type text,
  p_id uuid,
  p_student_id uuid,
  p_teacher_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_request uuid;
begin
  if not private.is_admin() then
    raise exception 'Active admin access required' using errcode = '42501';
  end if;

  if p_type is null or p_type not in ('subscription', 'preference') then
    raise exception 'Invalid student request type' using errcode = '22023';
  end if;

  if p_id is null or p_student_id is null or p_teacher_id is null then
    raise exception 'Request, student and teacher are required'
      using errcode = '22023';
  end if;

  -- Lock the request first so a missing row never leaves a teacher assignment.
  if p_type = 'subscription' then
    select id into v_request
    from public.subscription_requests
    where id = p_id
    for update;
  else
    select id into v_request
    from public.preference_requests
    where id = p_id
    for update;
  end if;

  if v_request is null then
    raise exception 'Student request not found' using errcode = 'PT404';
  end if;

  if not exists (select 1 from public.teachers t where t.id = p_teacher_id) then
    raise exception 'Teacher not found' using errcode = 'PT404';
  end if;

  update public.student_profiles
  set teacher_id = p_teacher_id,
      updated_at = now()
  where id = p_student_id;

  if not found then
    raise exception 'Student profile not found' using errcode = 'PT404';
  end if;

  -- Permanent deletion; the notification job cascades with the request.
  if p_type = 'subscription' then
    delete from public.subscription_requests where id = p_id;
  else
    delete from public.preference_requests where id = p_id;
  end if;
end;
$function$;

commit;
