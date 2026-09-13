export const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
export const kilos = (value) => `${Number(value || 0).toLocaleString()} KG`;
export const sumValues = (rows = [], selector = (row) => row) =>
  rows.reduce((total, row) => total + Number(selector(row) || 0), 0);
export const isEmptyReport = (data) => {
  if (!data || typeof data !== "object") return true;
  const values = Object.values(data);
  if (values.length === 0) return true;
  return values.every((value) => {
    if (typeof value === "number") return value === 0;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (value && typeof value === "object")
      return Object.keys(value).length === 0;
    return value === null || value === undefined;
  });
};
export const normalizeMetricKey = (key = "") =>
  String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export const findMetricValue = (source, aliases = []) => {
  if (!source || typeof source !== "object") return 0;

  const normalizedAliases = new Set(aliases.map(normalizeMetricKey));

  const search = (node) => {
    if (!node || typeof node !== "object") return null;

    if (Array.isArray(node)) {
      for (const item of node) {
        const result = search(item);
        if (result !== null) return result;
      }
      return null;
    }

    for (const [key, value] of Object.entries(node)) {
      if (value !== null && value !== undefined && !Array.isArray(value)) {
        const normalizedKey = normalizeMetricKey(key);
        if (normalizedAliases.has(normalizedKey)) {
          const numericValue = Number(value);
          return Number.isFinite(numericValue) ? numericValue : 0;
        }
      }

      if (value && typeof value === "object") {
        const nested = search(value);
        if (nested !== null) return nested;
      }
    }

    return null;
  };

  const result = search(source);
  return result === null ? 0 : result;
};
export const rowsOf = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.batches)) return data.batches;
  return [];
};
export const mapById = (data) => {
  const rows = rowsOf(data);
  return Object.fromEntries(
    rows
      .filter((row) => row && (row._id || row.id))
      .map((row) => [String(row._id || row.id), row]),
  );
};
