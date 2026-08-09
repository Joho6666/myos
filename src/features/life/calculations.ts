import type { Goal, Habit, HabitLog, MyOSData, Task, WeeklyReview } from "@/lib/data/models";

export function calculateGoalProgress(goal: Goal, data: MyOSData) {
  if (goal.progressMode === "manual") {
    return goal.manualProgress;
  }

  if (goal.progressMode === "tasks") {
    const tasks = data.tasks.filter((task) => task.goalId === goal.id);
    if (!tasks.length) {
      return goal.manualProgress;
    }
    const done = tasks.filter((task) => task.done || task.status === "completed").length;
    return Math.round((done / tasks.length) * 100);
  }

  const habits = data.habits.filter((habit) => habit.goalId === goal.id);
  if (!habits.length) {
    return goal.manualProgress;
  }
  const logs = data.habitLogs.filter((log) => habits.some((habit) => habit.id === log.habitId));
  if (!logs.length) {
    return goal.manualProgress;
  }
  const completed = logs.filter((log) => log.status === "completed").length;
  return Math.round((completed / logs.length) * 100);
}

export function getTodayTasks(tasks: Task[]) {
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  return tasks.filter((task) => {
    if (task.plannedDate) {
      return task.plannedDate === "today" || task.plannedDate === today;
    }
    return task.due === "今天" || task.due.includes(":") || task.due === "今晚";
  });
}

export function getTodayFocus(tasks: Task[]) {
  return getTodayTasks(tasks)
    .filter((task) => task.todayFocus && !task.done)
    .slice(0, 3);
}

export function habitCompletionRate(habits: Habit[], logs: HabitLog[]) {
  if (!habits.length) {
    return 0;
  }
  const completed = habits.filter((habit) =>
    logs.some((log) => log.habitId === habit.id && log.logDate === "today" && log.status === "completed")
  ).length;
  return Math.round((completed / habits.length) * 100);
}

export function buildWeeklyReview(data: MyOSData): Omit<WeeklyReview, "id" | "privacyLevel" | "updatedAt"> {
  const completedTasks = data.tasks.filter((task) => task.done || task.status === "completed");
  const unfinishedTasks = data.tasks.filter((task) => !task.done && task.status !== "cancelled" && task.status !== "archived");
  const studyMinutes = data.dailyCheckins.reduce((sum, item) => sum + (item.studyMinutes || 0), 0);
  const averageSleep =
    data.dailyCheckins.length > 0
      ? data.dailyCheckins.reduce((sum, item) => sum + (item.sleepHours || 0), 0) / data.dailyCheckins.length
      : 0;
  const averageMood =
    data.dailyCheckins.length > 0
      ? data.dailyCheckins.reduce((sum, item) => sum + (item.mood || 0), 0) / data.dailyCheckins.length
      : 0;

  return {
    weekStart: new Intl.DateTimeFormat("en-CA").format(new Date()),
    completedTaskIds: completedTasks.map((task) => task.id),
    unfinishedTaskIds: unfinishedTasks.map((task) => task.id),
    projectChanges: data.projects.map((project) => `${project.name}: ${project.nextAction}`).join("\n"),
    goalProgress: data.goals.map((goal) => `${goal.title}: ${calculateGoalProgress(goal, data)}%`).join("\n"),
    habitCompletionRate: habitCompletionRate(data.habits, data.habitLogs),
    studyMinutes,
    sleepTrend: averageSleep ? `平均睡眠约 ${averageSleep.toFixed(1)} 小时` : "暂无足够睡眠记录",
    moodTrend: averageMood ? `平均情绪评分约 ${averageMood.toFixed(1)}/5` : "暂无足够情绪记录",
    spendingSummaryPlaceholder: "支出摘要将在财富模块接入后生成。",
    nextWeekFocus: getTodayFocus(data.tasks).map((task) => task.title)
  };
}
