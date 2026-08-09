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
