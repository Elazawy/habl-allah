begin;

-- Align the database's required-name check with JavaScript's String.trim(),
-- including tabs and non-breaking spaces in direct public API submissions.
create function private.canonicalize_student_request_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_whitespace text := E' \t\n\r\f' || chr(11) || chr(160) || chr(5760)
    || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196)
    || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201)
    || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287)
    || chr(12288) || chr(65279);
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  new.student_name := btrim(coalesce(new.student_name, ''), v_whitespace);
  if new.student_name = '' then
    raise exception 'Student request name is required' using errcode = '22023';
  end if;
  return new;
end;
$function$;

revoke all on function private.canonicalize_student_request_name() from public;

create trigger canonicalize_preference_request_name
  before insert on public.preference_requests
  for each row execute function private.canonicalize_student_request_name();
create trigger canonicalize_subscription_request_name
  before insert on public.subscription_requests
  for each row execute function private.canonicalize_student_request_name();

commit;
