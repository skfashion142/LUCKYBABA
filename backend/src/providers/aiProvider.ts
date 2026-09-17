export class AIProviderError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "AIProviderError";
  }
}

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

function config() {
  const baseUrl = process.env.AI_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

export function aiConfigured() { return !!config(); }

export async function chatCompletion(messages: AIMessage[], opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}) {
  const cfg = config();
  if (!cfg) throw new AIProviderError("AI_PROVIDER_NOT_CONFIGURED", "AI provider is not configured", 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? Number(process.env.AI_PROVIDER_TIMEOUT_MS || 20000));
  try {
    let upstream: Response;
    try {
      upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 600 }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") throw new AIProviderError("AI_PROVIDER_TIMEOUT", "AI provider timed out", 504);
      throw new AIProviderError("AI_PROVIDER_UNREACHABLE", "AI provider is unreachable", 502);
    }
    if (!upstream.ok) throw new AIProviderError("AI_PROVIDER_ERROR", `AI provider returned ${upstream.status}`, 502);
    const data: any = await upstream.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new AIProviderError("AI_PROVIDER_EMPTY_RESPONSE", "AI provider returned no answer", 502);
    const answer = text.trim();
    if (answer.length > 8000) throw new AIProviderError("AI_PROVIDER_RESPONSE_TOO_LARGE", "AI provider response is too large", 502);
    return { text: answer, model: cfg.model };
  } finally { clearTimeout(timer); }
}
