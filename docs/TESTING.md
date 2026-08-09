# Testing

## Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Manual Browser Checks

- `/` redirects based on session.
- `/login` accepts only owner email.
- `/app` is blocked without session.
- Dashboard renders without horizontal overflow.
- Ctrl+K opens command palette.
- Project creation updates server-backed data.
- Inbox creation updates server-backed data.
- Prompt creation and copy work.
- Theme toggle works.
- Mobile width does not overflow.
- Life areas can be created and paused/restored.
- Goals can be created and opened.
- Tasks can be created as project, goal, or ordinary life tasks.
- Habits can be completed, partially completed, or skipped.
- Routines can save completed steps.
- Daily check-in can be saved.
- Daily review can be saved.
- Weekly review is generated from real local task, habit, goal, and check-in data.
- Search finds goals, habits, and reviews.
- `/api/myos/data` returns 401 without an owner session.
- `/api/myos/data` returns private data with an owner session.
- `/api/myos/actions` validates and persists supported mutations with an owner session.

## Viewports

- 1440 x 900
- 1280 x 800
- 768 x 1024
- 390 x 844
- 375 x 812

## Latest Verification

- `pnpm typecheck`: passed after the simplified dashboard and grouped sidebar update.
- `pnpm lint`: passed after the simplified dashboard and grouped sidebar update.
- `pnpm test`: passed after the simplified dashboard and grouped sidebar update, 5 tests.
- `pnpm build`: passed after the simplified dashboard and grouped sidebar update.
- Local HTTP check: `/app` redirects to `/login?next=/app` without session.
- Local HTTP check: `/login` returns 200 and includes MyOS content.

## Project Center Quick Create Verification Target

- `pnpm typecheck`: passed after the project quick-create update.
- `pnpm lint`: passed after the project quick-create update.
- `pnpm test`: passed after the project quick-create update, 5 tests.
- `pnpm build`: passed after the project quick-create update.
- Local HTTP check: `/app/projects` redirects to `/login?next=/app/projects` without session.
- Local HTTP check: `/login` returns 200 and includes MyOS content.

## Future Glass OS Verification Target

- `pnpm typecheck`: passed after the future glass OS UI update.
- `pnpm lint`: passed after the future glass OS UI update.
- `pnpm test`: passed after the future glass OS UI update, 5 tests.
- `pnpm build`: passed after the future glass OS UI update.
- Local HTTP check: `/login` returns 200 and includes the future glass OS copy.
- Local HTTP check: `/app` redirects to `/login?next=/app` without session.

## Command Quick Capture Verification Target

- `pnpm typecheck`: passed after the command quick-capture update.
- `pnpm lint`: passed after the command quick-capture update.
- `pnpm test`: passed after the command quick-capture update, 8 tests.
- `pnpm build`: passed after the command quick-capture update.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/app` redirects to `/login?next=/app` without session.

## Usable Placeholder Modules Verification Target

- `pnpm typecheck`: passed after making placeholder modules usable.
- `pnpm lint`: passed after making placeholder modules usable.
- `pnpm test`: passed after making placeholder modules usable, 8 tests.
- `pnpm build`: passed after making placeholder modules usable.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/app/tools` redirects to `/login?next=/app/tools` without session.
- Tools Center includes usable JSON, Base64, Markdown, and prompt-variable tools.
- Files Center records metadata through the existing backend action API.

## AI And Automation Workbench Verification Target

- `pnpm typecheck`: passed after the AI and automation workbench update.
- `pnpm lint`: passed after the AI and automation workbench update.
- `pnpm test`: passed after the AI and automation workbench update, 8 tests.
- `pnpm build`: passed after the AI and automation workbench update.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/app/ai` redirects to `/login?next=/app/ai` without session.
- Local HTTP check: `/app/automations` redirects to `/login?next=/app/automations` without session.

## Connection Dashboard Verification Target

- `pnpm typecheck`: passed after adding the connection dashboard.
- `pnpm lint`: passed after adding the connection dashboard.
- `pnpm test`: passed after adding the connection dashboard, 8 tests.
- `pnpm build`: passed after adding the connection dashboard.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/app/integrations` redirects to `/login?next=/app/integrations` without session.
- Local HTTP check: `/api/integrations/status` returns 401 without session.

## In-App Configuration Verification Target

- `pnpm typecheck`: passed after adding in-app configuration.
- `pnpm lint`: passed after adding in-app configuration.
- `pnpm test`: passed after adding in-app configuration, 8 tests.
- `pnpm build`: passed after adding in-app configuration.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/api/config/env` returns 401 without session.
- Local HTTP check: `/app/settings` redirects to `/login?next=/app/settings` without session.
- Production HTTP check: `/app` redirects to `/login?next=/app` without session.
- Production HTTP check: `/app` renders with owner session cookie.
- Browser screenshot check: `outputs/app-screenshot.png`.
- Mobile screenshot check: `outputs/app-mobile-screenshot.png`, `scrollWidth` equals `clientWidth` at 390px.

## GitHub Integration Summary Verification Target

- `pnpm typecheck`: passed after GitHub summary update.
- `pnpm lint`: passed after GitHub summary update.
- `pnpm test`: passed after GitHub summary update, 8 tests.
- `pnpm build`: passed after GitHub summary update.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/api/config/env` returns 401 without session.
- Local HTTP check: `/api/integrations/github/summary` returns 401 without session.
- Local HTTP check: `/app/integrations` redirects to `/login?next=/app/integrations` without session.
- Manual owner-session check: configure `GITHUB_TOKEN` in `/app/settings`, then use `/app/integrations` to read recent repositories, assigned issues, and starred repositories.
- Manual owner-session check: use “导入项目” on a GitHub repository and confirm it appears in Project Center.
- Manual owner-session check: use “转任务” on an assigned GitHub issue and confirm it appears in Tasks.
- Manual owner-session check: imported repositories and issues show “已存在” instead of allowing duplicate imports.
- Manual settings check: saving an already configured secret with an empty input must keep the existing secret unchanged.

## Notion Integration Summary Verification Target

- `pnpm typecheck`: passed after Notion summary update.
- `pnpm lint`: passed after Notion summary update.
- `pnpm test`: passed after Notion summary update, 8 tests.
- `pnpm build`: passed after Notion summary update.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/api/integrations/notion/summary` returns 401 without session.
- Local HTTP check: `/app/integrations` renders with owner session cookie and includes Notion content.
- Local HTTP check: `/api/integrations/notion/summary` returns 503 with owner session when `NOTION_TOKEN` is missing.
- Manual owner-session check: configure `NOTION_TOKEN` in `/app/settings`, then use `/app/integrations` to read recent pages and databases.
- Manual owner-session check: use “导入知识库” on a Notion item and confirm it appears in Knowledge.
- Manual owner-session check: imported Notion items show “已存在” instead of allowing duplicate imports.

## Gmail Integration Summary Verification Target

- `pnpm typecheck`: passed after Gmail summary update.
- `pnpm lint`: passed after Gmail summary update.
- `pnpm test`: passed after Gmail summary update, 8 tests.
- `pnpm build`: passed after Gmail summary update.
- Local HTTP check: `/login` returns 200 and includes MyOS content.
- Local HTTP check: `/api/integrations/gmail/summary` returns 401 without session.
- Local HTTP check: `/app/integrations` renders with owner session cookie and includes Gmail content.
- Local HTTP check: `/api/integrations/gmail/summary` returns 503 with owner session when Google OAuth credentials are missing.
- Manual owner-session check: configure Google OAuth variables in `/app/settings`, then use `/app/integrations` to read recent Gmail inbox messages.
- Manual owner-session check: use “进收件箱” on a Gmail message and confirm it appears in MyOS Inbox.
- Manual owner-session check: imported Gmail messages show “已存在” instead of allowing duplicate imports.

## Gmail Attachment Intake Verification Target

- `pnpm typecheck`: passed after adding Gmail attachment intake.
- `pnpm lint`: passed after adding Gmail attachment intake.
- `pnpm test`: passed after Gmail attachment intake, 12 tests.
- `pnpm build`: passed after Gmail attachment intake; `/api/integrations/gmail/attachments` appears in the production route list.
- Local HTTP check: `/api/integrations/gmail/attachments` returns 401 without session.
- Local HTTP check: `/api/integrations/gmail/attachments` returns 503 with owner session when Google OAuth credentials are missing.
- Local HTTP check: `/api/integrations/gmail/summary` still returns 401 without session and 503 with owner session when Google OAuth credentials are missing.
- Manual owner-session check: configure Google OAuth variables in `/app/settings`, refresh Gmail in `/app/integrations`, then use “导入附件” on a message with attachments.
- Manual owner-session check: imported Gmail attachments appear in File Center and download through `/api/files/download/[id]`.

## File Upload Verification Target

- `pnpm typecheck`: passed after local file upload update.
- `pnpm lint`: passed after local file upload update.
- `pnpm test`: passed after local file upload update, 8 tests.
- `pnpm build`: passed after local file upload update.
- Local HTTP check: `/api/files/upload` returns 401 without session.
- Local HTTP check: `/api/files/download/missing` returns 401 without session.
- Authenticated HTTP check: uploaded `package.json` through `/api/files/upload`; API returned 200 and the file record appeared in returned MyOS data.
- Authenticated HTTP check: downloaded the uploaded file through `/api/files/download/6f0b53ec-b8e9-4067-bcc6-20dc39122421`; API returned 200 and content length 1259.
- Local HTTP check: `/api/files/delete/missing` returns 401 without session.
- Authenticated HTTP check: deleted uploaded file `6f0b53ec-b8e9-4067-bcc6-20dc39122421` through `/api/files/delete/[id]`; API returned 200 and the file disappeared from returned MyOS data.
- Manual owner-session check: upload a small file in `/app/files`, confirm it appears in File Center, then download it through the protected download link.
- Manual owner-session check: delete an uploaded or manually registered file and confirm it disappears from File Center.

## File Center Feedback And Storage Consistency Verification Target

- `pnpm typecheck`: passed after File Center feedback and storage consistency update.
- `pnpm lint`: passed after File Center feedback and storage consistency update.
- `pnpm test`: passed after File Center feedback and storage consistency update, 18 tests.
- `pnpm build`: passed after File Center feedback and storage consistency update.
- File upload now removes the saved binary if MyOS file-record registration fails.
- File delete now reuses the shared binary deletion helper for local and Supabase Storage paths.
- Manual file registration in `/app/files` now shows explicit success or error feedback.
- Local HTTP check: `/app/files` renders with owner session and includes File Center and storage status content.
- Local HTTP check: unauthenticated `/api/files/status` returns 401.
- Local HTTP check: unauthenticated `/api/files/delete/missing` returns 401.
- Local HTTP check: owner-session `/api/files/delete/missing` returns 404.

## Supabase Storage Verification Target

- `pnpm typecheck`: passed after adding Supabase private Storage support.
- `pnpm lint`: passed after adding Supabase private Storage support.
- `pnpm test`: passed after Supabase private Storage support, 11 tests.
- `pnpm build`: passed after Supabase private Storage support.
- Authenticated HTTP check: uploaded `package.json` through `/api/files/upload` with local Supabase enabled; returned file record used `storagePath=supabase/00000000-0000-0000-0000-000000000001/...`.
- Authenticated HTTP check: downloaded the uploaded file through `/api/files/download/[id]`; route returned a short-lived signed Supabase Storage URL.
- Authenticated HTTP check: deleted the uploaded file through `/api/files/delete/[id]`; returned data no longer contained the uploaded file.
- Migration added: `supabase/migrations/20260724050000_private_storage_bucket.sql` creates the private `myos-files` bucket.

## File Storage Status Verification Target

- `pnpm typecheck`: passed after adding the file storage status endpoint and UI panel.
- `pnpm lint`: passed after adding the file storage status endpoint and UI panel.
- `pnpm test`: passed after the file storage status update, 11 tests.
- `pnpm build`: passed after the file storage status update; `/api/files/status` appears in the production route list.
- Local HTTP check: `/api/files/status` returns 401 without session.
- Local HTTP check: `/api/files/status` returns `backendMode=supabase`, `storageMode=supabase-storage`, `bucket=myos-files`, and `backupIncludesBinaries=false` with owner session.
- Local HTTP check: `/app/files` renders with owner session and includes “存储状态”, “Bucket”, and the JSON backup binary limitation note.
- Local HTTP check: `/api/myos/export` now includes `files.includesBinaryContent=false` and a note that JSON export includes file records only.

## Global Search Coverage Verification Target

- `pnpm typecheck`: passed after expanding global search coverage.
- `pnpm lint`: passed after expanding global search coverage.
- `pnpm test`: passed after global search update, 12 tests.
- `pnpm build`: passed after global search update.
- Unit test coverage now verifies task, inbox, automation, and file storage status search results.
- Local HTTP check: `/app` returns 307 to `/login?next=%2Fapp` without session.
- Local HTTP check: `/app` renders with owner session and still includes the command/search trigger, connection dashboard entry, and file center entry.

## Project And Task Maintenance Verification Target

- `pnpm typecheck`: passed after project/task maintenance update.
- `pnpm lint`: passed after project/task maintenance update.
- `pnpm test`: passed after project/task maintenance update, 10 tests.
- `pnpm build`: passed after project/task maintenance update.
- Local HTTP check: `/app/projects` renders with owner session cookie.
- Local HTTP check: `/app/tasks` renders with owner session cookie.
- Local HTTP check: `/api/myos/actions` returns 401 without session.
- Authenticated HTTP check: created, updated, and deleted a temporary task; final read showed `stillThere=false`.
- Authenticated HTTP check: created, updated, archived, favorited, and deleted a temporary project; final read showed `stillThere=false`.
- Backend unit tests cover project update/delete and task update/delete.
- Manual owner-session check: edit a project in `/app/projects`, archive it, favorite it, then delete a disposable project.
- Manual owner-session check: edit a task in `/app/tasks`, toggle completion, then delete a disposable task.

## Task Page Feedback Verification Target

- `pnpm typecheck`: passed after moving Task page actions to explicit client actions.
- `pnpm lint`: passed after moving Task page actions to explicit client actions.
- `pnpm test`: passed after Task page feedback update, 18 tests.
- `pnpm build`: passed after Task page feedback update.
- Task add, edit, completion toggle, and delete now show explicit success or error feedback.
- Local HTTP check: `/app/tasks` renders with owner session and includes the create form.
- Local HTTP check: unauthenticated `/app/tasks` redirects to `/login?next=%2Fapp%2Ftasks`.
- Local HTTP check: unauthenticated `/api/myos/actions` task creation returns 401.

## Inbox Knowledge Prompt Maintenance Verification Target

- `pnpm typecheck`: passed after inbox/knowledge/prompt maintenance update.
- `pnpm lint`: passed after inbox/knowledge/prompt maintenance update.
- `pnpm test`: passed after inbox/knowledge/prompt maintenance update, 11 tests.
- `pnpm build`: passed after inbox/knowledge/prompt maintenance update.
- Local HTTP check: `/app/inbox`, `/app/knowledge`, and `/app/prompts` render with owner session cookie.
- Local HTTP check: `/api/myos/actions` returns 401 without session.
- Authenticated HTTP check: created, updated, classified, and deleted a temporary inbox item; final read showed it was gone.
- Authenticated HTTP check: created, updated, favorited, and deleted a temporary knowledge note; final read showed it was gone.
- Authenticated HTTP check: created, updated, favorited, and deleted a temporary prompt; final read showed it was gone.
- Backend unit tests cover inbox, prompt, and note update/delete actions.

## Prompt And Knowledge Feedback Verification Target

- `pnpm typecheck`: passed after moving Prompt Library and Knowledge Library actions to explicit client actions.
- `pnpm lint`: passed after moving Prompt Library and Knowledge Library actions to explicit client actions.
- `pnpm test`: passed after Prompt and Knowledge feedback update, 18 tests.
- `pnpm build`: passed after Prompt and Knowledge feedback update.
- Prompt Library add, edit, favorite, copy, and delete now show explicit success or error feedback.
- Knowledge Library add, edit, favorite, and delete now show explicit success or error feedback.
- Local HTTP check: `/app/prompts` renders with owner session and includes the save form.
- Local HTTP check: `/app/knowledge` renders with owner session and includes the record form.
- Local HTTP check: unauthenticated `/app/prompts` redirects to `/login?next=%2Fapp%2Fprompts`.
- Local HTTP check: unauthenticated `/app/knowledge` redirects to `/login?next=%2Fapp%2Fknowledge`.

## Inbox And Bookmark Feedback Verification Target

- `pnpm typecheck`: passed after moving Inbox and Bookmarks actions to explicit client actions.
- `pnpm lint`: passed after moving Inbox and Bookmarks actions to explicit client actions.
- `pnpm test`: passed after Inbox and Bookmarks feedback update, 18 tests.
- `pnpm build`: passed after Inbox and Bookmarks feedback update.
- Inbox add, edit, and delete now show explicit success or error feedback.
- Bookmarks add, edit, and delete now show explicit success or error feedback.
- Local HTTP check: `/app/inbox` renders with owner session and includes the add form.
- Local HTTP check: `/app/bookmarks` renders with owner session and includes the save form.
- Local HTTP check: unauthenticated `/app/inbox` redirects to `/login?next=%2Fapp%2Finbox`.
- Local HTTP check: unauthenticated `/app/bookmarks` redirects to `/login?next=%2Fapp%2Fbookmarks`.

## Extended Module Maintenance Verification Target

- `pnpm typecheck`: passed after bookmark/learning/engineering/business maintenance update.
- `pnpm lint`: passed after bookmark/learning/engineering/business maintenance update.
- `pnpm test`: passed after bookmark/learning/engineering/business maintenance update, 11 tests.
- `pnpm build`: passed after bookmark/learning/engineering/business maintenance update.
- Local HTTP check: `/app/bookmarks`, `/app/learning`, `/app/engineering`, and `/app/business` render with owner session cookie.
- Manual owner-session check: edit and delete a bookmark in `/app/bookmarks`.
- Manual owner-session check: complete/delete a learning task and delete a learning note in `/app/learning`.
- Manual owner-session check: archive/delete an engineering project in `/app/engineering`.
- Manual owner-session check: mark done/archive/delete a business project in `/app/business`.

## Extended Module Create Feedback Verification Target

- `pnpm typecheck`: passed after moving learning, engineering, and business composite create flows to explicit client actions.
- `pnpm lint`: passed after moving learning, engineering, and business composite create flows to explicit client actions.
- `pnpm test`: passed after extended module create feedback update, 18 tests.
- `pnpm build`: passed after extended module create feedback update.
- Learning Center create now shows explicit success or error feedback after adding both task and note.
- Engineering Lab create now shows explicit success or error feedback after adding both project and note.
- Business Center create now shows explicit success or error feedback after adding project, task, and inbox item.
- Local HTTP check: `/app/learning`, `/app/engineering`, and `/app/business` render with owner session and include their create forms.
- Local HTTP check: unauthenticated `/app/learning` redirects to `/login?next=%2Fapp%2Flearning`.

## Data Export Verification Target

- `pnpm typecheck`: passed after data export update.
- `pnpm lint`: passed after data export update.
- `pnpm test`: passed after data export update, 11 tests.
- `pnpm build`: passed after data export update.
- Local HTTP check: `/api/myos/export` returns 401 without session.
- Authenticated HTTP check: `/api/myos/export` returns 200, `content-type: application/json`, `content-disposition: attachment`, and includes `app`, `schemaVersion`, `exportedAt`, `backendMode`, `owner`, and `data`.
- Local HTTP check: `/app/settings` renders with owner session cookie and includes “导出备份”.
- Manual owner-session check: use `/app/settings` data export button and confirm a JSON backup downloads.

## Data Import Verification Target

- `pnpm typecheck`: passed after data import update.
- `pnpm lint`: passed after data import update.
- `pnpm test`: passed after data import update, 11 tests.
- `pnpm build`: passed after data import update.
- Local HTTP check: `/api/myos/import` returns 401 without session.
- Authenticated HTTP check: importing the currently exported JSON backup through `/api/myos/import` returns 200 and valid MyOS data.
- Local HTTP check: `/app/settings` renders with owner session cookie and includes “导入备份”.
- Cleanup: removed temporary `work/myos-import-test.json` after verification.
- Manual owner-session check: use `/app/settings` backup import file picker, confirm overwrite, and verify data reloads.

## Global Integration Overview Verification Target

- `pnpm typecheck`: passed after upgrading the connection dashboard into a global overview.
- `pnpm lint`: passed after upgrading the connection dashboard into a global overview.
- `pnpm test`: passed after the global overview update, 11 tests.
- `pnpm build`: passed after the global overview update.
- Local HTTP check: `/app/integrations` returns 307 to `/login?next=%2Fapp%2Fintegrations` without session.
- Local HTTP check: `/api/integrations/status` returns 401 without session.
- Local HTTP check: `/api/integrations/status` returns 200 with owner session and includes Supabase, AI, n8n, GitHub, Gmail, and Notion statuses.
- Local HTTP check: `/app/integrations` renders with owner session and includes “全局态势”, “待处理信号”, “接入进度”, and “一键刷新全部”.

## Integration Import Error Handling Verification Target

- `pnpm typecheck`: passed after moving integration imports to the explicit client action helper.
- `pnpm lint`: passed after moving integration imports to the explicit client action helper.
- `pnpm test`: passed after the import error handling fix, 14 tests.
- `pnpm build`: passed after the import error handling fix.
- Unit test coverage verifies that `postMyOSAction` throws backend errors instead of letting callers report success.
- Local HTTP check: invalid owner-session `/api/myos/actions` payload returns 400 with validation details.
- Local HTTP check: unauthenticated `/api/myos/actions` still returns 401.
- Local HTTP check: `/app/integrations` renders with owner session and includes the connection dashboard and Gmail section.
- Manual owner-session check: with a deliberately invalid import payload or backend failure, GitHub/Gmail/Notion import actions should show the error message and must not show a success message.

## Data Action Error Mapping Verification Target

- `pnpm typecheck`: passed after adding strict local data existence checks and Supabase ID preflight.
- `pnpm lint`: passed after adding strict local data existence checks and Supabase ID preflight.
- `pnpm test`: passed after data action error mapping, 15 tests.
- `pnpm build`: passed after data action error mapping.
- Unit test coverage verifies missing local records throw `MyOSActionError` instead of silently succeeding.
- Local HTTP check in Supabase mode: invalid id `missing-task` returns 400 before reaching the database.
- Local HTTP check in Supabase mode: valid UUID for a missing task returns 404 with “记录不存在或已被删除”.
- Local HTTP check: unauthenticated `/api/myos/actions` still returns 401.
- Local HTTP check: `/app/settings` renders with owner session and includes “系统设置” and “连接检测”.

## Settings Connection Test Verification Target

- `pnpm typecheck`: passed after adding the settings connection test panel.
- `pnpm lint`: passed after adding the settings connection test panel.
- `pnpm test`: passed after the settings connection test panel update, 11 tests.
- `pnpm build`: passed after the settings connection test panel update.
- Local HTTP check: `/app/settings` returns 307 to `/login?next=%2Fapp%2Fsettings` without session.
- Local HTTP check: `/api/config/env` returns 401 without session.
- Local HTTP check: `/app/settings` renders with owner session and includes “连接检测” and “导入备份”.
- Local HTTP check: `/api/config/env` returns the allowlisted configuration fields with owner session; secret fields are not returned in plaintext.
- Local HTTP check: `/api/integrations/status` returns Supabase, AI, n8n, GitHub, Gmail, and Notion status for the settings connection test panel.

## Runtime Configuration Validation Verification Target

- `pnpm typecheck`: passed after adding runtime configuration validation.
- `pnpm lint`: passed after adding runtime configuration validation.
- `pnpm test`: passed after runtime configuration validation, 18 tests.
- `pnpm build`: passed after runtime configuration validation.
- Unit test coverage verifies valid owner, URL, timeout, bucket, and owner user id values.
- Unit test coverage rejects invalid URLs, invalid timeout values, and invalid Storage bucket names before writing `.env.local`.
- Local HTTP check: unauthenticated `/api/config/env` POST returns 401.
- Local HTTP check: owner-session `N8N_BASE_URL=not-a-url` returns 400 with a readable URL validation message.
- Local HTTP check: owner-session `N8N_REQUEST_TIMEOUT_MS=abc` returns 400 with a readable timeout validation message.
- Local HTTP check: `/app/settings` renders with owner session and includes the settings page.

## Settings Dangerous Action Feedback Verification Target

- `pnpm typecheck`: passed after making Settings reset use the explicit client action helper.
- `pnpm lint`: passed after making Settings reset use the explicit client action helper.
- `pnpm test`: passed after Settings dangerous action feedback update, 18 tests.
- `pnpm build`: passed after Settings dangerous action feedback update.
- Local HTTP check: `/app/settings` renders with owner session and includes the reset action.
- Local HTTP check: unauthenticated `/api/config/env` POST still returns 401.
- Local HTTP check: owner-session invalid `N8N_BASE_URL` still returns 400 after the Settings update.
- Manual owner-session check: click “重置” in Settings, confirm the dialog only on disposable data, and verify a success or error message appears on the page.

## Tool And Workflow Usability Verification Target

- `pnpm typecheck`: passed after adding the MCU timer tool and in-page configuration shortcuts.
- `pnpm lint`: passed after adding the MCU timer tool and in-page configuration shortcuts.
- `pnpm test`: passed after the tool and workflow usability update, 11 tests.
- `pnpm build`: passed after the tool and workflow usability update.
- Local HTTP check: `/app/tools` returns 307 to `/login?next=%2Fapp%2Ftools` without session.
- Local HTTP check: `/app/tools` renders with owner session and includes “单片机定时器计算”, “ARR 自动重装载值”, and “工具注册表”.
- Local HTTP check: `/app/ai` renders with owner session and includes “刷新状态” and “配置 AI”.
- Local HTTP check: `/app/automations` renders with owner session and includes “刷新状态”, “配置 n8n”, and the current n8n availability state.

## Tools Center Polish Verification Target

- `pnpm typecheck`: passed after replacing raw Markdown echo with rendered Markdown preview.
- `pnpm lint`: passed after replacing deprecated Base64 Unicode helpers.
- `pnpm test`: passed after the Tools Center polish update, 11 tests.
- `pnpm build`: passed after the Tools Center polish update.
- Local HTTP check: `/app/tools` returns 307 to `/login?next=%2Fapp%2Ftools` without session.
- Local HTTP check: `/app/tools` renders with owner session and includes the Markdown preview surface, Base64 tool, MCU timer tool, and ARR result row.
- Code scan: no remaining `escape(`, `unescape(`, `innerHTML`, or `dangerouslySetInnerHTML` usage in `src`.

## Life Management Verification Target

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 3 tests.
- `pnpm build`: passed.
- Production route check passed for `/app`, `/app/today`, `/app/life`, `/app/life/areas`, `/app/goals`, `/app/goals/goal-career`, `/app/tasks`, `/app/habits`, `/app/routines`, `/app/check-in`, `/app/reviews/daily`, `/app/reviews/weekly`, `/offline`, and `/manifest.webmanifest`.
- Mobile 390px check passed for `/app`, `/app/life`, `/app/goals`, `/app/tasks`, `/app/habits`, `/app/routines`, `/app/check-in`, `/app/reviews/daily`, and `/app/reviews/weekly`; `scrollWidth` equaled `clientWidth`.

## Backend Increment Verification Target

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 5 tests.
- `pnpm build`: passed.
- Unauthenticated API check for `/api/myos/data`: returned 401.
- Authenticated API check for `/api/myos/data`: returned 200 before the Supabase repository replacement.
- Authenticated mutation check for `/api/myos/actions`: returned 200 before the Supabase repository replacement.

## Supabase Repository Verification Target

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 5 tests.
- `pnpm build`: passed.
- Unauthenticated API check for `/api/myos/data`: returned 401.
- Authenticated API check without Supabase env for `/api/myos/data`: returned 503 with a clear Supabase configuration message.
- Local Supabase start: passed after shortening `project_id` to `myos`.
- Local Supabase migrations: passed, including service role grants.
- Authenticated API check with local Supabase for `/api/myos/data`: returned 200.
- Authenticated mutation check with local Supabase for `/api/myos/actions`: returned 200 and the added task was found on the next read.

## Usable Backend Verification Target

- Local mode returns 200 for authenticated `/api/myos/data` without Supabase env.
- Local mode persists `/api/myos/actions` mutations to `work/server-data/myos-data.json`.
- Latest local usability check: unauthenticated read returned 401, authenticated read returned 200, task creation returned 200, and the added task was found after a second read.

## Dashboard Global Connections Verification Target

- `pnpm typecheck`: passed after adding the compact global connection panel to `/app`.
- `pnpm lint`: passed after adding the compact global connection panel to `/app`.
- `pnpm test`: passed after the dashboard connection update, 18 tests.
- `pnpm build`: passed after the dashboard connection update.
- The main dashboard now reads `/api/integrations/status` and shows Supabase, GitHub, Gmail, Notion, AI, and n8n states directly on the first screen.
- The connection endpoint still returns only sanitized status messages and remains protected by the owner session.

## Tools Configuration Hub Verification Target

- `pnpm typecheck`: passed after adding the in-page tool configuration status panel.
- `pnpm lint`: passed after adding the in-page tool configuration status panel.
- `pnpm test`: passed after the tool configuration hub update, 18 tests.
- `pnpm build`: passed after the tool configuration hub update.
- Local HTTP check: `/app/tools` returns 307 to `/login?next=%2Fapp%2Ftools` without session.
- Local HTTP check: `/app/tools` renders with owner session and includes “工具配置状态”, “配置”, and “JSON 格式化”.
- Local HTTP check: `/api/integrations/status` returns 200 with owner session and feeds the tools page configuration panel.

## Project Center Feedback Verification Target

- `pnpm typecheck`: passed after moving Project Center mutations to explicit client actions.
- `pnpm lint`: passed after moving Project Center mutations to explicit client actions.
- `pnpm test`: passed after the Project Center feedback update, 18 tests.
- `pnpm build`: passed after the Project Center feedback update.
- Local HTTP check: `/app/projects` returns 307 to `/login?next=%2Fapp%2Fprojects` without session.
- Local HTTP check: `/app/projects` renders with owner session and includes “项目中心” and “快速新建项目”.
- Local HTTP check: unauthenticated `addProject` on `/api/myos/actions` returns 401.
- Authenticated mutation check: created a temporary project, updated its status and favorite state, then deleted it successfully.
- UI behavior target: quick create only clears the draft after backend success; edit mode stays open on failure; create/update/delete errors are shown on the page.

## AI And Automation Configuration Guard Verification Target

- `pnpm typecheck`: passed after adding AI and n8n configuration guards.
- `pnpm lint`: passed after adding AI and n8n configuration guards.
- `pnpm test`: passed after the AI and automation guard update, 18 tests.
- `pnpm build`: passed after the AI and automation guard update.
- Local HTTP check: `/app/ai` renders with owner session and includes “配置 AI” and “先配置 AI” when the selected provider is unavailable.
- Local HTTP check: `/app/automations` renders with owner session and includes “配置 n8n” and “先配置” when n8n is unavailable.
- Local HTTP check: unauthenticated `/api/ai/chat` and `/api/automations/run` return 401.
- Local HTTP check: owner-session `/api/ai/chat` returns 503 with an explicit unconfigured provider message when `OPENAI_API_KEY` is missing.
- Local HTTP check: owner-session `/api/automations/run` returns 503 with an explicit unconfigured n8n message when `N8N_BASE_URL` or `N8N_WEBHOOK_SECRET` is missing.

## Tools Embedded Configuration Verification Target

- `pnpm typecheck`: passed after embedding the runtime configuration editor in Tools Center.
- `pnpm lint`: passed after embedding the runtime configuration editor in Tools Center.
- `pnpm test`: passed after the embedded configuration update, 18 tests.
- `pnpm build`: passed after the embedded configuration update.
- Local HTTP check: `/app/tools` renders with owner session and includes “工具配置”.
- Local HTTP check: unauthenticated `/api/config/env` returns 401.
- Local HTTP check: owner-session `/api/config/env` returns allowlisted fields including `OPENAI_API_KEY` without returning secret plaintext.
- Authenticated configuration check: temporarily changed `N8N_REQUEST_TIMEOUT_MS` to `45000`, verified it saved, then restored the previous value.
- Validation check: invalid `N8N_BASE_URL=not-a-url` returns 400 with a readable URL validation message.

## Windows Local Agent Phase 1 Verification Target

- `pnpm typecheck`: passed after adding local-agent config, client, route, navigation, and page.
- `pnpm lint`: passed after adding the local-agent phase 1 implementation.
- `pnpm test`: passed after adding local-agent tests, 21 tests.
- `pnpm build`: passed; production route list includes `/api/local-agent/status` and `/app/local-agent`.
- Unit tests cover:
  - Missing local-agent env returns an unconfigured state.
  - Configured local-agent status aggregates `/health`, `/ollama/status`, and `/projects`.
  - Offline local-agent returns a clear connection failure.
  - `LOCAL_AGENT_BASE_URL` validates as an http/https URL before writing config.
- Direct local-agent check: `/health` returned 200 with the example token.
- Direct local-agent check: `/projects` returned 200 and included the MyOS allowlisted project.
- Direct local-agent check: wrong bearer token returned 401.
- Local HTTP check: unauthenticated `/api/local-agent/status` returned 401.
- Local HTTP check: unauthenticated `/app/local-agent` redirected to `/login?next=%2Fapp%2Flocal-agent`.
- Local HTTP check: owner-session `/api/local-agent/status` returned an unconfigured state when MyOS local-agent env was missing.
- Authenticated proxy check: temporarily configured `LOCAL_AGENT_BASE_URL` and `LOCAL_AGENT_TOKEN`, verified MyOS reached the local agent and returned one project, then restored the previous config.

## Local Agent MCP Configuration Verification

- `node --check local-agent/server.mjs`: passed.
- `pnpm typecheck`: passed after the MCP preview/apply implementation.
- `pnpm lint`: passed.
- `pnpm test`: passed, 6 files / 22 tests.
- `pnpm build`: passed; production route list includes `/api/capabilities/agent-mcp`.
- Local startup check: MyOS local-agent is listening on `127.0.0.1:43110` after `pnpm local-agent`.
- Local HTTP check: MyOS `/login` returned HTTP 200 on port 3002 after a targeted restart.
- Local HTTP check: unauthenticated `POST /api/capabilities/agent-mcp` returned HTTP 401.
- Manual acceptance remaining: sign in to MyOS, select an allowlisted project in Capability Center, use Preview, then verify the generated Claude Code or OpenCode file and backup after the explicit Apply action.

## Two-Level Navigation Verification

- `pnpm typecheck`: passed after replacing the flat primary/more sidebar with five expandable directories.
- `pnpm lint`: passed.
- `pnpm test`: passed, 6 files / 22 tests.
- Local HTTP check: MyOS `/login` returned HTTP 200 on port 3002 after the navigation update.

## Desktop Focus Window Verification

- `node --check desktop/electron/main.js`, `preload.js`, and `tray.js`: passed.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test`: passed, 6 files / 22 tests.
- `pnpm build`: passed; production route list includes private `/focus`.
- Local HTTP check: unauthenticated `/focus` returns HTTP 307 to `/login?next=%2Ffocus`.
- Desktop acceptance: launch the Electron app, use the monitor icon in the top bar or the tray menu, and confirm the focus window stays above other windows, hides instead of quitting, and completes an existing task.

## Native Desktop Polish Verification

- `node --check desktop/electron/main.js`: passed after adding window-state persistence and desktop shortcuts.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test`: passed, 6 files / 22 tests.
- Fresh `pnpm desktop:build` completed in a background process; setup and portable artifacts have current build timestamps.
- Portable `dist/MyOS-0.1.0-portable.exe` started successfully as an independent desktop process.
- Browser development service was restored on port 3002 after packaging.

## Agent Dispatch And Platform Catalog Verification

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 6 files / 22 tests.
- `pnpm build`: passed; the Agent Control Center and Connections dashboard compiled into the production app.
- Local HTTP check: `/login` returned HTTP 200 on port 3002 after a targeted restart.
- Local HTTP check: unauthenticated `/app/agents` and `/app/integrations` returned HTTP 307 to the login flow.
