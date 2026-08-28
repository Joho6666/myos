import type { Project } from "@/lib/data/models";
import type { CreationContext, CreationIntent, CreationType } from "./types";

const dateFormatter = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dayMs = 24 * 60 * 60 * 1000;

function dateAfter(days: number, timeZone: string, now: Date) { return dateFormatter(new Date(now.getTime() + days * dayMs), timeZone); }
function normalize(value: string) { return value.toLowerCase().replace(/[\s\-_·.，、]/g, ""); }
function weekdayDate(target: number, nextWeek: boolean, timeZone: string, now: Date) {
  const current = new Date(`${dateFormatter(now, timeZone)}T12:00:00Z`).getUTCDay();
  let offset = (target - current + 7) % 7;
  if (nextWeek || offset === 0) offset += 7;
  return dateAfter(offset, timeZone, now);
}

export function matchCreationProject(text: string, projects: Project[], context?: CreationContext) {
  if (context?.project) return { projectName: context.project.name, candidates: [context.project.name] };
  const source = normalize(text);
  const candidates = projects.filter((project) => {
    const name = normalize(project.name);
    return name.length >= 2 && (source.includes(name) || name.includes(source));
  }).map((project) => project.name);
  return { projectName: candidates.length === 1 ? candidates[0] : undefined, candidates };
}

function inferType(input: string): CreationType | null {
  if (/^(?:项目[：:\s]+|(?:创建|新建|建立|做一个|做个).{0,12}(?:项目|平台|系统|应用|网站))/.test(input)) return "project";
  if (/^(记一下|记录|想法|灵感|收件箱)|想法|灵感/.test(input)) return "inbox";
  if (/^(任务|待办)|今天|明天|后天|下周|周[一二三四五六日天]|下午|晚上|完成|测试|整理|提交|联系|购买|阅读/.test(input)) return "task";
  return null;
}

function parseDate(input: string, timeZone: string, now: Date) {
  let plannedDate = dateFormatter(now, timeZone); let due = "今天";
  if (/后天/.test(input)) { plannedDate = dateAfter(2, timeZone, now); due = "后天"; }
  else if (/明天/.test(input)) { plannedDate = dateAfter(1, timeZone, now); due = "明天"; }
  else if (/下周一/.test(input)) { plannedDate = weekdayDate(1, true, timeZone, now); due = "下周一"; }
  else {
    const weekday = input.match(/(?:本周)?周([一二三四五六日天])/);
    if (weekday) { const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }; plannedDate = weekdayDate(map[weekday[1]], false, timeZone, now); due = `周${weekday[1]}`; }
  }
  const time = input.match(/(?:下午|晚上)?\s*([0-1]?\d|2[0-3])(?:点|:)([0-5]\d)?/);
  const meridiem = input.match(/下午|晚上/)?.[0];
  let reminderTime: string | undefined;
  if (time) { let hour = Number(time[1]); if (meridiem && hour < 12) hour += 12; reminderTime = `${String(hour).padStart(2, "0")}:${time[2] || "00"}`; due = `${due}${meridiem || ""}${time[1]}点${time[2] ? time[2] : ""}`; }
  return { plannedDate, due, reminderTime };
}

function cleanTitle(input: string, type: CreationType | null) {
  let value = input.replace(/^(任务|待办|想法|灵感|记一下|记录)[:：\s]*/i, "");
  if (type === "project") value = value.replace(/^(创建一个|创建|新建|做一个|做个|建立)\s*/i, "").replace(/项目$/i, "");
  return value.replace(/不重要/g, "__NOT_IMPORTANT__").replace(/明天|后天|今天|下周一|(?:本周)?周[一二三四五六日天]|下午(?:\s*\d{1,2}(?:点|:\d{2})?)?|晚上(?:\s*\d{1,2}(?:点|:\d{2})?)?|高优先级|低优先级|紧急|重要/g, "").replace(/__NOT_IMPORTANT__/g, "不重要").replace(/[，。！？]+$/g, "").trim();
}

export function parseCreationIntent(input: string, projects: Project[], context?: CreationContext, timeZone = "Asia/Shanghai", now = new Date()): CreationIntent | null {
  const rawText = input.trim();
  if (!rawText) return null;
  const type = inferType(rawText);
  const dates = parseDate(rawText, timeZone, now);
  const project = matchCreationProject(rawText, projects, context);
  const title = cleanTitle(rawText, type);
  return {
    type, confidence: type && title ? "high" : "low", rawText, title: title || rawText,
    projectName: project.projectName, projectCandidates: project.candidates,
    priority: /不重要|不紧急|低优先级|不急|p3/i.test(rawText) ? "low" : /高优先级|紧急|重要|p1/i.test(rawText) ? "high" : "medium",
    due: dates.due, plannedDate: dates.plannedDate, reminderTime: dates.reminderTime,
    todayFocus: !/不重要|不紧急/i.test(rawText) && /重点|紧急|重要|p1/i.test(rawText),
    category: type === "project" ? "个人项目" : "快速记录",
    nextAction: type === "project" ? "明确项目目标和下一步行动" : ""
  };
}
