import type { Priority } from "@/lib/data/models";

type InboxCaptureType = "text" | "file" | "link" | "idea";

export type QuickCaptureIntent =
  | {
      kind: "project";
      label: string;
      payload: {
        name: string;
        category: string;
        nextAction: string;
      };
    }
  | {
      kind: "task";
      label: string;
      payload: {
        title: string;
        priority: Priority;
        due: string;
        plannedDate: string;
        todayFocus: boolean;
      };
    }
  | {
      kind: "inbox";
      label: string;
      payload: {
        title: string;
        type: InboxCaptureType;
        category: string;
      };
    };

function findPrefix(input: string, prefixes: string[]) {
  const prefix = prefixes.find((item) => input.toLowerCase().startsWith(item.toLowerCase()));
  return prefix || "";
}

function cleanPrefix(input: string, prefixes: string[]) {
  const prefix = findPrefix(input, prefixes);
  return prefix ? input.slice(prefix.length).trim() : "";
}

function splitTitleAndAction(input: string) {
  const separators = [" / ", " ｜ ", " | ", " - "];
  const separator = separators.find((item) => input.includes(item));

  if (!separator) {
    return { title: input.trim(), action: "" };
  }

  const [title, ...rest] = input.split(separator);
  return { title: title.trim(), action: rest.join(separator).trim() };
}

function inferPriority(input: string): Priority {
  if (/高|紧急|重要|p1|!!!/i.test(input)) return "high";
  if (/低|不急|p3/i.test(input)) return "low";
  return "medium";
}

function inferDue(input: string) {
  const time = input.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/)?.[0];
  if (time) return { due: time, plannedDate: "today" };
  if (/明天/.test(input)) return { due: "明天", plannedDate: "tomorrow" };
  if (/今晚|晚上/.test(input)) return { due: "今晚", plannedDate: "today" };
  return { due: "今天", plannedDate: "today" };
}

function cleanTaskTitle(input: string) {
  return input
    .replace(/\b([01]?\d|2[0-3]):[0-5]\d\b/g, "")
    .replace(/明天|今晚|晚上|重点|focus|p1|高优先级|中优先级|低优先级/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferInboxType(input: string): InboxCaptureType {
  if (/https?:\/\//i.test(input)) return "link";
  if (/\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g)$/i.test(input)) return "file";
  if (/想法|灵感|idea/i.test(input)) return "idea";
  return "text";
}

export function parseQuickCaptureIntent(query: string): QuickCaptureIntent | null {
  const input = query.trim();
  if (!input) return null;

  const projectText = cleanPrefix(input, ["项目 ", "project ", "p "]);
  if (projectText) {
    const parsed = splitTitleAndAction(projectText);
    if (!parsed.title) return null;
    return {
      kind: "project",
      label: `创建项目：${parsed.title}`,
      payload: {
        name: parsed.title,
        category: "AI开发",
        nextAction: parsed.action || "明确项目目标和下一步行动"
      }
    };
  }

  const taskText = cleanPrefix(input, ["任务 ", "task ", "todo ", "t "]);
  if (taskText) {
    const due = inferDue(taskText);
    return {
      kind: "task",
      label: `创建任务：${taskText}`,
      payload: {
        title: cleanTaskTitle(taskText),
        priority: inferPriority(taskText),
        due: due.due,
        plannedDate: due.plannedDate,
        todayFocus: /重点|focus|p1|高/.test(taskText)
      }
    };
  }

  const inboxPrefixes = ["想法 ", "灵感 ", "记录 ", "收件箱 ", "inbox ", "note "];
  const inboxPrefix = findPrefix(input, inboxPrefixes);
  const inboxText = cleanPrefix(input, inboxPrefixes);
  if (inboxText) {
    return {
      kind: "inbox",
      label: `记录到收件箱：${inboxText}`,
      payload: {
        title: inboxText,
        type: /想法|灵感/.test(inboxPrefix) ? "idea" : inferInboxType(inboxText),
        category: "快速记录"
      }
    };
  }

  return null;
}
