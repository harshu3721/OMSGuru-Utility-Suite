const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ApiError extends Error {
  constructor(message, { status, body, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class ApiClient {
  constructor({ settings, logger }) {
    this.settings = settings;
    this.logger = logger;
  }

  buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const { apiBaseUrl } = this.settings.get();
    if (!apiBaseUrl) throw new ApiError("Set an API base URL in Settings, or enter a full URL.");
    return new URL(path, apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`).toString();
  }

  buildHeaders(customHeaders = {}) {
    const { omsCid, apiKey } = this.settings.get();
    return {
      Accept: "application/json",
      ...(omsCid ? { "Oms-Cid": omsCid } : {}),
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...customHeaders,
    };
  }

  async request({ path, method = "GET", headers = {}, body, timeoutMs, retries }) {
    const settings = this.settings.get();
    const url = this.buildUrl(path);
    const maxRetries = retries ?? settings.retryCount;
    const requestHeaders = this.buildHeaders(headers);
    const payload = body === undefined || body === null || body === "" ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    if (payload && !Object.keys(requestHeaders).some((key) => key.toLowerCase() === "content-type")) requestHeaders["Content-Type"] = "application/json";

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs ?? settings.requestTimeoutMs);
      const startedAt = performance.now();
      try {
        this.logger.info("API request", { method, url, attempt: attempt + 1 });
        const response = await fetch(url, { method, headers: requestHeaders, body: payload, signal: controller.signal });
        const text = await response.text();
        let responseBody = text;
        try { responseBody = text ? JSON.parse(text) : null; } catch { /* non-JSON response */ }
        const result = { ok: response.ok, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), body: responseBody, durationMs: Math.round(performance.now() - startedAt) };
        if (!response.ok) throw new ApiError(`Request failed (${response.status} ${response.statusText})`, { status: response.status, body: responseBody });
        this.logger.info("API response", { method, url, status: response.status, durationMs: result.durationMs });
        return result;
      } catch (error) {
        const retryable = error.name === "AbortError" || !(error instanceof ApiError) || RETRYABLE_STATUS_CODES.has(error.status);
        if (attempt === maxRetries || !retryable) {
          const apiError = error.name === "AbortError" ? new ApiError("Request timed out.", { cause: error }) : error;
          this.logger.error("API request failed", { method, url, status: apiError.status, message: apiError.message });
          throw apiError;
        }
        await wait(300 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
