import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Banknote,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Download,
  Factory,
  HandCoins,
  Receipt,
  Scale,
  TrendingUp,
  Wallet,
  Warehouse,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import CylinderBreakdown from "../../components/common/CylinderBreakdown";
import { DataState } from "../../components/common/DataState";
import {
  customerService,
  reportService,
  salaryService,
  supplierService,
} from "../../services/erpService";
import {
  findMetricValue,
  isEmptyReport,
  kilos,
  mapById,
  money,
  sumValues,
} from "../../utils/formatters";
import { useReportSettings } from "../../utils/useReportSettings";
import { dateValue } from "../../utils/dates";
import { printToPdf } from "../../utils/printToPdf";

const buildMonthlyFallback = async (range) => {
  const [
    salesReport,
    purchaseReport,
    expensesReport,
    salaryReport,
    customerDueReport,
    supplierPayableReport,
  ] = await Promise.all([
    reportService.salesAll(range),
    reportService.purchasesAll(range),
    reportService.expenses(range),
    salaryService.salariesAll(),
    reportService.customerDues({ ...range }),
    reportService.supplierPayables({ ...range }),
  ]);

  const salesRows = salesReport.filter(
    (sale) => sale.status === "completed",
  );
  const purchaseRows = purchaseReport.filter(
    (purchase) => purchase.status === "completed",
  );
  const expenseRows = (Array.isArray(expensesReport) ? expensesReport : []).filter(
    (expense) => isInRange(expense.expenseDate, range),
  );
  const salaryRows = salaryReport.filter((payment) =>
    isInRange(payment.paymentDate, range),
  );
  const customerDueRows = Array.isArray(customerDueReport?.rows)
    ? customerDueReport.rows
    : Array.isArray(customerDueReport)
      ? customerDueReport
      : [];
  const supplierPayableRows = Array.isArray(supplierPayableReport?.rows)
    ? supplierPayableReport.rows
    : Array.isArray(supplierPayableReport)
      ? supplierPayableReport
      : [];

  const totalLpgSold = sumValues(salesRows, (row) => row.totalLpgKg ?? 0);
  const totalCylindersSold = sumValues(
    salesRows,
    (row) => row.totalCylinderCount ?? 0,
  );
  const totalSalesRevenue = sumValues(salesRows, (row) => row.totalAmount ?? 0);
  const totalCogs = sumValues(salesRows, (row) => row.totalCost ?? 0);
  const grossProfit = sumValues(
    salesRows,
    (row) =>
      row.grossProfit ??
      row.theoreticalProfit ??
      Number(row.totalAmount ?? row.total ?? 0) - Number(row.totalCost ?? 0),
  );
  const totalExpenses = sumValues(expenseRows, (row) => row.amount ?? 0);
  const customerOutstanding = sumValues(
    customerDueRows,
    (row) => row.outstanding ?? row.totalDue ?? row.customer?.totalDue ?? 0,
  );
  const supplierOutstanding = sumValues(
    supplierPayableRows,
    (row) => row.outstanding ?? row.totalDue ?? row.supplier?.totalDue ?? 0,
  );

  return {
    totalLpgPurchased: sumValues(purchaseRows, (row) => row.quantityKg ?? 0),
    purchaseSpend: sumValues(purchaseRows, (row) => row.totalCost ?? 0),
    totalLpgSold,
    totalCylindersSold,
    totalSalesRevenue,
    totalCogs,
    grossProfit,
    totalExpenses,
    customerPayments: 0,
    supplierPayments: 0,
    closingLpgStock: 0,
    customerOutstanding,
    supplierOutstanding,
    totalCustomerAdvances: 0,
    totalSupplierAdvances: 0,
    totalSalaryPaid: sumValues(salaryRows, (row) => row.amount ?? 0),
    operatingProfit:
      grossProfit -
      totalExpenses -
      sumValues(salaryRows, (row) => row.amount ?? 0),
    cylinderBreakdown: [],
  };
};

const metricConfig = [
  {
    id: "totalSales",
    label: "Total sales",
    icon: CircleDollarSign,
    tone: "emerald",
    aliases: [
      "totalSales",
      "salesRevenue",
      "totalSalesRevenue",
      "salesTotal",
      "totalRevenue",
      "totalSalesTotal",
    ],
  },
  {
    id: "purchaseSpend",
    label: "Purchase spend",
    icon: Factory,
    tone: "slate",
    aliases: ["purchaseSpend"],
  },
  {
    id: "totalLpgPurchased",
    label: "LPG purchased",
    icon: Boxes,
    tone: "cyan",
    aliases: ["totalLpgPurchased"],
  },
  {
    id: "totalLpgSold",
    label: "Total LPG sold",
    icon: Scale,
    tone: "cyan",
    aliases: [
      "totalLpgSold",
      "lpgSold",
      "totalLpgSoldKg",
      "lpgSoldKg",
      "soldLpgKg",
    ],
  },
  {
    id: "totalCylindersSold",
    label: "Total cylinders sold",
    icon: Boxes,
    tone: "violet",
    aliases: [
      "totalCylindersSold",
      "cylindersSold",
      "totalCylinderSales",
      "cylinderSales",
    ],
  },
  {
    id: "receivedInCash",
    label: "Received in cash",
    icon: HandCoins,
    tone: "green",
    aliases: [
      "receivedInCash",
      "totalReceivedInCash",
      "cashReceived",
      "totalCashReceived",
      "customerCashReceived",
      "customerPaymentsCash",
      "cashPaymentsReceived",
      "cashCollected",
      "totalCashCollected",
    ],
  },
  {
    id: "receivedInBank",
    label: "Received in bank",
    icon: Banknote,
    tone: "slate",
    aliases: [
      "receivedInBank",
      "totalReceivedInBank",
      "bankReceived",
      "totalBankReceived",
      "customerBankReceived",
      "customerPaymentsBank",
      "bankPaymentsReceived",
      "bankCollected",
      "totalBankCollected",
    ],
  },
  {
    id: "totalCustomerPayments",
    label: "Customer payments",
    icon: HandCoins,
    tone: "green",
    aliases: [
      "totalCustomerPayments",
      "customerPayments",
      "customerPaymentsTotal",
    ],
  },
  {
    id: "totalCustomerRefunds",
    label: "Customer advance refunds",
    icon: CircleDollarSign,
    tone: "orange",
    aliases: ["totalCustomerRefunds", "customerRefunds"],
  },
  {
    id: "totalSupplierPayments",
    label: "Supplier payments",
    icon: Banknote,
    tone: "slate",
    aliases: [
      "totalSupplierPayments",
      "supplierPayments",
      "supplierPaymentsTotal",
    ],
  },
  {
    id: "totalExpenses",
    label: "Total expenses",
    icon: Receipt,
    tone: "amber",
    aliases: ["totalExpenses", "expenses", "totalExpense", "expenseTotal"],
  },
  {
    id: "totalSalaryPaid",
    label: "Salary paid",
    icon: HandCoins,
    tone: "indigo",
    aliases: ["totalSalaryPaid", "salaryPaid", "totalSalary", "salaryPayments"],
  },
  {
    id: "totalCogs",
    label: "Cost of goods sold",
    icon: Receipt,
    tone: "amber",
    aliases: ["totalCogs", "costOfGoodsSold"],
  },
  {
    id: "grossProfit",
    label: "Gross profit",
    icon: TrendingUp,
    tone: "emerald",
    aliases: ["grossProfit", "profit", "totalGrossProfit", "grossProfitValue"],
  },
  {
    id: "operatingProfit",
    label: "Operating profit",
    icon: TrendingUp,
    tone: "cyan",
    aliases: ["operatingProfit", "totalOperatingProfit", "profitAfterExpenses"],
  },
  {
    id: "customerDue",
    label: "Current customer due",
    icon: Wallet,
    tone: "orange",
    aliases: [
      "customerDue",
      "customerOutstanding",
      "totalCustomerDue",
      "receivables",
      "customerOutstandingBalance",
      "totalCustomerOutstanding",
      "customerReceivables",
    ],
  },
  {
    id: "totalCustomerAdvances",
    label: "Current customer advances",
    icon: Wallet,
    tone: "orange",
    aliases: [
      "totalCustomerAdvances",
      "customerAdvances",
      "advanceBalance",
      "customerAdvanceBalance",
    ],
  },
  {
    id: "totalSupplierAdvances",
    label: "Current supplier advances",
    icon: Factory,
    tone: "green",
    aliases: [
      "totalSupplierAdvances",
      "supplierAdvances",
      "supplierAdvanceBalance",
    ],
  },
  {
    id: "supplierPayable",
    label: "Current supplier payable",
    icon: Factory,
    tone: "slate",
    aliases: [
      "supplierPayable",
      "supplierOutstanding",
      "totalSupplierPayable",
      "payables",
      "supplierOutstandingBalance",
      "totalSupplierOutstanding",
      "supplierPayables",
    ],
  },
  {
    id: "closingLpgStock",
    label: "Current LPG stock",
    icon: Warehouse,
    tone: "amber",
    aliases: [
      "closingLpgStock",
      "currentLpgStock",
      "availableLpgKg",
      "lpgInventoryKg",
    ],
  },
];

const formatMetricValue = (metricId, value) => {
  if (metricId === "totalCylindersSold") {
    return `${Number(value || 0).toLocaleString()} units`;
  }
  if (
    metricId === "totalLpgSold" ||
    metricId === "totalLpgPurchased" ||
    metricId === "currentLpgStock" ||
    metricId === "closingLpgStock"
  ) {
    return kilos(value);
  }
  return money(value);
};

const monthValue = (date) => dateValue(date).slice(0, 7);
const yearValue = (date) => String(date.getFullYear());

const reportRange = (mode, selectedDate, selectedMonth, selectedYear) => {
  const currentDate = selectedDate || dateValue(new Date());
  const currentMonth = selectedMonth || monthValue(new Date());
  const currentYear = selectedYear || yearValue(new Date());

  if (mode === "monthly") {
    const [year, rawMonth] = currentMonth.split("-").map(Number);
    const monthIndex = rawMonth - 1;
    const lastDay = new Date(year, monthIndex + 1, 0);
    return { from: `${currentMonth}-01`, to: dateValue(lastDay) };
  }

  if (mode === "yearly")
    return { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };

  if (mode === "all")
    return { from: "1900-01-01", to: currentDate };

  return { from: currentDate, to: currentDate };
};

const reportPeriodLabel = (mode, range, selectedMonth, selectedYear) => {
  if (mode === "monthly") {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }
  if (mode === "yearly") return `Year ${selectedYear}`;
  if (mode === "all") return "All time";
  return `Daily report — ${range.from}`;
};

const reportFilePeriod = (mode, range, selectedMonth, selectedYear) => {
  if (mode === "monthly") return selectedMonth;
  if (mode === "yearly") return selectedYear;
  if (mode === "all") return "All-Time";
  return range.from;
};

const isInRange = (value, range) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const day = date.toISOString().slice(0, 10);
  return day >= range.from && day <= range.to;
};

const groupSalaryByEmployee = (payments) => {
  const grouped = new Map();
  for (const payment of payments) {
    const person =
      payment.person && typeof payment.person === "object"
        ? payment.person
        : null;
    const name = person?.name || "Unknown employee";
    const id =
      person?._id ||
      person?.id ||
      (typeof payment.person === "string" ? payment.person : null);
    const key = id ? String(id) : `name:${name}`;
    const current = grouped.get(key) || { key, name, totalPaid: 0 };
    current.totalPaid += Number(payment.amount || 0);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
};

function ReportTable({ rows, columns, render, emptyText }) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);

  if (!rows.length) return <div className="state">{emptyText}</div>;

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>{visibleRows.map(render)}</tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="table-pagination">
          <span>
            Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of{" "}
            {rows.length}
          </span>
          <div className="table-pagination-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
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
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Reports() {
  const { showTheoreticalProfit } = useReportSettings();
  const now = new Date();
  const [mode, setMode] = useState("daily");
  const [date, setDate] = useState(dateValue(now));
  const [month, setMonth] = useState(monthValue(now));
  const [year, setYear] = useState(yearValue(now));
  const [section, setSection] = useState("overview");
  const activeSection =
    !showTheoreticalProfit && section === "profit-loss" ? "overview" : section;
  const range = reportRange(mode, date, month, year);
  const rangeKey = `${mode}-${range.from}-${range.to}`;

  const query = useQuery({
    queryKey: ["report", mode, range.from, range.to],
    queryFn: async () => {
      const summaryPromise = (async () => {
        if (mode === "daily") return reportService.daily(range);
        const payload = await reportService.monthly(range);
        if (mode === "monthly" && isEmptyReport(payload))
          return buildMonthlyFallback(range);
        return payload || {};
      })();

      const [
        summary,
        salesRows,
        purchaseRows,
        expenseRows,
        salaryRows,
        customerRows,
        supplierRows,
      ] = await Promise.all([
        summaryPromise,
        reportService.salesAll(range),
        reportService.purchasesAll(range),
        reportService.expenses(range),
        salaryService.salariesAll(),
        customerService.listAll(),
        supplierService.listAll(),
      ]);

      return {
        summary,
        sales: salesRows.filter((sale) => sale.status === "completed"),
        purchases: purchaseRows.filter(
          (purchase) => purchase.status === "completed",
        ),
        expenses: (Array.isArray(expenseRows) ? expenseRows : []).filter(
          (expense) => isInRange(expense.expenseDate, range),
        ),
        salaries: salaryRows.filter((payment) =>
          isInRange(payment.paymentDate, range),
        ),
        customers: customerRows,
        suppliers: supplierRows,
      };
    },
    enabled: Boolean(range.from && range.to),
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const report = query.data?.summary || {};
  const salesRows = query.data?.sales || [];
  const purchaseRows = query.data?.purchases || [];
  const expenseRows = query.data?.expenses || [];
  const salaryRows = query.data?.salaries || [];
  const salaryTotalsByEmployee = groupSalaryByEmployee(salaryRows);
  const customerMap = mapById(query.data?.customers);
  const supplierMap = mapById(query.data?.suppliers);
  const purchaseSpend = sumValues(purchaseRows, (row) => row.totalCost || 0);
  const reportMetrics = { ...report, purchaseSpend };
  const profitAndLoss = [
    ["Sales revenue", report.totalSalesRevenue ?? report.totalSales ?? 0],
    ["Cost of goods sold", report.totalCogs ?? 0],
    ["Gross profit", report.grossProfit ?? 0],
    ["Operating expenses", report.totalExpenses ?? 0],
    ["Employee salaries", report.totalSalaryPaid ?? 0],
    ["Operating profit", report.operatingProfit ?? 0],
  ];
  const tabs = [
    ["overview", "Overview"],
    ["purchases", "Purchases"],
    ["sales", "Sales"],
    ["expenses", "Expenses"],
    ["salaries", "Salaries"],
    ...(showTheoreticalProfit ? [["profit-loss", "Profit & loss"]] : []),
  ];

  return (
    <div className="report-page">
      <PageHeader
        title="Reports"
        description="Operational and financial reports across purchases, sales, expenses, salaries, and profitability."
        action={
          <button
            className="primary report-download"
            type="button"
            onClick={() =>
              printToPdf(
                `Al-Aksha_report_${reportFilePeriod(mode, range, month, year)}`,
              )
            }
            disabled={!query.data || query.isFetching}
          >
            <Download size={16} /> Download full report PDF
          </button>
        }
      />

      <div className="report-toolbar">
        <label>
          Report period
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="daily">Daily report</option>
            <option value="monthly">Monthly report</option>
            <option value="yearly">Yearly report</option>
            <option value="all">All time</option>
          </select>
        </label>

        <label>
          {mode === "monthly" ? "Month" : mode === "yearly" ? "Year" : "Date"}
          {mode !== "all" && (
            <span className="report-input">
              <CalendarDays size={16} />
              <input
                type={
                  mode === "monthly"
                    ? "month"
                    : mode === "yearly"
                      ? "number"
                      : "date"
                }
                min={mode === "yearly" ? "1900" : undefined}
                max={mode === "yearly" ? String(now.getFullYear()) : undefined}
                value={
                  mode === "monthly"
                    ? month
                    : mode === "yearly"
                      ? year
                      : date
                }
                onChange={(event) => {
                  if (mode === "monthly") setMonth(event.target.value);
                  else if (mode === "yearly") setYear(event.target.value);
                  else setDate(event.target.value);
                }}
              />
            </span>
          )}
        </label>
      </div>

      <DataState query={query}>
        <p className="muted report-period-note">
          Purchase, sales, expense, salary, and profit figures follow the
          selected period. Outstanding balances and stock are current totals.
        </p>
        <div className="metric-grid" key={rangeKey}>
          {metricConfig
            .filter(
              ({ id }) =>
                showTheoreticalProfit ||
                !["grossProfit", "operatingProfit", "totalCogs"].includes(id),
            )
            .map(({ id, label, icon: Icon, tone, aliases }) => {
              const value = findMetricValue(reportMetrics, aliases);
              return (
                <div
                  className="metric metric-tone"
                  data-tone={tone}
                  key={`${id}-${rangeKey}`}
                >
                  <div className="metric-head">
                    <span>{label}</span>
                    <span className="metric-icon" aria-hidden="true">
                      <Icon size={17} />
                    </span>
                  </div>
                  <strong>{formatMetricValue(id, value)}</strong>
                </div>
              );
            })}
        </div>

        <nav className="report-tabs" aria-label="Report sections">
          {tabs.map(([value, label]) => (
            <button
              className={
                activeSection === value ? "report-tab active" : "report-tab"
              }
              type="button"
              onClick={() => setSection(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeSection === "overview" && (
          <>
            <CylinderBreakdown items={report.cylinderBreakdown} />
            {showTheoreticalProfit && (
              <section className="profit-loss-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Financial summary</p>
                    <h2>Profit & loss</h2>
                  </div>
                  <span className="muted">For selected reporting period</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitAndLoss.map(([label, amount]) => (
                        <tr
                          className={
                            ["Gross profit", "Operating profit"].includes(label)
                              ? "strong"
                              : ""
                          }
                          key={label}
                        >
                          <td>{label}</td>
                          <td>{money(amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted report-note">
                  Operating profit follows the existing report calculation:
                  gross profit less operating expenses and employee salaries.
                </p>
              </section>
            )}
          </>
        )}

        {showTheoreticalProfit && activeSection === "profit-loss" && (
          <section className="profit-loss-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Financial summary</p>
                <h2>Profit & loss</h2>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAndLoss.map(([label, amount]) => (
                    <tr
                      className={
                        ["Gross profit", "Operating profit"].includes(label)
                          ? "strong"
                          : ""
                      }
                      key={label}
                    >
                      <td>{label}</td>
                      <td>{money(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted report-note">
              Operating profit follows the existing report calculation: gross
              profit less operating expenses and employee salaries. Purchases
              are inventory costs; cost of goods sold is used in gross profit.
            </p>
          </section>
        )}

        {activeSection === "purchases" && (
          <ReportTable
            rows={purchaseRows}
            columns={[
              "Purchase",
              "Date",
              "Supplier",
              "Quantity",
              "Total cost",
              "Paid",
              "Due",
              "Status",
            ]}
            emptyText="No purchases found for this reporting period."
            render={(row) => {
              const supplier =
                row.supplier && typeof row.supplier === "object"
                  ? row.supplier
                  : supplierMap[String(row.supplier)] || {};
              return (
                <tr key={row._id || row.id}>
                  <td className="strong">{row.purchaseNumber || "-"}</td>
                  <td>{dateValue(new Date(row.purchaseDate))}</td>
                  <td>{supplier.name || "-"}</td>
                  <td>{kilos(row.quantityKg)}</td>
                  <td>{money(row.totalCost)}</td>
                  <td>{money(row.totalPaid)}</td>
                  <td>{money(row.totalDue)}</td>
                  <td>{row.paymentStatus || row.status || "-"}</td>
                </tr>
              );
            }}
          />
        )}

        {activeSection === "sales" && (
          <ReportTable
            rows={salesRows}
            columns={[
              "Invoice",
              "Date",
              "Customer",
              "LPG",
              ...(showTheoreticalProfit ? ["Cost", "Gross profit"] : []),
              "Total",
              "Paid",
              "Due",
              "Status",
            ]}
            emptyText="No sales found for this reporting period."
            render={(row) => {
              const customer =
                row.customer && typeof row.customer === "object"
                  ? row.customer
                  : customerMap[String(row.customer)] || {};
              return (
                <tr key={row._id || row.id}>
                  <td className="strong">
                    <Link to={`/sales/${row._id || row.id}`}>
                      {row.invoiceNumber || "-"}
                    </Link>
                  </td>
                  <td>{dateValue(new Date(row.saleDate))}</td>
                  <td>{customer.name || "-"}</td>
                  <td>{kilos(row.totalLpgKg)}</td>
                  {showTheoreticalProfit && (
                    <>
                      <td>{money(row.totalCost)}</td>
                      <td>{money(row.grossProfit)}</td>
                    </>
                  )}
                  <td>{money(row.totalAmount)}</td>
                  <td>{money(row.totalPaid)}</td>
                  <td>{money(row.totalDue)}</td>
                  <td>{row.paymentStatus || row.status || "-"}</td>
                </tr>
              );
            }}
          />
        )}

        {activeSection === "expenses" && (
          <ReportTable
            rows={expenseRows}
            columns={["Date", "Category", "Description", "Method", "Amount"]}
            emptyText="No expenses found for this reporting period."
            render={(row) => (
              <tr key={row._id || row.id}>
                <td>{dateValue(new Date(row.expenseDate))}</td>
                <td>{row.category?.name || row.categoryName || "-"}</td>
                <td>{row.description || row.notes || "-"}</td>
                <td>{row.paymentMethod || "-"}</td>
                <td>{money(row.amount)}</td>
              </tr>
            )}
          />
        )}

        {activeSection === "salaries" && (
          <ReportTable
            rows={salaryTotalsByEmployee}
            columns={["Employee", "Total paid"]}
            emptyText="No salary payments found for this reporting period."
            render={(row) => (
              <tr key={row.key}>
                <td>{row.name}</td>
                <td>{money(row.totalPaid)}</td>
              </tr>
            )}
          />
        )}

        <article className="report-print-document">
          <header className="report-print-header">
            <div>
              <h1>Al-Aksha Traders</h1>
              <h2>Full Business Report</h2>
              <p>{reportPeriodLabel(mode, range, month, year)}</p>
            </div>
            <p>Generated {dateValue(new Date())}</p>
          </header>

          <section className="report-print-section">
            <h2>Overview</h2>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {metricConfig
                  .filter(
                    ({ id }) =>
                      showTheoreticalProfit ||
                      !["grossProfit", "operatingProfit", "totalCogs"].includes(
                        id,
                      ),
                  )
                  .map(({ id, label, aliases }) => (
                    <tr key={id}>
                      <td>{label}</td>
                      <td>
                        {formatMetricValue(
                          id,
                          findMetricValue(reportMetrics, aliases),
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          {report.cylinderBreakdown?.length > 0 && (
            <section className="report-print-section">
              <h2>Cylinders by category</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>LPG</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cylinderBreakdown.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{Number(item.quantity || 0).toLocaleString()} units</td>
                      <td>{kilos(item.lpgKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {showTheoreticalProfit && (
            <section className="report-print-section">
              <h2>Profit &amp; loss</h2>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAndLoss.map(([label, amount]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{money(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Operating profit follows the existing calculation: gross profit
                less operating expenses and employee salaries.
              </p>
            </section>
          )}

          <section className="report-print-section">
            <h2>Purchases</h2>
            <table>
              <thead>
                <tr>
                  {[
                    "Purchase",
                    "Date",
                    "Supplier",
                    "Quantity",
                    "Total cost",
                    "Paid",
                    "Due",
                    "Status",
                  ].map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseRows.length ? (
                  purchaseRows.map((row) => {
                    const supplier =
                      row.supplier && typeof row.supplier === "object"
                        ? row.supplier
                        : supplierMap[String(row.supplier)] || {};
                    return (
                      <tr key={row._id || row.id}>
                        <td>{row.purchaseNumber || "-"}</td>
                        <td>{dateValue(new Date(row.purchaseDate))}</td>
                        <td>{supplier.name || "-"}</td>
                        <td>{kilos(row.quantityKg)}</td>
                        <td>{money(row.totalCost)}</td>
                        <td>{money(row.totalPaid)}</td>
                        <td>{money(row.totalDue)}</td>
                        <td>{row.paymentStatus || row.status || "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="8">No purchases for this period.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="report-print-section">
            <h2>Sales</h2>
            <table>
              <thead>
                <tr>
                  {[
                    "Invoice",
                    "Date",
                    "Customer",
                    "LPG",
                    ...(showTheoreticalProfit ? ["Cost", "Gross profit"] : []),
                    "Total",
                    "Paid",
                    "Due",
                    "Status",
                  ].map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesRows.length ? (
                  salesRows.map((row) => {
                    const customer =
                      row.customer && typeof row.customer === "object"
                        ? row.customer
                        : customerMap[String(row.customer)] || {};
                    return (
                      <tr key={row._id || row.id}>
                        <td>{row.invoiceNumber || "-"}</td>
                        <td>{dateValue(new Date(row.saleDate))}</td>
                        <td>{customer.name || "-"}</td>
                        <td>{kilos(row.totalLpgKg)}</td>
                        {showTheoreticalProfit && (
                          <>
                            <td>{money(row.totalCost)}</td>
                            <td>{money(row.grossProfit)}</td>
                          </>
                        )}
                        <td>{money(row.totalAmount)}</td>
                        <td>{money(row.totalPaid)}</td>
                        <td>{money(row.totalDue)}</td>
                        <td>{row.paymentStatus || row.status || "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={showTheoreticalProfit ? 10 : 8}>
                      No sales for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="report-print-section">
            <h2>Expenses</h2>
            <table>
              <thead>
                <tr>
                  {["Date", "Category", "Description", "Method", "Amount"].map(
                    (column) => (
                      <th key={column}>{column}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {expenseRows.length ? (
                  expenseRows.map((row) => (
                    <tr key={row._id || row.id}>
                      <td>{dateValue(new Date(row.expenseDate))}</td>
                      <td>{row.category?.name || row.categoryName || "-"}</td>
                      <td>{row.description || row.notes || "-"}</td>
                      <td>{row.paymentMethod || "-"}</td>
                      <td>{money(row.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5">No expenses for this period.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="report-print-section">
            <h2>Salary totals by employee</h2>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total paid</th>
                </tr>
              </thead>
              <tbody>
                {salaryTotalsByEmployee.length ? (
                  salaryTotalsByEmployee.map((row) => (
                    <tr key={row.key}>
                      <td>{row.name}</td>
                      <td>{money(row.totalPaid)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">No salary payments for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

        </article>
      </DataState>
    </div>
  );
}
