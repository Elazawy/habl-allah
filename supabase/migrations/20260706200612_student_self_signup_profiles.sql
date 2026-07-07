create schema if not exists private;

create or replace function private.handle_new_student_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function private.handle_new_student_user() from public;

drop trigger if exists on_auth_student_user_created on auth.users;
create trigger on_auth_student_user_created
  after insert on auth.users
  for each row execute function private.handle_new_student_user();

drop policy if exists student_profiles_self_update on public.student_profiles;
drop policy if exists student_profiles_admin_update on public.student_profiles;

create policy student_profiles_admin_update
  on public.student_profiles for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
