import path from "node:path";

/**
 * 桌面版由 Electron 主进程注入 MYOS_DATA_DIR，指向可写的用户数据目录
 * （Windows 上是 %APPDATA%\MyOS）。打包后的安装目录只读，且 Next standalone
 * 的 server.js 会 process.chdir 到只读的 resources 目录，所以不能再用
 * process.cwd() 定位可写路径。
 *
 * 未设置 MYOS_DATA_DIR 时（pnpm dev / pnpm start）行为与桌面版之前完全一致。
 *
 * 重要：每个 path.join 的参数必须全部是字面量，不能用变量拼接或展开
 * （如 path.join(root, ...segments)）。Next 的依赖追踪会静态求值 path.join，
 * 遇到无法解析的动态参数时，会保守地把整个父目录复制进 standalone 产物 ——
 * work/ 下有浏览器调试残留的 chrome-cdp 配置和用户上传文件，实测会让产物
 * 从 200MB 膨胀到 4.2GB。
 */
const desktopRoot = process.env.MYOS_DATA_DIR;

export const serverDataDir = desktopRoot
  ? path.join(desktopRoot, "server-data")
  : path.join(process.cwd(), "work", "server-data");

export const uploadRoot = desktopRoot
  ? path.join(desktopRoot, "uploads")
  : path.join(process.cwd(), "work", "uploads");

export const envLocalPath = desktopRoot
  ? path.join(desktopRoot, ".env.local")
  : path.join(process.cwd(), ".env.local");
