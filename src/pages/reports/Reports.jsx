import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Banknote,
  Boxes,
  CalendarDays,
  CircleDollarSign,
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
import { DataState, DataTable } from "../../components/common/DataState";
import { customerService, reportService } from "../../services/erpService";
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

const buildMonthlyFallback = async (range) => {
  const [
    salesReport,
    expensesReport,
    customerDueReport,
    supplierPayableReport,
  ] = await Promise.all([
    reportService.sales({ ...range, page: 1, limit: 200 }),
    reportService.expenses({ ...range, page: 1, limit: 200 }),
    reportService.customerDues({ ...range }),
    reportService.supplierPayables({ ...range }),
  ]);

  const salesRows = Array.isArray(salesReport?.rows) ? salesReport.rows : [];
  const expenseRows = Array.isArray(expensesReport?.rows)
    ? expensesReport.rows
    : [];
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
    totalLpgPurchased: 0,
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
    totalSalaryPaid: 0,
    totalProfitSharePaid: 0,
    operatingProfit: grossProfit - totalExpenses,
    cylinderBreakdown: [],
  };
};

const metricConfig = [
  {
    id: "totalSales",
    label: "Total sales",
    icon: CircleDollarSign,
    tone: "emerald",
    progress: 84,
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
    id: "totalLpgSold",
    label: "Total LPG sold",
    icon: Scale,
    tone: "cyan",
    progress: 73,
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
    progress: 68,
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
    progress: 64,
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
    progress: 60,
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
    progress: 62,
    aliases: [
      "totalCustomerPayments",
      "customerPayments",
      "customerPaymentsTotal",
    ],
  },
  {
    id: "totalSupplierPayments",
    label: "Supplier payments",
    icon: Banknote,
    tone: "slate",
    progress: 56,
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
    progress: 47,
    aliases: ["totalExpenses", "expenses", "totalExpense", "expenseTotal"],
  },
  {
    id: "totalSalaryPaid",
    label: "Salary paid",
    icon: HandCoins,
    tone: "indigo",
    progress: 54,
    aliases: ["totalSalaryPaid", "salaryPaid", "totalSalary", "salaryPayments"],
  },
  {
    id: "grossProfit",
    label: "Gross profit",
    icon: TrendingUp,
    tone: "emerald",
    progress: 79,
    aliases: ["grossProfit", "profit", "totalGrossProfit", "grossProfitValue"],
  },
  {
    id: "operatingProfit",
    label: "Operating profit",
    icon: TrendingUp,
    tone: "cyan",
    progress: 66,
    aliases: ["operatingProfit", "totalOperatingProfit", "profitAfterExpenses"],
  },
  {
    id: "customerDue",
    label: "Customer due",
    icon: Wallet,
    tone: "orange",
    progress: 40,
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
    label: "Customer advances",
    icon: Wallet,
    tone: "orange",
    progress: 48,
    aliases: [
      "totalCustomerAdvances",
      "customerAdvances",
      "advanceBalance",
      "customerAdvanceBalance",
    ],
  },
  {
    id: "totalSupplierAdvances",
    label: "Supplier advances",
    icon: Factory,
    tone: "green",
    progress: 48,
    aliases: [
      "totalSupplierAdvances",
      "supplierAdvances",
      "supplierAdvanceBalance",
    ],
  },
  {
    id: "supplierPayable",
    label: "Supplier payable",
    icon: Factory,
    tone: "slate",
    progress: 43,
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
    label: "Closing LPG stock",
    icon: Warehouse,
    tone: "amber",
    progress: 62,
    aliases: [
      "closingLpgStock",
      "currentLpgStock",
      "availableLpgKg",
      "lpgInventoryKg",
    ],
  },
];

const formatMetricValue = (metricId, value) => {
  if (metricId === "totalCylindersSold" || metricId === "totalCylindersSold") {
    return `${Number(value || 0).toLocaleString()} units`;
  }
  if (
    metricId === "totalLpgSold" ||
    metricId === "currentLpgStock" ||
    metricId === "closingLpgStock"
  ) {
    return kilos(value);
  }
  return money(value);
};

const monthValue = (date) => dateValue(date).slice(0, 7);

const reportRange = (mode, selectedDate, selectedMonth) => {
  const currentDate = selectedDate || dateValue(new Date());
  const currentMonth = selectedMonth || monthValue(new Date());

  if (mode === "monthly") {
    const [year, rawMonth] = currentMonth.split("-").map(Number);
    const monthIndex = rawMonth - 1;
    const lastDay = new Date(year, monthIndex + 1, 0);
    return { from: `${currentMonth}-01`, to: dateValue(lastDay) };
  }

  return { from: currentDate, to: currentDate };
};

export default function Reports() {
  const { showTheoreticalProfit } = useReportSettings();
  const now = new Date();
  const [mode, setMode] = useState("daily");
  const [date, setDate] = useState(dateValue(now));
  const [month, setMonth] = useState(monthValue(now));
  const range = reportRange(mode, date, month);
  const rangeKey = `${mode}-${range.from}-${range.to}`;

  const query = useQuery({
    queryKey: ["report", mode, range.from, range.to],
    queryFn: async () => {
      if (mode === "monthly") {
        const payload = await reportService.monthly(range);
        if (!isEmptyReport(payload)) return payload || {};
        return buildMonthlyFallback(range);
      }

      return (await reportService.daily(range)) || {};
    },
    enabled: Boolean(range.from && range.to),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const sales = useQuery({
    queryKey: ["sales-report", range.from, range.to],
    queryFn: async () => {
      const payload = await reportService.sales({
        ...range,
        page: 1,
        limit: 50,
      });
      return payload || [];
    },
    enabled: Boolean(range.from && range.to),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.list({ limit: 1000 }),
  });

  const customerMap = mapById(customers.data);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Daily operational and financial reporting from authoritative records."
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
          </select>
        </label>

        <label>
          <span>{mode === "monthly" ? "Month" : "Date"}</span>
          <span className="report-input">
            <CalendarDays size={16} />
            <input
              type={mode === "monthly" ? "month" : "date"}
              value={mode === "monthly" ? month : date}
              onChange={(event) =>
                mode === "monthly"
                  ? setMonth(event.target.value)
                  : setDate(event.target.value)
              }
            />
          </span>
        </label>
      </div>

      <DataState query={query}>
        <div className="metric-grid" key={rangeKey}>
          {metricConfig
            .filter(
              ({ id }) =>
                showTheoreticalProfit ||
                !["grossProfit", "operatingProfit"].includes(id),
            )
            .map(({ id, label, icon: Icon, tone, progress, aliases }) => {
              const value = findMetricValue(query.data || {}, aliases);
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
                  <div className="metric-progress" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </DataState>

      <CylinderBreakdown items={query.data?.cylinderBreakdown} />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Sales profitability</p>
          <h2>Sales by transaction</h2>
        </div>
        {showTheoreticalProfit && (
          <span className="muted">Theoretical profit from completed sales</span>
        )}
      </div>

      <DataTable
        query={sales}
        columns={[
          "Invoice",
          "Date",
          "Customer",
          "LPG",
          "Purchase / KG",
          "Selling / KG",
          ...(showTheoreticalProfit ? ["Theoretical profit"] : []),
          "Payment",
        ]}
        render={(row) => {
          const customer =
            row.customer && typeof row.customer === "object"
              ? row.customer
              : customerMap[String(row.customer)] || {};

          const totalLpgKg = Number(row.totalLpgKg || 0);
          const totalCost = Number(row.totalCost || 0);
          const totalAmount = Number(row.totalAmount || 0);
          const purchasePricePerKg =
            row.purchasePricePerKg ?? (totalLpgKg ? totalCost / totalLpgKg : 0);
          const sellingPricePerKg =
            row.sellingPricePerKg ??
            (totalLpgKg ? totalAmount / totalLpgKg : 0);
          const theoreticalProfit =
            row.theoreticalProfit ?? row.grossProfit ?? totalAmount - totalCost;

          return (
            <tr key={row._id || row.id}>
              <td className="strong">
                <Link to={`/sales/${row._id || row.id}`}>
                  {row.invoiceNumber || row.saleNumber || "-"}
                </Link>
              </td>
              <td>
                {row.saleDate
                  ? new Date(row.saleDate).toLocaleDateString()
                  : "-"}
              </td>
              <td>{customer.name || row.customerName || "-"}</td>
              <td>{kilos(totalLpgKg)}</td>
              <td>{money(purchasePricePerKg)}</td>
              <td>{money(sellingPricePerKg)}</td>
              {showTheoreticalProfit && (
                <td className="strong">{money(theoreticalProfit)}</td>
              )}
              <td>
                <span className="badge neutral">
                  {row.paymentStatus || "unpaid"}
                </span>
              </td>
            </tr>
          );
        }}
      />
    </>
  );
}
