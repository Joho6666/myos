const DEFAULT_TIME_ZONE = "Asia/Shanghai";

function getTimeZone() {
  return process.env.MYOS_TIME_ZONE?.trim() || DEFAULT_TIME_ZONE;
}

function dateKey(date: Date, offsetDays = 0) {
  const shifted = new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(shifted);
}

export function todayDateKey(now = new Date()) {
  return dateKey(now);
}

export function dateOnly(value: string | undefined, now = new Date()) {
  if (!value || value === "today") {
    return todayDateKey(now);
  }
  if (value === "tomorrow") {
    return dateKey(now, 1);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function todayAlias(value: unknown, now = new Date()) {
  const raw = typeof value === "string" ? value : "";
  return raw === todayDateKey(now) ? "today" : raw;
}

const dayInMs = 24 * 60 * 60 * 1000;

/** 把时区无关的 YYYY-MM-DD 加上天数（用 UTC 日历运算，不经过本地时区）。 */
function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day);
  const shifted = new Date(base + days * dayInMs);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function isWeekday(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

/**
 * 计算重复任务下一次出现日期。fromDate 必须是 YYYY-MM-DD；
 * 非法规则或日期返回 null，调用方应放弃生成下一轮而不是报错。
 */
export function nextOccurrenceDate(rule: string, fromDate: string, now = new Date()): string | null {
  const base = dateOnly(fromDate, now);
  if (!base) return null;

  switch (rule) {
    case "daily":
      return addDays(base, 1);
    case "weekdays": {
      let next = addDays(base, 1);
      while (!isWeekday(next)) next = addDays(next, 1);
      return next;
    }
    case "weekly":
      return addDays(base, 7);
    case "monthly": {
      const [year, month, day] = base.split("-").map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
      return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(Math.min(day, daysInNextMonth)).padStart(2, "0")}`;
    }
    default:
      return null;
  }
}
