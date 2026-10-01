begin;

-- One authoritative participation record for guests and account holders.
alter table public.competition_guest_participants
  add column student_id uuid references public.student_profiles(id) on delete set null;
create index cgp_student_idx on public.competition_guest_participants(student_id);
create unique index cgp_student_competition_key
  on public.competition_guest_participants(student_id, competition_id);

create or replace function private.normalize_phone_digits(raw_phone text)
returns text language sql immutable set search_path = '' as $$
  select case when btrim(coalesce(raw_phone, '')) not like '+%' and digits like '0%'
    then '2' || digits else digits end
  from (select regexp_replace(translate(coalesce(raw_phone, ''),
    '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '\D', '', 'g') as digits) n;
$$;

-- Abort on normalization collisions: never choose a winner or discard progress.
update public.competition_guest_participants
set normalized_phone = private.normalize_phone_digits(student_phone),
    student_phone = private.normalize_phone_digits(student_phone);
create unique index student_profiles_canonical_phone_key
  on public.student_profiles(private.normalize_phone_digits(phone));

-- Import the old signed-in path. Subscription + assignment describe the same
-- participation; pending/rejected requests are used only without a subscription.
insert into public.competition_guest_participants
  (competition_id, student_id, student_name, student_phone, normalized_phone,
   level, status, current_stage_id, final_rank, created_at, updated_at)
select s.competition_id, s.student_id, p.full_name,
  private.normalize_phone_digits(p.phone), private.normalize_phone_digits(p.phone),
  coalesce(a.level, 'المستوى العام'), coalesce(a.status, 'accepted'),
  a.current_stage_id, a.final_rank, s.subscribed_at, coalesce(a.updated_at, s.subscribed_at)
from public.student_competition_subscriptions s
join public.student_profiles p on p.id = s.student_id
left join public.student_stage_assignments a
  on a.student_id = s.student_id and a.competition_id = s.competition_id
where s.is_active;

insert into public.competition_guest_participants
  (competition_id, student_id, student_name, student_phone, normalized_phone,
   level, status, current_stage_id, final_rank, created_at, updated_at)
select a.competition_id, a.student_id, p.full_name,
  private.normalize_phone_digits(p.phone), private.normalize_phone_digits(p.phone),
  coalesce(a.level, 'المستوى العام'), a.status, a.current_stage_id, a.final_rank,
  a.assigned_at, a.updated_at
from public.student_stage_assignments a
join public.student_profiles p on p.id = a.student_id
where not exists (select 1 from public.student_competition_subscriptions s
  where s.student_id = a.student_id and s.competition_id = a.competition_id and s.is_active);

insert into public.competition_guest_participants
  (competition_id, student_id, student_name, student_phone, normalized_phone, level, status, created_at)
select r.competition_id, r.student_id, r.student_name,
  private.normalize_phone_digits(coalesce(p.phone, r.student_phone)),
  private.normalize_phone_digits(coalesce(p.phone, r.student_phone)),
  r.level, r.status, r.created_at
from public.competition_registration_requests r
left join public.student_profiles p on p.id = r.student_id
where not exists (select 1 from public.student_competition_subscriptions s
  where s.student_id = r.student_id and s.competition_id = r.competition_id and s.is_active)
and not exists (select 1 from public.student_stage_assignments a
  where a.student_id = r.student_id and a.competition_id = r.competition_id);

update public.competition_guest_participants g set student_id = p.id
from public.student_profiles p
where g.student_id is null and g.normalized_phone = private.normalize_phone_digits(p.phone);

create policy cgp_student_select on public.competition_guest_participants
for select to authenticated using (student_id = (select auth.uid()));
revoke all on public.competition_guest_participants from anon;
grant select, insert, update, delete on public.competition_guest_participants to authenticated;

-- Retire client writes to the old path; keeping historical rows avoids deleting
-- deployment data, but all application reads/writes now use the canonical table.
revoke insert, update, delete on public.competition_registration_requests,
  public.student_competition_subscriptions, public.student_stage_assignments from anon, authenticated;

-- Trigger helpers are private and cannot be invoked through the Data API.
create function private.link_competition_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize account creation and guest registration for the same phone.
  perform pg_advisory_xact_lock(hashtextextended(private.normalize_phone_digits(new.phone), 0));
  update public.competition_guest_participants set student_id = new.id, updated_at = now()
    where student_id is null and normalized_phone = private.normalize_phone_digits(new.phone);
  return new;
end;
$$;
revoke all on function private.link_competition_account() from public;
create trigger link_competition_account after insert on public.student_profiles
for each row execute function private.link_competition_account();

create function private.prepare_competition_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_phone text;
begin
  if new.student_id is not null then
    select p.phone into strict v_phone from public.student_profiles p where p.id = new.student_id;
    new.student_phone := v_phone;
  end if;
  new.normalized_phone := private.normalize_phone_digits(new.student_phone);
  new.student_phone := new.normalized_phone;
  perform pg_advisory_xact_lock(hashtextextended(new.normalized_phone, 0));
  if new.student_id is null then
    select p.id into new.student_id from public.student_profiles p
    where private.normalize_phone_digits(p.phone) = new.normalized_phone;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_competition_participant() from public;
create trigger prepare_competition_participant before insert or update
on public.competition_guest_participants for each row
execute function private.prepare_competition_participant();

-- Preserve the existing public RPC response shape. Public wrappers are invokers;
-- only the narrow private implementation bypasses RLS for phone-only access.
create function private.submit_linked_competition_participant(
  p_competition_id uuid, p_student_name text, p_student_phone text, p_level text)
returns setof public.competition_guest_participants
language plpgsql security definer set search_path = '' as $$
declare v_phone text; v_student uuid; v_row public.competition_guest_participants;
begin
  select p.id, p.phone into v_student, v_phone from public.student_profiles p where p.id = auth.uid();
  v_phone := private.normalize_phone_digits(coalesce(v_phone, p_student_phone));
  if char_length(btrim(coalesce(p_student_name, ''))) < 2
     or char_length(btrim(coalesce(p_level, ''))) < 1 or v_phone !~ '^\d{10,15}$' then
    raise exception 'يرجى التحقق من الاسم ورقم الهاتف والمستوى.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_phone, 0));
  select g.* into v_row from public.competition_guest_participants g
    where g.competition_id = p_competition_id and g.normalized_phone = v_phone;
  if found then return next v_row; return; end if;
  if not exists (select 1 from public.quran_competitions c
    where c.id = p_competition_id and c.is_published
      and (c.registration_deadline is null or c.registration_deadline >= current_date)) then
    raise exception 'المسابقة غير متاحة للتسجيل.';
  end if;
  insert into public.competition_guest_participants
    (competition_id, student_id, student_name, student_phone, normalized_phone, level)
  values (p_competition_id, v_student, btrim(p_student_name), v_phone, v_phone, btrim(p_level))
  on conflict on constraint cgparticipants_unique_competition_phone do nothing
  returning * into v_row;
  if v_row.id is null then
    select g.* into v_row from public.competition_guest_participants g
    where g.competition_id = p_competition_id and g.normalized_phone = v_phone;
  end if;
  return next v_row;
end;
$$;
revoke all on function private.submit_linked_competition_participant(uuid,text,text,text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.submit_linked_competition_participant(uuid,text,text,text) to anon, authenticated;

create or replace function public.submit_competition_guest_participant(
  p_competition_id uuid, p_student_name text, p_student_phone text, p_level text)
returns table (id uuid, competition_id uuid, student_name text, student_phone text,
  level text, status text, current_stage_id uuid, final_rank integer,
  public_access_token uuid, created_at timestamptz, updated_at timestamptz)
language sql security invoker set search_path = '' as $$
  select g.id, g.competition_id, g.student_name, g.student_phone, g.level, g.status,
    g.current_stage_id, g.final_rank, g.public_access_token, g.created_at, g.updated_at
  from private.submit_linked_competition_participant(
    p_competition_id, p_student_name, p_student_phone, p_level) g;
$$;

-- Phone-only recovery is an explicit product policy, not proof of ownership.
-- Move existing privileged recovery implementations behind invoker wrappers.
alter function public.recover_competition_guest_participant(uuid,text) set schema private;
create function public.recover_competition_guest_participant(p_competition_id uuid,p_student_phone text)
returns table (id uuid, competition_id uuid, student_name text, student_phone text,
  level text, status text, current_stage_id uuid, final_rank integer,
  public_access_token uuid, created_at timestamptz, updated_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.recover_competition_guest_participant(p_competition_id,p_student_phone);
$$;
alter function public.get_competition_guest_participant_by_token(uuid,uuid) set schema private;
create function public.get_competition_guest_participant_by_token(p_competition_id uuid,p_public_access_token uuid)
returns table (id uuid, competition_id uuid, student_name text, student_phone text,
  level text, status text, current_stage_id uuid, final_rank integer,
  created_at timestamptz, updated_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.get_competition_guest_participant_by_token(p_competition_id,p_public_access_token);
$$;
revoke all on function private.recover_competition_guest_participant(uuid,text),
  private.get_competition_guest_participant_by_token(uuid,uuid) from public;
grant execute on function private.recover_competition_guest_participant(uuid,text),
  private.get_competition_guest_participant_by_token(uuid,uuid) to anon, authenticated;
revoke all on function public.submit_competition_guest_participant(uuid,text,text,text),
  public.recover_competition_guest_participant(uuid,text),
  public.get_competition_guest_participant_by_token(uuid,uuid) from public;
grant execute on function public.submit_competition_guest_participant(uuid,text,text,text),
  public.recover_competition_guest_participant(uuid,text),
  public.get_competition_guest_participant_by_token(uuid,uuid) to anon, authenticated;

commit;
