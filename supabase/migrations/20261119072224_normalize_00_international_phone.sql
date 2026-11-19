-- Treat a leading 00 international dialing prefix as equivalent to '+' in
-- student request intake and admin search, without changing the indexed
-- private.normalize_phone_digits() helper on student_profiles.

begin;

create or replace function private.canonicalize_student_request_phone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_raw text;
  v_digits text;
  v_phone text;
  -- ECMAScript String.trim() whitespace, including non-breaking spaces.
  v_whitespace text := E' \t\n\r\f' || chr(11) || chr(160) || chr(5760)
    || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196)
    || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201)
    || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287)
    || chr(12288) || chr(65279);
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  v_raw := btrim(coalesce(new.whatsapp, ''), v_whitespace);
  v_digits := regexp_replace(
    translate(v_raw, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
    '\D',
    '',
    'g'
  );

  if v_raw like '+%' then
    v_phone := v_digits;
    if v_phone like '0%' then
      raise exception 'International phone numbers must include a valid country code'
        using errcode = '22023';
    end if;
  elsif v_digits like '00%' then
    v_phone := substring(v_digits from 3);
    if v_phone like '0%' then
      raise exception 'International phone numbers must include a valid country code'
        using errcode = '22023';
    end if;
  else
    v_phone := private.normalize_phone_digits(v_raw);
  end if;

  new.whatsapp := v_phone;
  return new;
end;
$function$;

revoke all on function private.canonicalize_student_request_phone() from public;

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
  v_input_digits text;
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
    v_name_pattern := '%' || replace(
      replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_'
    ) || '%';
    if v_search ~ '^[0-9+()[:space:].,٠-٩۰-۹-]+$' then
      v_input_digits := regexp_replace(translate(v_search,
        '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '\D', '', 'g');
      v_phone_normalized := case
        when v_search not like '+%' and v_input_digits like '00%' then
          case
            when substring(v_input_digits from 3) <> ''
              and substring(v_input_digits from 3) not like '0%'
              then substring(v_input_digits from 3)
            else v_input_digits
          end
        else private.normalize_phone_digits(v_search)
      end;
      -- Only full Egyptian numbers have an alternate local form; a partial
      -- search such as "2" or "20" must stay literal.
      v_phone_raw := case
        when v_input_digits like '0%' and v_input_digits not like '00%' then v_input_digits
        when v_phone_normalized like '20%' and length(v_phone_normalized) >= 12
          then substring(v_phone_normalized from 2)
        when v_input_digits like '00%' then v_input_digits
        else ''
      end;
    else
      v_phone_normalized := '';
      v_phone_raw := '';
    end if;
  end if;

  with requests as (
    select sr.id, 'subscription'::text as request_type, sr.student_name,
      sr.whatsapp, sr.teacher_id, sr.teacher_name, null::text as gender_preference,
      null::integer as age, null::text as description, sr.status, sr.student_id,
      sr.created_at, sr.updated_at
    from public.subscription_requests sr
    union all
    select pr.id, 'preference'::text, pr.student_name, pr.whatsapp,
      null::uuid, null::text, pr.gender_preference, pr.age, pr.description,
      pr.status, pr.student_id, pr.created_at, pr.updated_at
    from public.preference_requests pr
  ), filtered as (
    select r.* from requests r
    where (v_type = 'all' or r.request_type = v_type)
      and (v_status is null or r.status = v_status)
      and (
        v_search is null
        or r.student_name ilike v_name_pattern escape '\'
        or (v_phone_normalized <> '' and (
          r.whatsapp ilike '%' || v_phone_normalized || '%'
          or (v_phone_raw <> '' and r.whatsapp ilike '%' || v_phone_raw || '%')
        ))
      )
  ), counted as (
    select count(*)::integer as total from filtered
  )
  select counted.total, coalesce((
    select jsonb_agg(to_jsonb(p)
      order by p.created_at desc nulls last, p.id desc, p.request_type asc)
    from (
      select * from filtered
      order by created_at desc nulls last, id desc, request_type asc
      offset v_offset limit v_limit
    ) p
  ), '[]'::jsonb)
  into v_total, v_items from counted;

  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$function$;

commit;
