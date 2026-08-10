import type { AIChatInput, AIChatResult, AIModel, AIProvider, ConnectionTestResult } from "./types";

class UnconfiguredProvider implements AIProvider {
  constructor(
    public id: string,
    public name: string,
    private envName: string
  ) {}

  async listModels(): Promise<AIModel[]> {
    return [];
  }

  async chat(input: AIChatInput): Promise<AIChatResult> {
    void input;
    throw new Error(`${this.name} 未配置。请在服务端设置 ${this.envName}。`);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return { ok: false, message: `未配置 ${this.envName}` };
  }
}

class ChatCompletionsProvider implements AIProvider {
  constructor(
    public id: string,
    public name: string,
    private apiKey: string,
    private baseUrl: string,
    private defaultModel: string,
    private headers: Record<string, string> = {}
  ) {}

  async listModels(): Promise<AIModel[]> {
    return [{ id: this.defaultModel, name: this.defaultModel }];
  }

  async chat(input: AIChatInput): Promise<AIChatResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        messages: input.system ? [{ role: "system", content: input.system }, ...input.messages] : input.messages
      })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.error?.message || `${this.name} 返回 ${response.status}`);
    }

    return {
      content: body?.choices?.[0]?.message?.content || "",
      provider: this.id,
      model: input.model || this.defaultModel,
      usage: {
        inputTokens: body?.usage?.prompt_tokens,
        outputTokens: body?.usage?.completion_tokens
      }
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return { ok: true, message: `${this.name} 已配置` };
  }
}

class OllamaProvider implements AIProvider {
  constructor(private baseUrl: string) {}

  id = "ollama";
  name = "Ollama";

  async listModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!response.ok) return [{ id: "llama3.1", name: "llama3.1" }];
    const body = await response.json().catch(() => null);
    return Array.isArray(body?.models) ? body.models.map((item: { name: string }) => ({ id: item.name, name: item.name })) : [];
  }

  async chat(input: AIChatInput): Promise<AIChatResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: input.model || "llama3.1",
        messages: input.system ? [{ role: "system", content: input.system }, ...input.messages] : input.messages,
        stream: false
      })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.error || `Ollama 返回 ${response.status}`);
    }

    return {
      content: body?.message?.content || "",
      provider: this.id,
      model: input.model || "llama3.1"
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const models = await this.listModels();
      return { ok: true, message: models.length ? `已连接，发现 ${models.length} 个模型` : "已连接，但没有模型" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Ollama 连接失败" };
    }
  }
}

export function getAIProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  providers.push(
    process.env.OPENAI_API_KEY
      ? new ChatCompletionsProvider("openai", "OpenAI", process.env.OPENAI_API_KEY, "https://api.openai.com/v1", "gpt-4o-mini")
      : new UnconfiguredProvider("openai", "OpenAI", "OPENAI_API_KEY")
  );
  providers.push(
    process.env.OPENROUTER_API_KEY
      ? new ChatCompletionsProvider("openrouter", "OpenRouter", process.env.OPENROUTER_API_KEY, "https://openrouter.ai/api/v1", "openai/gpt-4o-mini", {
          "http-referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "x-title": "MyOS"
        })
      : new UnconfiguredProvider("openrouter", "OpenRouter", "OPENROUTER_API_KEY")
  );
  providers.push(
    process.env.DEEPSEEK_API_KEY
      ? new ChatCompletionsProvider("deepseek", "DeepSeek", process.env.DEEPSEEK_API_KEY, "https://api.deepseek.com", "deepseek-v4-flash")
      : new UnconfiguredProvider("deepseek", "DeepSeek", "DEEPSEEK_API_KEY")
  );
  providers.push(process.env.OLLAMA_BASE_URL ? new OllamaProvider(process.env.OLLAMA_BASE_URL) : new UnconfiguredProvider("ollama", "Ollama", "OLLAMA_BASE_URL"));

  return providers;
}
