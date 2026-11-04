import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CircleDollarSign,
  Edit3,
  FileText,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataState";
import { customerService } from "../../services/erpService";
import { money, kilos } from "../../utils/formatters";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const pageSize = 20;

function PaginatedTable({ rows, columns, render }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);

  return (
    <>
      <DataTable
        rows={visibleRows}
        columns={columns}
        render={render}
      />
      {rows.length > 0 && (
        <nav className="table-pagination" aria-label="Table pagination">
          <span>
            Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of{" "}
            {rows.length}
          </span>
          <div className="table-pagination-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              aria-label="First page"
            >
              First
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              className="secondary"
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              aria-label="Next page"
            >
              Next
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => setPage(pageCount)}
              disabled={currentPage === pageCount}
              aria-label="Last page"
            >
              Last
            </button>
          </div>
        </nav>
      )}
    </>
  );
}

export default function CustomerOverview({ user }) {
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
            <Link className="secondary" to={`/customers/${id}/statement`}>
              <FileText size={16} /> Statement
            </Link>
            {user?.role === "admin" &&
              Number(customer?.advanceBalance || 0) > 0 && (
                <Link
                  className="secondary"
                  to={`/customers/${id}/refund-advance`}
                >
                  <CircleDollarSign size={16} /> Refund advance
                </Link>
              )}
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
        <div className="summary-panel advance-summary">
          <span>Available advance</span>
          <strong>
            {Number(customer?.advanceBalance || 0) > 0
              ? `-${money(customer.advanceBalance)}`
              : "-"}
          </strong>
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
      <PaginatedTable
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
      <PaginatedTable
        rows={payments}
        columns={["Date", "Receipt", "Sale / details", "Method", "Amount"]}
        render={(payment) => (
          <tr key={payment._id}>
            <td>{dateText(payment.paymentDate)}</td>
            <td>{payment.paymentNumber || "-"}</td>
            <td>
              {payment.paymentType === "advance_refund"
                ? `Advance refund${payment.advanceRefundOf?.paymentNumber ? ` of ${payment.advanceRefundOf.paymentNumber}` : ""}`
                : payment.paymentType === "advance"
                  ? "Customer advance"
                  : payment.paymentType === "advance_restoration"
                    ? "Advance restored from voided sale"
                    : payment.sale?.invoiceNumber || "General payment"}
            </td>
            <td>{payment.paymentMethod || "cash"}</td>
            <td
              className={
                ["advance", "advance_restoration", "advance_refund"].includes(
                  payment.paymentType,
                )
                  ? "strong advance-amount"
                  : "strong"
              }
            >
              {payment.paymentType === "advance_refund"
                ? `-${money(payment.amount)}`
                : ["advance", "advance_restoration"].includes(
                      payment.paymentType,
                    )
                  ? `-${money(payment.amount)}`
                  : money(payment.amount)}
            </td>
          </tr>
        )}
      />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Account activity</p>
          <h2>Running ledger</h2>
        </div>
      </div>
      <PaginatedTable
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
