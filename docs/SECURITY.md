# Security

## Current First Version

The app uses a signed, expiring owner session cookie for local route protection. The signing key should be provided through `MYOS_SESSION_SECRET`; local Supabase setups may temporarily fall back to the server-only `SUPABASE_SERVICE_ROLE_KEY` for compatibility. If `OWNER_EMAIL` is unset, it uses `owner@example.com` for local demo access.

Core data APIs now require that owner session before returning or changing private data. The backend uses server-only route handlers. Supabase secrets are never exposed to the browser. When Supabase is not configured, the app stores local data in `work/server-data`, which is suitable for this machine but not for hosted production.

## Required Production Controls

- Configure `OWNER_EMAIL` and a unique `MYOS_SESSION_SECRET`.
- Use Supabase Auth for real login.
- Keep all private tables behind RLS.
- Keep Storage buckets private.
- Keep secrets server-only.
- Never expose Service Role Key, AI keys, n8n secrets, or GitHub tokens to browser code.
- Set a unique `MYOS_SESSION_SECRET` in every environment before using MyOS as a remotely hosted production system. Supabase Auth remains the recommended future replacement for passwordless production login.

## Logging

Activity logs should record action type, entity type, id, result, and sanitized metadata. They must not store secrets, passwords, full webhook URLs, or unnecessary private file contents.

## Privacy Levels

MyOS now classifies content as:

- `normal`: projects, learning tasks, ordinary knowledge
- `sensitive`: finance, relationships, mood, health summaries
- `vault`: private diary, health details, IDs, extremely private files

Current iteration implements schema and UI-level handling. Sensitive modules write sanitized activity descriptions only. Search results should not show `vault` full body content.

## Vault Roadmap

Client-side encrypted vault storage is deferred. Do not implement a custom encryption scheme until there is a reviewed threat model, recovery plan, key derivation strategy, and migration path.
