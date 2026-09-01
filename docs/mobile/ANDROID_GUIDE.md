# Android 客户端打包与安装指南

MyOS 手机端是 **离线优先的 Capacitor 应用**（`apps/mobile`），不是把完整 Next.js Dashboard 塞进 WebView。

生产 APK **不要**设置 `capacitor.config.ts` 的 `server.url`。一旦设置，应用会变成依赖网络的远程网页，断网无法启动。

## 离线 APK（推荐）

1. 安装 JDK 17+ 与 Android Studio / SDK。
2. 复制 `apps/mobile/.env.example` 为 `apps/mobile/.env.production`，只填：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`（anon / publishable，**不要**填 service role）
   - `VITE_MYOS_SYNC_URL`（已部署的 MyOS https 地址）
3. 构建并同步：

```bash
pnpm android:offline
```

4. 用 Android Studio 打开工程，或命令行打 Debug APK：

```bash
pnpm android:open
# 或
pnpm android:build
```

APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。

## 离线能力

断网可以：

- 启动应用
- 记录今天的任务、收件箱和项目
- 数据保存在本机（优先加密 SQLite，失败则 Preferences）
- 查看上次缓存的 Agent 执行状态（只读）

联网且 Magic Link 登录后：

- 队列自动同步到 `/api/myos/sync`
- 刷新执行缓存

不能：

- 在手机上启动 Codex / Python Agent Runtime
- 在没有桌面 Runtime 时批准执行

## PWA 备选

主站 MyOS 有 manifest，可用 Chrome「添加到主屏幕」。这 **不是** 离线工作区：没有完整 Service Worker，断网后网页版几乎不可用。要离线记事请用上面的 APK。
