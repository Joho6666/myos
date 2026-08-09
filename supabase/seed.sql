-- Local development seed.
-- This creates the owner auth user expected by MyOS local configuration.
-- Do not put real passwords, API keys, customer data, or private files here.

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
  is_super_admin
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'owner@example.com',
  crypt('myos-local-password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false
)
on conflict (id) do update set
  email = excluded.email,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"owner@example.com"}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do update set
  identity_data = excluded.identity_data,
  updated_at = now();
