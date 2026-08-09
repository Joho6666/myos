import { toolsRegistry } from "@/features/tools/registry";
import type { MyOSData } from "@/lib/data/models";

export type SearchResult = {
  type: string;
  title: string;
  summary: string;
  href: string;
};

export function searchMyOS(data: MyOSData, query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  const results: SearchResult[] = [
    ...data.projects.map((item) => ({
      type: "项目",
      title: item.name,
      summary: `${item.category} / ${item.nextAction}`,
      href: `/app/projects/${item.id}`
    })),
    ...data.tasks.map((item) => ({
      type: "任务",
      title: item.title,
      summary: `${item.project || "未关联"} / ${item.done ? "已完成" : item.due}`,
      href: "/app/tasks"
    })),
    ...data.inbox.map((item) => ({
      type: "收件箱",
      title: item.title,
      summary: `${item.type} / ${item.category} / ${item.status}`,
      href: "/app/inbox"
    })),
    ...data.lifeAreas.map((item) => ({
      type: "人生领域",
      title: item.name,
      summary: item.description,
      href: "/app/life/areas"
    })),
    ...data.goals.map((item) => ({
      type: "目标",
      title: item.title,
      summary: `${item.status} / ${item.nextAction}`,
      href: `/app/goals/${item.id}`
    })),
    ...data.habits.map((item) => ({
      type: "习惯",
      title: item.name,
      summary: item.description,
      href: "/app/habits"
    })),
    ...data.dailyReviews.map((item) => ({
      type: "每日复盘",
      title: `${item.date} 每日复盘`,
      summary: item.privacyLevel === "vault" ? "高敏感内容已隐藏" : item.tomorrowFocus,
      href: "/app/reviews/daily"
    })),
    ...data.weeklyReviews.map((item) => ({
      type: "每周复盘",
      title: `${item.weekStart} 每周复盘`,
      summary: `习惯完成率 ${item.habitCompletionRate}%`,
      href: "/app/reviews/weekly"
    })),
    ...data.prompts.map((item) => ({
      type: "提示词",
      title: item.title,
      summary: item.category,
      href: "/app/prompts"
    })),
    ...data.notes.map((item) => ({
      type: "知识",
      title: item.title,
      summary: item.summary,
      href: "/app/knowledge"
    })),
    ...data.files.map((item) => ({
      type: "文件",
      title: item.name,
      summary: `${item.kind} / ${item.project}`,
      href: "/app/files"
    })),
    ...data.automations.map((item) => ({
      type: "自动化",
      title: item.name,
      summary: `${item.status} / ${item.nextRun}`,
      href: "/app/automations"
    })),
    ...toolsRegistry.filter((item) => item.enabled).map((item) => ({
      type: "工具",
      title: item.name,
      summary: item.description,
      href: item.route
    })),
    { type: "系统", title: "连接看板", summary: "GitHub、Gmail、Notion、数据库、AI 和 n8n 状态", href: "/app/integrations" },
    { type: "系统", title: "Agent 控制中心", summary: "查看项目执行、阻塞项和 Agent 汇报", href: "/app/agents" },
    { type: "系统", title: "派发 Agent 工作", summary: "为已有项目创建带范围与验收要求的 Agent 工作项", href: "/app/agents" },
    { type: "系统", title: "工作地图", summary: "项目工作树、Agent 执行状态和项目负载图", href: "/app/work-map" },
    { type: "系统", title: "能力中心", summary: "管理 MCP、Skills 和 API 配置状态", href: "/app/capabilities" },
    { type: "系统", title: "文件存储状态", summary: "查看本地文件或 Supabase Storage 状态", href: "/app/files" },
    { type: "系统", title: "系统设置", summary: "配置数据库、AI、n8n、GitHub、Gmail、Notion 和备份", href: "/app/settings" },
    { type: "系统", title: "导出备份", summary: "导出 MyOS JSON 记录备份，不包含文件二进制", href: "/app/settings" },
    { type: "系统", title: "导入备份", summary: "从 MyOS JSON 备份恢复记录", href: "/app/settings" }
  ];

  if (!q) {
    return results.slice(0, 8);
  }

  return results
    .filter((item) => `${item.type} ${item.title} ${item.summary}`.toLowerCase().includes(q))
    .slice(0, 12);
}
