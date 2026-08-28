import type { Priority, Project } from "@/lib/data/models";

export type CreationType = "task" | "project" | "inbox";
export type CreationGroup = "action" | "container" | "content";

export type CreationDefinition = { id: CreationType; label: string; description: string; group: CreationGroup; enabled: true };

export const creationRegistry: CreationDefinition[] = [
  { id: "task", label: "任务", description: "记录下一步行动", group: "action", enabled: true },
  { id: "project", label: "项目", description: "开始一个可持续推进的工作", group: "container", enabled: true },
  { id: "inbox", label: "想法", description: "先捕捉，稍后整理", group: "content", enabled: true }
];

export type CreationContext = { pathname: string; project?: Pick<Project, "id" | "name"> };

export type CreationIntent = {
  type: CreationType | null;
  confidence: "high" | "low";
  rawText: string;
  title: string;
  projectName?: string;
  projectCandidates: string[];
  priority: Priority;
  due: string;
  plannedDate: string;
  reminderTime?: string;
  todayFocus: boolean;
  category: string;
  nextAction: string;
};

export type CreationOpenOptions = { type?: CreationType; text?: string; trigger?: HTMLElement | null };
