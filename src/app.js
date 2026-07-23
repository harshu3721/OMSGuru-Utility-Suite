import { ApiClient } from "./api/client.js";
import { prettyJson, parseJson } from "./core/json.js";
import { Logger } from "./core/logger.js";
import { SettingsStore } from "./core/settings.js";
import { clear, element } from "./ui/dom.js";
import { modal, setLoading, toast } from "./ui/feedback.js";
import { searchableTable } from "./ui/table.js";

const content = document.querySelector("#app-content");
const nav = document.querySelector("#utility-nav");
const toastRegion = document.querySelector("#toast-region");
const settings = new SettingsStore();
const logger = new Logger();
const client = new ApiClient({ settings, logger });

const utilities = [
  { id: "playground", label: "API Playground" },
  { id: "payload", label: "Payload Generator" },
  { id: "formatter", label: "JSON Formatter" },
  { id: "logs", label: "Request Log" },
];

function field(label, control) {
  return element("label", { className: "field", text: label }, [control]);
}

function activate(id) {
  [...nav.children].forEach((button) => button.classList.toggle("active", button.dataset.utility === id));
  clear(content);
  ({ playground: renderPlayground, payload: renderPayloadGenerator, formatter: renderFormatter, logs: renderLogs }[id])();
}

function renderNav() {
  utilities.forEach((utility) => nav.append(element("button", { className: "nav-button", text: utility.label, attributes: { type: "button" }, on: { click: () => activate(utility.id) } }, [])));
}

function renderPlayground() {
  const path = element("input", { className: "input", placeholder: "/api/example or https://…", value: "" });
  const method = element("select", { className: "select" }, ["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => element("option", { value: item, text: item })));
  const headers = element("textarea", { className: "textarea", value: "{}", spellcheck: false });
  const body = element("textarea", { className: "textarea", value: "", placeholder: "Optional JSON request body", spellcheck: false });
  const result = element("pre", { className: "status muted", text: "Send a request to see the response here." });
  const send = element("button", { className: "button", text: "Send request", attributes: { type: "button" } });

  send.addEventListener("click", async () => {
    const parsedHeaders = parseJson(headers.value);
    const parsedBody = parseJson(body.value);
    if (!path.value.trim()) return toast(toastRegion, "Enter an endpoint path or full URL.", "error");
    if (parsedHeaders.error || parsedBody.error) return toast(toastRegion, `Invalid JSON: ${parsedHeaders.error || parsedBody.error}`, "error");
    setLoading(send, true, "Sending…");
    result.className = "status muted";
    result.textContent = "Request in progress…";
    try {
      const response = await client.request({ path: path.value.trim(), method: method.value, headers: parsedHeaders.value || {}, body: parsedBody.value });
      result.className = "status success";
      result.textContent = prettyJson(response);
      toast(toastRegion, `Request completed in ${response.durationMs} ms.`, "success");
    } catch (error) {
      result.className = "status error";
      result.textContent = prettyJson({ error: error.message, status: error.status, response: error.body });
      toast(toastRegion, error.message, "error");
    } finally { setLoading(send, false); }
  });

  content.append(
    element("section", { className: "panel" }, [
      element("h2", { text: "API Playground" }),
      element("p", { className: "muted", text: "Test authorised endpoints with the shared headers, timeout, retry, and logging framework." }),
      element("div", { className: "grid grid-3" }, [field("Method", method), field("Endpoint", path)]),
      element("div", { className: "grid" }, [field("Additional headers (JSON)", headers), field("Body (JSON)", body)]),
      element("div", { className: "button-row" }, [send]),
    ]),
    element("section", { className: "panel" }, [element("h3", { text: "Response viewer" }), result]),
  );
}

function renderFormatter() {
  const source = element("textarea", { className: "textarea", placeholder: "Paste JSON here", spellcheck: false });
  const output = element("pre", { className: "status muted", text: "Formatted JSON will appear here." });
  const format = element("button", { className: "button", text: "Format JSON" });
  format.addEventListener("click", () => {
    const parsed = parseJson(source.value);
    if (parsed.error) { output.className = "status error"; output.textContent = parsed.error; return; }
    output.className = "status success";
    output.textContent = prettyJson(parsed.value);
  });
  content.append(element("section", { className: "panel" }, [element("h2", { text: "JSON Formatter" }), element("div", { className: "grid" }, [field("JSON input", source), element("div", {}, [element("p", { className: "field", text: "Formatted output" }), output])]), element("div", { className: "button-row" }, [format])]));
}

function renderPayloadGenerator() {
  const orderId = element("input", { className: "input", placeholder: "Order ID" });
  const sku = element("input", { className: "input", placeholder: "SKU" });
  const quantity = element("input", { className: "input", type: "number", min: 1, value: 1 });
  const status = element("select", { className: "select" }, ["new", "processing", "cancelled", "shipped"].map((item) => element("option", { value: item, text: item })));
  const output = element("pre", { className: "status muted", text: "Fill in the fields, then generate a safe JSON template." });
  const generate = element("button", { className: "button", text: "Generate payload" });
  const copy = element("button", { className: "button button-secondary", text: "Copy payload", disabled: true });
  generate.addEventListener("click", () => {
    const payload = { order_id: orderId.value.trim() || "<order-id>", sku: sku.value.trim() || "<sku>", quantity: Number(quantity.value) || 1, status: status.value };
    output.className = "status success";
    output.textContent = prettyJson(payload);
    copy.disabled = false;
  });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(output.textContent); toast(toastRegion, "Payload copied.", "success"); }
    catch { toast(toastRegion, "Copy failed. Select the payload and copy it manually.", "error"); }
  });
  content.append(element("section", { className: "panel" }, [
    element("h2", { text: "Payload Generator" }),
    element("p", { className: "muted", text: "Create a JSON starter payload before testing an authorised API endpoint." }),
    element("div", { className: "grid grid-3" }, [field("Order ID", orderId), field("SKU", sku), field("Quantity", quantity), field("Status", status)]),
    element("div", { className: "button-row" }, [generate, copy]),
    element("h3", { text: "Generated JSON" }), output,
  ]));
}

function renderLogs() {
  const entries = logger.all().map((entry) => ({ time: new Date(entry.timestamp).toLocaleTimeString(), level: entry.level, message: entry.message, context: JSON.stringify(entry.context) }));
  const clearButton = element("button", { className: "button button-danger", text: "Clear log" });
  clearButton.addEventListener("click", () => { logger.clear(); renderLogs(); toast(toastRegion, "Request log cleared.", "success"); });
  content.append(element("section", { className: "panel" }, [element("h2", { text: "Request Log" }), element("p", { className: "muted", text: "Sensitive credential fields are redacted before they reach this log." }), element("div", { className: "button-row" }, [clearButton]), searchableTable({ columns: [{ key: "time", label: "Time" }, { key: "level", label: "Level" }, { key: "message", label: "Message" }, { key: "context", label: "Context" }], rows: entries })]));
}

function openSettings() {
  const current = settings.get();
  const apiBaseUrl = element("input", { className: "input", value: current.apiBaseUrl, placeholder: "https://api.example.com" });
  const omsCid = element("input", { className: "input", value: current.omsCid, placeholder: "Client ID" });
  const apiKey = element("input", { className: "input", type: "password", value: current.apiKey, placeholder: "API key" });
  const timeout = element("input", { className: "input", type: "number", min: 1000, value: current.requestTimeoutMs });
  const retries = element("input", { className: "input", type: "number", min: 0, max: 5, value: current.retryCount });
  const save = element("button", { className: "button", text: "Save settings" });
  const form = element("form", { className: "grid" }, [field("API base URL", apiBaseUrl), field("Oms-Cid", omsCid), field("API key", apiKey), field("Timeout (ms)", timeout), field("Retries", retries), element("div", { className: "button-row" }, [save])]);
  const instance = modal({ title: "Connection settings", content: form });
  form.addEventListener("submit", (event) => { event.preventDefault(); settings.update({ apiBaseUrl: apiBaseUrl.value.trim(), omsCid: omsCid.value.trim(), apiKey: apiKey.value.trim(), requestTimeoutMs: Number(timeout.value) || 15000, retryCount: Number(retries.value) || 0 }); instance.close(); toast(toastRegion, "Settings saved in this browser.", "success"); });
}

document.querySelector("#settings-button").addEventListener("click", openSettings);
renderNav();
activate("playground");
