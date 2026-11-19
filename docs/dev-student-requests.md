# DEV frontend setup — student requests

Development project: `bmliuvnxfsayjmufavma` (`dev`).
Never point local frontend work at production `hzealjrdtlfhkqhszkta`.

## Local Supabase

The hosted dev database and local Docker database are separate. To update the
local schema without deleting its data, start Supabase and apply migrations:

```bash
npx supabase start
npx supabase db push --local
```

For Telegram, the ignored `supabase/functions/.env` must contain the existing
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_REQUEST_CHAT_ID`, a random
`STUDENT_REQUESTS_WORKER_SECRET`, and
`STUDENT_REQUESTS_APP_ORIGIN=http://localhost:5173` (or the local frontend's
actual origin). Existing setups using `PUBLIC_APP_ORIGIN` continue to work. Keep
the file private and never commit or share its contents. The local admin link
works only on that machine.

The same worker secret must be in local Vault, together with the local Docker
endpoint. The following command reads the secret from the file without putting
it in shell history or command arguments. It creates missing entries but refuses
to overwrite different existing values. It connects only to local Supabase.

```bash
python3 - <<'PY'
import os, subprocess
from pathlib import Path

values = {}
for line in Path('supabase/functions/.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"\'')
secret = values.get('STUDENT_REQUESTS_WORKER_SECRET')
if not secret:
    raise SystemExit('Set STUDENT_REQUESTS_WORKER_SECRET in the private env file first.')
quote = lambda s: "'" + s.replace("'", "''") + "'"
endpoint = 'http://kong:8000/functions/v1/student-request-notifications'
sql = f'''begin;
do $body$
begin
  if exists (select 1 from vault.decrypted_secrets where name = 'student_requests_worker_secret' and decrypted_secret is distinct from {quote(secret)})
     or exists (select 1 from vault.decrypted_secrets where name = 'student_requests_worker_url' and decrypted_secret is distinct from {quote(endpoint)}) then
    raise exception 'Existing local Vault configuration differs; refusing to overwrite';
  end if;
  if not exists (select 1 from vault.secrets where name = 'student_requests_worker_secret') then
    perform vault.create_secret({quote(secret)}, 'student_requests_worker_secret');
  end if;
  if not exists (select 1 from vault.secrets where name = 'student_requests_worker_url') then
    perform vault.create_secret({quote(endpoint)}, 'student_requests_worker_url');
  end if;
end $body$;
commit;'''
subprocess.run(['psql', '-h', '127.0.0.1', '-p', '54322', '-U', 'postgres',
                '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], input=sql, text=True,
               env={**os.environ, 'PGPASSWORD': 'postgres'}, check=True)
PY
```

Start the local functions in a separate terminal and keep them running:

```bash
npx supabase functions serve
```

The scheduled worker sends new requests asynchronously. Repeat the Vault setup
after a local database reset; do not reset merely to apply migrations. Existing
requests created before the outbox migration are retained but are not
automatically sent retroactively.

## 1. Local environment

If it does not already exist, create an ignored `.env.dev.local` (not `.env.local`) with:

```dotenv
VITE_SUPABASE_URL='https://bmliuvnxfsayjmufavma.supabase.co'
VITE_SUPABASE_PUBLISHABLE_KEY='<dev publishable key>'
```

Get the publishable key from the dev project dashboard or an authorized operator.
Avoid listing all API keys in a terminal: that can expose unrelated secret keys.

Do not commit keys, paste them into chat, or put the service/secret key in a
`VITE_*` variable. The publishable key is public in the browser bundle, but keep
it out of git anyway. `studentsService.invokeAdminFunction` sends
`VITE_SUPABASE_PUBLISHABLE_KEY` as the `apikey`; an anon-key fallback is not
required for this flow.

Run the dev frontend in `dev` mode so Vite loads `.env.dev.local`:

```bash
npm run dev -- --mode dev
```

Do not copy production data or overwrite `.env.local`. Local mock/unit tests do
not need this env file.

## 2. Edge function

Student creation reuses the existing protected `admin-create-student` function.
It verifies the bearer session and an active `admin_users` row itself. The
gateway check is disabled in `supabase/config.toml` (`verify_jwt = false`) for
the same reason as the existing worker functions, so the handler can return its
own `401` / `403` responses.

Deploy only this function to dev:

```bash
npx supabase functions deploy admin-create-student \
  --use-api \
  --project-ref bmliuvnxfsayjmufavma
```

Verify:

```bash
npx supabase functions list --project-ref bmliuvnxfsayjmufavma
```

Expected: `admin-create-student` is `ACTIVE`, version `1` or newer, and
`verify_jwt=false`. Do not deploy to production.

## 3. Admin bootstrap (authorized operator only)

1. In the dev Supabase dashboard, create the admin user under Authentication.
2. Insert the matching auth user id into `admin_users`:

```sql
insert into public.admin_users (id, email, is_active)
values ('<auth-user-uuid>', '<admin-email>', true)
on conflict (id) do update
set email = excluded.email,
    is_active = true;
```

Keep passwords and service/secret keys out of docs, tickets, and chat. The
existing baseline grants and admin-facing `student_profiles` policies cover
admin reads; the function uses its server-side admin key.

## 4. Dev fixtures and cleanup

The dev project starts without teachers. To exercise the request/admin UI,
create fixture teacher and test-student records through the admin UI (or a
transactional SQL fixture), then remove them when the test finishes. Do not seed
production or copy production rows. Issue 17 migrations are already applied to
dev; do not apply migrations from this document.

## 5. Current dev status (2026-11-06)

Deployed and active on dev:

- `student-request-notifications` — `verify_jwt=false`
- `notify-preference-telegram` — `verify_jwt=false`
- `admin-create-student` — `verify_jwt=false`, version 2 with robust duplicate detection

Smoke results against dev:

- `POST` without `Authorization`: `401 {"error":"Missing bearer token"}`
- invalid bearer: `401 {"error":"Invalid or expired session"}`
- valid non-admin session: `403 {"error":"Admin access required"}`
- first student create: `201`; same phone again: `409 {"error":"رقم الهاتف هذا مسجل بالفعل."}`
- synthetic admin and student users, profiles, and `admin_users` rows cleaned up

Real dev UI tests need the URL and publishable key above. Mock tests do not.
