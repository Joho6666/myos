import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the development cache separate from production builds. This prevents
  // `next build` from invalidating a running local development server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // 桌面版由 Electron 拉起 .next/standalone/server.js 作为子进程。
  // 仅在桌面版构建时启用，避免影响 Vercel 部署。
  ...(process.env.MYOS_DESKTOP_BUILD === "1" ? { output: "standalone" as const } : {}),
  // 依赖追踪只需要 node_modules。work/ 下是本机运行数据
  // （server-data、uploads、chrome-cdp 浏览器配置），
  // 不排除会被整个复制进 standalone，体积膨胀到 GB 级，
  // 而且会把本地数据打进安装包。
  outputFileTracingExcludes: {
    "*": [
      "./work/**",
      "./outputs/**",
      "./dist/**",
      "./desktop/**",
      "./supabase/**",
      "./tools/**",
      "./node_modules/typescript/**",
      "./node_modules/@types/**"
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
