import type { Task } from "@/lib/data/models";
import { googleCalendarDateRange, googleDateOnly, googleFetch, googleTaskDueDate } from "./google";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const TASKS_API = "https://tasks.googleapis.com/tasks/v1";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  description: string;
  status: string;
  htmlLink: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  updated: string;
};

export type GoogleCalendarListResponse = {
  items?: GoogleCalendarEvent[];
};

export type GoogleTaskList = {
  id: string;
  title: string;
  updated?: string;
};

export type GoogleTask = {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  updated?: string;
  selfLink?: string;
};

export type GoogleTaskListsResponse = {
  items?: GoogleTaskList[];
};

export type GoogleTasksResponse = {
  items?: GoogleTask[];
};

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  description?: string;
  parents?: string[];
};

export type GoogleDriveListResponse = {
  files?: GoogleDriveFile[];
  incompleteSearch?: boolean;
};

export function getGoogleCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
}

export function getGoogleTasksListId() {
  return process.env.GOOGLE_TASKS_LIST_ID?.trim();
}

export function getGoogleDriveFolderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  signal: AbortSignal,
  range = googleCalendarDateRange()
) {
  const params = new URLSearchParams({
    timeMin: range.start,
    timeMax: range.end,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100"
  });
  return await googleFetch<GoogleCalendarListResponse>(
    `${CALENDAR_API}/calendars/${encodeURIComponent(getGoogleCalendarId())}/events?${params.toString()}`,
    accessToken,
    signal
  );
}

function calendarDateForTask(task: Task) {
  if (task.plannedDate && /^\d{4}-\d{2}-\d{2}$/.test(task.plannedDate)) return task.plannedDate;
  return googleDateOnly(new Date().toISOString()) || new Date().toISOString().slice(0, 10);
}

export async function createGoogleCalendarEvent(task: Task, accessToken: string, signal: AbortSignal) {
  const date = calendarDateForTask(task);
  const timeZone = process.env.MYOS_TIME_ZONE || "Asia/Shanghai";
  return await googleFetch<GoogleCalendarEvent>(
    `${CALENDAR_API}/calendars/${encodeURIComponent(getGoogleCalendarId())}/events`,
    accessToken,
    signal,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        summary: task.title,
        description: `MyOS 任务 ID: ${task.id}`,
        start: { dateTime: `${date}T09:00:00`, timeZone },
        end: { dateTime: `${date}T10:00:00`, timeZone }
      })
    }
  );
}

export async function updateGoogleCalendarEvent(task: Task, eventId: string, accessToken: string, signal: AbortSignal) {
  const date = calendarDateForTask(task);
  const timeZone = process.env.MYOS_TIME_ZONE || "Asia/Shanghai";
  return await googleFetch<GoogleCalendarEvent>(
    `${CALENDAR_API}/calendars/${encodeURIComponent(getGoogleCalendarId())}/events/${encodeURIComponent(eventId)}`,
    accessToken,
    signal,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        summary: task.title,
        description: `MyOS 任务 ID: ${task.id}`,
        start: { dateTime: `${date}T09:00:00`, timeZone },
        end: { dateTime: `${date}T10:00:00`, timeZone }
      })
    }
  );
}

export async function listGoogleTaskLists(accessToken: string, signal: AbortSignal) {
  return await googleFetch<GoogleTaskListsResponse>(`${TASKS_API}/users/@me/lists?maxResults=100`, accessToken, signal);
}

export async function resolveGoogleTasksListId(accessToken: string, signal: AbortSignal) {
  const configured = getGoogleTasksListId();
  if (configured) return configured;
  const lists = await listGoogleTaskLists(accessToken, signal);
  const first = lists.items?.[0];
  if (!first?.id) throw new Error("Google Tasks 中没有可用的任务清单。");
  return first.id;
}

export async function listGoogleTasks(accessToken: string, signal: AbortSignal, taskListId?: string) {
  const listId = taskListId || await resolveGoogleTasksListId(accessToken, signal);
  const params = new URLSearchParams({ showCompleted: "true", showHidden: "false", maxResults: "100" });
  const response = await googleFetch<GoogleTasksResponse>(
    `${TASKS_API}/lists/${encodeURIComponent(listId)}/tasks?${params.toString()}`,
    accessToken,
    signal
  );
  return { listId, tasks: response.items || [] };
}

export async function createGoogleTask(task: Task, accessToken: string, signal: AbortSignal, taskListId?: string) {
  const listId = taskListId || await resolveGoogleTasksListId(accessToken, signal);
  const body: { title: string; notes: string; due?: string } = {
    title: task.title,
    notes: `MyOS 任务 ID: ${task.id}`
  };
  const due = googleTaskDueDate(task.plannedDate || undefined);
  if (due) body.due = due;
  const googleTask = await googleFetch<GoogleTask>(
    `${TASKS_API}/lists/${encodeURIComponent(listId)}/tasks`,
    accessToken,
    signal,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  );
  return { listId, task: googleTask };
}

export async function updateGoogleTask(task: Task, googleTaskId: string, accessToken: string, signal: AbortSignal, taskListId?: string) {
  const listId = taskListId || await resolveGoogleTasksListId(accessToken, signal);
  const body: { title: string; notes: string; status: "needsAction" | "completed"; due?: string } = {
    title: task.title,
    notes: `MyOS 任务 ID: ${task.id}`,
    status: task.done ? "completed" : "needsAction"
  };
  const due = googleTaskDueDate(task.plannedDate || undefined);
  if (due) body.due = due;
  const googleTask = await googleFetch<GoogleTask>(
    `${TASKS_API}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(googleTaskId)}`,
    accessToken,
    signal,
    { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  );
  return { listId, task: googleTask };
}

export async function listGoogleDriveFiles(accessToken: string, signal: AbortSignal) {
  const params = new URLSearchParams({
    q: "trashed = false",
    spaces: "drive",
    orderBy: "modifiedTime desc",
    pageSize: "100",
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,description,parents),incompleteSearch"
  });
  const folderId = getGoogleDriveFolderId();
  if (folderId) params.set("q", `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`);
  return await googleFetch<GoogleDriveListResponse>(`${DRIVE_API}/files?${params.toString()}`, accessToken, signal);
}
