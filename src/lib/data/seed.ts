import type { MyOSData } from "./models";

export const seedData: MyOSData = {
  projects: [
    {
      id: "project-myos",
      name: "MyOS 私人工作台",
      category: "AI开发",
      status: "active",
      path: "~/dev/myos",
      nextAction: "接入 Supabase 数据层",
      updatedAt: "今天 09:40",
      favorite: true,
      summary: "把项目、任务、外部工具和本地 Agent 汇聚为一个可持续使用的个人操作系统。",
      techStack: ["Next.js", "TypeScript", "Supabase", "Electron"],
      progressMode: "agent_work",
      manualProgress: 42
    },
    {
      id: "project-car",
      name: "循迹小车优化",
      category: "单片机",
      status: "planned",
      path: "~/engineering/tracking-car",
      nextAction: "整理 PID 调参记录",
      updatedAt: "昨天",
      favorite: false
    },
    {
      id: "project-hotel",
      name: "酒店运营 AI 分析",
      category: "数据分析",
      status: "paused",
      path: "~/business/hotel-agent",
      nextAction: "定义月度经营指标",
      updatedAt: "2 天前",
      favorite: false
    }
  ],
  projectMilestones: [
    { id: "milestone-myos-foundation", projectId: "project-myos", title: "基础数据层", description: "完成 Supabase、RLS 和核心 CRUD。", status: "completed", targetDate: "2026-08-01", progress: 100, updatedAt: "今天" },
    { id: "milestone-myos-agent", projectId: "project-myos", title: "Agent 执行闭环", description: "让 Agent 可以领取工作、提交证据并汇报阻塞。", status: "in_progress", targetDate: "2026-08-15", progress: 55, updatedAt: "今天" },
    { id: "milestone-myos-sync", projectId: "project-myos", title: "外部连接同步", description: "把 GitHub、Gmail 和 Notion 的重要信号带入 MyOS。", status: "planned", targetDate: "2026-08-25", progress: 10, updatedAt: "今天" }
  ],
  projectRisks: [
    { id: "risk-myos-sync", projectId: "project-myos", title: "外部连接仍以手动导入为主", severity: "medium", status: "open", mitigation: "先记录同步状态和失败日志，再逐个增加增量同步。", updatedAt: "今天" }
  ],
  tasks: [
    { id: "task-1", title: "补全文档结构", project: "MyOS 私人工作台", goalId: "goal-career", priority: "high", due: "10:30", plannedDate: "today", status: "planned", todayFocus: true, done: false },
    { id: "task-2", title: "设计数据库 RLS", project: "MyOS 私人工作台", goalId: "goal-career", priority: "high", due: "14:00", plannedDate: "today", status: "planned", todayFocus: true, done: false },
    { id: "task-3", title: "整理 STM32 定时器资料", project: "循迹小车优化", goalId: "goal-study", priority: "medium", due: "今晚", plannedDate: "today", status: "planned", todayFocus: true, done: false },
    { id: "task-4", title: "归档客户报告模板", project: "接单资料", priority: "low", due: "本周", status: "completed", done: true }
  ],
  inbox: [
    { id: "inbox-1", title: "课程报告格式要求", type: "file", category: "文档", status: "pending", createdAt: "10:12" },
    { id: "inbox-2", title: "GitHub: AI agent workflow", type: "link", category: "开发", status: "classified", createdAt: "昨天" },
    { id: "inbox-3", title: "PCB 检查清单想法", type: "idea", category: "工程", status: "pending", createdAt: "昨天" }
  ],
  prompts: [
    {
      id: "prompt-1",
      title: "Codex 阶段开发任务拆解",
      category: "Codex开发",
      model: "gpt-5",
      content: "请基于 {{project_name}} 的当前仓库，拆解下一阶段可执行任务。",
      favorite: true,
      useCount: 12,
      updatedAt: "30 分钟前"
    },
    {
      id: "prompt-2",
      title: "课程报告结构检查",
      category: "Word",
      model: "gpt-5",
      content: "请检查这份报告是否满足 {{requirements}}，输出修改清单。",
      favorite: false,
      useCount: 8,
      updatedAt: "昨天"
    }
  ],
  notes: [
    { id: "note-1", title: "Supabase RLS 常用策略", type: "开发经验", summary: "按 user_id 隔离私人数据，避免前端绕过。", updatedAt: "今天", favorite: true },
    { id: "note-2", title: "STM32 定时器计算思路", type: "工程规则", summary: "PSC 与 ARR 的取值推导和常见频率。", updatedAt: "昨天", favorite: false }
  ],
  files: [
    { id: "file-1", name: "数据库设计.sql", kind: "SQL", project: "MyOS 私人工作台", size: "18 KB", updatedAt: "今天" },
    { id: "file-2", name: "课程报告要求.pdf", kind: "PDF", project: "接单资料", size: "1.2 MB", updatedAt: "昨天" },
    { id: "file-3", name: "循迹小车测试记录.xlsx", kind: "Excel", project: "循迹小车优化", size: "240 KB", updatedAt: "2 天前" }
  ],
  activities: [
    { id: "act-1", action: "创建项目", detail: "MyOS 私人工作台", time: "10 分钟前", result: "success" },
    { id: "act-2", action: "运行自动化", detail: "n8n 未配置，已阻止执行", time: "1 小时前", result: "warning" },
    { id: "act-3", action: "保存提示词", detail: "Codex 阶段开发任务拆解", time: "昨天", result: "success" }
  ],
  automations: [
    { id: "auto-1", name: "每日 AI 资讯", status: "not_configured", lastRun: "尚未运行", nextRun: "配置后可用" },
    { id: "auto-2", name: "文档自动分析", status: "not_configured", lastRun: "尚未运行", nextRun: "配置后可用" },
    { id: "auto-3", name: "项目周报", status: "not_configured", lastRun: "尚未运行", nextRun: "配置后可用" }
  ],
  lifeAreas: [
    { id: "area-study", name: "学业与学习", description: "课程、技能、考试和长期学习积累。", icon: "book-open", displayOrder: 1, status: "active", privacyLevel: "normal", updatedAt: "今天" },
    { id: "area-career", name: "职业与项目", description: "开发项目、作品、职业准备和长期能力建设。", icon: "briefcase", displayOrder: 2, status: "active", privacyLevel: "normal", updatedAt: "今天" },
    { id: "area-health", name: "健康与身体", description: "睡眠、精力、运动和身体状态记录。", icon: "heart-pulse", displayOrder: 3, status: "active", privacyLevel: "sensitive", updatedAt: "今天" },
    { id: "area-wealth", name: "财富与接单", description: "接单、收入、成本、预算和财富记录。", icon: "wallet", displayOrder: 4, status: "active", privacyLevel: "sensitive", updatedAt: "今天" },
    { id: "area-relationships", name: "人际关系", description: "重要关系、沟通事项和长期维护。", icon: "users", displayOrder: 5, status: "active", privacyLevel: "sensitive", updatedAt: "今天" },
    { id: "area-life", name: "日常生活", description: "生活琐事、例程、整理和个人事务。", icon: "home", displayOrder: 6, status: "active", privacyLevel: "normal", updatedAt: "今天" }
  ],
  goals: [
    { id: "goal-career", lifeAreaId: "area-career", title: "把 MyOS 做成每天会打开的私人系统", description: "先让项目、任务、习惯和复盘统一到一个入口。", motivation: "减少工具分散和重复整理成本。", successCriteria: "连续一周用 MyOS 安排今日重点和晚间复盘。", status: "active", priority: "high", startDate: "2026-07-24", targetDate: "2026-08-31", manualProgress: 35, progressMode: "tasks", nextAction: "完成人生管理核心模块", privacyLevel: "normal", updatedAt: "今天" },
    { id: "goal-study", lifeAreaId: "area-study", title: "建立 STM32 与 PCB 学习闭环", description: "把学习笔记、工程记录和实践项目串起来。", motivation: "提升软硬件结合能力。", successCriteria: "完成一个可复盘的 STM32 小项目。", status: "planned", priority: "medium", startDate: "2026-07-24", targetDate: "2026-09-15", manualProgress: 15, progressMode: "manual", nextAction: "整理定时器资料", privacyLevel: "normal", updatedAt: "昨天" }
  ],
  habits: [
    { id: "habit-review", lifeAreaId: "area-life", goalId: "goal-career", name: "晚间复盘", description: "每天用四个问题收束当天状态。", frequencyType: "daily", targetValue: 1, unit: "次", reminderTime: "22:30", status: "active", privacyLevel: "sensitive", updatedAt: "今天" },
    { id: "habit-study", lifeAreaId: "area-study", goalId: "goal-study", name: "专注学习", description: "记录当天有效学习时间。", frequencyType: "daily", targetValue: 60, unit: "分钟", reminderTime: "20:00", status: "active", privacyLevel: "normal", updatedAt: "今天" }
  ],
  habitLogs: [
    { id: "habit-log-1", habitId: "habit-review", logDate: "today", status: "partial", value: 1, note: "等待晚间完成" }
  ],
  routines: [
    { id: "routine-night", lifeAreaId: "area-life", name: "睡前例程", description: "低压力收尾，不做断签惩罚。", scheduleType: "daily", status: "active", privacyLevel: "sensitive", updatedAt: "今天" }
  ],
  routineSteps: [
    { id: "routine-step-1", routineId: "routine-night", title: "整理桌面", displayOrder: 1, estimatedMinutes: 5 },
    { id: "routine-step-2", routineId: "routine-night", title: "查看明日安排", displayOrder: 2, estimatedMinutes: 5 },
    { id: "routine-step-3", routineId: "routine-night", title: "完成每日复盘", displayOrder: 3, estimatedMinutes: 10 }
  ],
  routineLogs: [],
  dailyCheckins: [
    { id: "checkin-today", date: "today", sleepQuality: 4, energy: 3, mood: 4, stress: 2, studyMinutes: 45, workMinutes: 90, note: "保持轻量记录。", privacyLevel: "sensitive", updatedAt: "今天" }
  ],
  dailyReviews: [],
  weeklyReviews: [],
  agentAssignments: [
    { id: "assignment-codex-myos", projectId: "project-myos", agentId: "codex", role: "主开发", createdAt: "今天" },
    { id: "assignment-claude-myos", projectId: "project-myos", agentId: "claude-code", role: "架构审查", createdAt: "今天" }
  ],
  agentWorkItems: [
    { id: "agent-work-1", projectId: "project-myos", agentId: "codex", title: "建立项目数据层", instructions: "完成项目数据模型、迁移与真实 CRUD。", status: "completed", progress: 100, updatedAt: "今天", lastHeartbeatAt: "今天 09:40", completedAt: "今天 09:40", result: "Supabase 核心 CRUD 已完成。", changedFiles: ["src/server/data/supabase-store.ts", "supabase/migrations"], testResult: "pnpm typecheck / pnpm test 通过", failureCount: 0 },
    { id: "agent-work-2", projectId: "project-myos", agentId: "claude-code", title: "审查访问控制", instructions: "检查私有路由、RLS 与密钥边界。", status: "in_progress", progress: 60, updatedAt: "今天", lastHeartbeatAt: "今天 10:20", result: "完成第一轮检查，正在整理剩余建议。", changedFiles: [], testResult: "已完成静态审查", failureCount: 0 }
  ],
  agentReports: [
    { id: "agent-report-1", projectId: "project-myos", workItemId: "agent-work-2", agentId: "claude-code", summary: "完成第一轮安全边界检查，正在整理剩余建议。", progress: 60, createdAt: "今天", changedFiles: [], testResult: "已完成静态审查" }
  ],
  agentWorkEvents: [
    { id: "agent-event-1", projectId: "project-myos", workItemId: "agent-work-2", agentId: "claude-code", eventType: "progress", progress: 60, message: "完成第一轮安全边界检查。", createdAt: "今天" },
    { id: "agent-event-2", projectId: "project-myos", workItemId: "agent-work-1", agentId: "codex", eventType: "completed", progress: 100, message: "Supabase 核心 CRUD 已完成。", createdAt: "今天" }
  ]
};
