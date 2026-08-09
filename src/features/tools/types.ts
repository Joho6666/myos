export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  route: string;
  icon: string;
  keywords: string[];
  enabled: boolean;
  status: "active" | "beta" | "planned";
  permissions?: string[];
};
