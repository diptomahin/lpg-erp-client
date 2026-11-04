import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataState } from "../../components/common/DataState";
import { apiError } from "../../services/apiClient";
import {
  expenseCategoryService,
  expenseService,
} from "../../services/erpService";
import { mapById, money, rowsOf } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";
import { today } from "../../utils/dates";

export default function Expenses() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    today().slice(0, 7),
  );
  const query = useQuery({
    queryKey: ["expenses"],
    queryFn: expenseService.listAll,
  });
  const categories = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseCategoryService.list({ limit: 100 }),
  });
  const categoryMap = mapById(categories.data);
  const [selectedYear, selectedMonthNumber] = selectedMonth
    .split("-")
    .map(Number);
  const expenses = rowsOf(query.data).filter((expense) => {
    if (!expense.expenseDate) return false;
    const date = new Date(expense.expenseDate);
    return (
      date.getFullYear() === selectedYear &&
      date.getMonth() + 1 === selectedMonthNumber
    );
  });

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track operating expenses separately from LPG inventory cost."
        action={
          <Link className="primary" to="/expenses/new">
            <Plus size={17} /> Add expense
          </Link>
        }
      />
      <div className="section-heading expense-filter-heading">
        <label className="salary-month-filter">
          Month
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <DataState query={query}>
          {expenses.length ? (
            <table>
              <thead>
                <tr>
                  {["Category", "Date", "Amount", "Method", "Description"].map(
                    (column) => (
                      <th key={column}>{column}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => {
                  const category =
                    row.category && typeof row.category === "object"
                      ? row.category
                      : categoryMap[String(row.category)] || {};
                  return (
                    <tr key={row._id || row.id}>
                      <td className="strong">
                        {category.name ||
                          row.categoryName ||
                          row.category ||
                          "-"}
                      </td>
                      <td>
                        {row.expenseDate
                          ? new Date(row.expenseDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>{money(row.amount)}</td>
                      <td>{row.paymentMethod || "-"}</td>
                      <td>{row.description || row.notes || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="state">
              No expenses found for the selected month.
            </div>
          )}
        </DataState>
      </div>
    </>
  );
}

export function ExpenseForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const categories = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseCategoryService.list({ limit: 100 }),
  });
  const [form, setForm] = useState({
    category: "",
    amount: "",
    expenseDate: today(),
    paymentMethod: "cash",
    description: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const visibleCategories = rowsOf(categories.data).filter(
    (category) => !/salary/i.test(category.name || ""),
  );
  const mutation = useMutation({
    mutationFn: (payload) => expenseService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-report"] }),
        queryClient.invalidateQueries({ queryKey: ["monthly-report"] }),
        queryClient.invalidateQueries({ queryKey: ["report"] }),
      ]);
      showToast("Expense recorded successfully.");
      navigate("/expenses");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });
  return (
    <>
      <PageHeader
        title="New expense"
        description="Record an operating expense from the documented expense categories. Salaries are managed from the Salary page."
        action={
          <Link className="secondary" to="/expenses">
            Cancel
          </Link>
        }
      />
      <form
        className="form-panel narrow-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          mutation.mutate({
            category: form.category,
            amount: Number(form.amount),
            expenseDate: form.expenseDate,
            paymentMethod: form.paymentMethod,
            description: form.description.trim(),
            notes: form.notes.trim(),
          });
        }}
      >
        <h2>Expense details</h2>
        <label>
          Category
          <select
            required
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
          >
            <option value="">Select category</option>
            {visibleCategories.map((category) => (
              <option
                key={category._id || category.id}
                value={category._id || category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
            />
            <span className="amount-preview">
              {money(Number(form.amount || 0))}
            </span>
          </label>
          <label>
            Expense date
            <input
              type="date"
              required
              value={form.expenseDate}
              onChange={(event) =>
                setForm({ ...form, expenseDate: event.target.value })
              }
            />
          </label>
        </div>
        <label>
          Payment method
          <select
            value={form.paymentMethod}
            onChange={(event) =>
              setForm({ ...form, paymentMethod: event.target.value })
            }
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>
        <label>
          Description
          <input
            required
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="Vehicle fuel"
          />
        </label>
        <label>
          Notes
          <textarea
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Recording..." : "Record expense"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </>
  );
}
