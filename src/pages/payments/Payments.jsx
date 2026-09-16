import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataState";
import { apiError } from "../../services/apiClient";
import {
  customerService,
  paymentService,
  purchaseService,
  saleService,
  supplierService,
} from "../../services/erpService";
import { money, rowsOf } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";
import { today } from "../../utils/dates";

export default function Payments({ type }) {
  const customer = type === "customer";
  const { supplierId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const service = customer
    ? paymentService.customerList
    : paymentService.supplierList;
  const create = customer
    ? paymentService.customerCreate
    : paymentService.supplierCreate;
  const accounts = useQuery({
    queryKey: [customer ? "customers" : "suppliers"],
    queryFn: () =>
      (customer ? customerService.list : supplierService.list)({ limit: 1000 }),
  });
  const transactions = useQuery({
    queryKey: [customer ? "sales" : "purchases", "payment-options"],
    queryFn: () =>
      (customer ? saleService.list : purchaseService.list)({ limit: 1000 }),
  });
  const query = useQuery({
    queryKey: [`${type}-payments`],
    queryFn: () => service({ page: 1, limit: 20 }),
  });
  const [form, setForm] = useState({
    account: supplierId || "",
    transaction: "",
    paymentType: "sale",
    amount: "",
    paymentDate: today(),
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: create,
    onSuccess: () => {
      setForm({
        account: "",
        transaction: "",
        paymentType: "sale",
        amount: "",
        paymentDate: today(),
        paymentMethod: "cash",
        reference: "",
        notes: "",
      });
      setError("");
      queryClient.invalidateQueries({ queryKey: [`${type}-payments`] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      showToast(
        `${customer ? "Customer" : "Supplier"} payment recorded successfully.`,
      );
    },
    onError: (requestError) => setError(apiError(requestError)),
  });
  const accountRows = rowsOf(accounts.data);
  const transactionRows = rowsOf(transactions.data);
  const accountField = customer ? "customer" : "supplier";
  const transactionField = customer ? "sale" : "purchase";
  const selectedAccount = accountRows.find(
    (row) => String(row._id || row.id) === String(form.account),
  );
  const availableTransactions = transactionRows.filter((row) => {
    if (!form.account) return false;
    const linkedAccount = row[accountField];
    const linkedAccountId =
      linkedAccount?._id || linkedAccount?.id || linkedAccount;
    return String(linkedAccountId || "") === String(form.account);
  });
  const visibleRows = supplierId
    ? rowsOf(query.data).filter((row) => {
        const linkedSupplier = row.supplier;
        const linkedSupplierId =
          linkedSupplier?._id || linkedSupplier?.id || linkedSupplier;
        return String(linkedSupplierId || "") === String(supplierId);
      })
    : undefined;

  const submit = (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      [accountField]: form.account,
      amount: Number(form.amount),
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod,
      ...(customer ? { paymentType: form.paymentType } : {}),
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    };
    if (form.transaction) payload[transactionField] = form.transaction;
    mutation.mutate(payload);
  };

  return (
    <>
      <PageHeader
        title={`${customer ? "Customer" : "Supplier"} payments`}
        description="Record and review partial, linked, and general account payments."
        action={
          supplierId ? (
            <Link className="secondary" to="/suppliers">
              Back to suppliers
            </Link>
          ) : null
        }
      />
      <div className="payment-layout">
        <form className="form-panel payment-form" onSubmit={submit}>
          <div className="panel-title">
            <div>
              <p className="eyebrow">New payment</p>
              <h2>{customer ? "Collect customer due" : "Pay supplier"}</h2>
            </div>
          </div>
          <label>
            {customer ? "Customer" : "Supplier"}
            <select
              required
              value={form.account}
              onChange={(event) =>
                setForm({
                  ...form,
                  account: event.target.value,
                  transaction: "",
                  paymentType: "sale",
                })
              }
            >
              <option value="">Select account</option>
              {accountRows.map((row) => (
                <option key={row._id || row.id} value={row._id || row.id}>
                  {row.name}
                  {row.companyName ? ` - ${row.companyName}` : ""}
                </option>
              ))}
            </select>
          </label>
          {selectedAccount && (
            <div className="due-callout">
              <span>
                {customer ? "Total customer due" : "Total supplier payable"}
              </span>
              <strong>
                {money(
                  selectedAccount.totalDue ??
                    (customer
                      ? selectedAccount.existingReceivable
                      : selectedAccount.existingPayable) ??
                    0,
                )}
              </strong>
              {customer && Number(selectedAccount.advanceBalance || 0) > 0 && (
                <small>
                  Available advance: {money(selectedAccount.advanceBalance)}
                </small>
              )}
            </div>
          )}
          {customer && (
            <label>
              Payment purpose
              <select
                value={form.paymentType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    paymentType: event.target.value,
                    transaction: "",
                  })
                }
              >
                <option value="sale">Collect current due</option>
                <option
                  value="advance"
                  disabled={Number(selectedAccount?.totalDue || 0) > 0}
                >
                  Advance for future sales
                  {Number(selectedAccount?.totalDue || 0) > 0
                    ? " (clear due first)"
                    : ""}
                </option>
              </select>
            </label>
          )}
          <label>
            Link to {customer ? "sale" : "purchase"} (optional)
            <select
              value={form.transaction}
              disabled={customer && form.paymentType === "advance"}
              onChange={(event) =>
                setForm({ ...form, transaction: event.target.value })
              }
            >
              <option value="">General account payment</option>
              {availableTransactions.map((row) => (
                <option key={row._id || row.id} value={row._id || row.id}>
                  {row.invoiceNumber ||
                    row.saleNumber ||
                    row.purchaseNumber ||
                    row._id ||
                    row.id}
                </option>
              ))}
            </select>
          </label>
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
          <div className="form-grid">
            <label>
              Payment date
              <input
                type="date"
                required
                value={form.paymentDate}
                onChange={(event) =>
                  setForm({ ...form, paymentDate: event.target.value })
                }
              />
            </label>
            <label>
              Method
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
          </div>
          <label>
            Reference
            <input
              value={form.reference}
              onChange={(event) =>
                setForm({ ...form, reference: event.target.value })
              }
              placeholder="Receipt or transfer reference"
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
            {mutation.isPending ? "Recording..." : "Record payment"}
          </button>
        </form>
        <DataTable
          query={query}
          rows={visibleRows}
          columns={[
            "Payment",
            "Account",
            "Date",
            "Amount",
            "Method",
            "Reference",
          ]}
          render={(row) => (
            <tr key={row._id || row.id}>
              <td className="strong">{row.paymentNumber || row._id || "-"}</td>
              <td>
                {row[accountField]?.name || row[`${accountField}Name`] || "-"}
              </td>
              <td>
                {row.paymentDate
                  ? new Date(row.paymentDate).toLocaleDateString()
                  : "-"}
              </td>
              <td>{money(row.amount)}</td>
              <td>{row.paymentMethod || "-"}</td>
              <td>{row.reference || "-"}</td>
            </tr>
          )}
        />
      </div>
    </>
  );
}
