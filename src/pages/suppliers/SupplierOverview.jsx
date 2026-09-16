import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit3 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataState";
import { supplierService } from "../../services/erpService";
import { kilos, money } from "../../utils/formatters";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function SupplierOverview() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["supplier-overview", id],
    queryFn: () => supplierService.overview(id),
  });

  if (query.isPending)
    return <div className="state">Loading supplier history...</div>;
  if (query.isError)
    return (
      <div className="state error">
        <strong>Could not load supplier history.</strong>
      </div>
    );

  const {
    supplier,
    purchases = [],
    payments = [],
    ledger = [],
    totals = {},
  } = query.data || {};

  return (
    <>
      <PageHeader
        title={supplier?.name || "Supplier"}
        description={supplier?.companyName || "Supplier relationship overview."}
        action={
          <div className="action-row">
            <Link className="secondary" to="/suppliers">
              <ArrowLeft size={16} /> Suppliers
            </Link>
            <Link className="primary" to={`/suppliers/${id}/edit`}>
              <Edit3 size={16} /> Edit
            </Link>
          </div>
        }
      />

      <div className="customer-summary-grid">
        <div className="summary-panel">
          <span>Outstanding payable</span>
          <strong>{money(totals.payable)}</strong>
        </div>
        <div className="summary-panel">
          <span>Total purchases</span>
          <strong>{money(totals.purchases)}</strong>
        </div>
        <div className="summary-panel">
          <span>Total paid</span>
          <strong>{money(totals.paid)}</strong>
        </div>
        <div className="summary-panel supplier-advance-summary">
          <span>Available advance</span>
          <strong>
            {Number(totals.advance || 0) > 0
              ? `+${money(totals.advance)}`
              : "-"}
          </strong>
        </div>
      </div>

      <section className="form-panel customer-info">
        <div>
          <span>Phone</span>
          <strong>{supplier?.phone || "-"}</strong>
        </div>
        <div>
          <span>Address</span>
          <strong>{supplier?.address || "-"}</strong>
        </div>
        <div>
          <span>Notes</span>
          <strong>{supplier?.notes || "-"}</strong>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Purchase history</p>
          <h2>Purchases</h2>
        </div>
      </div>
      <DataTable
        rows={purchases}
        columns={["Date", "Purchase", "Quantity", "Total", "Due", "Status"]}
        render={(purchase) => (
          <tr key={purchase._id}>
            <td>{dateText(purchase.purchaseDate)}</td>
            <td className="strong">{purchase.purchaseNumber || "-"}</td>
            <td>{kilos(purchase.quantityKg)}</td>
            <td>{money(purchase.totalCost)}</td>
            <td>{money(purchase.totalDue)}</td>
            <td>
              <span className="badge success">
                {purchase.paymentStatus || "unpaid"}
              </span>
            </td>
          </tr>
        )}
      />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Payment history</p>
          <h2>Supplier payments</h2>
        </div>
      </div>
      <DataTable
        rows={payments}
        columns={["Date", "Receipt", "Purchase", "Method", "Amount"]}
        render={(payment) => (
          <tr key={payment._id}>
            <td>{dateText(payment.paymentDate)}</td>
            <td>{payment.paymentNumber || "-"}</td>
            <td>{payment.purchase?.purchaseNumber || "General payment"}</td>
            <td>{payment.paymentMethod || "cash"}</td>
            <td
              className={
                payment.paymentType === "advance"
                  ? "strong supplier-advance-amount"
                  : "strong"
              }
            >
              {payment.paymentType === "advance"
                ? `+${money(payment.amount)}`
                : money(payment.amount)}
            </td>
          </tr>
        )}
      />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Account activity</p>
          <h2>Payable ledger</h2>
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
