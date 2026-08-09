alter table public.profiles
  add column if not exists myos_seeded_at timestamptz;
