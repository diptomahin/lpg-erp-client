import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataState";
import { supplierService } from "../../services/erpService";
import { money } from "../../utils/formatters";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function SupplierAdvances() {
  const query = useQuery({
    queryKey: ["supplier-advances"],
    queryFn: supplierService.advances,
  });

  return (
    <>
      <PageHeader
        title="Supplier advances"
        description="Suppliers with available payments for future purchases."
      />
      <DataTable
        query={query}
        columns={[
          "Supplier",
          "Available advance",
          "Last advance",
          "Method",
          "",
        ]}
        render={(row) => {
          const latest = row.advances?.[0];
          return (
            <tr key={row._id || row.id}>
              <td className="strong">{row.name}</td>
              <td className="supplier-advance-amount">
                +{money(row.advanceBalance)}
              </td>
              <td>{dateText(latest?.paymentDate)}</td>
              <td>{latest?.paymentMethod || "cash"}</td>
              <td>
                <Link
                  className="icon-button"
                  to={`/suppliers/${row._id || row.id}/payments`}
                  aria-label={`View payments for ${row.name}`}
                  title="View supplier payments"
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
