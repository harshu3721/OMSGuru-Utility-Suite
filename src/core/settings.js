const STORAGE_KEY = "omsguru.utility-suite.settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  apiBaseUrl: "",
  omsCid: "",
  apiKey: "",
  requestTimeoutMs: 15000,
  retryCount: 2,
});

function readStoredSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export class SettingsStore {
  constructor() {
    this.listeners = new Set();
    this.value = { ...DEFAULT_SETTINGS, ...readStoredSettings() };
  }

  get() {
    return { ...this.value };
  }

  update(partial) {
    this.value = { ...this.value, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.value));
    this.listeners.forEach((listener) => listener(this.get()));
    return this.get();
  }

  reset() {
    this.value = { ...DEFAULT_SETTINGS };
    localStorage.removeItem(STORAGE_KEY);
    this.listeners.forEach((listener) => listener(this.get()));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
