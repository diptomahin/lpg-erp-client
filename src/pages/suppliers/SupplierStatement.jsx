import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { supplierService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { printToPdf } from "../../utils/printToPdf";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const roundBalance = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const withRunningBalances = (entries, openingBalance) => {
  let balance = openingBalance;
  return entries.map((entry) => {
    balance = roundBalance(
      balance + Number(entry.debit || 0) - Number(entry.credit || 0),
    );
    return { ...entry, balance };
  });
};

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

  const { supplier, ledger = [], payments = [], totals = {} } = query.data || {};
  const statementEntries = [
    ...ledger.map((entry, index) => ({ ...entry, order: index })),
    ...payments
      .filter((payment) => payment.paymentType === "advance")
      .map((payment, index) => ({
        date: payment.paymentDate,
        description: "Advance paid",
        reference: payment.paymentNumber || "-",
        debit: 0,
        credit: payment.amount,
        order: ledger.length + index,
      })),
  ].sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date) ||
      Number(b.debit || 0) - Number(a.debit || 0) ||
      a.order - b.order,
  );
  const closingPayable = Number(supplier?.totalDue ?? totals.payable ?? 0);
  const availableAdvance = Number(
    supplier?.advanceBalance ?? totals.advance ?? 0,
  );
  const closingBalance = roundBalance(closingPayable - availableAdvance);
  const paymentsMade = payments
    .filter(
      (payment) =>
        !["advance", "advance_application"].includes(payment.paymentType),
    )
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const netActivity = statementEntries.reduce(
    (balance, entry) =>
      balance + Number(entry.debit || 0) - Number(entry.credit || 0),
    0,
  );
  const openingBalance = roundBalance(closingBalance - netActivity);
  const rowsWithBalances = withRunningBalances(
    statementEntries,
    openingBalance,
  );

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
              <dd>{`-${money(availableAdvance)}`}</dd>
            </div>
            <div className="statement-balance-due">
              <dt>Net Balance (Payable / Advance)</dt>
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
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="statement-opening-row">
                <td>{dateText(supplier?.createdAt)}</td>
                <td>Opening Balance</td>
                <td>Balance at supplier creation</td>
                <td>{openingBalance > 0 ? money(openingBalance) : "-"}</td>
                <td>{openingBalance < 0 ? money(-openingBalance) : "-"}</td>
                <td>{money(openingBalance)}</td>
              </tr>
              {rowsWithBalances.map((entry, index) => (
                <tr key={`${entry.reference || entry.description}-${index}`}>
                  <td>{dateText(entry.date)}</td>
                  <td>{entry.description}</td>
                  <td>{entry.reference || "-"}</td>
                  <td>{Number(entry.debit) ? money(entry.debit) : "-"}</td>
                  <td>{Number(entry.credit) ? money(entry.credit) : "-"}</td>
                  <td>{money(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Balance Payable</td>
                <td>{money(closingPayable)}</td>
              </tr>
              <tr>
                <td colSpan="5">Available Advance</td>
                <td>{`-${money(availableAdvance)}`}</td>
              </tr>
              <tr>
                <td colSpan="5">Net Balance (Payable / Advance)</td>
                <td>{money(closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </>
  );
}
