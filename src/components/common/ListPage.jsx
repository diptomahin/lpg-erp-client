import { Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "./PageHeader";
import { DataTable } from "./DataState";
import { rowsOf } from "../../utils/formatters";

export default function ListPage({
  type,
  service,
  title,
  description,
  columns,
  render,
  action,
  filters = [],
}) {
  const [filterValues, setFilterValues] = useState({});
  const query = useQuery({
    queryKey: [type, filterValues],
    queryFn: () =>
      service.list({
        page: 1,
        limit: 20,
        ...Object.fromEntries(
          Object.entries(filterValues).filter(([, value]) => value),
        ),
      }),
  });
  return (
    <>
      <PageHeader title={title} description={description} action={action} />
      <div className="filter-row">
        <div className="search">
          <Search size={17} />
          <input placeholder={`Search ${type}`} />
        </div>
        <span className="result-count">
          {query.data?.pagination?.total || rowsOf(query.data).length} records
        </span>
      </div>
      {filters.length > 0 && (
        <div className="filter-row resource-filters">
          {filters.map((filter) => (
            <label className="filter-control" key={filter.key}>
              {filter.label}
              {filter.type === "select" ? (
                <select
                  value={filterValues[filter.key] || ""}
                  onChange={(event) =>
                    setFilterValues({
                      ...filterValues,
                      [filter.key]: event.target.value,
                    })
                  }
                >
                  <option value="">All</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={filter.type || "text"}
                  value={filterValues[filter.key] || ""}
                  onChange={(event) =>
                    setFilterValues({
                      ...filterValues,
                      [filter.key]: event.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
        </div>
      )}
      <DataTable query={query} columns={columns} render={render} />
    </>
  );
}
