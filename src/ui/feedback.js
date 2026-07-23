import { element } from "./dom.js";

export function toast(region, message, type = "info", duration = 4000) {
  const item = element("div", { className: `toast toast-${type}`, text: message, role: "status" });
  region.append(item);
  setTimeout(() => item.remove(), duration);
}

export function setLoading(button, loading, label = "Working…") {
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
  button.disabled = loading;
  button.textContent = loading ? label : button.dataset.defaultLabel;
}

export function modal({ title, content, onClose }) {
  const close = () => { overlay.remove(); onClose?.(); };
  const dialog = element("section", { className: "modal", attributes: { role: "dialog", "aria-modal": "true", "aria-label": title } });
  dialog.append(
    element("header", { className: "modal-header" }, [element("h2", { text: title }), element("button", { className: "icon-button", text: "×", attributes: { "aria-label": "Close" }, on: { click: close } })]),
    content,
  );
  const overlay = element("div", { className: "modal-overlay", on: { click: (event) => { if (event.target === overlay) close(); } } }, [dialog]);
  document.body.append(overlay);
  return { close, dialog };
}
