export type ProjectTemplate = {
  id: string;
  label: string;
  category: string;
  nextAction: string;
  hint: string;
  featured: boolean;
};

export const projectTemplates: ProjectTemplate[] = [
  { id: "ai", label: "AI 开发", category: "AI开发", nextAction: "整理需求并拆出第一版功能", hint: "网站、Agent、自动化", featured: true },
  { id: "web", label: "网站", category: "网站开发", nextAction: "确定页面结构和第一屏内容", hint: "Next.js / 小程序 / 后台", featured: true },
  { id: "mcu", label: "单片机", category: "单片机", nextAction: "记录硬件目标和当前调试问题", hint: "51 / STM32 / Keil", featured: true },
  { id: "course", label: "课程作业", category: "课程作业", nextAction: "整理作业要求和交付格式", hint: "报告 / PPT / PDF", featured: true },
  { id: "client", label: "接单", category: "接单项目", nextAction: "确认需求、截止时间和报价范围", hint: "客户需求 / 交付", featured: false },
  { id: "data", label: "数据分析", category: "数据分析", nextAction: "确认数据来源和核心指标", hint: "Excel / 酒店运营", featured: false }
];

export const projectCategories = projectTemplates.map((template) => template.category);
