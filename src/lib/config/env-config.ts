import { readFile, writeFile } from "node:fs/promises";
import { envLocalPath as runtimeEnvLocalPath } from "@/server/paths";

export type ConfigField = {
  key: string;
  label: string;
  group: "owner" | "database" | "ai" | "automation" | "external";
  secret: boolean;
  description: string;
  placeholder?: string;
};

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const configFields: ConfigField[] = [
  { key: "OWNER_EMAIL", label: "拥有者邮箱", group: "owner", secret: false, description: "只允许这个邮箱登录 MyOS。", placeholder: "owner@example.com" },
  { key: "MYOS_SESSION_SECRET", label: "会话签名密钥", group: "owner", secret: true, description: "用于签名私人登录会话，建议使用至少 32 个字符的随机值。" },
  { key: "NEXT_PUBLIC_APP_URL", label: "应用地址", group: "owner", secret: false, description: "OpenRouter、OAuth 和部署回调用到的站点地址。", placeholder: "http://localhost:3000" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", group: "database", secret: false, description: "Supabase 项目 URL。" },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", label: "Supabase Publishable Key", group: "database", secret: false, description: "可公开的 Supabase anon/publishable key。" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role", group: "database", secret: true, description: "只在服务端使用，不能发送到浏览器。" },
  { key: "SUPABASE_OWNER_USER_ID", label: "Supabase Owner User ID", group: "database", secret: false, description: "可选。指定 owner 对应的 Supabase Auth 用户 ID。" },
  { key: "SUPABASE_STORAGE_BUCKET", label: "Supabase Storage Bucket", group: "database", secret: false, description: "私有文件 bucket 名称。默认 myos-files。", placeholder: "myos-files" },
  { key: "OPENAI_API_KEY", label: "OpenAI API Key", group: "ai", secret: true, description: "用于 AI 工作台 OpenAI Provider。" },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key", group: "ai", secret: true, description: "用于 AI 工作台 OpenRouter Provider。" },
  { key: "OLLAMA_BASE_URL", label: "Ollama Base URL", group: "ai", secret: false, description: "本地 Ollama 地址。", placeholder: "http://localhost:11434" },
  { key: "N8N_BASE_URL", label: "n8n Base URL", group: "automation", secret: false, description: "n8n Webhook 基础地址。" },
  { key: "N8N_WEBHOOK_SECRET", label: "n8n Webhook Secret", group: "automation", secret: true, description: "MyOS 调用 n8n 时附加的签名密钥。" },
  { key: "N8N_REQUEST_TIMEOUT_MS", label: "n8n Timeout", group: "automation", secret: false, description: "n8n 请求超时毫秒数。", placeholder: "30000" },
  { key: "GITHUB_TOKEN", label: "GitHub Token", group: "external", secret: true, description: "用于连接看板检测 GitHub，后续同步仓库和 Issue。" },
  { key: "NOTION_TOKEN", label: "Notion Token", group: "external", secret: true, description: "用于连接 Notion 工作区。" },
  { key: "GOOGLE_CLIENT_ID", label: "Google Client ID", group: "external", secret: false, description: "用于 Gmail OAuth。" },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google Client Secret", group: "external", secret: true, description: "用于 Gmail OAuth，只保存在服务端。" },
  { key: "GOOGLE_REFRESH_TOKEN", label: "Google Refresh Token", group: "external", secret: true, description: "用于服务端刷新 Gmail access token。" },
  { key: "LOCAL_AGENT_BASE_URL", label: "Local Agent URL", group: "external", secret: false, description: "Windows 本地助手地址，仅服务端调用。", placeholder: "http://127.0.0.1:43110" },
  { key: "LOCAL_AGENT_TOKEN", label: "Local Agent Token", group: "external", secret: true, description: "MyOS 服务端调用本地助手使用的本地密钥。" }
];

const envLocalPath = runtimeEnvLocalPath;

function parseEnv(raw: string) {
  const map = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      try {
        map.set(match[1], JSON.parse(value));
        continue;
      } catch {
        map.set(match[1], value.slice(1, -1));
        continue;
      }
    }
    map.set(match[1], value.replace(/^'|'$/g, ""));
  }
  return map;
}

function encodeEnvValue(value: string) {
  if (/^[A-Za-z0-9_./:@-]*$/.test(value)) return value;
  return JSON.stringify(value);
}

function serializeEnv(values: Map<string, string>) {
  const orderedKeys = configFields.map((field) => field.key);
  const extraKeys = Array.from(values.keys()).filter((key) => !orderedKeys.includes(key)).sort();
  return [...orderedKeys, ...extraKeys]
    .filter((key) => values.has(key))
    .map((key) => `${key}=${encodeEnvValue(values.get(key) || "")}`)
    .join("\n")
    .concat("\n");
}

function mask(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "已配置";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function validateUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new ConfigValidationError(`${label} 必须是 http 或 https 地址。`);
  }
}

function validateRuntimeConfigValue(field: ConfigField, value: string) {
  if (!value) return;

  if (field.key === "OWNER_EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ConfigValidationError("拥有者邮箱格式不正确。");
  }

  if (field.key === "MYOS_SESSION_SECRET" && value.length < 32) {
    throw new ConfigValidationError("会话签名密钥至少需要 32 个字符。");
  }

  if (["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "OLLAMA_BASE_URL", "N8N_BASE_URL", "LOCAL_AGENT_BASE_URL"].includes(field.key)) {
    validateUrl(value, field.label);
  }

  if (field.key === "N8N_REQUEST_TIMEOUT_MS") {
    const timeout = Number(value);
    if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) {
      throw new ConfigValidationError("n8n Timeout 必须是 1000 到 300000 之间的整数毫秒数。");
    }
  }

  if (field.key === "SUPABASE_STORAGE_BUCKET" && !/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(value)) {
    throw new ConfigValidationError("Supabase Storage Bucket 只能使用小写字母、数字、点、下划线和短横线，长度 3-63。");
  }

  if (field.key === "SUPABASE_OWNER_USER_ID" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ConfigValidationError("Supabase Owner User ID 必须是 UUID。");
  }
}

export function validateRuntimeConfigUpdates(updates: Record<string, string>) {
  const fieldsByKey = new Map(configFields.map((field) => [field.key, field]));
  for (const [key, rawValue] of Object.entries(updates)) {
    const field = fieldsByKey.get(key);
    if (!field) continue;
    validateRuntimeConfigValue(field, rawValue.trim());
  }
}

export async function readRuntimeConfig() {
  let fileValues = new Map<string, string>();
  try {
    fileValues = parseEnv(await readFile(envLocalPath, "utf8"));
  } catch {
    fileValues = new Map();
  }

  return configFields.map((field) => {
    const value = process.env[field.key] || fileValues.get(field.key) || "";
    return {
      ...field,
      configured: Boolean(value),
      value: field.secret ? "" : value,
      maskedValue: field.secret ? mask(value) : value
    };
  });
}

export async function updateRuntimeConfig(updates: Record<string, string>) {
  const allowed = new Set(configFields.map((field) => field.key));
  validateRuntimeConfigUpdates(updates);
  let values = new Map<string, string>();
  try {
    values = parseEnv(await readFile(envLocalPath, "utf8"));
  } catch {
    values = new Map();
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.has(key)) continue;
    const trimmed = value.trim();
    if (trimmed) {
      values.set(key, trimmed);
      process.env[key] = trimmed;
    } else {
      values.delete(key);
      delete process.env[key];
    }
  }

  await writeFile(envLocalPath, serializeEnv(values), "utf8");
  return await readRuntimeConfig();
}
