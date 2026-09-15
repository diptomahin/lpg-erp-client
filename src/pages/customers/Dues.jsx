import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { DataState, DataTable } from "../../components/common/DataState";
import { customerService } from "../../services/erpService";
import { money } from "../../utils/formatters";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "No payment recorded";

export default function Dues() {
  const query = useQuery({
    queryKey: ["customer-dues"],
    queryFn: customerService.dues,
  });

  return (
    <>
      <PageHeader
        title="Dues"
        description="Customers with outstanding balances and their latest payment activity."
      />
      <DataTable
        query={query}
        columns={["Customer", "Company", "Outstanding", "Last payment", ""]}
        render={(row) => (
          <tr key={row._id || row.id}>
            <td className="strong">
              <Link to={`/customers/${row._id || row.id}`}>{row.name}</Link>
            </td>
            <td>{row.companyName || "-"}</td>
            <td className="strong">{money(row.totalDue)}</td>
            <td>
              {dateText(row.lastPayment?.paymentDate)}
              {row.lastPayment?.amount ? (
                <small className="table-note">
                  {money(row.lastPayment.amount)} via{" "}
                  {row.lastPayment.paymentMethod || "cash"}
                </small>
              ) : null}
            </td>
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
        )}
      />
    </>
  );
}
