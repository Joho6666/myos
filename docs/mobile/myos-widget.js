// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: mobile-alt;
/**
 * =======================================================
 * MyOS iOS 桌面实时小组件 (Scriptable Widget)
 * =======================================================
 * 使用说明：
 * 1. 在 App Store 下载免费应用「Scriptable」
 * 2. 打开 Scriptable，点击右上角「+」新建脚本，粘贴本文件全部代码
 * 3. 修改下方的 CONFIG 配置（填入你的 MyOS 地址与 Token）
 * 4. 返回 iOS 桌面，长按桌面 -> 添加组件 -> 选择 Scriptable -> 选择此脚本即可
 */

const CONFIG = {
  // 你的 MyOS 线上部署地址或内网穿透地址（结尾不要带斜杠）
  // 示例: "https://myos.yourdomain.com" 或 "http://192.168.1.100:3000"
  serverUrl: "https://your-myos-domain.com",

  // 你在 MyOS 环境变量中设置的 MYOS_QUICK_API_TOKEN
  apiToken: "YOUR_MYOS_QUICK_API_TOKEN",

  // 自定义标题
  appTitle: "MyOS",
};

// 如果在桌面小组件参数中传入了自定义 URL 或 Token，则优先使用参数
if (args.widgetParameter) {
  const parts = args.widgetParameter.split(",");
  if (parts[0]) CONFIG.serverUrl = parts[0].trim();
  if (parts[1]) CONFIG.apiToken = parts[1].trim();
}

async function fetchWidgetData() {
  const url = `${CONFIG.serverUrl}/api/widget/summary`;
  const req = new Request(url);
  req.headers = {
    "Authorization": `Bearer ${CONFIG.apiToken}`,
    "Content-Type": "application/json"
  };
  req.timeoutInterval = 10;

  try {
    const res = await req.loadJSON();
    return res;
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

async function createWidget(data) {
  const widget = new ListWidget();
  widget.url = `${CONFIG.serverUrl}/app`;
  widget.setPadding(14, 14, 14, 14);

  // 主题与渐变背景
  const isDark = Device.isUsingDarkAppearance();
  const gradient = new LinearGradient();
  if (isDark) {
    gradient.colors = [new Color("#0f172a"), new Color("#1e293b")];
    gradient.locations = [0.0, 1.0];
  } else {
    gradient.colors = [new Color("#f8fafc"), new Color("#e2e8f0")];
    gradient.locations = [0.0, 1.0];
  }
  widget.backgroundGradient = gradient;

  // 1. 顶部栏 (Header)
  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  const titleText = headerStack.addText("⚡ " + CONFIG.appTitle);
  titleText.font = Font.boldSystemFont(13);
  titleText.textColor = isDark ? new Color("#38bdf8") : new Color("#0284c7");

  headerStack.addSpacer();

  const dateText = headerStack.addText(data?.today || "今天");
  dateText.font = Font.systemFont(11);
  dateText.textColor = isDark ? new Color("#94a3b8") : new Color("#64748b");

  widget.addSpacer(8);

  // 2. 错误状态展示
  if (!data || !data.ok) {
    const errorText = widget.addText("⚠️ 连接 MyOS 失败");
    errorText.font = Font.boldSystemFont(12);
    errorText.textColor = new Color("#ef4444");

    const descText = widget.addText("请检查网络地址与 Token 配置");
    descText.font = Font.systemFont(10);
    descText.textColor = isDark ? new Color("#94a3b8") : new Color("#64748b");
    return widget;
  }

  // 3. 统计状态胶囊栏 (Inbox & 今日任务)
  const badgeStack = widget.addStack();
  badgeStack.layoutHorizontally();
  badgeStack.spacing = 6;

  // 收件箱待办数
  const inboxBadge = badgeStack.addStack();
  inboxBadge.backgroundColor = isDark ? new Color("#334155", 0.7) : new Color("#cbd5e1", 0.7);
  inboxBadge.cornerRadius = 6;
  inboxBadge.setPadding(3, 7, 3, 7);
  const inboxText = inboxBadge.addText(`📥 待整理: ${data.inbox?.pendingCount || 0}`);
  inboxText.font = Font.mediumSystemFont(10);
  inboxText.textColor = isDark ? new Color("#e2e8f0") : new Color("#334155");

  // 今日任务数
  const taskBadge = badgeStack.addStack();
  taskBadge.backgroundColor = isDark ? new Color("#0369a1", 0.3) : new Color("#bae6fd", 0.6);
  taskBadge.cornerRadius = 6;
  taskBadge.setPadding(3, 7, 3, 7);
  const taskBadgeText = taskBadge.addText(`✅ 今日待办: ${data.tasks?.todayTotal || 0}`);
  taskBadgeText.font = Font.mediumSystemFont(10);
  taskBadgeText.textColor = isDark ? new Color("#38bdf8") : new Color("#0369a1");

  widget.addSpacer(8);

  // 4. 今日任务清单展示
  const tasks = data.tasks?.todayList || [];
  if (tasks.length === 0) {
    const emptyStack = widget.addStack();
    emptyStack.layoutHorizontally();
    const emptyText = emptyStack.addText("🎉 今日任务全部搞定或无计划");
    emptyText.font = Font.systemFont(11);
    emptyText.textColor = isDark ? new Color("#94a3b8") : new Color("#64748b");
  } else {
    const maxItems = config.widgetFamily === "small" ? 2 : 4;
    const displayTasks = tasks.slice(0, maxItems);

    for (const t of displayTasks) {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.spacing = 5;

      // 优先级点
      const dot = row.addText(t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "⚪");
      dot.font = Font.systemFont(8);

      const title = row.addText(t.title);
      title.font = Font.systemFont(11);
      title.lineLimit = 1;
      title.textColor = isDark ? new Color("#f1f5f9") : new Color("#1e293b");

      widget.addSpacer(3);
    }
  }

  // 5. 聚焦目标（仅在大型/中型组件显示）
  if (config.widgetFamily !== "small" && data.goals?.focusGoal) {
    widget.addSpacer();
    const goalStack = widget.addStack();
    goalStack.layoutHorizontally();
    const goalIcon = goalStack.addText("🎯 核心聚焦: ");
    goalIcon.font = Font.boldSystemFont(10);
    goalIcon.textColor = isDark ? new Color("#fbbf24") : new Color("#d97706");

    const goalName = goalStack.addText(data.goals.focusGoal);
    goalName.font = Font.systemFont(10);
    goalName.lineLimit = 1;
    goalName.textColor = isDark ? new Color("#fcd34d") : new Color("#b45309");
  }

  return widget;
}

// 运行与预览
const data = await fetchWidgetData();
const widget = await createWidget(data);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // 在 Scriptable App 内点击运行时提供中号组件预览
  widget.presentMedium();
}
Script.complete();
