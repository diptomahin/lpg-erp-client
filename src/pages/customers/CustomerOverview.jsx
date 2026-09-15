import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit3 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataState, DataTable } from "../../components/common/DataState";
import { customerService } from "../../services/erpService";
import { money, kilos } from "../../utils/formatters";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function CustomerOverview() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["customer-overview", id],
    queryFn: () => customerService.overview(id),
  });

  if (query.isPending)
    return <div className="state">Loading customer history...</div>;
  if (query.isError)
    return (
      <div className="state error">
        <strong>Could not load customer history.</strong>
      </div>
    );

  const {
    customer,
    sales = [],
    payments = [],
    ledger = [],
    totals = {},
  } = query.data || {};

  return (
    <>
      <PageHeader
        title={customer?.name || "Customer"}
        description={customer?.companyName || "Customer relationship overview."}
        action={
          <div className="action-row">
            <Link className="secondary" to="/customers">
              <ArrowLeft size={16} /> Customers
            </Link>
            <Link className="primary" to={`/customers/${id}/edit`}>
              <Edit3 size={16} /> Edit
            </Link>
          </div>
        }
      />

      <div className="customer-summary-grid">
        <div className="summary-panel">
          <span>Outstanding due</span>
          <strong>{money(totals.due)}</strong>
        </div>
        <div className="summary-panel">
          <span>Total purchases</span>
          <strong>{money(totals.sales)}</strong>
        </div>
        <div className="summary-panel">
          <span>Total paid</span>
          <strong>{money(totals.paid)}</strong>
        </div>
      </div>

      <section className="form-panel customer-info">
        <div>
          <span>Phone</span>
          <strong>{customer?.phone || "-"}</strong>
        </div>
        <div>
          <span>Address</span>
          <strong>{customer?.address || "-"}</strong>
        </div>
        <div>
          <span>Notes</span>
          <strong>{customer?.notes || "-"}</strong>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Buying history</p>
          <h2>Sales transactions</h2>
        </div>
      </div>
      <DataTable
        rows={sales}
        columns={[
          "Date",
          "Invoice",
          "Cylinders",
          "LPG",
          "Total",
          "Due",
          "Status",
        ]}
        render={(sale) => (
          <tr key={sale._id}>
            <td>{dateText(sale.saleDate)}</td>
            <td className="strong">
              <Link to={`/sales/${sale._id}`}>{sale.invoiceNumber || "-"}</Link>
            </td>
            <td>{sale.totalCylinderCount || 0}</td>
            <td>{kilos(sale.totalLpgKg)}</td>
            <td>{money(sale.totalAmount)}</td>
            <td>{money(sale.totalDue)}</td>
            <td>
              <span className="badge success">
                {sale.paymentStatus || "unpaid"}
              </span>
            </td>
          </tr>
        )}
      />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Payment history</p>
          <h2>Customer payments</h2>
        </div>
      </div>
      <DataTable
        rows={payments}
        columns={["Date", "Receipt", "Sale", "Method", "Amount"]}
        render={(payment) => (
          <tr key={payment._id}>
            <td>{dateText(payment.paymentDate)}</td>
            <td>{payment.paymentNumber || "-"}</td>
            <td>{payment.sale?.invoiceNumber || "General payment"}</td>
            <td>{payment.paymentMethod || "cash"}</td>
            <td className="strong">{money(payment.amount)}</td>
          </tr>
        )}
      />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Account activity</p>
          <h2>Running ledger</h2>
        </div>
      </div>
      <DataTable
        rows={ledger}
        columns={[
          "Date",
          "Description",
          "Reference",
          "Debit",
          "Credit",
          "Balance",
        ]}
        render={(entry, index) => (
          <tr key={`${entry.reference}-${index}`}>
            <td>{dateText(entry.date)}</td>
            <td>{entry.description}</td>
            <td>{entry.reference || "-"}</td>
            <td>{money(entry.debit)}</td>
            <td>{money(entry.credit)}</td>
            <td className="strong">{money(entry.balance)}</td>
          </tr>
        )}
      />
    </>
  );
}
