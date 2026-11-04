import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { customerService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { printToPdf } from "../../utils/printToPdf";
import { buildCustomerLedger } from "../../utils/accountLedgers";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function CustomerStatement() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["customer-overview", id],
    queryFn: () => customerService.overview(id),
  });

  if (query.isPending)
    return <div className="state">Loading customer statement...</div>;
  if (query.isError)
    return (
      <div className="state error">
        <strong>Could not load customer statement.</strong>
      </div>
    );

  const { customer, sales = [], payments = [], totals = {} } =
    query.data || {};
  const { openingBalance, closingBalance, entries: rowsWithBalances } =
    buildCustomerLedger({ customer, sales, payments });
  const closingDue = Number(customer?.totalDue ?? totals.due ?? 0);
  const availableAdvance = Number(
    customer?.advanceBalance ?? totals.advance ?? 0,
  );

  return (
    <>
      <PageHeader
        title="Statement of Accounts"
        description="Customer account activity and balances."
        action={
          <div className="action-row statement-actions">
            <Link className="secondary" to={`/customers/${id}`}>
              <ArrowLeft size={16} /> Customer details
            </Link>
            <button
              className="primary"
              type="button"
              onClick={() =>
                printToPdf(
                  `Al-Aksha Traders_customerStatement_${customer?.name || customer?.companyName || "Customer"}`,
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
              Statement for {customer?.companyName || customer?.name || "Customer"}
            </p>
            {customer?.name && customer.companyName && <p>{customer.name}</p>}
            {customer?.address && <p>{customer.address}</p>}
            {customer?.phone && <p>{customer.phone}</p>}
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
              <dt>Invoiced Amount</dt>
              <dd>{money(totals.sales)}</dd>
            </div>
            <div>
              <dt>Amount Received</dt>
              <dd>{money(totals.paid)}</dd>
            </div>
            <div>
              <dt>Available Advance</dt>
              <dd>{`-${money(availableAdvance)}`}</dd>
            </div>
            <div className="statement-balance-due">
              <dt>Net Balance (Due / Advance)</dt>
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
                <td>{dateText(customer?.createdAt)}</td>
                <td>Opening Balance</td>
                <td>Balance at customer creation</td>
                <td>{openingBalance > 0 ? money(openingBalance) : "-"}</td>
                <td>{openingBalance < 0 ? money(-openingBalance) : "-"}</td>
                <td>{money(openingBalance)}</td>
              </tr>
              {rowsWithBalances.map((entry, index) => (
                <tr key={`${entry.reference || entry.description}-${index}`}>
                  <td>{dateText(entry.date)}</td>
                  <td>
                    {entry.description === "Sale"
                      ? "Invoice"
                      : entry.description}
                  </td>
                  <td>{entry.reference || "-"}</td>
                  <td>{Number(entry.amount) ? money(entry.amount) : "-"}</td>
                  <td>{Number(entry.payment) ? money(entry.payment) : "-"}</td>
                  <td>{money(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Balance Due</td>
                <td>{money(closingDue)}</td>
              </tr>
              <tr>
                <td colSpan="5">Available Advance</td>
                <td>{`-${money(availableAdvance)}`}</td>
              </tr>
              <tr>
                <td colSpan="5">Net Balance (Due / Advance)</td>
                <td>{money(closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </>
  );
}
