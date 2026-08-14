# Google Integration Design

MyOS now uses the server-side Google OAuth refresh-token configuration already used by Gmail to connect Google Calendar, Google Tasks, and Google Drive. The browser never receives the client secret, refresh token, or access token.

## Current Capabilities

- Read Google Calendar events for the next seven days.
- Create and update Google Calendar events from an explicitly selected MyOS task.
- Import and incrementally sync Google Tasks, including completion state and due dates.
- Create and update Google Tasks from an explicitly selected MyOS task.
- Read recent Google Drive file metadata and register cloud links in MyOS File Center.

Recurring events, reminders, conflict resolution, and background scheduling remain follow-up work.

## Sync Rules

- Calendar reads cover the next seven days; event writes are explicit from a selected MyOS task.
- Google Tasks imports update mapped MyOS tasks and create missing tasks; task writes are explicit.
- Drive imports register metadata and links only; MyOS does not download Drive contents yet.
- Long-term goals do not sync directly.
- Habits do not create many individual tasks by default.
- Every synced resource stores an external id.
- Sync must prevent loops with `external_resource_links.last_synced_at` and remote update timestamps.
- External deletion and local deletion are not silently applied; conflict handling remains a follow-up.

## Tables

- `external_integrations`: provider, scopes, status, token reference, sync status.
- `external_resource_links`: local entity to external resource mapping.
- `sync_logs`: sanitized sync attempts and conflicts.

## Security

OAuth tokens, refresh tokens, and Google Client Secret must only live in server-side secure storage. They must never be sent to browser code or activity logs.

## Configuration

Set these values in `/app/settings` or `.env.local`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID` (optional, defaults to `primary`)
- `GOOGLE_TASKS_LIST_ID` (optional, defaults to the first task list)
- `GOOGLE_DRIVE_FOLDER_ID` (optional, narrows Drive reads to one folder)
- `GOOGLE_REDIRECT_URI` (optional, defaults to `/api/integrations/google/oauth/callback` under `NEXT_PUBLIC_APP_URL`)

The Settings page includes **连接 Google 账号**. Configure the OAuth client first, register the exact redirect URI in Google Cloud, then use that button. The callback stores the returned refresh token on the server and sends the browser back to the connection dashboard.

The refresh token must be issued with the scopes needed by the enabled features. In addition to any existing Gmail scope, request:

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/tasks`
- `https://www.googleapis.com/auth/drive.readonly`

Adding scopes to an already-issued refresh token normally requires completing the Google consent flow again and storing the new refresh token. A Gmail-only refresh token can refresh successfully while Calendar, Tasks, or Drive still returns an authorization error.

For local development, register this exact authorized redirect URI in Google Cloud Console:

`http://localhost:3000/api/integrations/google/oauth/callback`

If the desktop launcher uses another local port, set `NEXT_PUBLIC_APP_URL` and `GOOGLE_REDIRECT_URI` to the actual app URL before authorizing. The redirect URI in Google Cloud must match it exactly.

## Routes and behavior

- `GET /api/integrations/google/calendar/summary`: next seven days of Calendar events.
- `POST /api/integrations/google/calendar/push`: create or update one Calendar event from a MyOS task.
- `GET /api/integrations/google/tasks/summary`: task lists and tasks from the selected list.
- `POST /api/integrations/google/tasks/import`: incrementally sync remote tasks, including completion state; mapped tasks are updated and new tasks are created.
- `POST /api/integrations/google/tasks/push`: create or update one Google Task from a MyOS task.
- `GET /api/integrations/google/drive/summary`: recent Drive file metadata.
- `POST /api/integrations/google/drive/import`: register Drive links in MyOS File Center without downloading file contents.

The connection dashboard exposes these actions and keeps every write explicit. Refreshing a summary is read-only. External resource mappings are stored in `external_resource_links` when Supabase is available, with a local mapping fallback for desktop/local-file mode.

## Adapter Shape

```ts
interface GoogleIntegrationAdapter {
  listCalendarEvents(range: { start: string; end: string }): Promise<ExternalEvent[]>;
  upsertCalendarEvent(input: CalendarEventInput): Promise<ExternalResourceLink>;
  upsertTask(input: GoogleTaskInput): Promise<ExternalResourceLink>;
  handleRemoteDeletion(linkId: string): Promise<SyncConflict>;
}
```
