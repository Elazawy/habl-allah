-- Migration: Add competition guest participation
-- Adds a dedicated `competition_guest_participants` table so students can join
-- competitions without creating an account, plus secure RPCs for the public
-- submit / recovery / token-lookup flows and admin stage management.
--
-- Product rules implemented here:
--   * One guest participant per (competition_id, normalized_phone).
--   * Rejected guests stay rejected: re-applying returns the rejected row
--     instead of creating a fresh pending request.
--   * No broad anonymous table access — anon goes through narrow RPCs only.
--   * Guests never get auth users or student_profiles rows.
--   * Signed-in competition applications keep using
--     competition_registration_requests but no longer require
--     country / birth_date / gender.

begin;

-- ──────────────────────────────────────────
-- 1. Relax competition_registration_requests for the simplified application
--    shape (name, phone, level only). country becomes nullable and the public
--    insert policy stops requiring birth_date / gender / country.
-- ──────────────────────────────────────────
alter table public.competition_registration_requests
  alter column country drop not null;

drop policy if exists "competition_registration_requests_public_insert"
  on public.competition_registration_requests;

create policy "competition_registration_requests_public_insert"
  on public.competition_registration_requests
  for insert
  to public
  with check (
    competition_id is not null
    and char_length(btrim(student_name)) >= 2
    and student_phone ~ '^\d{10,15}$'
    and char_length(btrim(level)) >= 1
    -- Legacy columns are optional now; validated only when present.
    and (country is null or char_length(btrim(country)) >= 2)
    and (
      birth_date is null
      or (
        birth_date >= (current_date - interval '120 years')
        and birth_date <= (current_date - interval '3 years')
      )
    )
    and (gender is null or gender in ('male', 'female'))
    and (
      student_id is null
      or ((auth.uid() is not null) and (student_id = auth.uid()))
    )
  );

-- ──────────────────────────────────────────
-- 2. Table: competition_guest_participants
-- ──────────────────────────────────────────
create table if not exists public.competition_guest_participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.quran_competitions(id) on delete cascade,
  student_name text not null check (char_length(btrim(student_name)) >= 2),
  student_phone text not null,
  normalized_phone text not null check (normalized_phone ~ '^\d{10,15}$'),
  level text not null check (char_length(btrim(level)) >= 1),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'active', 'rejected', 'failed', 'completed')),
  current_stage_id uuid references public.competition_stages(id) on delete set null,
  final_rank integer,
  public_access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  completed_at timestamptz,
  constraint cgparticipants_unique_competition_phone unique (competition_id, normalized_phone)
);

create index if not exists cgparticipants_competition_idx
  on public.competition_guest_participants(competition_id);

create index if not exists cgparticipants_stage_idx
  on public.competition_guest_participants(current_stage_id);

create index if not exists cgparticipants_status_idx
  on public.competition_guest_participants(status);

create unique index if not exists cgparticipants_token_idx
  on public.competition_guest_participants(public_access_token);

alter table public.competition_guest_participants enable row level security;

-- ──────────────────────────────────────────
-- 3. RLS policies
--    Admins manage everything; anon has NO table policies at all
--    (public access is only through the security definer RPCs below).
-- ──────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_guest_participants'
      and policyname = 'cgp_admin_select'
  ) then
    create policy cgp_admin_select
      on public.competition_guest_participants
      for select
      to authenticated
      using ((select private.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_guest_participants'
      and policyname = 'cgp_admin_insert'
  ) then
    create policy cgp_admin_insert
      on public.competition_guest_participants
      for insert
      to authenticated
      with check ((select private.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_guest_participants'
      and policyname = 'cgp_admin_update'
  ) then
    create policy cgp_admin_update
      on public.competition_guest_participants
      for update
      to authenticated
      using ((select private.is_admin()))
      with check ((select private.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_guest_participants'
      and policyname = 'cgp_admin_delete'
  ) then
    create policy cgp_admin_delete
      on public.competition_guest_participants
      for delete
      to authenticated
      using ((select private.is_admin()));
  end if;
end $$;

-- Data API grants (RLS + grants are separate in Supabase).
grant select, insert, update, delete on public.competition_guest_participants to authenticated;

-- ──────────────────────────────────────────
-- 4. Helper: normalized phone from localized digits
--    Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII,
--    then strips every non-digit character.
-- ──────────────────────────────────────────
create or replace function private.normalize_phone_digits(raw_phone text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      coalesce(raw_phone, ''),
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
      '01234567890123456789'
    ),
    '\D',
    '',
    'g'
  );
$$;

-- ──────────────────────────────────────────
-- 5. Public RPC: guest submits a participation request
--    Returns the public row shape; creates a pending row the first time and
--    returns the existing row (pending / accepted / active / rejected /
--    failed / completed) on duplicate submissions — never a duplicate row.
--
--    NOTE: column references are always table-qualified because RETURNS TABLE
--    output names (id, competition_id, …) would otherwise collide with them.
-- ──────────────────────────────────────────
create or replace function public.submit_competition_guest_participant(
  p_competition_id uuid,
  p_student_name text,
  p_student_phone text,
  p_level text
)
returns table (
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_normalized_phone text;
  v_existing public.competition_guest_participants;
  v_created public.competition_guest_participants;
begin
  -- Validate input (server-side mirror of the frontend validation).
  v_normalized_phone := private.normalize_phone_digits(p_student_phone);

  if p_competition_id is null then
    raise exception 'بيانات المسابقة غير مكتملة.';
  end if;

  if char_length(btrim(coalesce(p_student_name, ''))) < 2 then
    raise exception 'الاسم يجب أن يتكون من حرفين على الأقل.';
  end if;

  if v_normalized_phone !~ '^\d{10,15}$' then
    raise exception 'رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.';
  end if;

  if char_length(btrim(coalesce(p_level, ''))) < 1 then
    raise exception 'يرجى تحديد المستوى المطلوب.';
  end if;

  -- The competition must exist and be published for anonymous submission.
  if not exists (
    select 1
    from public.quran_competitions c
    where c.id = p_competition_id
      and c.is_published = true
  ) then
    raise exception 'المسابقة غير موجودة أو غير منشورة.';
  end if;

  -- Duplicate handling: return the existing row, whatever its status is.
  -- Rejected requests intentionally do NOT become pending again.
  select g.*
  into v_existing
  from public.competition_guest_participants g
  where g.competition_id = p_competition_id
    and g.normalized_phone = v_normalized_phone;

  if found then
    return query
      select
        v_existing.id,
        v_existing.competition_id,
        v_existing.student_name,
        v_existing.student_phone,
        v_existing.level,
        v_existing.status,
        v_existing.current_stage_id,
        v_existing.final_rank,
        v_existing.public_access_token,
        v_existing.created_at,
        v_existing.updated_at;
    return;
  end if;

  insert into public.competition_guest_participants (
    competition_id,
    student_name,
    student_phone,
    normalized_phone,
    level,
    status
  ) values (
    p_competition_id,
    btrim(p_student_name),
    v_normalized_phone,
    v_normalized_phone,
    btrim(p_level),
    'pending'
  )
  -- ON CONFLICT references the constraint by name (not the column list)
  -- because plpgsql treats the column-list form as expressions, which would
  -- collide with the RETURNS TABLE output names above.
  on conflict on constraint cgparticipants_unique_competition_phone do nothing
  returning * into v_created;

  -- A concurrent request may have inserted the same row between our SELECT
  -- and INSERT; fall back to reading the winner of the unique constraint.
  if v_created is null then
    select g.*
    into v_created
    from public.competition_guest_participants g
    where g.competition_id = p_competition_id
      and g.normalized_phone = v_normalized_phone;
  end if;

  return query
    select
      v_created.id,
      v_created.competition_id,
      v_created.student_name,
      v_created.student_phone,
      v_created.level,
      v_created.status,
      v_created.current_stage_id,
      v_created.final_rank,
      v_created.public_access_token,
      v_created.created_at,
      v_created.updated_at;
end;
$$;

grant execute on function public.submit_competition_guest_participant(uuid, text, text, text) to anon, authenticated;

-- ──────────────────────────────────────────
-- 6. Public RPC: recover guest participation by phone number only
--    Returns exactly one row when found; an EMPTY SET when not found
--    (never a row of NULLs). Phone-only by product decision.
-- ──────────────────────────────────────────
create or replace function public.recover_competition_guest_participant(
  p_competition_id uuid,
  p_student_phone text
)
returns table (
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_normalized_phone text;
  v_existing public.competition_guest_participants;
begin
  v_normalized_phone := private.normalize_phone_digits(p_student_phone);

  if p_competition_id is null then
    raise exception 'بيانات المسابقة غير مكتملة.';
  end if;

  if v_normalized_phone !~ '^\d{10,15}$' then
    raise exception 'رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.';
  end if;

  select g.*
  into v_existing
  from public.competition_guest_participants g
  where g.competition_id = p_competition_id
    and g.normalized_phone = v_normalized_phone;

  if found then
    return query
      select
        v_existing.id,
        v_existing.competition_id,
        v_existing.student_name,
        v_existing.student_phone,
        v_existing.level,
        v_existing.status,
        v_existing.current_stage_id,
        v_existing.final_rank,
        v_existing.public_access_token,
        v_existing.created_at,
        v_existing.updated_at;
  end if;
  -- Not found: fall through and return an empty set.
end;
$$;

grant execute on function public.recover_competition_guest_participant(uuid, text) to anon, authenticated;

-- ──────────────────────────────────────────
-- 7. Public RPC: token lookup for returning visitors
--    Used when localStorage holds a saved token (e.g. after applying on this
--    device). Narrow column list — no broad anon select policy on the table.
-- ──────────────────────────────────────────
create or replace function public.get_competition_guest_participant_by_token(
  p_competition_id uuid,
  p_public_access_token uuid
)
returns table (
  id uuid,
  competition_id uuid,
  student_name text,
  student_phone text,
  level text,
  status text,
  current_stage_id uuid,
  final_rank integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.competition_id,
    g.student_name,
    g.student_phone,
    g.level,
    g.status,
    g.current_stage_id,
    g.final_rank,
    g.created_at,
    g.updated_at
  from public.competition_guest_participants g
  where g.competition_id = p_competition_id
    and g.public_access_token = p_public_access_token;
$$;

grant execute on function public.get_competition_guest_participant_by_token(uuid, uuid) to anon, authenticated;

commit;
