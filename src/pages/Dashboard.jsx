import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Factory,
  Plus,
  Receipt,
  Scale,
  TrendingUp,
  Wallet,
  Warehouse,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import { DataState, DataTable } from "../components/common/DataState";
import { customerService, dashboardService } from "../services/erpService";
import { kilos, mapById, money } from "../utils/formatters";

const dateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthValue = (date) => dateValue(date).slice(0, 7);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const metricConfig = {
  sales: {
    label: "Sales today",
    icon: CircleDollarSign,
    tone: "emerald",
    progress: 82,
    key: "totalSales",
  },
  lpg: {
    label: "LPG sold",
    icon: Scale,
    tone: "cyan",
    progress: 72,
    key: "totalLpgSold",
  },
  cylinders: {
    label: "Cylinders sold",
    icon: Boxes,
    tone: "violet",
    progress: 64,
    key: "totalCylindersSold",
  },
  stock: {
    label: "Current LPG stock",
    icon: Warehouse,
    tone: "amber",
    progress: 58,
    key: "currentLpgStock",
  },
  customerDue: {
    label: "Customer due",
    icon: Wallet,
    tone: "rose",
    progress: 46,
    key: "customerDue",
  },
  supplierPayable: {
    label: "Supplier payable",
    icon: Factory,
    tone: "slate",
    progress: 41,
    key: "supplierPayable",
  },
  expenses: {
    label: "Expenses today",
    icon: Receipt,
    tone: "orange",
    progress: 35,
    key: "totalExpenses",
  },
  salary: {
    label: "Salary paid",
    icon: ChartNoAxesCombined,
    tone: "indigo",
    progress: 52,
    key: "totalSalaryPaid",
  },
  profit: {
    label: "Gross profit",
    icon: TrendingUp,
    tone: "green",
    progress: 76,
    key: "grossProfit",
  },
};

const numberValue = (value) => Number(value || 0);

const cardValue = (key, value) => {
  if (key === "totalCylindersSold") {
    return `${numberValue(value).toLocaleString()} units`;
  }
  return key === "totalLpgSold" || key === "currentLpgStock"
    ? kilos(value)
    : money(value);
};

export default function Dashboard() {
  const [mode, setMode] = useState("daily");
  const [date, setDate] = useState(dateValue(new Date()));
  const [month, setMonth] = useState(monthValue(new Date()));
  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardService.summary,
  });
  const sales = useQuery({
    queryKey: ["dashboard-sales"],
    queryFn: dashboardService.recentSales,
  });
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.list({ limit: 1000 }),
  });
  const customerMap = mapById(customers.data);
  const summaryData = summary.data || {};
  const cards = Object.values(metricConfig).map((config) => ({
    ...config,
    value:
      summaryData[config.key] ??
      summaryData[config.key.replace(/^total/, "")] ??
      0,
  }));

  return (
    <>
      <PageHeader
        title={getGreeting()}
        description="Here is the pulse of your LPG operation today."
        action={
          <Link className="primary" to="/sales/new">
            <Plus size={17} /> New sale
          </Link>
        }
      />
      <div className="report-toolbar overview-toolbar">
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
      <DataState query={summary}>
        <div className="metric-grid">
          {cards.map(({ key, label, value, icon: Icon, tone, progress }) => (
            <div className="metric metric-tone" data-tone={tone} key={key}>
              <div className="metric-head">
                <span>{label}</span>
                <span className="metric-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
              </div>
              <strong>{cardValue(key, value)}</strong>
              <div className="metric-progress" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </DataState>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Recent sales</h2>
        </div>
        <Link className="text-link" to="/sales">
          View all
        </Link>
      </div>
      <DataTable
        query={sales}
        columns={[
          "Invoice",
          "Date",
          "Customer",
          "Cylinders",
          "Total",
          "Due",
          "Status",
        ]}
        render={(row) => {
          const customer =
            row.customer && typeof row.customer === "object"
              ? row.customer
              : customerMap[String(row.customer)] || {};
          return (
            <tr key={row._id || row.id}>
              <td className="strong">
                <Link to={`/sales/${row._id || row.id}`}>
                  {row.invoiceNumber || row.saleNumber || "Sale"}
                </Link>
              </td>
              <td>
                {row.saleDate
                  ? new Date(row.saleDate).toLocaleDateString()
                  : "-"}
              </td>
              <td>{customer.name || row.customerName || "-"}</td>
              <td>{row.totalCylinderCount ?? row.totalCylinders ?? "-"}</td>
              <td>{money(row.totalAmount ?? row.total ?? 0)}</td>
              <td>{money(row.totalDue ?? row.dueAmount ?? row.due ?? 0)}</td>
              <td>
                <span className="badge success">
                  {row.status || row.paymentStatus || "Completed"}
                </span>
              </td>
            </tr>
          );
        }}
      />
    </>
  );
}
