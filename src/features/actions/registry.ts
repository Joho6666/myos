import { toolsRegistry } from "@/features/tools/registry";

export type MyOSActionDefinition = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  href?: string;
  type: "navigate" | "create" | "run";
  enabled: boolean;
  group: "capture" | "work" | "life" | "automation" | "system";
};

const baseActions: MyOSActionDefinition[] = [
  { id: "create-project", label: "新建项目", description: "在统一创建中心中确认项目内容", keywords: ["项目", "project", "create"], icon: "folder-plus", href: "/app/projects", type: "create", enabled: true, group: "capture" },
  { id: "create-task", label: "新建任务", description: "记录今天或某个项目的下一步行动", keywords: ["任务", "todo", "task"], icon: "check-square", href: "/app/tasks", type: "create", enabled: true, group: "capture" },
  { id: "capture-inbox", label: "记录想法", description: "写入万能收件箱，稍后分类", keywords: ["收件箱", "灵感", "inbox"], icon: "inbox", href: "/app/inbox", type: "create", enabled: true, group: "capture" },
  { id: "upload-file", label: "上传文件", description: "进入文件中心保存资料", keywords: ["文件", "上传", "pdf", "word"], icon: "upload", href: "/app/files", type: "create", enabled: true, group: "capture" },
  { id: "open-ai", label: "打开 AI 工作台", description: "进入统一 AI 工作入口", keywords: ["ai", "模型", "chat"], icon: "bot", href: "/app/ai", type: "navigate", enabled: true, group: "work" },
  { id: "open-agents", label: "打开 Agent 控制中心", description: "查看项目执行、阻塞项和 Agent 汇报", keywords: ["agent", "codex", "claude", "执行", "汇报"], icon: "radar", href: "/app/agents", type: "navigate", enabled: true, group: "work" },
  { id: "open-executions", label: "打开执行中心", description: "查看运行中的 Agent、审批、Diff 和验证结果", keywords: ["execution", "执行", "codex", "diff", "审批"], icon: "play", href: "/app/executions", type: "navigate", enabled: true, group: "work" },
  { id: "dispatch-agent-work", label: "派发 Agent 工作", description: "用模板将明确工作加入项目 Agent 队列", keywords: ["agent", "派发", "任务", "codex", "claude", "执行"], icon: "send", href: "/app/agents", type: "create", enabled: true, group: "work" },
  { id: "open-work-map", label: "打开工作地图", description: "查看项目工作树、执行分布和阻塞项", keywords: ["工作树", "图表", "看板", "进度", "work map"], icon: "git-branch", href: "/app/work-map", type: "navigate", enabled: true, group: "work" },
  { id: "open-capabilities", label: "打开能力中心", description: "查看 MCP、Skills 与 API 配置状态", keywords: ["mcp", "skill", "api", "能力", "工具"], icon: "wrench", href: "/app/capabilities", type: "navigate", enabled: true, group: "system" },
  { id: "daily-review", label: "开始每日复盘", description: "用真实记录回看今天", keywords: ["复盘", "review"], icon: "file-text", href: "/app/reviews/daily", type: "create", enabled: true, group: "life" },
  { id: "run-automation", label: "运行自动化", description: "进入 n8n 工作流控制中心", keywords: ["自动化", "n8n", "workflow"], icon: "activity", href: "/app/automations", type: "run", enabled: true, group: "automation" },
  { id: "open-integrations", label: "打开连接看板", description: "查看 GitHub、Gmail、Notion、数据库和自动化状态", keywords: ["连接", "github", "gmail", "notion", "database"], icon: "network", href: "/app/integrations", type: "navigate", enabled: true, group: "system" },
  { id: "open-settings", label: "系统设置", description: "查看集成、外观和数据设置", keywords: ["设置", "settings"], icon: "settings", href: "/app/settings", type: "navigate", enabled: true, group: "system" }
];

export const actionRegistry: MyOSActionDefinition[] = [
  ...baseActions,
  ...toolsRegistry.map((tool): MyOSActionDefinition => ({
    id: `open-tool-${tool.id}`,
    label: `打开 ${tool.name}`,
    description: tool.description,
    keywords: tool.keywords,
    icon: tool.icon,
    href: tool.route,
    type: "navigate",
    enabled: tool.enabled,
    group: "work"
  }))
];
