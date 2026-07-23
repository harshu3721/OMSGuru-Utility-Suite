const REDACTED_KEYS = new Set(["authorization", "api-key", "apikey", "x-api-key", "token", "password"]);

function redact(value, key = "") {
  if (REDACTED_KEYS.has(key.toLowerCase())) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  return value;
}

export class Logger {
  constructor(limit = 200) {
    this.limit = limit;
    this.entries = [];
  }

  write(level, message, context = {}) {
    const entry = { timestamp: new Date().toISOString(), level, message, context: redact(context) };
    this.entries.unshift(entry);
    this.entries.length = Math.min(this.entries.length, this.limit);
    const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
    console[method]("[OMSGuru]", message, entry.context);
    return entry;
  }

  info(message, context) { return this.write("info", message, context); }
  warn(message, context) { return this.write("warn", message, context); }
  error(message, context) { return this.write("error", message, context); }
  all() { return [...this.entries]; }
  clear() { this.entries = []; }
}
