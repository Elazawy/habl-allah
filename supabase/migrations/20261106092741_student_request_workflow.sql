-- Student request workflow: admin review, fulfillment, and a transactional
-- notification outbox for subscription/preference requests.
--
-- Contract:
--   * Public inserts stay open to anon/authenticated, but cannot supply admin
--     fields, links, ids or timestamps. Name/WhatsApp are normalized and
--     validated on INSERT only so old incomplete rows remain readable/editable.
--   * Admins review through SECURITY DEFINER RPCs (no direct table writes) and
--     list both inboxes through one correctly paginated RPC.
--   * Each new request enqueues exactly one PII-free outbox job. Successful
--     jobs are deleted by the worker; jobs cascade away with their request.
--   * A minute cron invokes the worker with a Vault-backed shared secret. The
--     cron target no-ops until both Vault keys exist, so the migration does not
--     require the secrets to be present. A separate daily cron removes
--     exhausted jobs even when the worker is not configured.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Request review fields
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.subscription_requests
  add column status text not null default 'new',
  add column student_id uuid references public.student_profiles(id) on delete set null,
  add column notes text not null default '',
  add column history jsonb not null default '[]'::jsonb,
  add column updated_at timestamptz not null default now(),
  add column processed_by uuid;

alter table public.subscription_requests
  add constraint subscription_requests_status_check
    check (status in ('new', 'contacted')),
  add constraint subscription_requests_notes_check
    check (char_length(notes) <= 4000),
  add constraint subscription_requests_history_check
    check (jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 20);

alter table public.preference_requests
  add column status text not null default 'new',
  add column student_id uuid references public.student_profiles(id) on delete set null,
  add column notes text not null default '',
  add column history jsonb not null default '[]'::jsonb,
  add column updated_at timestamptz not null default now(),
  add column processed_by uuid;

alter table public.preference_requests
  add constraint preference_requests_status_check
    check (status in ('new', 'contacted')),
  add constraint preference_requests_notes_check
    check (char_length(notes) <= 4000),
  add constraint preference_requests_history_check
    check (jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 20);

create index subscription_requests_student_idx
  on public.subscription_requests(student_id);
create index preference_requests_student_idx
  on public.preference_requests(student_id);
create index subscription_requests_queue_idx
  on public.subscription_requests(created_at desc, id desc);
create index preference_requests_queue_idx
  on public.preference_requests(created_at desc, id desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Notification outbox (IDs only; no copied request PII)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.student_request_notifications (
  id uuid primary key default gen_random_uuid(),
  subscription_request_id uuid references public.subscription_requests(id) on delete cascade,
  preference_request_id uuid references public.preference_requests(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint student_request_notifications_one_request_check
    check (num_nonnulls(subscription_request_id, preference_request_id) = 1)
);

create unique index student_request_notifications_subscription_idx
  on public.student_request_notifications(subscription_request_id);
create unique index student_request_notifications_preference_idx
  on public.student_request_notifications(preference_request_id);
create index student_request_notifications_claim_idx
  on public.student_request_notifications(next_attempt_at, id)
  where attempts < 5;
create index student_request_notifications_exhausted_idx
  on public.student_request_notifications(created_at)
  where attempts >= 5;

alter table public.student_request_notifications enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Public insert normalization / validation
--    Only anon/authenticated inserts are normalized; privileged maintenance
--    (service_role/postgres) may still create or preserve legacy rows.
--    The trigger only runs on INSERT, so old incomplete rows are untouched.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.prepare_student_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_name text;
  v_phone text;
  v_teacher_name text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Admin-managed fields may only hold their defaults on a public insert.
  if new.status is distinct from 'new'
     or new.notes is distinct from ''
     or new.history is distinct from '[]'::jsonb
     or new.processed_by is not null then
    raise exception 'Student request admin fields cannot be set by clients'
      using errcode = '42501';
  end if;

  -- Public callers can never create an administrative link to an account.
  if new.student_id is not null then
    raise exception 'Student request student account cannot be linked by clients'
      using errcode = '42501';
  end if;

  -- Never trust client-supplied identifiers or timestamps.
  new.id := gen_random_uuid();
  new.created_at := now();

  v_name := btrim(coalesce(new.student_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Student request name must be between 1 and 200 characters'
      using errcode = '22023';
  end if;
  new.student_name := v_name;

  -- Shared canonical shape: localized digits are translated, non-digits are
  -- removed, and a local leading zero gains the Egypt country prefix. A leading
  -- '+' keeps the digits as-is.
  v_phone := private.normalize_phone_digits(new.whatsapp);
  new.whatsapp := v_phone;
  if new.whatsapp !~ '^\d{10,15}$' then
    raise exception 'Student request WhatsApp must contain 10 to 15 digits'
      using errcode = '22023';
  end if;

  if tg_table_name = 'preference_requests' then
    if new.age is not null and (new.age < 5 or new.age > 99) then
      raise exception 'Student request age must be between 5 and 99'
        using errcode = '22023';
    end if;
    new.description := nullif(btrim(coalesce(new.description, '')), '');
    if char_length(coalesce(new.description, '')) > 4000 then
      raise exception 'Student request description is too long'
        using errcode = '22023';
    end if;
  else
    -- A subscription request targets a real teacher. Derive the historical
    -- display name from that teacher instead of trusting client text.
    if new.teacher_id is null then
      raise exception 'A teacher is required for a subscription request'
        using errcode = '22023';
    end if;

    select t.name into v_teacher_name
    from public.teachers t
    where t.id = new.teacher_id;

    if v_teacher_name is null then
      raise exception 'Teacher not found' using errcode = '22023';
    end if;

    new.teacher_name := btrim(v_teacher_name);
  end if;

  -- Neutralize values whose defaults are indistinguishable from explicit input.
  new.status := 'new';
  new.notes := '';
  new.history := '[]'::jsonb;
  new.processed_by := null;
  new.updated_at := now();

  return new;
end;
$function$;

revoke all on function private.prepare_student_request() from public;

create trigger prepare_subscription_request
  before insert on public.subscription_requests
  for each row execute function private.prepare_student_request();

create trigger prepare_preference_request
  before insert on public.preference_requests
  for each row execute function private.prepare_student_request();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Outbox enqueue (replaces the legacy preference HTTP trigger)
-- ─────────────────────────────────────────────────────────────────────────────

drop trigger if exists on_preference_request_insert on public.preference_requests;
drop function if exists public.notify_preference_telegram();

create or replace function private.enqueue_student_request_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_table_name = 'subscription_requests' then
    insert into public.student_request_notifications (subscription_request_id)
    values (new.id);
  elsif tg_table_name = 'preference_requests' then
    insert into public.student_request_notifications (preference_request_id)
    values (new.id);
  else
    raise exception 'Unsupported student request table: %', tg_table_name;
  end if;
  return new;
end;
$function$;

revoke all on function private.enqueue_student_request_notification() from public;

create trigger enqueue_subscription_request_notification
  after insert on public.subscription_requests
  for each row execute function private.enqueue_student_request_notification();

create trigger enqueue_preference_request_notification
  after insert on public.preference_requests
  for each row execute function private.enqueue_student_request_notification();

-- Keep updated_at authoritative for every write path (including admin RPCs).
create trigger set_subscription_request_updated_at
  before update on public.subscription_requests
  for each row execute function public.set_updated_at();

create trigger set_preference_request_updated_at
  before update on public.preference_requests
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Admin RPC helpers
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.append_student_request_history(
  p_history jsonb,
  p_entry jsonb
)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $function$
  select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
  from (
    select value, ord
    from jsonb_array_elements(coalesce(p_history, '[]'::jsonb) || p_entry)
      with ordinality as entries(value, ord)
    order by ord desc
    limit 20
  ) bounded;
$function$;

revoke all on function private.append_student_request_history(jsonb, jsonb) from public;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Admin RPCs
-- ─────────────────────────────────────────────────────────────────────────────

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
    raise exception 'Student request not found' using errcode = 'P0002';
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
    raise exception 'Student request not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.teachers t where t.id = p_teacher_id) then
    raise exception 'Teacher not found' using errcode = 'P0002';
  end if;

  update public.student_profiles
  set teacher_id = p_teacher_id,
      updated_at = now()
  where id = p_student_id;

  if not found then
    raise exception 'Student profile not found' using errcode = 'P0002';
  end if;

  -- Permanent deletion; the notification job cascades with the request.
  if p_type = 'subscription' then
    delete from public.subscription_requests where id = p_id;
  else
    delete from public.preference_requests where id = p_id;
  end if;
end;
$function$;

create or replace function public.admin_close_student_request(
  p_type text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
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

  if p_type = 'subscription' then
    delete from public.subscription_requests where id = p_id;
  else
    delete from public.preference_requests where id = p_id;
  end if;
end;
$function$;

create or replace function public.admin_retry_student_request_notification(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_locked_until timestamptz;
begin
  if not private.is_admin() then
    raise exception 'Active admin access required' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'Notification id is required' using errcode = '22023';
  end if;

  select n.locked_until into v_locked_until
  from public.student_request_notifications n
  where n.id = p_id
  for update;

  if not found then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

  -- Never reset a job that a worker currently holds; that would allow a second
  -- worker to claim and send the same notification concurrently.
  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'Notification is currently being processed'
      using errcode = '55006';
  end if;

  update public.student_request_notifications
  set attempts = 0,
      next_attempt_at = now(),
      locked_until = null,
      last_error = null
  where id = p_id;
end;
$function$;

-- Combined admin queue for both inboxes. Returns summary rows only (no notes or
-- history), with an exact total and real offset/limit pagination.
create or replace function public.admin_list_student_requests(
  p_type text default 'all',
  p_status text default null,
  p_search text default null,
  p_offset integer default 0,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_type text := lower(btrim(coalesce(p_type, 'all')));
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_limit integer := least(100, greatest(1, coalesce(p_limit, 20)));
  v_name_pattern text;
  v_phone_raw text;
  v_phone_normalized text;
  v_total integer;
  v_items jsonb;
begin
  if not private.is_admin() then
    raise exception 'Active admin access required' using errcode = '42501';
  end if;

  if v_type not in ('all', 'subscription', 'preference') then
    raise exception 'Invalid student request type' using errcode = '22023';
  end if;

  if v_status is not null and v_status not in ('new', 'contacted') then
    raise exception 'Invalid student request status' using errcode = '22023';
  end if;

  if v_search is not null then
    v_search := left(v_search, 100);
    -- Escape LIKE metacharacters so a direct RPC caller cannot turn a search
    -- term into a wildcard. The value stays a bound parameter, never SQL text.
    v_name_pattern := '%' || replace(
      replace(replace(v_search, '\', '\\'), '%', '\%'),
      '_', '\_'
    ) || '%';

    -- Only phone-shaped searches use the phone matcher. A name search must not
    -- silently acquire a numeric fragment from words or SQL-looking input.
    if v_search ~ '^[0-9+()[:space:].,٠-٩۰-۹-]+$' then
      v_phone_normalized := private.normalize_phone_digits(v_search);
      -- Also match legacy local rows stored before canonicalization.
      v_phone_raw := case
        when v_phone_normalized like '2%' then substring(v_phone_normalized from 2)
        else v_phone_normalized
      end;
    else
      v_phone_normalized := '';
      v_phone_raw := '';
    end if;
  end if;

  with requests as (
    select
      sr.id,
      'subscription'::text as request_type,
      sr.student_name,
      sr.whatsapp,
      sr.teacher_id,
      sr.teacher_name,
      null::text as gender_preference,
      null::integer as age,
      null::text as description,
      sr.status,
      sr.student_id,
      sr.created_at,
      sr.updated_at
    from public.subscription_requests sr

    union all

    select
      pr.id,
      'preference'::text as request_type,
      pr.student_name,
      pr.whatsapp,
      null::uuid as teacher_id,
      null::text as teacher_name,
      pr.gender_preference,
      pr.age,
      pr.description,
      pr.status,
      pr.student_id,
      pr.created_at,
      pr.updated_at
    from public.preference_requests pr
  ),
  filtered as (
    select r.*
    from requests r
    where (v_type = 'all' or r.request_type = v_type)
      and (v_status is null or r.status = v_status)
      and (
        v_search is null
        or r.student_name ilike v_name_pattern escape '\'
        or (
          v_phone_normalized <> ''
          and (
            r.whatsapp ilike '%' || v_phone_normalized || '%'
            or r.whatsapp ilike '%' || v_phone_raw || '%'
          )
        )
      )
  ),
  counted as (
    select count(*)::integer as total from filtered
  )
  select
    counted.total,
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(p)
          order by p.created_at desc nulls last, p.id desc, p.request_type asc
        )
        from (
          select *
          from filtered
          order by created_at desc nulls last, id desc, request_type asc
          offset v_offset
          limit v_limit
        ) p
      ),
      '[]'::jsonb
    )
  into v_total, v_items
  from counted;

  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Worker claim RPC (service_role only)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.claim_student_request_notifications(
  p_limit integer default 10
)
returns table (
  id uuid,
  subscription_request_id uuid,
  preference_request_id uuid,
  attempts integer,
  next_attempt_at timestamptz,
  locked_until timestamptz,
  last_error text,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  with due as (
    select n.id
    from public.student_request_notifications n
    where n.attempts < 5
      and n.next_attempt_at <= now()
      and (n.locked_until is null or n.locked_until <= now())
    order by n.next_attempt_at, n.id
    for update skip locked
    limit greatest(0, least(coalesce(p_limit, 10), 100))
  )
  update public.student_request_notifications n
  set attempts = n.attempts + 1,
      locked_until = now() + interval '2 minutes'
  from due
  where n.id = due.id
  returning n.id, n.subscription_request_id, n.preference_request_id,
    n.attempts, n.next_attempt_at, n.locked_until, n.last_error, n.created_at;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Scheduled worker invocation and independent retention cleanup
--    The worker cron no-ops until both Vault keys exist; safe to apply before
--    setup. The cleanup cron needs no Vault/token configuration.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.invoke_student_request_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_url text;
  v_secret text;
begin
  -- Vault is not present in plain Postgres (or may not be provisioned yet).
  if to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;

  select s.decrypted_secret into v_url
  from vault.decrypted_secrets s
  where s.name = 'student_requests_worker_url'
  limit 1;

  select s.decrypted_secret into v_secret
  from vault.decrypted_secrets s
  where s.name = 'student_requests_worker_secret'
  limit 1;

  if nullif(btrim(coalesce(v_url, '')), '') is null
     or nullif(btrim(coalesce(v_secret, '')), '') is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-request-worker-secret', v_secret
    ),
    timeout_milliseconds := 120000
  );
end;
$function$;

revoke all on function private.invoke_student_request_worker() from public;

create or replace function private.cleanup_student_request_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer := 0;
begin
  delete from public.student_request_notifications
  where attempts >= 5
    and created_at < now() - interval '7 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function private.cleanup_student_request_notifications() from public;

-- pg_cron is present on Supabase, but keep the migration usable in plain
-- Postgres where it is not installed.
do $schedule$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;

  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'student-request-notifications-worker',
      'student-request-notifications-cleanup'
    );

    perform cron.schedule(
      'student-request-notifications-worker',
      '* * * * *',
      'select private.invoke_student_request_worker()'
    );

    perform cron.schedule(
      'student-request-notifications-cleanup',
      '17 3 * * *',
      'select private.cleanup_student_request_notifications()'
    );
  end if;
end;
$schedule$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Access control
-- ─────────────────────────────────────────────────────────────────────────────

-- Requests: public insert + active-admin read. All writes go through RPCs.
revoke all on public.subscription_requests from public, anon, authenticated;
grant select on public.subscription_requests to authenticated;
grant insert on public.subscription_requests to anon, authenticated;

revoke all on public.preference_requests from public, anon, authenticated;
grant select on public.preference_requests to authenticated;
grant insert on public.preference_requests to anon, authenticated;

-- Outbox: active-admin read only; the worker uses service_role directly.
revoke all on public.student_request_notifications from public, anon, authenticated;
grant select on public.student_request_notifications to authenticated;

grant select, insert, update, delete on public.subscription_requests to service_role;
grant select, insert, update, delete on public.preference_requests to service_role;
grant select, insert, update, delete on public.student_request_notifications to service_role;

drop policy if exists "public can submit preference" on public.preference_requests;
drop policy if exists "authenticated can submit preference" on public.preference_requests;
drop policy if exists "public can submit subscription" on public.subscription_requests;

drop policy if exists student_requests_public_insert_preference on public.preference_requests;
drop policy if exists student_requests_public_insert_subscription on public.subscription_requests;
drop policy if exists preference_requests_admin_select on public.preference_requests;
drop policy if exists subscription_requests_admin_select on public.subscription_requests;
drop policy if exists student_request_notifications_admin_select on public.student_request_notifications;

create policy student_requests_public_insert_preference
  on public.preference_requests
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and notes = ''
    and history = '[]'::jsonb
    and processed_by is null
    and student_id is null
  );

create policy student_requests_public_insert_subscription
  on public.subscription_requests
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and notes = ''
    and history = '[]'::jsonb
    and processed_by is null
    and student_id is null
    and teacher_id is not null
  );

create policy preference_requests_admin_select
  on public.preference_requests
  for select
  to authenticated
  using (private.is_admin());

create policy subscription_requests_admin_select
  on public.subscription_requests
  for select
  to authenticated
  using (private.is_admin());

create policy student_request_notifications_admin_select
  on public.student_request_notifications
  for select
  to authenticated
  using (private.is_admin());

-- Admin RPCs: authenticated callers still pass the active-admin check.
revoke all on function public.admin_update_student_request(text, uuid, text, text)
  from public, anon;
grant execute on function public.admin_update_student_request(text, uuid, text, text)
  to authenticated;

revoke all on function public.admin_fulfill_student_request(text, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.admin_fulfill_student_request(text, uuid, uuid, uuid)
  to authenticated;

revoke all on function public.admin_close_student_request(text, uuid)
  from public, anon;
grant execute on function public.admin_close_student_request(text, uuid)
  to authenticated;

revoke all on function public.admin_retry_student_request_notification(uuid)
  from public, anon;
grant execute on function public.admin_retry_student_request_notification(uuid)
  to authenticated;

revoke all on function public.admin_list_student_requests(text, text, text, integer, integer)
  from public, anon;
grant execute on function public.admin_list_student_requests(text, text, text, integer, integer)
  to authenticated;

-- Worker claim RPC: service_role only.
revoke all on function public.claim_student_request_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_student_request_notifications(integer)
  to service_role;

comment on table public.student_request_notifications is
  'PII-free outbox for student request notifications. Workers claim jobs with a lease, delete on success, and update errors on failure.';
comment on function public.claim_student_request_notifications(integer) is
  'Service-role worker claim: leases due jobs (attempts < 5) with SKIP LOCKED and increments attempts.';
comment on function public.admin_fulfill_student_request(text, uuid, uuid, uuid) is
  'Active admin: assigns the teacher to the student profile and permanently deletes the request atomically.';
comment on function public.admin_close_student_request(text, uuid) is
  'Active admin: permanently deletes a student request and its notification job.';
comment on function public.admin_list_student_requests(text, text, text, integer, integer) is
  'Active admin: merged subscription/preference queue with exact total and stable pagination; returns summary fields only.';
comment on function private.cleanup_student_request_notifications() is
  'Daily retention cleanup: removes exhausted notification jobs older than seven days without depending on worker configuration.';

commit;
