/**
 * 桌面版构建：用「干净环境」跑 next build。
 *
 * 为什么必须这样做：
 * Next 会在构建期把 NEXT_PUBLIC_* 内联进服务端 chunk
 * （node_modules/next/dist/lib/static-env.js）。如果带着开发机的 .env.local
 * 构建，本机 Supabase 地址等值会被写死进 .exe。
 *
 * 也不能把变量设成空字符串绕过 —— static-env.js 判断的是 value != null，
 * 空串照样内联，会把 isSupabaseConfigured() 永久钉死为 false，
 * 用户之后再也无法在 /app/settings 里启用 Supabase。
 * 唯一正确做法是构建时让这些变量「不存在」。
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envLocal = path.join(projectRoot, ".env.local");
const envBackup = path.join(projectRoot, ".env.local.buildbak");
const standaloneDir = path.join(projectRoot, ".next", "standalone");

let stashed = false;

function restoreEnv() {
  if (stashed && existsSync(envBackup)) {
    renameSync(envBackup, envLocal);
    stashed = false;
    console.log("[build-app] 已还原 .env.local");
  }
}

// 双保险：异常退出、Ctrl+C 都要还原，绝不能丢用户的 .env.local
process.on("exit", restoreEnv);
process.on("SIGINT", () => {
  restoreEnv();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restoreEnv();
  process.exit(143);
});

/** 剔除所有 MyOS 相关变量，避免任何值被内联进产物 */
function cleanEnv() {
  const stripped = {};
  const drop = /^(NEXT_PUBLIC_|SUPABASE_|OPENAI_|OPENROUTER_|OLLAMA_|N8N_|GITHUB_|NOTION_|GOOGLE_|LOCAL_AGENT_|OWNER_EMAIL)/;

  for (const [key, value] of Object.entries(process.env)) {
    if (drop.test(key)) continue;
    stripped[key] = value;
  }

  stripped.NODE_ENV = "production";
  // 桌面版不上报构建遥测
  stripped.NEXT_TELEMETRY_DISABLED = "1";
  return stripped;
}

function run() {
  if (existsSync(envLocal)) {
    if (existsSync(envBackup)) {
      throw new Error(
        `发现残留的 ${path.basename(envBackup)}，上次构建可能被强制中断。请先人工确认并处理该文件。`
      );
    }
    renameSync(envLocal, envBackup);
    stashed = true;
    console.log("[build-app] 已临时移走 .env.local，用干净环境构建");
  }

  // 清掉上次的 standalone，避免残留文件混进新产物
  // Windows 上 IDE/索引器可能用 ReadDirectoryChangesW 持有 standalone 目录句柄，
  // 导致 rmdir 整个目录失败（EPERM/EBUSY），rename 同样失败。此时退化为清空目录
  // 内容、保留空壳——next build 与后续 cpSync 仍可向其中写入（被占用的仅是目录本身
  // 的句柄，不影响其子项的增删）。子项可正常删除（已实测 rm -rf 能清空内容）。
  if (existsSync(standaloneDir)) {
    try {
      rmSync(standaloneDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`[build-app] rmSync(standaloneDir) 失败（${e.code || e.message}），改为清空目录内容。`);
      for (const name of readdirSync(standaloneDir)) {
        rmSync(path.join(standaloneDir, name), { recursive: true, force: true });
      }
    }
  }

  console.log("[build-app] 运行 next build (output: standalone)...");
  const result = spawnSync(
    process.execPath,
    [path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "build"],
    {
      cwd: projectRoot,
      env: { ...cleanEnv(), MYOS_DESKTOP_BUILD: "1" },
      stdio: "inherit"
    }
  );

  if (result.status !== 0) {
    throw new Error(`next build 失败，退出码 ${result.status}`);
  }

  if (!existsSync(standaloneDir)) {
    throw new Error("未找到 .next/standalone，请确认 next.config.ts 里 output 为 standalone。");
  }

  // Next standalone 不会自动带上静态资源，需要手动补拷贝
  console.log("[build-app] 拷贝 .next/static 与 public 到 standalone...");
  // 清除依赖追踪误带的 work/ 目录（仅含空 server-data）
  rmSync(path.join(standaloneDir, "work"), { recursive: true, force: true });
  const staticTarget = path.join(standaloneDir, ".next", "static");
  rmSync(staticTarget, { recursive: true, force: true });
  cpSync(path.join(projectRoot, ".next", "static"), staticTarget, { recursive: true });

  const publicSource = path.join(projectRoot, "public");
  if (existsSync(publicSource)) {
    const publicTarget = path.join(standaloneDir, "public");
    rmSync(publicTarget, { recursive: true, force: true });
    cpSync(publicSource, publicTarget, { recursive: true });
  }

  copyNextRuntime(standaloneDir, projectRoot);
  copyNextRuntimeDeps(standaloneDir, projectRoot);
  ensureStandalonePackageJsons(standaloneDir, projectRoot);

  console.log("[build-app] 完成。");
}

/**
 * Next 15.5 的 @vercel/nft 依赖追踪对 next 包自身的内部 require 跟踪不全：
 * 它只把 next.js 直接引用的少数文件复制进 standalone，却漏掉了 ../build/output/log、
 * ./config、../lib/constants 等几十个运行时必需文件，还漏了 package.json 本身。
 * 结果桌面版启动时 `require('next')` 直接崩溃，窗口停在 loading 页白屏。
 *
 * 追踪器靠不住，这里直接把完整的 next 包覆盖进 standalone。版本一致（standalone
 * 就是从这份 node_modules 追踪出来的），多带的文件在运行时是惰性的（Next 只
 * require 它需要的，多余文件不会触发编译）。
 *
 * 但完整 next 包有 81MB，其中 dist/compiled 占 58MB，大量是构建期/实验性产物，
 * 运行时根本不会加载。这里在拷贝时剔除一组已验证安全删除的 compiled 子目录：
 *   - react-dom-experimental / react-server-dom-*-experimental / *-turbopack /
 *     scheduler-experimental：React 实验构建，生产 standalone 走稳定版 react-dom
 *   - webpack / schema-utils* / loader-utils* / loader-runner / babel-packages /
 *     babel-code-frame / terser / acorn：构建期转译/打包依赖，standalone server 不编译代码
 *   - amphtml-validator：仅用于 AMP 校验（MyOS 无 AMP 页）
 *   - next-devtools：开发覆盖层
 *   - @mswjs / node-html-parser / conf / json5 / source-map08 / postcss-safe-parser /
 *     shell-quote / css.escape / anser / postcss-plugin-stub-for-cssnano-simple：开发/配置工具
 *
 * 验证方式：在 standalone 上删除这批子目录后启动 server.js，/login 返回 200、
 * /app 返回 307、各 /api/* 路由正常返回 401/405（路由处理器加载执行无报错），
 * 无 "Cannot find module"。剔除后 next 包从 81MB 降到 55MB（-26MB）。
 * 另排除 .map / .d.ts 这类纯开发期产物以进一步控制体积。
 */
function copyNextRuntime(standaloneDir, projectRoot) {
  const sourceNext = path.join(projectRoot, "node_modules", "next");
  const targetNext = path.join(standaloneDir, "node_modules", "next");
  if (!existsSync(sourceNext)) return;

  // 已验证可安全剔除的 next/dist/compiled 子目录（构建期/实验性产物）
  const dropSubdirs = new Set([
    "amphtml-validator", "webpack", "webpack-sources1", "webpack-sources3",
    "schema-utils2", "schema-utils3", "loader-utils2", "loader-utils3", "loader-runner",
    "babel-packages", "babel-code-frame", "terser", "next-devtools",
    "postcss-safe-parser", "acorn", "node-html-parser", "@mswjs", "source-map08",
    "json5", "conf", "shell-quote", "css.escape", "postcss-plugin-stub-for-cssnano-simple", "anser",
    "react-dom-experimental", "react-experimental",
    "react-server-dom-webpack-experimental", "react-server-dom-turbopack-experimental",
    "react-server-dom-turbopack", "scheduler-experimental"
  ]);

  const compiledDir = path.join(sourceNext, "dist", "compiled");
  const compiledPrefix = compiledDir.split(path.sep).join("/") + "/";
  let dropped = 0;
  if (existsSync(compiledDir)) {
    for (const name of readdirSync(compiledDir)) {
      if (dropSubdirs.has(name)) dropped++;
    }
  }

  rmSync(targetNext, { recursive: true, force: true });
  cpSync(sourceNext, targetNext, {
    recursive: true,
    filter: (src) => {
      if (src.endsWith(".map") || src.endsWith(".d.ts")) return false;
      // 跳过黑名单 compiled 子目录及其内容
      const norm = src.split(path.sep).join("/");
      if (norm.startsWith(compiledPrefix)) {
        const firstSeg = norm.slice(compiledPrefix.length).split("/")[0];
        if (dropSubdirs.has(firstSeg)) return false;
      }
      return true;
    }
  });
  console.log(`[build-app] 用 next 包覆盖 standalone/node_modules/next（剔除 ${dropped} 个构建期/实验性 compiled 子目录，约 -26MB）`);
}

/**
 * Next 的 @vercel/nft 依赖追踪在解析 `require('next')` 时，会直接解析到
 * next 的入口文件（如 dist/server/next.js）并复制它，但**不会**复制
 * next/package.json 本身。运行时 `require('next')` 需要 package.json 的
 * main/exports 字段才能定位入口，缺失会抛 "Cannot find module 'next'"，
 * 整个桌面版启动后白屏（服务起不来）。
 *
 * 遍历 standalone 的 node_modules，凡是缺 package.json 的包，从项目根的
 * node_modules 补拷贝过来。版本一致（standalone 就是从这份 node_modules
 * 追踪出来的），只补 package.json 这一个文件，不引入额外内容。
 */
function ensureStandalonePackageJsons(standaloneDir, projectRoot) {
  const standaloneModules = path.join(standaloneDir, "node_modules");
  const sourceModules = path.join(projectRoot, "node_modules");
  if (!existsSync(standaloneModules) || !existsSync(sourceModules)) return;

  let patched = 0;
  for (const entry of readdirSync(standaloneModules, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    // 处理 @scope/ 包：scope 目录下的每个子包都要检查
    const scopeDirs = entry.name.startsWith("@")
      ? readdirSync(path.join(standaloneModules, entry.name), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => path.join(entry.name, d.name))
      : [entry.name];

    for (const pkg of scopeDirs) {
      const targetPkgJson = path.join(standaloneModules, pkg, "package.json");
      if (existsSync(targetPkgJson)) continue;

      const sourcePkgJson = path.join(sourceModules, pkg, "package.json");
      if (!existsSync(sourcePkgJson)) continue;

      cpSync(sourcePkgJson, targetPkgJson);
      patched++;
      console.log(`[build-app] 补拷贝 node_modules/${pkg}/package.json`);
    }
  }
  if (patched > 0) {
    console.log(`[build-app] 共补了 ${patched} 个缺失的 package.json`);
  }
}

/**
 * copyNextRuntime 把 next 包本身补全了，但 next/package.json 声明的运行时依赖
 * （@next/env、@swc/helpers、caniuse-lite、postcss 等）同样没被 @vercel/nft
 * 追踪进 standalone——因为追踪器根本没把 next 当作"包"来读它的 dependencies。
 * 直接在项目目录里跑 standalone 能起，纯粹是 Node 沿目录树向上找到了项目根的
 * node_modules；打包后 app 目录是孤立的，没有上层 node_modules 兜底，于是
 * `@swc/helpers/_/_interop_require_default` 这类 require 直接崩。
 *
 * 从项目根的 node_modules 按 next 的 dependencies 树补拷贝。只补 standalone
 * 里缺失的包；遇到已存在的就停（已存在的包是 nft 正常追踪进来的，它们自己的
 * 依赖树完整，不再深入，避免把整个 node_modules 都拖进来）。仅对新拷贝的包
 * 递归，保证补全 next 这条断裂的链路即可。
 */
function copyNextRuntimeDeps(standaloneDir, projectRoot) {
  const standaloneModules = path.join(standaloneDir, "node_modules");
  const sourceModules = path.join(projectRoot, "node_modules");
  if (!existsSync(sourceModules)) return;

  const queue = [];
  const visited = new Set(["next"]);

  const enqueueDeps = (pkgName) => {
    const srcPkgJson = path.join(sourceModules, pkgName, "package.json");
    if (!existsSync(srcPkgJson)) return;
    let deps;
    try {
      deps = Object.keys(JSON.parse(readFileSync(srcPkgJson, "utf8")).dependencies || {});
    } catch {
      return;
    }
    for (const d of deps) {
      if (!visited.has(d)) {
        visited.add(d);
        queue.push(d);
      }
    }
  };

  enqueueDeps("next");

  let copied = 0;
  while (queue.length) {
    const dep = queue.shift();
    const target = path.join(standaloneModules, dep);
    if (existsSync(target)) continue; // nft 已追踪进来，依赖树完整，不深入

    const source = path.join(sourceModules, dep);
    if (!existsSync(source)) {
      console.log(`[build-app] next 依赖 ${dep} 在源 node_modules 中找不到，跳过`);
      continue;
    }
    cpSync(source, target, {
      recursive: true,
      filter: (src) => !src.endsWith(".map") && !src.endsWith(".d.ts")
    });
    copied++;
    console.log(`[build-app] 补拷贝 next 运行时依赖: ${dep}`);
    enqueueDeps(dep);
  }
  if (copied > 0) {
    console.log(`[build-app] 共补了 ${copied} 个 next 运行时依赖`);
  }
}

try {
  run();
} finally {
  restoreEnv();
}
