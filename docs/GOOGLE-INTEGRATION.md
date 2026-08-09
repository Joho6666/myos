# Google Integration Design

This iteration only designs the adapter and database structure. It does not implement production OAuth.

## Future Capabilities

- Read Google Calendar events.
- Create and update Google Calendar events.
- Support recurring events and reminders.
- Sync Google Tasks.

## Sync Rules

- Items with explicit start and end times sync as Google Calendar events.
- Tasks with only a due date sync as Google Tasks.
- Long-term goals do not sync directly.
- Habits do not create many individual tasks by default.
- Every synced resource stores an external id.
- Sync must prevent loops with `external_resource_links.last_synced_at` and remote update timestamps.
- External deletion and local deletion must create conflict records instead of silent data loss.

## Tables

- `external_integrations`: provider, scopes, status, token reference, sync status.
- `external_resource_links`: local entity to external resource mapping.
- `sync_logs`: sanitized sync attempts and conflicts.

## Security

OAuth tokens, refresh tokens, and Google Client Secret must only live in server-side secure storage. They must never be sent to browser code or activity logs.

## Adapter Shape

```ts
interface GoogleIntegrationAdapter {
  listCalendarEvents(range: { start: string; end: string }): Promise<ExternalEvent[]>;
  upsertCalendarEvent(input: CalendarEventInput): Promise<ExternalResourceLink>;
  upsertTask(input: GoogleTaskInput): Promise<ExternalResourceLink>;
  handleRemoteDeletion(linkId: string): Promise<SyncConflict>;
}
```
