import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { apiError } from "../../services/apiClient";
import { salaryService } from "../../services/erpService";
import { money, rowsOf } from "../../utils/formatters";
import { today } from "../../utils/dates";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const monthKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

export default function EmployeeDetails() {
  const { id } = useParams();
  const [paymentMonth, setPaymentMonth] = useState(() => today().slice(0, 7));
  const people = useQuery({
    queryKey: ["salary-people"],
    queryFn: salaryService.peopleAll,
  });
  const salaries = useQuery({
    queryKey: ["salary-payments"],
    queryFn: salaryService.salariesAll,
  });

  if (people.isPending || salaries.isPending)
    return <div className="state">Loading employee details...</div>;
  if (people.isError || salaries.isError)
    return (
      <div className="state error">
        <strong>Could not load employee details.</strong>
        <span>
          {apiError(people.isError ? people.error : salaries.error)}
        </span>
      </div>
    );

  const employee = rowsOf(people.data).find(
    (person) => String(person._id || person.id) === id,
  );

  if (!employee)
    return (
      <div className="state error">
        <strong>Employee not found.</strong>
        <Link className="secondary" to="/salary">
          <ArrowLeft size={16} /> Back to Salary
        </Link>
      </div>
    );

  const payments = rowsOf(salaries.data)
    .filter((payment) => {
      const personId =
        typeof payment.person === "object"
          ? payment.person?._id || payment.person?.id
          : payment.person;
      return String(personId) === id;
    })
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  const monthlyTotals = new Map();
  for (const payment of payments) {
    if (!payment.paymentDate) continue;
    const key = monthKey(payment.paymentDate);
    const month = monthlyTotals.get(key) || { count: 0, amount: 0 };
    month.count += 1;
    month.amount += Number(payment.amount || 0);
    monthlyTotals.set(key, month);
  }
  const monthlyHistory = [...monthlyTotals.entries()].sort(([monthA], [monthB]) =>
    monthB.localeCompare(monthA),
  );
  const selectedPayments = payments.filter(
    (payment) =>
      payment.paymentDate && monthKey(payment.paymentDate) === paymentMonth,
  );
  const role = [
    employee.isEmployee && "Employee",
    employee.isPartner && "Partner",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <>
      <PageHeader
        title={employee.name}
        description="Employee profile and complete salary payment history."
        action={
          <Link className="secondary" to="/salary">
            <ArrowLeft size={16} /> Back to Salary
          </Link>
        }
      />

      <section className="form-panel employee-profile">
        <h2>Employee Information</h2>
        <dl className="employee-details-grid">
          <div>
            <dt>Role</dt>
            <dd>{role || "-"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{employee.status || "active"}</dd>
          </div>
          <div>
            <dt>Monthly salary</dt>
            <dd>{employee.isEmployee ? money(employee.monthlySalary) : "-"}</dd>
          </div>
          {employee.isPartner && (
            <div>
              <dt>Partner share</dt>
              <dd>{Number(employee.partnerSharePercent || 0)}%</dd>
            </div>
          )}
          <div>
            <dt>Phone</dt>
            <dd>{employee.phone || "-"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{employee.email || "-"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{employee.address || "-"}</dd>
          </div>
          <div>
            <dt>Added</dt>
            <dd>{dateText(employee.createdAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{dateText(employee.updatedAt)}</dd>
          </div>
          <div className="employee-notes">
            <dt>Notes</dt>
            <dd>{employee.notes || "-"}</dd>
          </div>
        </dl>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Monthly totals</p>
          <h2>Month-by-month payment history</h2>
        </div>
      </div>
      <div className="table-wrap">
        {monthlyHistory.length ? (
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Transactions</th>
                <th>Total paid</th>
              </tr>
            </thead>
            <tbody>
              {monthlyHistory.map(([month, summary]) => (
                <tr key={month}>
                  <td className="strong">{monthLabel(month)}</td>
                  <td>{summary.count}</td>
                  <td>{money(summary.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="state">No salary payments recorded.</div>
        )}
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Transactions</p>
          <h2>Salary payment details</h2>
        </div>
        <label className="salary-month-filter">
          Month
          <input
            type="month"
            value={paymentMonth}
            onChange={(event) => setPaymentMonth(event.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        {selectedPayments.length ? (
          <table>
            <thead>
              <tr>
                <th>Payment date</th>
                <th>Salary period</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {selectedPayments.map((payment) => (
                <tr key={payment._id || payment.id}>
                  <td>{dateText(payment.paymentDate)}</td>
                  <td>{payment.period || "-"}</td>
                  <td className="strong">{money(payment.amount)}</td>
                  <td>{payment.paymentMethod || "-"}</td>
                  <td>{payment.reference || "-"}</td>
                  <td>{payment.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="state">
            No salary payments found for the selected month.
          </div>
        )}
      </div>
    </>
  );
}
