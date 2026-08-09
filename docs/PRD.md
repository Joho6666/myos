# MyOS PRD

## Product Definition

MyOS is a private personal operating system for one owner. It centralizes AI work, files, projects, prompts, knowledge, automations, learning, engineering, and business operations.

## First Version Scope

- Login page and private route protection
- Private dashboard overview
- Today workspace with daily focus, habits, quick capture, and review entry
- Life areas, goals, tasks, habits, routines, daily check-ins, daily reviews, and weekly reviews
- Project center
- Universal inbox
- Prompt library
- Knowledge library
- File center structure
- Automation center structure
- AI workbench structure
- Global search and command palette
- Activity log
- Settings
- Database migration and RLS planning
- PWA manifest and offline page

## Out Of Scope

- Public registration
- Public landing page
- Payment and membership
- Customer login
- Social features
- Complex vector search
- Direct local machine control
- Browser-based MCU flashing
- Production Google OAuth
- Push notifications without explicit user opt-in
- Client-side encrypted vault implementation

## Success Criteria

- Owner can enter private workspace.
- Private pages are blocked without session.
- Core modules are navigable and usable with local data.
- Supabase migration provides secure data model for next phase.
- Unconfigured third-party services do not fake success.
- Weekly review summaries are derived from real local data.
