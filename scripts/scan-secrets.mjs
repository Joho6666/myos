import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".git", ".next", ".next-dev", "dist", "dist-release-0.1.6", "dist-release-0.1.7", ".venv", "android", "coverage", "python-agent"]);
const patterns = [
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /eyJ[A-Za-z0-9_-]{80,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/
];
const allowed = [
  "src/server/integrations/google.test.ts",
  "src/lib/python-agent/client.test.ts",
  "src/lib/auth/session-token.test.ts"
];

async function walk(dir, found) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, found);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|py|md|json|yml|yaml|env)$/.test(entry.name)) continue;
    const relative = path.relative(root, full).replaceAll("\\", "/");
    if (relative.endsWith(".example") || relative.endsWith("scan-secrets.mjs") || allowed.includes(relative)) continue;
    const info = await stat(full);
    if (info.size > 750000) continue;
    const text = await readFile(full, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(text)) found.push(relative);
    }
  }
}

const found = [];
await walk(root, found);
if (found.length) {
  console.error("Possible committed secrets:\n" + found.join("\n"));
  process.exit(1);
}
console.log("Secret scan passed.");
