import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { supplierService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { printToPdf } from "../../utils/printToPdf";
import { buildSupplierLedger } from "../../utils/accountLedgers";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function SupplierStatement() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["supplier-overview", id],
    queryFn: () => supplierService.overview(id),
  });

  if (query.isPending)
    return <div className="state">Loading supplier statement...</div>;
  if (query.isError)
    return (
      <div className="state error">
        <strong>Could not load supplier statement.</strong>
      </div>
    );

  const { supplier, purchases = [], payments = [], totals = {} } =
    query.data || {};
  const { openingBalance, closingBalance, entries: rowsWithBalances } =
    buildSupplierLedger({ supplier, purchases, payments });
  const closingPayable = Number(supplier?.totalDue ?? totals.payable ?? 0);
  const availableAdvance = Number(
    supplier?.advanceBalance ?? totals.advance ?? 0,
  );
  const paymentsMade = payments
    .filter((payment) => payment.paymentType !== "advance_application")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Statement of Accounts"
        description="Supplier account activity and balances."
        action={
          <div className="action-row statement-actions">
            <Link className="secondary" to={`/suppliers/${id}`}>
              <ArrowLeft size={16} /> Supplier details
            </Link>
            <button
              className="primary"
              type="button"
              onClick={() =>
                printToPdf(
                  `Al-Aksha Traders_supplierStatement_${supplier?.name || supplier?.companyName || "Supplier"}`,
                )
              }
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        }
      />

      <article className="statement-page">
        <header className="statement-header">
          <div>
            <h2>Al-Aksha Traders</h2>
            <p>
              Statement for{" "}
              {supplier?.companyName || supplier?.name || "Supplier"}
            </p>
            {supplier?.name && supplier.companyName && <p>{supplier.name}</p>}
            {supplier?.address && <p>{supplier.address}</p>}
            {supplier?.phone && <p>{supplier.phone}</p>}
          </div>
          <div className="statement-title">
            <h1>Statement of Accounts</h1>
            <p>Generated {dateText(new Date())}</p>
          </div>
        </header>

        <section className="statement-summary" aria-label="Account summary">
          <h2>Account Summary</h2>
          <dl>
            <div>
              <dt>Opening Balance</dt>
              <dd>{money(openingBalance)}</dd>
            </div>
            <div>
              <dt>Purchases</dt>
              <dd>{money(totals.purchases)}</dd>
            </div>
            <div>
              <dt>Payments Made</dt>
              <dd>{money(paymentsMade)}</dd>
            </div>
            <div>
              <dt>Available Advance</dt>
              <dd>{money(availableAdvance)}</dd>
            </div>
            <div className="statement-balance-due">
              <dt>Net Balance (Advance / Payable)</dt>
              <dd>{money(closingBalance)}</dd>
            </div>
          </dl>
        </section>

        <div className="statement-table-wrap">
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="statement-opening-row">
                <td>{dateText(supplier?.createdAt)}</td>
                <td>Opening Balance</td>
                <td>Balance at supplier creation</td>
                <td>{openingBalance < 0 ? money(-openingBalance) : "-"}</td>
                <td>{openingBalance > 0 ? money(openingBalance) : "-"}</td>
                <td>{money(openingBalance)}</td>
              </tr>
              {rowsWithBalances.map((entry, index) => (
                <tr key={`${entry.reference || entry.description}-${index}`}>
                  <td>{dateText(entry.date)}</td>
                  <td>{entry.description}</td>
                  <td>{entry.reference || "-"}</td>
                  <td>{Number(entry.amount) ? money(entry.amount) : "-"}</td>
                  <td>{Number(entry.payment) ? money(entry.payment) : "-"}</td>
                  <td>{money(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Balance Payable</td>
                <td>{`-${money(closingPayable)}`}</td>
              </tr>
              <tr>
                <td colSpan="5">Available Advance</td>
                <td>{money(availableAdvance)}</td>
              </tr>
              <tr>
                <td colSpan="5">Net Balance (Advance / Payable)</td>
                <td>{money(closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </>
  );
}
