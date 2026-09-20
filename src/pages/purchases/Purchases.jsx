import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListPage from "../../components/common/ListPage";
import { apiError } from "../../services/apiClient";
import { purchaseService, supplierService } from "../../services/erpService";
import { DataState } from "../../components/common/DataState";
import { kilos, mapById, money, rowsOf } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";
import { today } from "../../utils/dates";

export function Purchases() {
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.list({ limit: 1000 }),
  });
  const supplierMap = mapById(suppliers.data);

  return (
    <ListPage
      type="purchases"
      service={purchaseService}
      title="Purchases"
      description="Bulk LPG procurement and supplier transactions."
      action={
        <Link className="primary" to="/purchases/new">
          <Plus size={17} /> New purchase
        </Link>
      }
      filters={[{ key: "purchaseDate", label: "Date", type: "date" }]}
      columns={[
        "Purchase",
        "Supplier",
        "Date",
        "Quantity",
        "Total cost",
        "Due",
        "Status",
      ]}
      render={(row) => {
        const supplier = supplierMap[String(row.supplier)] || {};
        const due = row.totalDue ?? row.dueAmount ?? row.due ?? 0;

        return (
          <tr key={row._id || row.id}>
            <td className="strong">
              <Link to={`/purchases/${row._id || row.id}`}>
                {row.purchaseNumber}
              </Link>
            </td>
            <td>{supplier.name || row.supplierName || "-"}</td>
            <td>
              {row.purchaseDate
                ? new Date(row.purchaseDate).toLocaleDateString()
                : "-"}
            </td>
            <td>
              {row.quantityTon} TON / {kilos(row.quantityKg)}
            </td>
            <td>{money(row.totalCost)}</td>
            <td>{money(due)}</td>
            <td>
              <span className="badge success">{row.status || "COMPLETED"}</span>
            </td>
          </tr>
        );
      }}
    />
  );
}

export function PurchaseForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.list({ limit: 100 }),
  });

  const [form, setForm] = useState({
    supplier: "",
    quantityUnit: "kg",
    quantity: "",
    purchaseRatePerKg: "",
    totalPaid: "",
    purchaseDate: today(),
    notes: "",
  });

  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => purchaseService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      showToast("Purchase created successfully.");
      navigate("/purchases");
    },
    onError: (err) => setError(apiError(err)),
  });

  const quantityKg =
    Number(form.quantity || 0) * (form.quantityUnit === "ton" ? 1000 : 1);
  const total = quantityKg * Number(form.purchaseRatePerKg || 0);
  const selectedSupplier = rowsOf(suppliers.data).find(
    (supplier) => String(supplier._id || supplier.id) === String(form.supplier),
  );
  const currentPayable = Number(
    selectedSupplier?.totalDue ?? selectedSupplier?.existingPayable ?? 0,
  );
  const currentAdvance = Number(selectedSupplier?.advanceBalance || 0);
  const initialPayment = Number(form.totalPaid || 0);
  const projectedAdvance = Math.max(
    0,
    currentAdvance - Math.max(0, total - initialPayment),
  );
  const appliedAdvance = currentAdvance - projectedAdvance;
  const projectedPayable = Math.max(
    0,
    currentPayable + total - initialPayment - appliedAdvance,
  );

  const submitPayload = {
    supplier: form.supplier,
    ...(form.quantityUnit === "ton"
      ? { quantityTon: Number(form.quantity) }
      : { quantityKg: Number(form.quantity) }),
    purchaseRatePerKg: Number(form.purchaseRatePerKg),
    totalPaid: Number(form.totalPaid || 0),
    purchaseDate: form.purchaseDate,
    notes: form.notes.trim(),
  };

  return (
    <>
      <PageHeader
        title="New purchase"
        description="Record a delivery in KG or TON. The backend normalizes the authoritative KG batch."
      />
      <form
        className="form-panel narrow-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(submitPayload);
        }}
      >
        <h2>Purchase details</h2>

        <label>
          Supplier
          <select
            required
            value={form.supplier}
            onChange={(event) =>
              setForm({ ...form, supplier: event.target.value })
            }
          >
            <option value="">Select supplier</option>
            {rowsOf(suppliers.data).map((row) => (
              <option key={row._id || row.id} value={row._id || row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {selectedSupplier && (
          <div className="customer-balance-callout">
            <div>
              <span>Current payable</span>
              <strong
                className={
                  currentPayable > 0 ? "balance-payable" : "balance-clear"
                }
              >
                {money(currentPayable)}
              </strong>
            </div>
            <div>
              <span>Current advance</span>
              <strong className="supplier-advance-amount">
                {currentAdvance > 0 ? `+${money(currentAdvance)}` : "-"}
              </strong>
            </div>
            <div className="customer-balance-projection">
              <span>After this purchase</span>
              <strong>
                Payable {money(projectedPayable)}
                {projectedAdvance > 0
                  ? ` · Advance +${money(projectedAdvance)}`
                  : ""}
              </strong>
            </div>
          </div>
        )}

        <div className="form-grid">
          <label>
            Quantity unit
            <select
              value={form.quantityUnit}
              onChange={(event) =>
                setForm({
                  ...form,
                  quantityUnit: event.target.value,
                  quantity: "",
                })
              }
            >
              <option value="kg">Kilograms (KG)</option>
              <option value="ton">Tons (TON)</option>
            </select>
          </label>

          <label>
            Quantity in {form.quantityUnit === "ton" ? "TON" : "KG"}
            <input
              type="number"
              min="0.001"
              step="0.001"
              required
              value={form.quantity}
              onChange={(event) =>
                setForm({ ...form, quantity: event.target.value })
              }
            />
            <small className="muted">{kilos(quantityKg)} normalized</small>
          </label>

          <label>
            Purchase rate per KG
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.purchaseRatePerKg}
              onChange={(event) =>
                setForm({ ...form, purchaseRatePerKg: event.target.value })
              }
            />
          </label>

          <label>
            Initial payment
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.totalPaid}
              onChange={(event) =>
                setForm({ ...form, totalPaid: event.target.value })
              }
            />
            <span className="amount-preview">
              {money(Number(form.totalPaid || 0))}
            </span>
          </label>
        </div>

        <label>
          Purchase date
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(event) =>
              setForm({ ...form, purchaseDate: event.target.value })
            }
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

        <div className="submit-panel">
          <div className="summary-row">
            <span>Preview total cost</span>
            <strong>{money(total)}</strong>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create purchase"}{" "}
            <ArrowUpRight size={17} />
          </button>
        </div>
      </form>
    </>
  );
}

export function PurchaseDetail() {
  const id = useLocation().pathname.split("/").pop();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem("lpg_user") || "null");
  const query = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => purchaseService.get(id),
  });
  const purchase = query.data?.purchase || query.data || {};
  const [actualQuantityKg, setActualQuantityKg] = useState("");
  const [error, setError] = useState("");
  const quantity = Number(actualQuantityKg || 0);
  const estimatedQuantityKg = Number(
    purchase.estimatedQuantityKg || purchase.quantityKg || 0,
  );
  const confirmedQuantityKg = Number(
    purchase.actualQuantityKg ||
      (purchase.quantityStatus === "confirmed" ? purchase.quantityKg : 0),
  );
  const ratePerKg = Number(purchase.purchaseRatePerKg || 0);
  const previewTotal = quantity * ratePerKg;
  const previewDue = Math.max(
    0,
    previewTotal - Number(purchase.totalPaid || 0),
  );
  const mutation = useMutation({
    mutationFn: () =>
      purchaseService.confirmQuantity(id, { actualQuantityKg: quantity }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase", id] }),
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      ]);
      setActualQuantityKg("");
      setError("");
      showToast("Actual purchase quantity confirmed.");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });

  return (
    <>
      <PageHeader
        title={purchase.purchaseNumber || "Purchase details"}
        description="Review the estimated delivery and confirm the supplier's actual KG."
        action={
          <Link className="secondary" to="/purchases">
            Back to purchases
          </Link>
        }
      />
      <DataState query={query}>
        <div className="detail-grid">
          <section className="form-panel">
            <p className="eyebrow">Purchase record</p>
            <h2>{purchase.supplier?.name || "Supplier"}</h2>
            <div className="summary-line">
              <span>Estimated quantity</span>
              <strong>{kilos(estimatedQuantityKg)}</strong>
            </div>
            <div className="summary-line">
              <span>Actual quantity</span>
              <strong>
                {confirmedQuantityKg
                  ? kilos(confirmedQuantityKg)
                  : "Not confirmed"}
              </strong>
            </div>
            <div className="summary-line">
              <span>Purchase rate / KG</span>
              <strong>{money(ratePerKg)}</strong>
            </div>
            <div className="summary-line">
              <span>Current total</span>
              <strong>{money(purchase.totalCost)}</strong>
            </div>
            <div className="summary-line">
              <span>Current due</span>
              <strong>{money(purchase.totalDue)}</strong>
            </div>
            <div className="summary-line">
              <span>Quantity status</span>
              <strong>{purchase.quantityStatus || "estimated"}</strong>
            </div>
          </section>
          <form
            className="form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              if (!(quantity > 0)) {
                setError("Enter the actual quantity in KG.");
                return;
              }
              mutation.mutate();
            }}
          >
            <p className="eyebrow">Reconciliation</p>
            <h2>Confirm actual quantity</h2>
            <label>
              Actual quantity in KG
              <input
                type="number"
                min="0.001"
                step="0.001"
                required
                value={actualQuantityKg}
                onChange={(event) => setActualQuantityKg(event.target.value)}
              />
            </label>
            {actualQuantityKg && (
              <div className="customer-balance-callout">
                <div>
                  <span>Updated total cost</span>
                  <strong>{money(previewTotal)}</strong>
                </div>
                <div>
                  <span>Updated due</span>
                  <strong>{money(previewDue)}</strong>
                </div>
              </div>
            )}
            {user?.role !== "admin" && (
              <div className="form-error">
                Only administrators can confirm quantities because this changes
                supplier payables.
              </div>
            )}
            {error && <div className="form-error">{error}</div>}
            <button
              className="primary"
              disabled={user?.role !== "admin" || mutation.isPending}
            >
              {mutation.isPending ? "Confirming..." : "Confirm actual quantity"}
              <ArrowUpRight size={17} />
            </button>
          </form>
        </div>
      </DataState>
    </>
  );
}
