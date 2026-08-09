export type AutomationRequest = {
  workflowPath: string;
  input: Record<string, unknown>;
};

export type AutomationResult = {
  ok: boolean;
  status: "success" | "failed" | "not_configured";
  output?: unknown;
  error?: string;
};

export async function runN8NWorkflow(request: AutomationRequest): Promise<AutomationResult> {
  const baseUrl = process.env.N8N_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!baseUrl || !secret) {
    return {
      ok: false,
      status: "not_configured",
      error: "n8n 未配置。请先设置 N8N_BASE_URL 和 N8N_WEBHOOK_SECRET。"
    };
  }

  const controller = new AbortController();
  const timeout = Number(process.env.N8N_REQUEST_TIMEOUT_MS || 30000);
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${request.workflowPath.replace(/^\//, "")}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-myos-webhook-secret": secret
      },
      body: JSON.stringify(request.input),
      signal: controller.signal
    });

    const output = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.ok ? "success" : "failed",
      output,
      error: response.ok ? undefined : `n8n 返回 ${response.status}`
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown n8n error"
    };
  } finally {
    clearTimeout(timer);
  }
}
