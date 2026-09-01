# MyOS 离线移动端

`apps/mobile` 是 Android 内置的离线优先界面。生产 APK 不使用 `server.url`，因此可以在没有网络时启动、记录任务、项目和收件箱，并查看上次缓存的 Agent 执行状态。

## 构建

1. 复制 `apps/mobile/.env.example` 为 `apps/mobile/.env.production`，填入 Supabase URL、Publishable Key 和 Vercel 同步地址。
2. 运行 `pnpm android:offline`，再使用 Android Gradle 构建 APK。

## 云同步

手机使用 Supabase Magic Link 登录。离线写入会放在本地操作队列；联网后调用 Vercel `/api/myos/sync`。Service Role Key 只在 Vercel 环境变量中，绝不打入 APK。

## 电脑本地文件

Local Agent 只读取 `allowedFileRoots` 内已授权的目录。把电脑和手机加入同一个 Tailscale tailnet 后，用 `tailscale serve` 把 Local Agent 的 loopback HTTPS 暴露给自己的设备；不要开放公网端口。
