import type { ToolDefinition } from "./types";

export const toolsRegistry: ToolDefinition[] = [
  {
    id: "prompt-variable-generator",
    name: "提示词变量生成器",
    description: "从一段需求中提取可复用的 {{variables}}。",
    category: "AI工具",
    route: "/app/tools",
    icon: "braces",
    keywords: ["prompt", "variables", "提示词"],
    enabled: true,
    status: "active"
  },
  {
    id: "json-formatter",
    name: "JSON 格式化",
    description: "格式化、压缩并校验 JSON 文本。",
    category: "开发工具",
    route: "/app/tools",
    icon: "code",
    keywords: ["json", "format", "developer"],
    enabled: true,
    status: "active"
  },
  {
    id: "markdown-preview",
    name: "Markdown 预览",
    description: "快速预览文档、笔记和交付说明。",
    category: "文档工具",
    route: "/app/tools",
    icon: "file-text",
    keywords: ["markdown", "文档", "笔记"],
    enabled: true,
    status: "beta"
  },
  {
    id: "mcu-timer",
    name: "单片机定时器计算",
    description: "根据时钟、预分频和目标周期计算 STM32/51 常用定时器 ARR。",
    category: "单片机工具",
    route: "/app/tools",
    icon: "cpu",
    keywords: ["stm32", "timer", "单片机"],
    enabled: true,
    status: "active"
  }
];
