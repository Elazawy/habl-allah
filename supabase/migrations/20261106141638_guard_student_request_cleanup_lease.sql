-- Do not delete a fifth-attempt job while a worker still holds its lease.
-- The worker may legally be performing its final send; removing the row during
-- that window would make the worker's fenced success/delete path ambiguous.
-- Expired leases remain eligible for the seven-day retention cleanup.

begin;

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
    and created_at < now() - interval '7 days'
    and (locked_until is null or locked_until <= now());

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function private.cleanup_student_request_notifications() from public;

comment on function private.cleanup_student_request_notifications() is
  'Daily retention cleanup: removes exhausted, unleased notification jobs older than seven days without depending on worker configuration.';

commit;
