# UI Spec

## Direction

Private future glass OS. Desktop-first, visually polished, information-dense, and readable.

## Layout

- Left sidebar: 248px with five expandable first-level directories: Today, Work, AI & Automation, Knowledge & Life, and Professional & System. Each directory reveals second-level destinations only when opened; the directory that contains the current page opens automatically.
- Topbar: 60px.
- Today page: concise focus workspace with three headline data points, a compact action dock, project progress bars, Agent queue, inbox triage, and connection health.
- Main content: open layout with panels, tables, lists, timelines, and forms.
- Mobile: sidebar hidden; command/search remains accessible.

## Colors

- Background: soft blue-gray system gradient.
- Surface: translucent glass panels with blur and high-contrast text.
- Text: near-black in light mode, near-white in dark mode.
- Muted: cool slate gray.
- Border: translucent glass highlight.
- Accent: blue to cyan.
- Success: `#16A34A`
- Warning: `#D97706`
- Error: `#DC2626`
- Skins: Ocean Blue, Forest Green, Sunset Orange, and Nebula Purple. Skin choice and light/dark preference persist locally on the device and do not affect other MyOS data.

## Typography

- UI text: Inter or system sans-serif.
- Technical values: system monospace.
- No handwritten or decorative fonts.

## Interaction

- Ctrl+K opens command palette.
- Hover states must not shift layout.
- Focus states must be visible.
- Empty states must explain next action.
- Unconfigured integrations must say they are unconfigured.
- Life and health pages must avoid anxious red warning patterns.
- Health check-in pages must state that they are only for personal records and trend observation, not medical diagnosis.
- Today page must show only date-relevant tasks, habits, quick capture, and review entry.
- Navigation labels should stay short; detailed meaning belongs inside the destination page.
- Dashboard suggestions must be derived from local data, not presented as AI-generated insight unless an AI provider actually ran.
- Project creation should default to quick capture: one project name, optional slash-separated next action, template chips, and collapsible advanced fields.
- The first project templates should be visible as four high-frequency choices; specialist templates and detailed fields remain behind one optional control.
- Persistent navigation must expose only a small set of first-level work contexts. Search and the second-level directories preserve access to detailed capabilities without competing for attention.
- Navigation is intentionally two-level: first-level entries describe a work context; second-level entries are direct executable destinations. Do not add individual modules directly to the root sidebar.
- Project lists should support lightweight filtering without forcing the user into a heavy table for everyday use.
- Glass effects must not reduce text contrast or hide form boundaries.
- Decorative gradients may appear on login, shell background, hero areas, and empty states, but must not cover primary controls.
- Command palette should expose quick actions, recent content, and search results in grouped sections.
- On mobile, a fixed five-destination dock provides Today, Projects, Inbox, Connections, and an expandable More sheet. Main content reserves space above it so actions remain tappable.
- Theme selection appears in the shared top bar and must retain readable foreground, border, focus, and status contrast in both color modes.
- The Work Map uses expandable project roots with task and Agent work-item branches. Its completion ring, execution distribution, project load bars, and blocker panel are calculated from persisted records only; it must not imply historical trend data that the system has not captured.
- Project creation is template-first and autofocuses the project name. The primary action creates the record and enters its detail workspace immediately. Portfolio funnel and category bars expose only real project progression and category counts.
- Capability Center may display installed Skill metadata, MCP configuration snippets, and API connection status. It must never display API keys, tokens, full local filesystem paths, or offer arbitrary local command execution.
- Global search should cover projects, tasks, inbox items, life data, prompts, notes, files, automations, enabled tools, connection dashboard, file storage status, and backup entries.
- Command palette quick capture supports `项目 ...`, `任务 ...`, and `想法 ...` prefixes for direct creation.
- Quick capture must write through the existing backend action API and update other open MyOS data views.
- Previously placeholder modules should provide at least one real useful action: create, register, capture, convert, or view saved data.
- File Center supports local upload, Supabase private Storage upload, registration, protected signed download, and delete.
- Tools Center includes real utility panels for JSON formatting, UTF-8 safe Base64 conversion, rendered Markdown preview, prompt variable extraction, and MCU timer calculation.
- AI and Automation pages should include direct status refresh and a settings shortcut so missing configuration can be fixed from the current workflow.
- Agent Control Center provides one compact dispatch form with project, Agent, scope, and reusable task templates. It records queue items through the authenticated backend; it does not claim to launch an Agent until that Agent is connected through its actual CLI or MCP workflow.
- Connections uses a single catalog for direct integrations and MCP-ready platforms. A platform is labeled connected only after its real connection status is returned by the server; catalog entries otherwise say `待配置` or `通过 MCP 添加`.

## Current UI References

- Linear-style work surfaces: configurable views, clear ownership, and status-oriented dashboards.
- Notion-style navigation: sidebar groups should help locate areas quickly instead of exposing a flat module list.
- Todoist Today-style focus: the daily view should emphasize what is scheduled for today and avoid showing every backlog item.
- Raycast-style command center: global search and actions should be available from a compact command entry.
- MUI Toolpad-style shell: dashboard pages use a stable sidebar, header, and scrollable content area.
- GitHub Projects-style item entry: adding work should be possible from a compact inline row.
- Notion-style templates: repeated project types should prefill sensible defaults.

## Concept Reference

Primary concept image:

```text
outputs/myos-dashboard-concept.png
```
