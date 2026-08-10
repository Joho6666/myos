# MyOS Windows 桌面版

MyOS 桌面版是用 Electron 打包的真正 Windows 应用：双击 `.exe` 打开 MyOS，内置启动本地助手、系统托盘、开机启动、桌面通知和专注浮窗。

## 架构

MyOS 有 Server Actions、20 多个 `/api/*` 路由、`middleware.ts` 和 Node runtime 的文件上传下载，所以不能做成静态导出。桌面版的做法是：Electron 主进程拉起真实的 Next.js 服务端作为子进程，窗口再指向本地端口。

```
Electron 主进程 (desktop/electron/main.js)
├── 子进程 1：.next/standalone/server.js   → 127.0.0.1:<自动分配端口>
├── 子进程 2：local-agent/server.mjs       → 127.0.0.1:43110
└── BrowserWindow → http://127.0.0.1:<port>/app
└── 专注浮窗 → http://127.0.0.1:<port>/focus
```

两个子进程都用 **Electron 自带的 Node** 运行（`ELECTRON_RUN_AS_NODE=1`），所以目标机器不需要安装 Node.js 或 pnpm。

模块划分：

| 文件 | 职责 |
| --- | --- |
| `main.js` | 应用生命周期、窗口、单实例锁、IPC |
| `paths.js` | 打包态/开发态的路径解析 |
| `bootstrap.js` | 首次启动初始化、端口探测、`.env.local` 解析 |
| `services.js` | 两个子进程的启动、健康轮询、停止、重启 |
| `tray.js` | 托盘菜单、开机启动开关 |
| `notify.js` | Windows 通知 |
| `preload.js` | `contextBridge`，只暴露三个方法 |

## 数据目录

所有可写数据都在 `%APPDATA%\MyOS`（由 `electron-builder.yml` 的 `productName` 决定），安装目录保持只读：

```
%APPDATA%\MyOS\
├── .env.local              首次启动生成的配置，会自动包含本机会话签名密钥
├── agent.config.json       本地助手配置，token 每台机器随机生成
├── server-data\
│   └── myos-data.json      本地文件模式的数据
├── uploads\                上传的文件
└── logs\
    ├── myos-web.log
    ├── local-agent.log
    └── desktop.log
```

代码侧由 `src/server/paths.ts` 统一处理：Electron 注入 `MYOS_DATA_DIR`，该模块据此解析 `serverDataDir`、`uploadRoot`、`envLocalPath`。未设置该变量时（`pnpm dev`）行为与桌面版之前完全一致。

本地助手同理，读 `MYOS_AGENT_CONFIG` 定位配置文件。

## 专注浮窗

专注浮窗是 Electron 的独立、始终置顶窗口，不是网页上的装饰层。它只显示下一步任务和进行中项目，并允许直接完成任务。

- 在桌面版顶部栏点击显示器图标，或从系统托盘选择“显示 / 隐藏专注浮窗”。
- 关闭或最小化浮窗只会隐藏它，MyOS 和后台服务继续运行。
- 浮窗和主窗口共享同一个 Electron 会话，因此登录后的私人数据仍受 MyOS 登录保护。
- 浏览器版不会显示浮窗按钮，也不会假装拥有桌面权限。

## 原生使用体验

桌面版会保留主窗口的大小、位置和最大化状态。关闭主窗口时应用会驻留在系统托盘，双击托盘图标可以恢复窗口。

- `Ctrl + Alt + Space`：显示或隐藏专注浮窗。
- 设置页面的“桌面应用”区可以打开数据目录或重启内置本地服务。
- 同一时间只允许一个 MyOS 桌面实例；重复打开时会恢复已有窗口。

## 安装包不含任何密钥

`next build` 会把 `NEXT_PUBLIC_*` **内联进服务端 chunk**（见 `node_modules/next/dist/lib/static-env.js`）。如果带着开发机的 `.env.local` 构建，本机 Supabase 地址等值会被写死进 `.exe`。

所以 `desktop/scripts/build-app.mjs` 会：

1. 把 `.env.local` 临时改名为 `.env.local.buildbak`
2. 用剔除了所有 MyOS 相关变量的环境跑 `next build`
3. `try/finally` + `exit`/`SIGINT`/`SIGTERM` 三重保险还原文件名

注意**不能**用「把变量设成空字符串」绕过：`static-env.js` 判断的是 `value != null`，空串照样内联，会把 `isSupabaseConfigured()` 永久钉死为 false，用户之后再也无法在 `/app/settings` 里启用 Supabase。唯一正确做法是构建时让这些变量不存在。

结果：安装包里没有任何密钥，同时 Supabase、OpenAI 等仍可在 `/app/settings` 运行时配置。`updateRuntimeConfig` 在写文件的同时更新 `process.env`，保存后立即生效，无需重启。

验证方法（每次改动构建流程后都该跑一遍）：

```bash
grep -r "54331" .next/standalone/.next/server        # 应为 0 命中
grep -r "NEXT_PUBLIC_SUPABASE_URL" .next/standalone/.next/server/chunks
```

第二条应该看到 `process.env.NEXT_PUBLIC_SUPABASE_URL` 这样的**运行时读取**，而不是被替换成字面量地址。如果看到具体的 URL 值，说明构建时环境没清干净。

### 依赖追踪排除

`next.config.ts` 的 `outputFileTracingExcludes` 排除了 `work/`、`outputs/` 等目录。这条不是优化，是必需的：`work/` 下有本机运行数据（`server-data`、`uploads`，以及浏览器调试留下的 `chrome-cdp` 配置目录），不排除的话 Next 会把它们整个复制进 standalone —— 实测体积从 200MB 膨胀到 4.3GB，而且会把本地数据和上传的文件打进安装包。

### Next 15.5.21 的 `next` 包追踪不全

Next 15.5.21 的 @vercel/nft 依赖追踪对 `next` 包自身有回归：解析 `require('next')` 时它直接定位到入口文件（`dist/server/next.js`），却**不把 `next` 当作一个包来读**——既不复制 `next/package.json`，也不复制 `next/package.json` 里 `dependencies` 声明的运行时依赖，更不跟踪 `next.js` 内部那 7000 多个传递 require。

实测 standalone 里 `node_modules/next/` 只有 11 个文件（正常应 3500+），缺 `package.json`、`node-polyfill-crypto`、`config`、`shared/lib/constants` 等。直接在项目目录里 `node .next/standalone/server.js` 能起来是个假象——Node 沿目录树向上找到了项目根的 `node_modules/next` 和 `@swc/helpers` 兜底。打包成 Electron 后 `resources/app/` 是孤立的，没有上层 `node_modules`，启动即崩：

```
Error: Cannot find module '@swc/helpers/_/_interop_require_default'
Require stack:
- .../resources/app/node_modules/next/dist/shared/lib/constants.js
- .../resources/app/node_modules/next/dist/server/config.js
- .../resources/app/node_modules/next/dist/server/next.js
- .../resources/app/server.js
```

`outputFileTracingExcludes` 和 `outputFileTracingRoot` 都治不了这个——问题出在追踪器没把 `next` 当包读，不在排除规则。`desktop/scripts/build-app.mjs` 里用两道补丁绕过：

1. **`copyNextRuntime()`** —— 把项目根 `node_modules/next` 整个覆盖进 standalone（仅排除 `.map`/`.d.ts`，约 72MB）。版本必然一致，因为 standalone 就是从这份 `node_modules` 追踪出来的。多带的文件是惰性的，Next 只 require 它实际用到的。
2. **`copyNextRuntimeDeps()`** —— 从 `next/package.json` 的 `dependencies` 出发做 BFS，把 standalone 里缺失的运行时依赖（`@next/env`、`@swc/helpers`、`caniuse-lite`、`postcss` 及它们的传递依赖 `tslib`/`nanoid`/`picocolors`/`source-map-js`）从项目根补拷贝进来。遇到已存在的包就停步——那些是 nft 正常追踪进来的，依赖树完整，不再深入以免把整个 `node_modules` 拖进来。

验证打包产物是否自洽（不依赖项目根 `node_modules`）：

```bash
node -e "console.log(require.resolve('@swc/helpers/_/_interop_require_default',{paths:['dist/win-unpacked/resources/app']}))"
```

能解析到 `resources/app/node_modules/@swc/helpers/...` 即说明 `next` 的运行时依赖链已自洽。升级 Next 大版本后若 `next/package.json` 的 `dependencies` 变化，`copyNextRuntimeDeps()` 会自动跟上（它读的是当前 `next/package.json`）。

## 构建

```bash
corepack pnpm desktop:build
```

等价于依次执行：

```bash
node desktop/scripts/make-icon.mjs     # SVG → 512x512 PNG
node desktop/scripts/build-app.mjs     # 干净环境 next build + 补拷贝静态资源
electron-builder --win                 # 打三种产物
```

产物在 `dist/`：

- `MyOS-Setup-0.1.2.exe` —— NSIS 安装程序，可选安装路径，建桌面和开始菜单快捷方式
- `MyOS-0.1.2-portable.exe` —— 便携版单文件
- `win-unpacked/` —— 免解压目录版，方便调试

开发态调试（不打包，最快）：

```bash
corepack pnpm desktop:dev
```

## Windows 符号链接限制

`pnpm-workspace.yaml` 里设了 `nodeLinker: hoisted`（pnpm 11 从这个文件读该设置，不是 `.npmrc`）。原因：Next standalone 追踪依赖时要重建 `node_modules` 的目录结构，而 pnpm 默认的符号链接布局会让它尝试创建目录符号链接 —— Windows 默认不允许普通用户这么做（需要开发者模式），构建会以 `EPERM` 失败。hoisted 布局让 `node_modules` 变成真实的平铺目录，Next 直接复制文件即可。

改动这个设置后需要删掉 `node_modules` 重装才会生效。

代价是磁盘占用变大、失去 pnpm 的严格依赖隔离；好处是方案跟着仓库走，换机器或交给别人都能直接打包。

## 数据迁移

桌面版的数据目录是全新的，不会自动继承 `work/server-data/myos-data.json`。迁移路径：

1. `pnpm dev` 启动，在 `/app/settings` 导出 JSON
2. 打开桌面版，在 `/app/settings` 导入该 JSON

导出不含 `.env.local` 密钥和文件原始二进制，导入只恢复文件记录、不恢复文件本体。

## 与 PowerShell 启动器的关系

`desktop/start-myos.ps1` 仍然保留，两者用途不同：

| | 桌面版 App | PowerShell 启动器 |
| --- | --- | --- |
| 数据位置 | `%APPDATA%\MyOS` | 项目 `work/` |
| 依赖 | 无（自带 Node） | 需要 Node + pnpm |
| 界面 | 独立窗口 + 托盘 | 浏览器标签页 |
| 适合 | 日常使用 | 开发调试 |

## 已知限制

- 安装包体积约 150–250MB，这是内嵌 Node 服务端的必然代价
- 默认走本地文件模式。要用 Supabase 需自行起 Docker 后在 `/app/settings` 填写，App 不代管 Docker
- 未做代码签名，Windows SmartScreen 首次运行会提示「未知发布者」
