import { apiError } from "../../services/apiClient";
import { rowsOf } from "../../utils/formatters";

export function DataState({ query, children }) {
  if (query.isPending) return <div className="state">Loading records...</div>;
  if (query.isError)
    return (
      <div className="state error">
        <strong>Could not load this view.</strong>
        <span>{apiError(query.error)}</span>
      </div>
    );
  const hasEmptyList = Array.isArray(query.data) && query.data.length === 0;
  const hasEmptyPaginatedList =
    query.data &&
    (Array.isArray(query.data.rows) || Array.isArray(query.data.batches)) &&
    rowsOf(query.data).length === 0;
  if (hasEmptyList || hasEmptyPaginatedList)
    return <div className="state">No records found.</div>;
  return children;
}

export function DataTable({ query, columns, render, rows }) {
  const sourceRows = rows !== undefined ? rows : query?.data;
  const tableRows = rowsOf(sourceRows);

  return (
    <div className="table-wrap">
      <DataState query={query}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>{tableRows.slice(0, 20).map(render)}</tbody>
        </table>
      </DataState>
    </div>
  );
}
