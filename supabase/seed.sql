-- ---------------------------------------------------------------------------
-- Local development seed data. LOCAL DEV ONLY -- never run against production.
--
-- Runs automatically after migrations on `npx supabase db reset`
-- (wired up via `db.seed.sql_paths = ["./seed.sql"]` in supabase/config.toml).
--
-- What it does: creates a confirmed admin account so you can sign in at
-- /admin/login without having to hand-craft a user after every reset.
--
--     email:    admin@hablallah.com
--     password: admin123
--
-- "Admin" in this app means "has a row in public.admin_users with
-- is_active = true" (see private.is_admin()). There is no role column, so we
-- create the auth user AND the admin_users row.
--
-- Every statement is idempotent, so this file is safe to run repeatedly.
--
-- Note: the Auth Admin API is not reachable from plain SQL, so we write to
-- auth.users / auth.identities directly and hash the password with pgcrypto
-- bcrypt. pgcrypto lives in the `extensions` schema on Supabase, hence the
-- extensions.crypt(...) / extensions.gen_salt(...) qualification.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

-- A fixed UUID keeps the admin stable across resets, so anything that
-- references it (bookmarks, hand-written SQL, fixtures) keeps working.
-- Admin user id: 00000000-0000-0000-0000-000000000001

-- If an admin with this email already exists under a different id (e.g. one
-- created earlier via the Auth Admin API, which assigns a random uuid), drop it
-- so we converge on the fixed id. Without this, the insert below would trip the
-- `users_email_partial_key` unique index instead of hitting the id conflict.
-- The FKs on auth.identities and public.admin_users are ON DELETE CASCADE.
delete from auth.users
where email = 'admin@hablallah.com'
  and id <> '00000000-0000-0000-0000-000000000001'::uuid;

-- 1. The auth user. Only columns that actually exist on auth.users are set;
--    `confirmed_at` is a generated column (LEAST of the two confirmed_at
--    timestamps) and must not be written to. The token columns are set to ''
--    rather than NULL to match what GoTrue itself writes.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_anonymous,
  email_change_confirm_status,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  phone_change,
  phone_change_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@hablallah.com',
  extensions.crypt('admin123', extensions.gen_salt('bf', 10)),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email_verified":true}'::jsonb,
  false,
  false,
  0,
  '', '', '', '', '', '', '', ''
)
on conflict (id) do update
  set email              = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
      aud                = excluded.aud,
      role               = excluded.role,
      raw_app_meta_data  = excluded.raw_app_meta_data,
      updated_at         = now();

-- 2. The matching identity row. Modern GoTrue requires an `email` identity for
--    password sign-in to work -- without this the password grant returns
--    "Invalid login credentials". auth.identities.email is generated from
--    identity_data->>'email', so it is not set explicitly.
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@hablallah.com","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do update
  set user_id       = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at    = now();

-- 3. Grant admin. This is what private.is_admin() and the admin_users_self_read
--    RLS policy key off. Runs as `postgres` during db reset, so the missing
--    INSERT policy on admin_users is not an obstacle.
insert into public.admin_users (id, email, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'admin@hablallah.com',
  true
)
on conflict (id) do update
  set email      = excluded.email,
      is_active  = true,
      updated_at = now();
