export type ThemeMode = "light" | "dark";

export type ThemeSkin = {
  id: string;
  label: string;
  description: string;
  colors: [string, string, string];
};

export const themeSkins: ThemeSkin[] = [
  { id: "ocean", label: "海洋蓝", description: "清晰冷静", colors: ["#f4f8ff", "#2563eb", "#0ea5e9"] },
  { id: "aqua-health", label: "健康浅蓝", description: "医疗仪表盘", colors: ["#f8fbff", "#0e7490", "#f472b6"] },
  { id: "macaron", label: "马卡龙", description: "柔和彩色", colors: ["#d8ecfc", "#3b82f6", "#a78bfa"] },
  { id: "finance-sun", label: "琥珀金融", description: "蓝金高光", colors: ["#fbbf24", "#1d4ed8", "#f59e0b"] },
  { id: "finance-clean", label: "极简财务", description: "白卡统计", colors: ["#eef1fb", "#4f46e5", "#f59e0b"] },
  { id: "mint", label: "薄荷清新", description: "轻盈专注", colors: ["#effcf7", "#0d9488", "#34d399"] },
  { id: "lavender", label: "薰衣草", description: "紫调玻璃", colors: ["#f5f3ff", "#7c3aed", "#c084fc"] },
  { id: "forest", label: "森林绿", description: "低干扰", colors: ["#eff8f3", "#166534", "#2dd4bf"] },
  { id: "sunset", label: "日落橙", description: "温暖专注", colors: ["#fff4ec", "#ea580c", "#ec4899"] },
  { id: "graphite", label: "石墨极简", description: "黑白质感", colors: ["#f5f6f8", "#111827", "#6b7280"] },
  { id: "neon", label: "暗夜霓虹", description: "高对比", colors: ["#070b16", "#22d3ee", "#a855f7"] },
  { id: "grape", label: "星云紫", description: "夜间创作", colors: ["#f6f2ff", "#7c3aed", "#db2777"] }
];

export const defaultSkinId = "ocean";

export function normalizeSkinId(skinId: string | null | undefined) {
  return themeSkins.some((theme) => theme.id === skinId) ? skinId! : defaultSkinId;
}
