import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataState";
import { customerService } from "../../services/erpService";
import { money } from "../../utils/formatters";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function Advances() {
  const query = useQuery({
    queryKey: ["customer-advances"],
    queryFn: customerService.advances,
  });

  return (
    <>
      <PageHeader
        title="Advances"
        description="Customers with available payments for future sales."
      />
      <DataTable
        query={query}
        columns={[
          "Customer",
          "Available advance",
          "Last advance",
          "Method",
          "",
        ]}
        render={(row) => {
          const latest = row.advances?.[0];
          return (
            <tr key={row._id || row.id}>
              <td className="strong">
                <Link to={`/customers/${row._id || row.id}`}>{row.name}</Link>
              </td>
              <td className="advance-amount">-{money(row.advanceBalance)}</td>
              <td>{dateText(latest?.paymentDate)}</td>
              <td>{latest?.paymentMethod || "cash"}</td>
              <td>
                <Link
                  className="icon-button"
                  to={`/customers/${row._id || row.id}`}
                  aria-label={`View ${row.name}`}
                  title="View customer history"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          );
        }}
      />
    </>
  );
}
