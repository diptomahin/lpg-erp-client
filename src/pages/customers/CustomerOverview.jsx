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
import { buildCustomerLedger } from "../../utils/accountLedgers";

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
  const [selectedPayment, setSelectedPayment] = useState(null);
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
    totals = {},
  } = query.data || {};
  const { openingBalance, entries: runningLedger } = buildCustomerLedger({
    customer,
    sales,
    payments,
  });
  const ledgerRows = [
    {
      date: customer?.createdAt,
      createdAt: customer?.createdAt,
      description: "Opening Balance",
      reference: "Balance at customer creation",
      amount: Math.max(openingBalance, 0),
      payment: Math.max(-openingBalance, 0),
      balance: openingBalance,
      isOpening: true,
    },
    ...runningLedger,
  ];

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
            <td>
              {payment.paymentNumber ? (
                <button
                  className="table-link"
                  type="button"
                  onClick={() => setSelectedPayment(payment)}
                >
                  {payment.paymentNumber}
                </button>
              ) : (
                "-"
              )}
            </td>
            <td>
              {payment.paymentType === "advance_refund"
                ? `Advance refund${payment.advanceRefundOf?.paymentNumber ? ` of ${payment.advanceRefundOf.paymentNumber}` : ""}`
                : payment.paymentType === "advance"
                  ? "Customer advance"
                  : payment.paymentType === "advance_restoration"
                    ? "Advance restored from voided sale"
                    : payment.sale?._id ? (
                        <Link to={`/sales/${payment.sale._id}`}>
                          {payment.sale.invoiceNumber || "View invoice"}
                        </Link>
                      ) : (
                        "General payment"
                      )}
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
      {selectedPayment && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedPayment(null)}
        >
          <section
            className="modal-card receipt-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-title modal-head">
              <div>
                <p className="eyebrow">Customer payment receipt</p>
                <h2 id="receipt-detail-title">
                  {selectedPayment.paymentNumber || "Receipt details"}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSelectedPayment(null)}
                aria-label="Close receipt details"
              >
                ✕
              </button>
            </div>
            <div className="detail-meta">
              <div>
                <span>Customer</span>
                <strong>{customer?.name || "-"}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{dateText(selectedPayment.paymentDate)}</strong>
              </div>
              <div>
                <span>Payment type</span>
                <strong>
                  {selectedPayment.paymentType === "advance_application"
                    ? "Advance applied"
                    : selectedPayment.paymentType === "advance_refund"
                      ? "Advance refund"
                      : selectedPayment.paymentType === "advance_restoration"
                        ? "Advance restored"
                        : selectedPayment.paymentType === "advance"
                          ? "Customer advance"
                          : "Payment"}
                </strong>
              </div>
              <div>
                <span>Payment method</span>
                <strong>{selectedPayment.paymentMethod || "cash"}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>{money(selectedPayment.amount)}</strong>
              </div>
              <div>
                <span>Related invoice</span>
                <strong>
                  {selectedPayment.sale?._id ? (
                    <Link to={`/sales/${selectedPayment.sale._id}`}>
                      {selectedPayment.sale.invoiceNumber || "View invoice"}
                    </Link>
                  ) : (
                    "-"
                  )}
                </strong>
              </div>
              {selectedPayment.reference && (
                <div>
                  <span>Reference</span>
                  <strong>{selectedPayment.reference}</strong>
                </div>
              )}
              {selectedPayment.notes && (
                <div>
                  <span>Notes</span>
                  <strong>{selectedPayment.notes}</strong>
                </div>
              )}
              {selectedPayment.advanceRefundOf?.paymentNumber && (
                <div>
                  <span>Refund of receipt</span>
                  <strong>
                    {selectedPayment.advanceRefundOf.paymentNumber}
                  </strong>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="section-heading">
        <div>
          <p className="eyebrow">Account activity</p>
          <h2>Running ledger</h2>
        </div>
      </div>
      <PaginatedTable
        rows={ledgerRows}
        columns={[
          "Date",
          "Description",
          "Reference",
          "Amount",
          "Payment",
          "Balance",
        ]}
        render={(entry, index) => (
          <tr key={`${entry.reference}-${index}`}>
            <td>{dateText(entry.date)}</td>
            <td>{entry.description}</td>
            <td>{entry.reference || "-"}</td>
            <td>{entry.amount ? money(entry.amount) : "-"}</td>
            <td>{entry.payment ? money(entry.payment) : "-"}</td>
            <td className="strong">{money(entry.balance)}</td>
          </tr>
        )}
      />
    </>
  );
}
