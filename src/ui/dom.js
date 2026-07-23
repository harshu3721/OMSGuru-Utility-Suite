export function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  const { className, text, html, attributes, on, ...properties } = options;
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (html !== undefined) node.innerHTML = html;
  if (attributes) Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  Object.assign(node, properties);
  if (on) Object.entries(on).forEach(([event, handler]) => node.addEventListener(event, handler));
  children.flat().filter(Boolean).forEach((child) => node.append(child));
  return node;
}

export function clear(node) { node.replaceChildren(); return node; }
