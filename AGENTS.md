# MyOS Project Rules

## Goal

MyOS is a private, single-user personal digital operating system. It manages AI workflows, projects, inbox items, files, knowledge notes, prompts, automations, learning tracks, engineering projects, business orders, bookmarks, settings, and activity logs.

This is not a public tool directory, SaaS landing page, or blog. The root route redirects to `/login` or `/app`.

## Stack

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS plus project CSS tokens
- shadcn/ui-compatible component style
- Lucide Icons
- React Hook Form and Zod for forms
- Supabase PostgreSQL, Auth, Storage, and SSR client
- n8n through server-side webhook adapter
- AI Provider Adapter for OpenAI, OpenRouter, and Ollama
- pnpm

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`

## Architecture Rules

- Keep public, auth, and private layouts separate.
- Keep business logic out of large React components.
- Use Server Components by default; use Client Components for browser state, shortcuts, local CRUD, and interactive UI.
- Keep data access, AI calls, automation calls, storage, validation, and UI components separated.
- Do not create giant single-file pages when the feature grows.
- New tools must be registered through `src/features/tools/registry.ts`.
- Searchable entities should flow through the unified search service.

## Security Rules

- Never hardcode secrets.
- Never expose OpenAI, OpenRouter, Supabase Service Role, n8n, GitHub, or webhook secrets to the browser.
- All private data tables must include `user_id`.
- All Supabase private tables must enable RLS.
- Storage buckets must be private by default.
- Logs must not include passwords, full API keys, webhook secrets, or unnecessary private content.

## UI Rules

- Desktop-first private dashboard.
- Use restrained neutral colors with sparse blue accent.
- Use Lucide icons, not emoji icons.
- Do not add marketing heroes, fake metrics, decorative badges, or random tools.
- Prefer lists, tables, side panels, timelines, tabs, and command palette.
- Avoid nested cards and repeated card grids.
- Check mobile widths for overflow.
- Maintain visible focus states and keyboard navigation.

## Definition of Done

- Relevant docs are updated.
- TypeScript passes.
- Lint passes or failures are documented.
- Build passes or failures are documented.
- Private routes remain protected.
- No secrets are committed.
- New database changes have migration files and docs.
