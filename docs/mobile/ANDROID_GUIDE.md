# Android 客户端打包与安装指南

MyOS 提供了两种在 Android 手机上使用的最佳实践：

---

## 方式一：Capacitor 打包原生 APK（离线独立安装包）

### 1. 前置环境
- 本地需要安装 JDK 17+ 与 Android Studio（或配置好 Android SDK / Platform Tools）。

### 2. 配置服务器地址
打开项目根目录的 `capacitor.config.ts`：
```ts
server: {
  // 替换为你的实际云端线上部署地址或局域网地址
  url: "https://your-myos-domain.com",
  cleartext: true
}
```

### 3. 同步并生成 APK
在终端执行以下命令：
```bash
# 1. 同步配置与 Web 资源到 Android 工程
pnpm android:sync

# 2. 直接在 Android Studio 中打开工程进行编译和真机调试
pnpm android:open

# 或者通过命令行直接打包 Debug APK：
pnpm android:build
```
生成的 APK 位于：`android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 方式二：PWA WebAPK 免编译安装（推荐，几秒搞定）

项目已经配置好了完整的 PWA Manifest 与高清矢量图标：

1. 使用手机上的 **Chrome** 或 **Edge** 浏览器打开你的 MyOS 线上地址（例如 `https://your-myos-domain.com`）。
2. 点击浏览器右上角菜单（三个点） -> **「安装应用」** 或 **「添加到主屏幕」**。
3. 系统会自动将其打包为一个轻量的独立应用，拥有独立桌面图标和无边框全屏体验。
