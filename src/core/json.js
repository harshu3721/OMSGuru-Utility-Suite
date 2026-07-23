export function parseJson(value) {
  if (!value || !value.trim()) return { value: null, error: null };
  try {
    return { value: JSON.parse(value), error: null };
  } catch (error) {
    return { value: null, error: error.message };
  }
}

export function prettyJson(value) {
  return JSON.stringify(typeof value === "string" ? JSON.parse(value) : value, null, 2);
}
