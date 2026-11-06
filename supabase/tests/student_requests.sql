-- Student request workflow integration tests.
-- Run against a migrated database with:
--   npx supabase db query --linked --project-ref <ref> -f supabase/tests/student_requests.sql
--   (or psql -v ON_ERROR_STOP=1 -f supabase/tests/student_requests.sql)
-- All fixtures and assertions are rolled back; no existing records are changed.

begin;

create temporary table sr_test_ids (
  key text primary key,
  id uuid not null
) on commit drop;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_admin uuid := gen_random_uuid();
  v_inactive_admin uuid := gen_random_uuid();
  v_student uuid := gen_random_uuid();
  v_other_student uuid := gen_random_uuid();
  v_teacher uuid := gen_random_uuid();
  v_teacher2 uuid := gen_random_uuid();
  v_phone text := '2010' || lpad((floor(random() * 100000000))::int::text, 8, '0');
  v_phone2 text := '2011' || lpad((floor(random() * 100000000))::int::text, 8, '0');
begin
  -- admin_users.id references auth.users, so create the auth rows first.
  insert into auth.users(id, email, raw_user_meta_data)
  values
    (v_admin, 'sr-admin-' || v_admin || '@example.com', '{}'::jsonb),
    (v_inactive_admin, 'sr-inactive-admin-' || v_inactive_admin || '@example.com', '{}'::jsonb),
    (v_student, 'sr-student-' || v_student || '@example.com', '{}'::jsonb),
    (v_other_student, 'sr-student-' || v_other_student || '@example.com', '{}'::jsonb);

  insert into public.admin_users(id, email, is_active)
  values (v_admin, 'sr-admin-' || v_admin || '@example.com', true),
         (v_inactive_admin, 'sr-inactive-admin-' || v_inactive_admin || '@example.com', false);

  insert into public.student_profiles(id, full_name, phone)
  values (v_student, 'طالب اختبار', v_phone),
         (v_other_student, 'طالب آخر', v_phone2);

  insert into public.teachers(id, name, gender)
  values (v_teacher, 'معلم أنون', 'male'),
         (v_teacher2, 'معلم ثان', 'male');

  insert into sr_test_ids(key, id)
  values ('admin', v_admin),
         ('inactive_admin', v_inactive_admin),
         ('student', v_student),
         ('other_student', v_other_student),
         ('teacher', v_teacher),
         ('teacher2', v_teacher2);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Public inserts: anon/authenticated, normalization, defaults, enqueue
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_teacher uuid;
  v_sub uuid;
  v_pref uuid;
  v_min_name uuid;
  v_repeat uuid;
  v_fake_id uuid := gen_random_uuid();
  v_created_at timestamptz;
  v_job public.student_request_notifications;
begin
  select id into v_teacher from sr_test_ids where key = 'teacher';

  execute 'set local role anon';

  -- Supplied ids, timestamps and teacher text are not trusted.
  insert into public.subscription_requests
    (id, created_at, teacher_id, teacher_name, student_name, whatsapp)
  values
    (v_fake_id, '2000-01-01T00:00:00Z', v_teacher, 'اسم مزور',
     '  طالب أنون  ', '٠١١٢٣٤٥٦٧٨٩');

  insert into public.preference_requests
    (student_name, age, whatsapp, description)
  values
    ('  طالب تفضيل  ', null, '۰۱۰۱۲۳۴۵۶۷۸', '  وصف الاحتياج  ');

  -- One-character names are valid (frontend minimum is one nonblank char).
  insert into public.preference_requests(student_name, whatsapp)
  values ('س', '01012345679');

  -- Genuine repeats are allowed; only the frontend guards double clicks.
  insert into public.preference_requests(student_name, whatsapp, description)
  values ('طالب مكرر', '01012220000', 'first'),
         ('طالب مكرر', '01012220000', 'second');

  execute 'reset role';

  select id, created_at into v_sub, v_created_at
  from public.subscription_requests
  where whatsapp = '201123456789';

  assert v_sub is not null and v_sub <> v_fake_id,
    'public id is generated, not trusted';
  assert v_created_at > now() - interval '1 minute',
    'public created_at is server time, not trusted';
  assert (select student_name from public.subscription_requests where id = v_sub)
    = 'طالب أنون', 'subscription name is trimmed';
  assert (select whatsapp from public.subscription_requests where id = v_sub)
    = '201123456789', 'Arabic-digit WhatsApp is canonicalized';
  assert (select teacher_name from public.subscription_requests where id = v_sub)
    = 'معلم أنون', 'teacher_name is derived from the real teacher';
  assert (select status from public.subscription_requests where id = v_sub)
    = 'new', 'new requests start as new';
  assert (select notes from public.subscription_requests where id = v_sub)
    = '', 'notes start empty';
  assert (select history from public.subscription_requests where id = v_sub)
    = '[]'::jsonb, 'history starts empty';
  assert (select student_id from public.subscription_requests where id = v_sub)
    is null, 'public inserts cannot link a student';
  assert (select processed_by from public.subscription_requests where id = v_sub)
    is null, 'processed_by starts null';

  select * into v_job
  from public.student_request_notifications
  where subscription_request_id = v_sub;
  assert v_job.id is not null, 'subscription insert enqueues a job';
  assert v_job.preference_request_id is null and v_job.attempts = 0,
    'subscription job has only its request id and no attempts';
  assert v_job.next_attempt_at <= now() and v_job.locked_until is null,
    'new job is due and unlocked';

  select id into v_pref
  from public.preference_requests
  where whatsapp = '201012345678';
  assert v_pref is not null, 'Persian-digit WhatsApp is canonicalized';
  assert (select student_name from public.preference_requests where id = v_pref)
    = 'طالب تفضيل', 'preference name is trimmed';
  assert (select description from public.preference_requests where id = v_pref)
    = 'وصف الاحتياج', 'preference description is trimmed';
  assert (select age from public.preference_requests where id = v_pref)
    is null, 'age remains optional';
  assert (select student_id from public.preference_requests where id = v_pref)
    is null, 'preference student link starts null';

  select * into v_job
  from public.student_request_notifications
  where preference_request_id = v_pref;
  assert v_job.id is not null and v_job.subscription_request_id is null,
    'preference insert enqueues exactly one job';

  select id into v_min_name
  from public.preference_requests
  where whatsapp = '201012345679';
  assert (select student_name from public.preference_requests where id = v_min_name)
    = 'س', 'one-character name is accepted';

  assert (select count(*) from public.preference_requests
    where whatsapp = '201012220000') = 2,
    'repeat requests with the same contact are both saved';
  assert (select count(*) from public.student_request_notifications n
    join public.preference_requests r on r.id = n.preference_request_id
    where r.whatsapp = '201012220000') = 2,
    'each repeat request has its own outbox job';

  select id into v_repeat
  from public.preference_requests
  where whatsapp = '201012220000'
  order by id desc
  limit 1;

  insert into sr_test_ids(key, id)
  values ('sub', v_sub), ('pref', v_pref), ('min_name', v_min_name),
         ('repeat', v_repeat);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Malicious/rejected public inserts
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_teacher uuid;
  v_other_student uuid;
  v_student uuid;
begin
  select id into v_teacher from sr_test_ids where key = 'teacher';
  select id into v_other_student from sr_test_ids where key = 'other_student';
  select id into v_student from sr_test_ids where key = 'student';

  execute 'set local role anon';

  begin
    insert into public.subscription_requests
      (teacher_id, student_name, whatsapp, status)
    values (v_teacher, 'طالب', '01012345001', 'contacted');
    raise exception 'anon status insert unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;

  begin
    insert into public.subscription_requests
      (teacher_id, student_name, whatsapp, notes)
    values (v_teacher, 'طالب', '01012345002', 'admin note');
    raise exception 'anon notes insert unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;

  begin
    insert into public.subscription_requests
      (teacher_id, student_name, whatsapp, history)
    values (v_teacher, 'طالب', '01012345003', '[{"status":"contacted"}]'::jsonb);
    raise exception 'anon history insert unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;

  begin
    insert into public.subscription_requests
      (teacher_id, student_name, whatsapp, processed_by)
    values (v_teacher, 'طالب', '01012345004', gen_random_uuid());
    raise exception 'anon processed_by insert unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;

  begin
    insert into public.preference_requests
      (student_name, whatsapp, student_id)
    values ('طالب', '01012345005', v_other_student);
    raise exception 'anon student_id insert unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;

  begin
    insert into public.subscription_requests
      (student_name, whatsapp, teacher_id)
    values ('طالب', '01012345006', gen_random_uuid());
    raise exception 'invalid teacher id unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    insert into public.subscription_requests(student_name, whatsapp)
    values ('طالب', '01012345007');
    raise exception 'missing teacher unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    insert into public.preference_requests(student_name, whatsapp, age)
    values ('طالب', '01012345008', 4);
    raise exception 'invalid age unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    insert into public.preference_requests(student_name, whatsapp)
    values ('   ', '01012345009');
    raise exception 'blank name unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    insert into public.preference_requests(student_name, whatsapp)
    values ('طالب', 'not-a-phone');
    raise exception 'invalid WhatsApp unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  execute 'reset role';

  -- An authenticated caller cannot link even their own account.
  perform set_config('request.jwt.claim.sub', v_student::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.preference_requests
      (student_name, whatsapp, student_id)
    values ('طالب', '01012345010', v_student);
    raise exception 'authenticated student_id insert unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  execute 'reset role';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Authenticated inserts, RLS admin-only reads
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_admin uuid;
  v_student uuid;
  v_auth_pref uuid;
begin
  select id into v_admin from sr_test_ids where key = 'admin';
  select id into v_student from sr_test_ids where key = 'student';

  perform set_config('request.jwt.claim.sub', v_student::text, true);
  execute 'set local role authenticated';

  insert into public.preference_requests
    (student_name, whatsapp, age)
  values ('طالب مسجل', '+201234567890', 7);

  execute 'reset role';

  select id into v_auth_pref
  from public.preference_requests where whatsapp = '201234567890';
  assert v_auth_pref is not null, 'authenticated users may submit requests';
  assert (select age from public.preference_requests where id = v_auth_pref) = 7,
    'provided age is stored';
  assert (select student_id from public.preference_requests where id = v_auth_pref)
    is null, 'authenticated submissions do not auto-link the account';
  insert into sr_test_ids(key, id) values ('auth_pref', v_auth_pref);

  -- A normal authenticated user cannot read the admin queue or jobs.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  assert (select count(*) from public.subscription_requests) = 0,
    'non-admin cannot read subscription requests';
  assert (select count(*) from public.preference_requests) = 0,
    'non-admin cannot read preference requests';
  assert (select count(*) from public.student_request_notifications) = 0,
    'non-admin cannot read notification jobs';
  execute 'reset role';

  -- Active admins can read both request types and the outbox.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';
  assert (select count(*) from public.subscription_requests) >= 1,
    'admin reads subscription requests';
  assert (select count(*) from public.preference_requests) >= 1,
    'admin reads preference requests';
  assert (select count(*) from public.student_request_notifications) >= 1,
    'admin reads notification jobs';
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin update/retry RPCs: active admin, validation, history bound
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_admin uuid;
  v_inactive_admin uuid;
  v_sub uuid;
  v_history jsonb;
begin
  select id into v_admin from sr_test_ids where key = 'admin';
  select id into v_inactive_admin from sr_test_ids where key = 'inactive_admin';
  select id into v_sub from sr_test_ids where key = 'sub';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';

  perform public.admin_update_student_request(
    'subscription', v_sub, 'contacted', 'تم التواصل');

  begin
    perform public.admin_update_student_request(
      'subscription', v_sub, null, '');
    raise exception 'null status unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_update_student_request(
      null, v_sub, 'new', '');
    raise exception 'null type unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_update_student_request(
      'subscription', v_sub, 'closed', '');
    raise exception 'invalid status unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_update_student_request(
      'other', v_sub, 'new', '');
    raise exception 'invalid type unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_update_student_request(
      'subscription', v_sub, 'new', repeat('x', 4001));
    raise exception 'oversized notes unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_update_student_request(
      'subscription', gen_random_uuid(), 'new', '');
    raise exception 'update of a missing request unexpectedly succeeded';
  exception when others then
    if sqlstate <> 'PT404' then raise; end if;
  end;

  execute 'reset role';

  select history into v_history
  from public.subscription_requests where id = v_sub;

  assert (select status from public.subscription_requests where id = v_sub)
    = 'contacted', 'admin sets status';
  assert (select notes from public.subscription_requests where id = v_sub)
    = 'تم التواصل', 'admin sets notes';
  assert (select processed_by from public.subscription_requests where id = v_sub)
    = v_admin, 'admin is recorded as processor';
  assert jsonb_array_length(v_history) = 1, 'admin update appends history';
  assert v_history -> 0 ->> 'status' = 'contacted'
    and v_history -> 0 ->> 'by' = v_admin::text,
    'history entry records status and actor';

  -- Non-admin and inactive-admin callers cannot reach the RPC body.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_update_student_request(
      'subscription', v_sub, 'new', '');
    raise exception 'non-admin update unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', v_inactive_admin::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_update_student_request(
      'subscription', v_sub, 'new', '');
    raise exception 'inactive admin update unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  execute 'reset role';

  -- History is bounded: 20 pre-existing entries + one update keeps 20.
  update public.subscription_requests
  set history = (
    select jsonb_agg(jsonb_build_object('n', n))
    from generate_series(1, 20) n
  )
  where id = v_sub;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';
  perform public.admin_update_student_request('subscription', v_sub, 'new', '');
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);

  select history into v_history
  from public.subscription_requests where id = v_sub;
  assert jsonb_array_length(v_history) = 20, 'history stays bounded at 20';
  assert v_history -> -1 ->> 'status' = 'new', 'newest history entry is last';

  assert not has_function_privilege(
    'anon', 'public.admin_update_student_request(text,uuid,text,text)', 'EXECUTE'),
    'anon cannot execute admin update';
  assert has_function_privilege(
    'authenticated', 'public.admin_update_student_request(text,uuid,text,text)', 'EXECUTE'),
    'authenticated can reach admin update (body still checks admin)';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Worker claim: lease, concurrency guard, attempt cap, admin retry
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_admin uuid;
  v_sub uuid;
  v_job public.student_request_notifications;
begin
  select id into v_admin from sr_test_ids where key = 'admin';
  select id into v_sub from sr_test_ids where key = 'sub';

  execute 'set local role service_role';
  assert (select count(*) from public.claim_student_request_notifications(10)
    where subscription_request_id = v_sub) = 1,
    'service role claims a due job';
  execute 'reset role';

  select * into v_job
  from public.student_request_notifications
  where subscription_request_id = v_sub;
  assert v_job.attempts = 1, 'claim increments attempts';
  assert v_job.locked_until > now(), 'claim acquires a lease';

  execute 'set local role service_role';
  assert not exists (
    select 1 from public.claim_student_request_notifications(10)
    where subscription_request_id = v_sub
  ), 'leased job is not claimed again';
  execute 'reset role';

  -- Expired leases become claimable again.
  update public.student_request_notifications
  set locked_until = now() - interval '1 second',
      next_attempt_at = now() - interval '1 minute'
  where subscription_request_id = v_sub;

  execute 'set local role service_role';
  assert (select count(*) from public.claim_student_request_notifications(10)
    where subscription_request_id = v_sub) = 1,
    'expired lease is reclaimed';
  execute 'reset role';

  select * into v_job
  from public.student_request_notifications
  where subscription_request_id = v_sub;
  assert v_job.attempts = 2 and v_job.locked_until > now(),
    'reclaim increments attempts and renews the lease';

  -- Attempts >= 5 are never claimed.
  update public.student_request_notifications
  set attempts = 5,
      locked_until = null,
      next_attempt_at = now() - interval '1 minute'
  where id = v_job.id;

  execute 'set local role service_role';
  assert not exists (
    select 1 from public.claim_student_request_notifications(10)
    where id = v_job.id
  ), 'exhausted job is not claimed';
  execute 'reset role';

  -- Attempt four is claimable; the fifth attempt then exhausts the job.
  update public.student_request_notifications
  set attempts = 4,
      locked_until = null,
      next_attempt_at = now() - interval '1 minute'
  where id = v_job.id;
  execute 'set local role service_role';
  assert exists (
    select 1 from public.claim_student_request_notifications(10)
    where id = v_job.id
  ), 'job with four attempts is claimable';
  execute 'reset role';

  -- Admin retry must not reset a job while a worker holds an active lease.
  update public.student_request_notifications
  set attempts = 5,
      last_error = 'temporary failure',
      locked_until = now() + interval '1 hour'
  where id = v_job.id;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_retry_student_request_notification(v_job.id);
    raise exception 'active-lease retry unexpectedly succeeded';
  exception when others then
    if sqlstate <> '55006' then raise; end if;
  end;
  execute 'reset role';

  select * into v_job
  from public.student_request_notifications
  where id = v_job.id;
  assert v_job.attempts = 5 and v_job.locked_until > now()
    and v_job.last_error = 'temporary failure',
    'active-lease retry leaves the job untouched';

  -- Once the lease expires, admin retry resets everything.
  update public.student_request_notifications
  set locked_until = now() - interval '1 second'
  where id = v_job.id;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';
  perform public.admin_retry_student_request_notification(v_job.id);
  begin
    perform public.admin_retry_student_request_notification(null);
    raise exception 'null retry id unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);

  select * into v_job
  from public.student_request_notifications
  where id = v_job.id;
  assert v_job.attempts = 0, 'admin retry resets attempts';
  assert v_job.next_attempt_at <= now(), 'admin retry makes the job due';
  assert v_job.locked_until is null and v_job.last_error is null,
    'admin retry clears lease and error';

  assert has_function_privilege(
    'service_role', 'public.claim_student_request_notifications(integer)', 'EXECUTE'),
    'service role can claim jobs';
  assert not has_function_privilege(
    'authenticated', 'public.claim_student_request_notifications(integer)', 'EXECUTE'),
    'authenticated cannot claim jobs';
  assert not has_function_privilege(
    'anon', 'public.claim_student_request_notifications(integer)', 'EXECUTE'),
    'anon cannot claim jobs';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fulfillment / close: atomic teacher assignment, permanent delete, cascade
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_admin uuid;
  v_student uuid;
  v_teacher uuid;
  v_teacher2 uuid;
  v_pref uuid := gen_random_uuid();
  v_sub_fulfill uuid := gen_random_uuid();
  v_sub_rollback uuid := gen_random_uuid();
  v_sub_close uuid := gen_random_uuid();
begin
  select id into v_admin from sr_test_ids where key = 'admin';
  select id into v_student from sr_test_ids where key = 'student';
  select id into v_teacher from sr_test_ids where key = 'teacher';
  select id into v_teacher2 from sr_test_ids where key = 'teacher2';

  insert into public.preference_requests(id, student_name, whatsapp)
  values (v_pref, 'طالب تنفيذ', '01099990001');
  insert into public.subscription_requests
    (id, teacher_id, teacher_name, student_name, whatsapp)
  values (v_sub_fulfill, v_teacher, 'معلم أنون', 'طالب تنفيذ اشتراك', '01099990002');
  insert into public.subscription_requests
    (id, teacher_id, teacher_name, student_name, whatsapp)
  values (v_sub_rollback, v_teacher, 'معلم أنون', 'طالب فشل تنفيذ', '01099990003');
  insert into public.subscription_requests
    (id, teacher_id, teacher_name, student_name, whatsapp)
  values (v_sub_close, v_teacher, 'معلم أنون', 'طالب إغلاق', '01099990004');

  -- Give the requests admin state before they are deleted.
  update public.preference_requests
  set status = 'contacted', notes = 'note', history = '[{"n":1}]'::jsonb
  where id = v_pref;
  update public.subscription_requests
  set status = 'contacted', notes = 'note', history = '[{"n":1}]'::jsonb
  where id = v_sub_close;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';

  -- Preference fulfillment assigns the teacher then deletes the request.
  perform public.admin_fulfill_student_request(
    'preference', v_pref, v_student, v_teacher2);

  -- Subscription fulfillment overwrites an existing teacher assignment.
  perform public.admin_fulfill_student_request(
    'subscription', v_sub_fulfill, v_student, v_teacher);

  execute 'reset role';

  assert not exists (select 1 from public.preference_requests where id = v_pref),
    'fulfillment permanently deletes preference requests';
  assert not exists (select 1 from public.subscription_requests where id = v_sub_fulfill),
    'fulfillment permanently deletes subscription requests';
  assert not exists (
    select 1 from public.student_request_notifications
    where preference_request_id = v_pref
      or subscription_request_id = v_sub_fulfill
  ), 'jobs cascade when requests are fulfilled';
  assert (select teacher_id from public.student_profiles where id = v_student)
    = v_teacher, 'fulfillment overwrites the student teacher assignment';
  assert exists (select 1 from public.student_profiles where id = v_student),
    'the student account remains after request deletion';

  -- Failed fulfillment must leave request, job, and teacher untouched.
  update public.student_profiles
  set teacher_id = v_teacher2
  where id = v_student;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_fulfill_student_request(
      'subscription', v_sub_rollback, v_student, gen_random_uuid());
    raise exception 'fulfillment with a missing teacher unexpectedly succeeded';
  exception when others then
    if sqlstate <> 'PT404' then raise; end if;
  end;

  begin
    perform public.admin_fulfill_student_request(
      'subscription', v_sub_rollback, gen_random_uuid(), v_teacher);
    raise exception 'fulfillment with a missing student unexpectedly succeeded';
  exception when others then
    if sqlstate <> 'PT404' then raise; end if;
  end;

  begin
    perform public.admin_fulfill_student_request(
      'subscription', gen_random_uuid(), v_student, v_teacher);
    raise exception 'fulfillment with a missing request unexpectedly succeeded';
  exception when others then
    if sqlstate <> 'PT404' then raise; end if;
  end;

  begin
    perform public.admin_fulfill_student_request(
      null, v_sub_rollback, v_student, v_teacher);
    raise exception 'fulfillment with null type unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_fulfill_student_request(
      'other', v_sub_rollback, v_student, v_teacher);
    raise exception 'invalid fulfill type unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  -- Close is a permanent delete and cascades the job.
  perform public.admin_close_student_request('subscription', v_sub_close);

  begin
    perform public.admin_close_student_request(null, v_sub_rollback);
    raise exception 'close with null type unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    perform public.admin_close_student_request('other', v_sub_rollback);
    raise exception 'invalid close type unexpectedly succeeded';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  execute 'reset role';

  assert exists (select 1 from public.subscription_requests where id = v_sub_rollback),
    'failed fulfillment rolls back the request deletion';
  assert exists (
    select 1 from public.student_request_notifications
    where subscription_request_id = v_sub_rollback
  ), 'failed fulfillment rolls back the job deletion';
  assert (select teacher_id from public.student_profiles where id = v_student)
    = v_teacher2, 'failed fulfillment does not change the teacher assignment';

  assert not exists (select 1 from public.subscription_requests where id = v_sub_close),
    'close permanently deletes the request';
  assert not exists (
    select 1 from public.student_request_notifications
    where subscription_request_id = v_sub_close
  ), 'close cascades the notification job';

  -- A non-admin cannot fulfill or close even with valid ids.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_fulfill_student_request(
      'subscription', v_sub_rollback, v_student, v_teacher);
    raise exception 'non-admin fulfillment unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  begin
    perform public.admin_close_student_request('subscription', v_sub_rollback);
    raise exception 'non-admin close unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Outbox shape, unique enqueue, retention cleanup, legacy-row preservation
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_legacy uuid := gen_random_uuid();
  v_cleanup_old uuid := gen_random_uuid();
  v_cleanup_active uuid := gen_random_uuid();
  v_cleanup_expired_lease uuid := gen_random_uuid();
  v_cleanup_new uuid := gen_random_uuid();
  v_job public.student_request_notifications;
  v_sub uuid;
begin
  select id into v_sub from sr_test_ids where key = 'sub';

  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'student_request_notifications'
      and column_name in (
        'student_name', 'whatsapp', 'teacher_name', 'notes', 'description'
      )
  ), 'outbox contains request ids only, not copied PII';

  begin
    insert into public.student_request_notifications(attempts) values (0);
    raise exception 'job with no request unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    insert into public.student_request_notifications
      (subscription_request_id, preference_request_id)
    values (v_sub, (select id from sr_test_ids where key = 'pref'));
    raise exception 'job with two requests unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    insert into public.student_request_notifications(subscription_request_id)
    values (v_sub);
    raise exception 'duplicate outbox row unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  -- Old incomplete rows remain writable by privileged maintenance paths.
  insert into public.subscription_requests(id) values (v_legacy);
  update public.subscription_requests
  set student_name = 'legacy row',
      whatsapp = '01099990007',
      notes = 'legacy note'
  where id = v_legacy;

  select * into v_job
  from public.student_request_notifications
  where subscription_request_id = v_legacy;
  assert v_job.id is not null, 'new privileged insert still enqueues one job';
  assert (select count(*) from public.student_request_notifications
    where subscription_request_id = v_legacy) = 1,
    'updating a legacy row does not backfill another job';
  assert (select whatsapp from public.subscription_requests where id = v_legacy)
    = '01099990007', 'insert-only validation does not rewrite updates';

  -- Daily retention cleanup removes only exhausted, unleased jobs older than
  -- seven days. An active fifth-attempt lease must survive the sweep.
  insert into public.subscription_requests(id, student_name, whatsapp)
  values (v_cleanup_old, 'cleanup old', '01099990008'),
         (v_cleanup_active, 'cleanup active', '01099990010'),
         (v_cleanup_expired_lease, 'cleanup expired lease', '01099990011'),
         (v_cleanup_new, 'cleanup new', '01099990009');
  update public.student_request_notifications
  set attempts = 5, created_at = now() - interval '8 days',
      locked_until = null
  where subscription_request_id = v_cleanup_old;
  update public.student_request_notifications
  set attempts = 5, created_at = now() - interval '8 days',
      locked_until = now() + interval '1 hour'
  where subscription_request_id = v_cleanup_active;
  update public.student_request_notifications
  set attempts = 5, created_at = now() - interval '8 days',
      locked_until = now() - interval '1 hour'
  where subscription_request_id = v_cleanup_expired_lease;
  update public.student_request_notifications
  set attempts = 5, created_at = now() - interval '1 day',
      locked_until = null
  where subscription_request_id = v_cleanup_new;

  perform private.cleanup_student_request_notifications();

  assert not exists (
    select 1 from public.student_request_notifications
    where subscription_request_id = v_cleanup_old
  ), 'cleanup removes exhausted unleased jobs older than seven days';
  assert exists (
    select 1 from public.student_request_notifications
    where subscription_request_id = v_cleanup_active
  ), 'cleanup retains an active fifth-attempt lease';
  assert not exists (
    select 1 from public.student_request_notifications
    where subscription_request_id = v_cleanup_expired_lease
  ), 'cleanup removes old exhausted jobs whose lease expired';
  assert exists (
    select 1 from public.student_request_notifications
    where subscription_request_id = v_cleanup_new
  ), 'cleanup keeps exhausted jobs inside the seven-day window';

  -- The old preference HTTP trigger/function is gone.
  assert not exists (
    select 1 from pg_trigger
    where tgname = 'on_preference_request_insert'
      and tgrelid = 'public.preference_requests'::regclass
  ), 'legacy preference HTTP trigger is removed';
  assert to_regprocedure('public.notify_preference_telegram()') is null,
    'legacy preference HTTP function is removed';

  insert into sr_test_ids(key, id) values ('legacy', v_legacy);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin merged list: exact total, stable pagination, safe search, type/status
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_admin uuid;
  v_inactive_admin uuid;
  v_teacher uuid;
  v_ids uuid[] := array[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid()
  ];
  v_phone text;
  v_item jsonb;
  v_page jsonb;
  v_id uuid;
  v_prev uuid;
  v_seen uuid[] := '{}';
  v_offset integer;
  v_created timestamptz := now() - interval '1 hour';
begin
  select id into v_admin from sr_test_ids where key = 'admin';
  select id into v_inactive_admin from sr_test_ids where key = 'inactive_admin';
  select id into v_teacher from sr_test_ids where key = 'teacher';

  -- Five rows across both tables with the same created_at. Alternating types
  -- proves the combined order and paging are deterministic.
  for i in 1..5 loop
    v_phone := case
      when i = 5 then '0155500005'
      else '2015550000' || i::text
    end;

    if i % 2 = 1 then
      insert into public.subscription_requests
        (id, teacher_id, teacher_name, student_name, whatsapp, created_at,
         status)
      values (
        v_ids[i], v_teacher, 'معلم قائمة',
        'ListPaging ' || i::text, v_phone, v_created,
        case when i = 3 then 'contacted' else 'new' end
      );
    else
      insert into public.preference_requests
        (id, student_name, whatsapp, age, description, created_at, status)
      values (
        v_ids[i], 'ListPaging ' || i::text, v_phone, 10 + i,
        'summary description ' || i::text, v_created,
        case when i = 3 then 'contacted' else 'new' end
      );
    end if;
  end loop;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';

  -- Paging every two rows: no duplicates, stable id-desc order, total always 5.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  foreach v_offset in array array[0, 2, 4] loop
    select public.admin_list_student_requests(
      'all', null, 'ListPaging', v_offset, 2
    ) into v_page;

    assert (v_page ->> 'total')::integer = 5,
      'admin list returns the exact total on every page';

    for v_item in select value from jsonb_array_elements(v_page -> 'items') loop
      v_id := (v_item ->> 'id')::uuid;
      assert not v_id = any(v_seen), 'admin list pagination has no duplicates';
      assert v_prev is null or v_id < v_prev,
        'admin list orders same-timestamp rows by id desc';
      v_seen := v_seen || v_id;
      v_prev := v_id;
    end loop;
  end loop;

  assert cardinality(v_seen) = 5, 'admin list paging returns all five rows';
  assert (select id from (
    select id from public.subscription_requests where student_name like 'ListPaging %'
    union all
    select id from public.preference_requests where student_name like 'ListPaging %'
  ) expected order by id desc limit 1) = v_seen[1],
    'first row is the highest id';

  -- Negative offsets are clamped to zero without changing the first page.
  select public.admin_list_student_requests(
    'all', null, 'ListPaging', -10, 2
  ) into v_page;
  assert (v_page -> 'items' -> 0 ->> 'id')::uuid = v_seen[1],
    'negative offset is clamped to zero';

  -- Name search and localized/raw phone search.
  select public.admin_list_student_requests('all', null, 'ListPaging', 0, 20)
  into v_page;
  assert (v_page ->> 'total')::integer = 5, 'name search returns the fixture set';

  select public.admin_list_student_requests(
    'all', null, '٢٠١٥٥٥٠٠٠٠٣', 0, 20
  ) into v_page;
  assert (v_page ->> 'total')::integer = 1
    and (v_page -> 'items' -> 0 ->> 'id')::uuid = v_ids[3],
    'Arabic-digit phone search normalizes and matches';

  select public.admin_list_student_requests(
    'all', null, '0155500005', 0, 20
  ) into v_page;
  assert (v_page ->> 'total')::integer = 1
    and (v_page -> 'items' -> 0 ->> 'id')::uuid = v_ids[5],
    'raw legacy local phone search matches';

  -- LIKE metacharacters and SQL-looking input stay literal/safe.
  select public.admin_list_student_requests('all', null, '%', 0, 20)
  into v_page;
  assert (v_page ->> 'total')::integer = 0,
    'percent is escaped instead of matching everything';

  select public.admin_list_student_requests(
    'all', null, 'x'' OR 1=1--', 0, 20
  ) into v_page;
  assert (v_page ->> 'total')::integer = 0,
    'SQL-looking search stays a bound literal';

  -- Type and status filters.
  select public.admin_list_student_requests(
    'subscription', null, 'ListPaging', 0, 20
  ) into v_page;
  assert (v_page ->> 'total')::integer = 3, 'subscription filter counts three';

  select public.admin_list_student_requests(
    'preference', null, 'ListPaging', 0, 20
  ) into v_page;
  assert (v_page ->> 'total')::integer = 2, 'preference filter counts two';
  assert (v_page -> 'items' -> 0 ? 'description')
    and not (v_page -> 'items' -> 0 ? 'notes')
    and not (v_page -> 'items' -> 0 ? 'history'),
    'list rows include request summary but not notes/history';

  select public.admin_list_student_requests(
    'all', 'contacted', 'ListPaging', 0, 20
  ) into v_page;
  assert (v_page ->> 'total')::integer = 1
    and (v_page -> 'items' -> 0 ->> 'status') = 'contacted',
    'status filter returns only contacted rows';

  execute 'reset role';

  -- Non-admin and inactive-admin callers are denied.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_list_student_requests('all', null, null, 0, 20);
    raise exception 'non-admin list unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', v_inactive_admin::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_list_student_requests('all', null, null, 0, 20);
    raise exception 'inactive-admin list unexpectedly succeeded';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);

  assert not has_function_privilege(
    'anon',
    'public.admin_list_student_requests(text,text,text,integer,integer)',
    'EXECUTE'
  ), 'anon cannot execute admin list';
  assert has_function_privilege(
    'authenticated',
    'public.admin_list_student_requests(text,text,text,integer,integer)',
    'EXECUTE'
  ), 'authenticated can reach admin list (body still checks admin)';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Scheduled jobs and table/function privileges
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('cron.job') is not null then
    assert exists (
      select 1 from cron.job where jobname = 'student-request-notifications-worker'
    ), 'minute worker cron is scheduled';
    assert exists (
      select 1 from cron.job where jobname = 'student-request-notifications-cleanup'
    ), 'daily retention cleanup cron is scheduled';
  end if;

  assert has_table_privilege('anon', 'public.subscription_requests', 'INSERT'),
    'anon can submit subscription requests';
  assert has_table_privilege('anon', 'public.preference_requests', 'INSERT'),
    'anon can submit preference requests';
  assert has_table_privilege('authenticated', 'public.subscription_requests', 'INSERT'),
    'authenticated can submit subscription requests';
  assert has_table_privilege('authenticated', 'public.preference_requests', 'INSERT'),
    'authenticated can submit preference requests';

  assert not has_table_privilege('anon', 'public.subscription_requests', 'SELECT'),
    'anon cannot read subscription requests';
  assert not has_table_privilege('anon', 'public.preference_requests', 'SELECT'),
    'anon cannot read preference requests';
  assert not has_table_privilege('anon', 'public.subscription_requests', 'UPDATE'),
    'anon cannot update requests directly';
  assert not has_table_privilege('anon', 'public.subscription_requests', 'DELETE'),
    'anon cannot delete requests directly';
  assert not has_table_privilege('authenticated', 'public.preference_requests', 'UPDATE'),
    'authenticated cannot update requests directly';
  assert not has_table_privilege('authenticated', 'public.preference_requests', 'DELETE'),
    'authenticated cannot delete requests directly';

  assert not has_table_privilege('anon', 'public.student_request_notifications', 'SELECT'),
    'anon cannot read notification jobs';
  assert not has_table_privilege('anon', 'public.student_request_notifications', 'INSERT'),
    'anon cannot write notification jobs';
  assert has_table_privilege('authenticated', 'public.student_request_notifications', 'SELECT'),
    'authenticated admins can read jobs through RLS';
  assert not has_table_privilege('authenticated', 'public.student_request_notifications', 'INSERT'),
    'authenticated cannot write notification jobs';

  assert not has_function_privilege(
    'anon', 'public.admin_fulfill_student_request(text,uuid,uuid,uuid)', 'EXECUTE'),
    'anon cannot execute fulfillment';
  assert not has_function_privilege(
    'anon', 'public.admin_close_student_request(text,uuid)', 'EXECUTE'),
    'anon cannot execute close';
  assert not has_function_privilege(
    'anon', 'public.admin_retry_student_request_notification(uuid)', 'EXECUTE'),
    'anon cannot execute retry';
end $$;

-- Regression coverage for whitespace and stable phone canonicalization, short
-- numeric searches, and a notification removed before an admin retries it.
do $$
declare
  v_admin uuid;
  v_unrelated uuid := gen_random_uuid();
  v_matching uuid := gen_random_uuid();
  v_page jsonb;
  v_search text;
begin
  select id into v_admin from sr_test_ids where key = 'admin';

  insert into public.preference_requests (id, student_name, whatsapp)
  values (v_unrelated, 'Short search unrelated', '1111111111'),
         (v_matching, 'Short search matching', '2055555555');

  execute 'set local role anon';
  insert into public.preference_requests (student_name, whatsapp)
  values ('whitespace international', E'\t+447700900123'),
         ('nonbreaking international', chr(160) || '+201012345678'),
         (chr(160) || E'\tاسم منظّم\n', '01112345678');

  begin
    insert into public.preference_requests (student_name, whatsapp)
    values (E'\t\n' || chr(160), '01112345678');
    raise exception 'whitespace-only name unexpectedly accepted';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;

  begin
    insert into public.preference_requests (student_name, whatsapp)
    values ('invalid country code', E'\t+٠١٠١٢٣٤٥٦٧٨');
    raise exception 'international zero country code unexpectedly accepted';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  execute 'reset role';

  assert (select whatsapp from public.preference_requests
    where student_name = 'whitespace international') = '447700900123',
    'tab-prefixed international phone matches JS normalization';
  assert (select whatsapp from public.preference_requests
    where student_name = 'nonbreaking international') = '201012345678',
    'nonbreaking-space international phone matches JS normalization';
  assert exists (select 1 from public.preference_requests
    where student_name = 'اسم منظّم'),
    'direct public submission trims non-ASCII and control whitespace from names';
  assert (select whatsapp from public.preference_requests
    where student_name = 'whitespace international') =
    private.normalize_phone_digits((select whatsapp from public.preference_requests
      where student_name = 'whitespace international')),
    'stored canonical phone is idempotent';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';
  foreach v_search in array array['2', '٢', '20'] loop
    select public.admin_list_student_requests('all', null, v_search, 0, 100)
    into v_page;
    assert not exists (
      select 1 from jsonb_array_elements(v_page -> 'items') item
      where (item ->> 'id')::uuid = v_unrelated
    ), 'short numeric search must not match an unrelated phone';
    assert exists (
      select 1 from jsonb_array_elements(v_page -> 'items') item
      where (item ->> 'id')::uuid = v_matching
    ), 'short numeric search still matches the literal number';
  end loop;

  begin
    perform public.admin_retry_student_request_notification(gen_random_uuid());
    raise exception 'retry of a missing notification unexpectedly succeeded';
  exception when others then
    if sqlstate <> 'PT404' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

rollback;
