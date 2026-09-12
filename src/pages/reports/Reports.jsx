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
import { DataState, DataTable } from "../../components/common/DataState";
import { customerService, reportService } from "../../services/erpService";
import { kilos, mapById, money } from "../../utils/formatters";
import { useReportSettings } from "../../utils/useReportSettings";

const metricConfig = {
  totalSales: ["Total sales", money, CircleDollarSign, "emerald", 84],
  totalLpgSold: ["Total LPG sold", kilos, Scale, "cyan", 73],
  totalCylindersSold: [
    "Total cylinders sold",
    (value) => `${Number(value || 0).toLocaleString()} units`,
    Boxes,
    "violet",
    68,
  ],
  totalCustomerPayments: ["Customer payments", money, HandCoins, "green", 62],
  totalSupplierPayments: ["Supplier payments", money, Banknote, "slate", 56],
  totalExpenses: ["Total expenses", money, Receipt, "amber", 47],
  totalSalaryPaid: ["Salary paid", money, HandCoins, "indigo", 54],
  totalProfitSharePaid: ["Profit shares paid", money, HandCoins, "rose", 38],
  grossProfit: ["Gross profit", money, TrendingUp, "emerald", 79],
  operatingProfit: ["Operating profit", money, TrendingUp, "cyan", 66],
  customerDue: ["Customer due", money, Wallet, "orange", 40],
  supplierPayable: ["Supplier payable", money, Factory, "slate", 43],
  currentLpgStock: ["Current LPG stock", kilos, Warehouse, "amber", 59],
  totalLpgPurchased: ["Total LPG purchased", kilos, Scale, "violet", 71],
  totalSalesRevenue: ["Sales revenue", money, CircleDollarSign, "emerald", 81],
  totalCogs: ["Total COGS", money, Receipt, "red", 52],
  customerPayments: ["Customer payments", money, HandCoins, "green", 60],
  supplierPayments: ["Supplier payments", money, Banknote, "slate", 54],
  closingLpgStock: ["Closing LPG stock", kilos, Warehouse, "amber", 62],
  customerOutstanding: ["Customer outstanding", money, Wallet, "orange", 44],
  supplierOutstanding: ["Supplier outstanding", money, Factory, "slate", 46],
};

const dateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthValue = (date) => dateValue(date).slice(0, 7);

const reportRange = (mode, date, month) => {
  if (mode === "monthly") {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0);
    return { from: `${month}-01`, to: dateValue(lastDay) };
  }
  return { from: date, to: date };
};

export default function Reports() {
  const { showTheoreticalProfit } = useReportSettings();
  const now = new Date();
  const [mode, setMode] = useState("daily");
  const [date, setDate] = useState(dateValue(now));
  const [month, setMonth] = useState(monthValue(now));
  const range = reportRange(mode, date, month);
  const query = useQuery({
    queryKey: ["report", mode, range.from, range.to],
    queryFn: () =>
      mode === "monthly"
        ? reportService.monthly(range)
        : reportService.daily(range),
  });
  const sales = useQuery({
    queryKey: ["sales-report", range.from, range.to],
    queryFn: () => reportService.sales({ ...range, page: 1, limit: 50 }),
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
        <div className="metric-grid">
          {Object.entries(query.data || {})
            .filter(([, value]) => typeof value === "number")
            .map(([key, value]) => {
              const [label, format, Icon, tone = "emerald", progress = 55] =
                metricConfig[key] || [
                  key.replace(/[A-Z]/g, (letter) => ` ${letter}`).trim(),
                  money,
                  CircleDollarSign,
                  "emerald",
                  55,
                ];
              return (
                <div className="metric metric-tone" data-tone={tone} key={key}>
                  <div className="metric-head">
                    <span>{label}</span>
                    <span className="metric-icon" aria-hidden="true">
                      <Icon size={17} />
                    </span>
                  </div>
                  <strong>{format(value)}</strong>
                  <div className="metric-progress" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </DataState>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sales profitability</p>
          <h2>Sales by transaction</h2>
        </div>
        <span className="muted">Theoretical profit from completed sales</span>
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
