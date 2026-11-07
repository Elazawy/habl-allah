# Student request Telegram notifications

Server-only outbox worker for the two student request insertion events:

| Source insert | Heading |
| --- | --- |
| `preference_requests` | `طلب مساعدة في اختيار معلم` |
| `subscription_requests` | `طلب اشتراك مع المعلم [teacher name]` |

It sends no "saved in admin" wording, status-change alerts, history entries,
password messages, reminders, or any other notification type.

## Delivery model

1. A migration-owned trigger inserts one PII-free row into
   `public.student_request_notifications` containing only the request foreign
   key. Cascading deletes remove the job when its request is deleted.
2. A migration-owned `pg_cron` job is already scheduled every minute and calls
   the worker with the Vault-backed `x-request-worker-secret` header. The
   invoker no-ops while the Vault `student_requests_worker_url` is absent. The
   Edge `STUDENT_REQUESTS_WORKER_SECRET` and Vault
   `student_requests_worker_secret` are already set equal; do not replace them
   independently.
3. The worker authenticates before reading Telegram configuration, then calls
   the service-only RPC `claim_student_request_notifications(p_limit)`.
4. The RPC increments `attempts`, takes a 2-minute `locked_until` lease, skips
   rows with `attempts >= 5`, and uses `FOR UPDATE SKIP LOCKED`.
5. The worker reloads the request fresh, then re-checks the outbox row with the
   full claim fence (`id`, `attempts`, `locked_until`) plus a live lease
   immediately before the send. A deleted request, a newer claim, or an admin
   reset makes the stale worker skip. An ownership-read network/abort error is
   treated separately: it schedules a fenced retry with normal backoff instead
   of silently consuming an attempt. A request deleted while a send is already
   in flight cannot be retracted.
6. Success deletes only the fenced job immediately. If the guarded delete
   matches no row, the current owner's row or admin reset is left untouched and
   no failure/retire update is written. Failure clears the lease and schedules a
   sanitized retry; those updates use the same fence, so a stale worker cannot
   overwrite an admin retry reset.
7. Retention is owned entirely by the DB daily SQL cleanup, which uses server
   `now()`, is lease-aware, and runs even while the worker is disabled. The
   worker does not prune rows and its response has no `pruned` field.

**No exactly-once guarantee.** Per-request unique indexes prevent duplicate
enqueue, but an ambiguous Telegram response, a delete failure after a successful
send, an admin retry, or a request deleted during an in-flight send can still
produce a duplicate or a send after cancellation. Treat delivery as at-least-once.

Batch size is 5. Each Telegram call and each Supabase DB call has an 8-second
abort timeout, and the worker stops starting new sends after 70 seconds. If the
budget is reached before any send, the worker fenced-releases its own claim:
`attempts` is decremented under the exact claim, the lease is cleared, and the
job becomes due immediately. A release update that matches no row is a safe
no-op. An expired lease is never modified because another worker may already own
it; it is left for lease expiry/reclaim. A failed release can still consume one
attempt, but no message is sent. Keep concurrent manual invocations small.

## Message contract

Plain text only. `parse_mode` is never sent. Every field and the final message
are capped at 4096 UTF-16 units, and the admin link is preserved.

Preference:

```text
طلب مساعدة في اختيار معلم

اسم الطالب: ...
رقم واتساب: ...
العمر: ...
القسم: ...

وصف الاحتياج:
...

وقت الإرسال: ... (توقيت القاهرة)
رقم الطلب: <request uuid>
رابط الإدارة: <PUBLIC_APP_ORIGIN>/admin/quran/requests?type=preference&id=<request uuid>
```

Subscription:

```text
طلب اشتراك مع المعلم <teacher name>

اسم الطالب: ...
رقم واتساب: ...

وقت الإرسال: ... (توقيت القاهرة)
رقم الطلب: <request uuid>
رابط الإدارة: <PUBLIC_APP_ORIGIN>/admin/quran/requests?type=subscription&id=<request uuid>
```

Missing optional values render as `غير محدد`. Preference section labels are
`معلم (قسم الرجال)`, `معلمة (قسم النساء)`, `أي قسم`, or `غير محدد`. Only
preference messages include age, section, and description.

## Security model

- Both routes have `verify_jwt = false` in `supabase/config.toml` because they
  are server/cron endpoints. Each rejects a missing or wrong
  `x-request-worker-secret` with `401` **only when the server-side worker secret
  is configured**.
- The shared secret is checked before the Telegram token or destination is
  read, so an unauthenticated caller gets `401` even when the Telegram token is
  missing. If `STUDENT_REQUESTS_WORKER_SECRET` itself is missing, the worker
  fails closed with `500`; configure that secret before using the 401 smoke
  test.
- On a valid request, missing token/chat/origin configuration returns a generic
  `500` before any job is claimed, so retry attempts are not burned.
- The service-role Supabase client is the shared
  `npm:@supabase/supabase-js@2.108.2` module. Never expose that key to a
  browser.
- Logs never include the bot token, raw Telegram URLs/errors, request links,
  student names, WhatsApp numbers, or descriptions. Persisted `last_error`
  values are from a small allowlist.

## Required configuration

| Name | Purpose | Status |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Bot token used only by the worker | **Pending** a new valid token, supplied privately. The old token was revoked. |
| `TELEGRAM_REQUEST_CHAT_ID` | Existing request destination | **Pending.** The old temp file is missing. Recover the **same existing** chat ID from the operator's private config or Telegram administration; never guess it or create a new destination. Do not print or commit it. |
| `STUDENT_REQUESTS_WORKER_SECRET` | Shared secret checked by the worker and by cron | **Already set equal** in the dev Edge secrets and Vault. Do not generate, resubmit, or rotate one side independently. |
| `PUBLIC_APP_ORIGIN` | Origin for the admin deep link, no trailing slash | **Pending.** Must be the actual publicly reachable dev admin origin; `localhost` and `127.0.0.1` are invalid because Telegram recipients open the link elsewhere. Do not guess from local frontend env or reuse production blindly. |
| `SUPABASE_URL` | Project URL | Platform-provided. |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEYS` | Service-role access | Platform-provided. |

Dev project ref: `bmliuvnxfsayjmufavma`. Never deploy or write secrets to the
production project. Every CLI command must pass
`--project-ref bmliuvnxfsayjmufavma`; the local CLI link may point at production.

### Secure setup (no values in argv, chat, or repo)

The user chose to configure the remaining values later. Do not upload secrets as
part of this worker change.

1. Do **not** regenerate or replace `STUDENT_REQUESTS_WORKER_SECRET`. The dev
   Edge secret and Vault `student_requests_worker_secret` are already equal and
   verified. If rotation is ever required, update both sides together from one
   private file, without logging or printing the value.
2. Create a private env file outside the repo, owned by the operator, mode
   `600`. Edit it with an editor so values never enter shell history or argv.
   It should contain only the three missing values, never the existing worker
   secret:

   ```text
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_REQUEST_CHAT_ID=
   PUBLIC_APP_ORIGIN=
   ```

3. Require all three values to be nonempty and validated first. Never run
   `secrets set` with blank values, which could overwrite a good secret.
4. Set only those Edge secrets from the file:

   ```bash
   chmod 600 "$PRIVATE_ENV_FILE"
   npx --yes supabase@2.115.0 secrets set \
     --env-file "$PRIVATE_ENV_FILE" \
     --project-ref bmliuvnxfsayjmufavma
   ```

5. The every-minute cron already exists; do not create a second one. It no-ops
   while Vault `student_requests_worker_url` is absent. Only after the token,
   chat ID, and origin are all validated, have the DB owner create that Vault
   entry with the exact dev URL. Leave the existing Vault
   `student_requests_worker_secret` unchanged. The URL is not a secret:

   ```bash
   npx --yes supabase@3.0.0 db query --remote=bmliuvnxfsayjmufavma --yes \
     "select vault.create_secret('https://bmliuvnxfsayjmufavma.supabase.co/functions/v1/student-request-notifications', 'student_requests_worker_url', 'Student request worker endpoint') where not exists (select 1 from vault.secrets where name = 'student_requests_worker_url')"
   ```

   This enables delivery for pending requests. Do not paste the token, chat ID,
   or worker secret into chat or a commit.

## Deploy and smoke-test (dev only)

Run local validation first:

```bash
npx --yes deno@2.9.6 check \
  supabase/functions/student-request-notifications/index.ts \
  supabase/functions/notify-preference-telegram/index.ts

npx --yes deno@2.9.6 test --allow-env \
  supabase/functions/student-request-notifications/
```

Then deploy only the tested routes, using the API bundler because Docker is not
available:

```bash
npx --yes supabase@2.115.0 functions deploy \
  student-request-notifications notify-preference-telegram \
  --project-ref bmliuvnxfsayjmufavma \
  --use-api
```

The deploy requires a configured Supabase access token. Do not fall back to the
linked production project.

Smoke-test without sending a request (no secret header):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  https://bmliuvnxfsayjmufavma.supabase.co/functions/v1/student-request-notifications

curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  https://bmliuvnxfsayjmufavma.supabase.co/functions/v1/notify-preference-telegram
```

Expect `401` for both unauthenticated POSTs once
`STUDENT_REQUESTS_WORKER_SECRET` is configured; without that server-side secret
the worker fails closed with `500` by design. `GET` must return `405`. The
legacy `notify-preference-telegram` route delegates to the same handler and does
not process the old webhook payload.

## Database contract (owned by the migration)

The worker expects `public.student_request_notifications` with:

- `id`
- exactly one of `subscription_request_id` / `preference_request_id`, nullable,
  `ON DELETE CASCADE`
- `attempts`, `next_attempt_at`, `locked_until`, `last_error`, `created_at`
- no copied PII

It also expects `public.claim_student_request_notifications(p_limit integer
default 10)`, service-role only, returning the columns above after incrementing
`attempts` and leasing for 2 minutes.

The migration owns both insert triggers and the cron/Vault wiring. The worker
does not create tables, triggers, Vault entries, or cron jobs, and does not
insert outbox rows.

## Retry and retention

`attempts` is incremented by the claim RPC before the send:

| Attempt | Delay after failure |
| --- | --- |
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 1 hour |
| 5 | No automatic retry; retained for admin retry |

An admin retry resets `attempts`, clears the lease, and makes the job due. A
stale worker's guarded update cannot overwrite that reset. Exhausted jobs are
retained for admin retry and pruned after 7 days by the migration-owned daily
SQL cleanup, using server `now()` and excluding active leases:

```sql
delete from public.student_request_notifications
where attempts >= 5
  and created_at < now() - interval '7 days'
  and (locked_until is null or locked_until <= now());
```

This DB cleanup runs even while the worker is disabled, so retention does not
depend on worker availability or worker/DB clock agreement. The worker does not
run its own prune.

## Tests

The tests do not call Telegram or mutate a remote project. Integration tests
inject a fake Supabase client and mock `fetch`:

- unauthenticated call rejected before Telegram token is read;
- missing worker secret fails closed;
- missing Telegram token/config does not claim or retry a job;
- non-POST returns `405`;
- missing request and cancellation before send do not deliver;
- plain-text success deletes only the fenced job;
- send failure stores a safe reason, schedules 1m/5m/15m/1h retries, and leaves
  the job in place, including the fifth/exhausted failure;
- stale or expired leases and wrong claim ownership skip before the send;
- an ownership-read DB error or abort schedules a fenced retry with
  `notification_delivery_failed` backoff and no Telegram send;
- a batch-budget release returns the attempt, clears the lease, and sends
  nothing; an expired lease is left for service reclaim;
- a successful send whose guarded delete matches no row leaves the current
  owner/reset row untouched and does not retire or fail it;
- guarded failure updates that match no row are safe;
- a successful-send delete error retires with a safe reason;
- invalid jobs and subscription dispatch behave correctly;
- claim RPC failure does not send.

## Operations

- Response bodies contain only counts (`claimed`, `sent`, `failed`, `skipped`),
  never message content, secrets, or a `pruned` field.
- The dev worker secret is already equal in Edge and Vault. Never resubmit or
  rotate only one side. If rotation is ever necessary, update both together from
  one private file without printing or logging the value.
- To change the destination, update `TELEGRAM_REQUEST_CHAT_ID` only, and only
  with the existing operator-owned chat ID. Do not create a new destination.
- Do not deploy an old or revoked bot token, and do not rewrite git history for
  the previously exposed token.
