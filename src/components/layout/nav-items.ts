import {
  Activity,
  Archive,
  Bot,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarCheck,
  Cpu,
  FileText,
  FolderKanban,
  Goal,
  HeartPulse,
  Inbox,
  Library,
  ListChecks,
  Settings,
  Star,
  Target,
  ClipboardList,
  Network,
  MonitorCog,
  Radar,
  GitBranch,
  Wrench,
  LayoutDashboard,
  Sparkles,
  Layers3,
  SlidersHorizontal
} from "lucide-react";

export const navItems = [
  { href: "/app", label: "今天", icon: CalendarCheck },
  { href: "/app/tasks", label: "任务", icon: ClipboardList },
  { href: "/app/inbox", label: "收件箱", icon: Inbox },
  { href: "/app/life", label: "人生管理", icon: HeartPulse },
  { href: "/app/goals", label: "目标", icon: Target },
  { href: "/app/habits", label: "习惯", icon: ListChecks },
  { href: "/app/routines", label: "例程", icon: Goal },
  { href: "/app/ai", label: "AI 工作台", icon: Bot },
  { href: "/app/projects", label: "项目", icon: FolderKanban },
  { href: "/app/files", label: "文件", icon: Archive },
  { href: "/app/knowledge", label: "知识库", icon: Library },
  { href: "/app/prompts", label: "提示词", icon: FileText },
  { href: "/app/automations", label: "自动化", icon: Activity },
  { href: "/app/tools", label: "工具", icon: Wrench },
  { href: "/app/learning", label: "学习", icon: BookOpen },
  { href: "/app/engineering", label: "工程", icon: Cpu },
  { href: "/app/business", label: "业务", icon: BriefcaseBusiness },
  { href: "/app/bookmarks", label: "收藏", icon: Star },
  { href: "/app/integrations", label: "连接", icon: Network },
  { href: "/app/local-agent", label: "本地助手", icon: MonitorCog },
  { href: "/app/activity", label: "活动", icon: Brain },
  { href: "/app/settings", label: "设置", icon: Settings },
  { href: "/app/agents", label: "Agent 控制", icon: Radar },
  { href: "/app/work-map", label: "工作地图", icon: GitBranch },
  { href: "/app/capabilities", label: "能力中心", icon: Wrench }
];

export const primaryNavItems = [navItems[0], navItems[8], navItems[2], navItems[18]];

export const navGroups = [
  { label: "今日", description: "每天最常用的入口", icon: LayoutDashboard, items: [navItems[0]] },
  { label: "工作", description: "任务、项目与 Agent 协作", icon: Layers3, items: [navItems[1], navItems[2], navItems[8], navItems[22], navItems[23]] },
  { label: "AI 与自动化", description: "模型、工具和外部连接", icon: Sparkles, items: [navItems[7], navItems[12], navItems[13], navItems[18], navItems[19], navItems[24]] },
  { label: "知识与生活", description: "资料沉淀与长期节奏", icon: BookOpen, items: [navItems[9], navItems[10], navItems[11], navItems[17], navItems[3], navItems[4], navItems[5], navItems[6], navItems[14]] },
  { label: "专业与系统", description: "专业工作和系统管理", icon: SlidersHorizontal, items: [navItems[15], navItems[16], navItems[20], navItems[21]] }
];

export const moreNavSections = navGroups.slice(1);
