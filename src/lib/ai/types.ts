export type AIModel = {
  id: string;
  name: string;
};

export type AIChatInput = {
  model: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
};

export type AIChatResult = {
  content: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
};

export interface AIProvider {
  id: string;
  name: string;
  listModels(): Promise<AIModel[]>;
  chat(input: AIChatInput): Promise<AIChatResult>;
  testConnection(): Promise<ConnectionTestResult>;
}
