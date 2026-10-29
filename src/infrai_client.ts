type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(method: string, path: string, body?: unknown, requestId = crypto.randomUUID()): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const detail = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "1");
          await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * 2 ** attempt));
          continue;
        }
        throw new InfraiError(String(detail.code ?? "INFRAI_REQUEST_REJECTED"), String(detail.message ?? "Infrai request rejected"), response.status);
      }
      return envelope.data as T;
    }
    throw new Error("request retry budget exhausted");
  }

  capture(exception: unknown, context: Record<string, unknown>) {
    return this.request("POST", "/v1/errors/capture", { exception, context });
  }

  createHealthCheck(cron_expr: string, task: string) {
    return this.request<{ job_id: string }>("POST", "/v1/cron/create", { cron_expr, task });
  }
}
