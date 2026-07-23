/**
 * Browser helpers that work in OMSGuru userscripts without requiring a build
 * process. Import only in pages where the APIs are authorised for use.
 */
export function waitForElement(selector, { timeoutMs = 10000, root = document } = {}) {
  const immediate = root.querySelector(selector);
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const match = root.querySelector(selector);
      if (match) { cleanup(); resolve(match); }
    });
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Element not found: ${selector}`)); }, timeoutMs);
    const cleanup = () => { observer.disconnect(); clearTimeout(timer); };
    observer.observe(root.documentElement || root, { childList: true, subtree: true });
  });
}

export function observeElements(selector, callback, root = document) {
  const seen = new WeakSet();
  const scan = () => root.querySelectorAll(selector).forEach((node) => {
    if (!seen.has(node)) { seen.add(node); callback(node); }
  });
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(root.documentElement || root, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function getPageContext() {
  return { url: location.href, path: location.pathname, title: document.title, timestamp: new Date().toISOString() };
}

export function copyToClipboard(value) {
  return navigator.clipboard.writeText(String(value));
}
