# MyOS

MyOS is a private, single-user personal digital operating system for AI work, projects, inbox capture, files, prompts, knowledge, automations, engineering records, learning, and business orders.

It is not a public SaaS or tool directory. Unauthenticated users go to `/login`; authenticated owners go to `/app`.

## Local Start

```bash
pnpm install
pnpm supabase:start
pnpm dev
```

Windows 下 `pnpm supabase:start` 会调用项目内置的 Supabase CLI；如果 Docker Desktop 尚未启动，请先启动 Docker Desktop。

Open `http://localhost:3000`.

If `OWNER_EMAIL` is not set, local demo login uses:

```text
owner@example.com
```

## Environment

Copy `.env.example` to `.env.local` and fill values as needed. Do not commit `.env.local`.

Client-safe variables start with `NEXT_PUBLIC_`. All secrets must remain server-only.

`MYOS_TIME_ZONE` controls calendar-date aliases such as `today` and `tomorrow`; it defaults to `Asia/Shanghai`.

`MYOS_SESSION_SECRET` signs the private owner session cookie. Set a long random value in production. For local compatibility, the server-only Supabase Service Role key is used only when this dedicated secret is absent.

This workspace has `.env.local` configured for the local Supabase stack:

- API: `http://127.0.0.1:54331`
- Studio: `http://127.0.0.1:54323`
- Owner email: `owner@example.com`
- Owner user id: `00000000-0000-0000-0000-000000000001`

Useful local Supabase commands:

```bash
pnpm supabase:start
pnpm supabase:stop
pnpm supabase:reset
```

## Windows Local Agent

The first local-agent phase is read-only. It checks whether the local helper is online, whether Ollama is reachable, and which local projects are allowlisted.

Setup:

```bash
copy local-agent\agent.config.example.json local-agent\agent.config.json
pnpm local-agent
```

Set the same token in both places:

- `local-agent/agent.config.json`: `authToken`
- `.env.local`: `LOCAL_AGENT_TOKEN`

Then open `/app/local-agent`.

The local agent binds only to `127.0.0.1`. The first phase does not open folders, run scripts, or execute arbitrary commands.

## Windows Desktop App

MyOS 已经可以打包成真正的 Windows 桌面应用：双击 `.exe` 打开 MyOS，内置启动本地助手、系统托盘、开机启动和桌面通知。

最新安装包和便携版可从 [GitHub Releases](https://github.com/Joho6666/myos/releases) 下载；界面预览和应用图标位于 [`docs/assets`](./docs/assets)。

Build:

```bash
corepack pnpm desktop:build
```

产物在 `dist/`：

- `MyOS-Setup-0.1.0.exe` —— NSIS 安装程序
- `MyOS-0.1.0-portable.exe` —— 便携版
- `win-unpacked/` —— 免解压目录版

开发态调试（不打包）：

```bash
corepack pnpm desktop:dev
```

桌面版把数据写在 `%APPDATA%\MyOS`（`.env.local`、`server-data`、`uploads`、`logs`），安装目录保持只读。安装包内**不含任何密钥** —— 首次启动生成空白配置，Supabase、OpenAI 等在 `/app/settings` 里填写，保存后立即生效。

目标机器不需要安装 Node.js 或 pnpm，Electron 自带的 Node 会运行 Next 服务端和本地助手。

桌面版默认走本地文件模式，无 Docker 依赖。要用 Supabase 需自行 `pnpm supabase:start` 后在 `/app/settings` 填写连接信息。

详见 `docs/DESKTOP.md`。

### 数据迁移

桌面版数据目录是全新的，不会自动继承 `work/server-data/myos-data.json`。迁移方式：`pnpm dev` 里在 `/app/settings` 导出 JSON，再到桌面版里导入。

### PowerShell Launcher

`desktop/start-myos.ps1` 仍然保留，适合开发调试：

- Starts the Windows local agent if port `43110` is not already listening.
- Starts MyOS if port `3000` is not already listening.
- Opens `http://localhost:3000/app`.
- Writes status and process logs under `desktop/logs`.
- Does not print local-agent tokens.

它使用项目目录下的 `work/`，需要本机已装 Node 和 pnpm；桌面版 App 则使用 `%APPDATA%\MyOS` 且自带运行时。

## Current Features

- Local single-owner login guard
- Authenticated backend API for reading and updating core MyOS data
- Usable local server data repository by default
- Supabase-backed CRUD repository when Supabase is configured
- Private app shell
- Sidebar navigation
- Top command/search bar
- Ctrl+K command palette
- Dashboard overview
- Projects and project detail
- Universal inbox
- Prompt library
- Knowledge library
- File center with local upload, Supabase private Storage upload, signed download, file registration, and delete
- Automation status page
- AI provider status page
- Tool registry
- Today workspace
- Life areas
- Goals and goal detail pages
- Upgraded task system with goal/project association and today focus
- Habits and habit logs
- Routines and routine logs
- Daily check-ins
- Daily and weekly reviews
- PWA manifest and offline page
- Google integration database/design plan
- Learning, engineering, business, bookmarks, activity, and settings pages
- Settings data export and import for JSON backup/restore
- Connection dashboard for GitHub, Gmail, Notion, Supabase, AI, and n8n
- Gmail message intake into Inbox and Gmail attachment intake into File Center
- Read-only Windows local-agent status page for local helper, Ollama, and allowlisted projects
- Supabase migration with RLS policies

## Known Limits

- Core CRUD now goes through a protected server API.
- Local Supabase is configured for this workspace and data is saved in Supabase tables.
- If `.env.local` is removed, the app falls back to the local server repository at `work/server-data/myos-data.json`.
- File upload works through the protected server API. Local mode stores binaries under `work/uploads`; Supabase mode stores binaries in the private `SUPABASE_STORAGE_BUCKET` bucket and downloads through short-lived signed URLs.
- Data export downloads MyOS records as JSON. It does not export `.env.local` secrets or original file binaries.
- Data import accepts MyOS JSON backup files and replaces current records after confirmation. It restores file records only, not missing original files.
- AI and n8n integrations show real unconfigured states until server environment variables are provided.
- Gmail summary and attachment import require Google OAuth variables. Attachment import saves files through the same protected local/Supabase Storage pipeline as ordinary uploads.
- Encrypted vault storage is planned but not implemented.
- Offline mode currently provides an offline page and local quick-draft helper; full service worker caching is a later step.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Deployment

Deploy with Vercel after configuring Supabase and required environment variables. Do not expose service role keys to the browser.

For production deployment, configure Supabase, apply all migrations, create the owner user, and keep `SUPABASE_SERVICE_ROLE_KEY` server-only. The local server repository is intended for making the app immediately usable on this machine.
