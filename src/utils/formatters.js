export const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
export const kilos = (value) => `${Number(value || 0).toLocaleString()} KG`;
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
