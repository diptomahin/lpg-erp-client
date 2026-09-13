import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListPage from "../../components/common/ListPage";
import { apiError } from "../../services/apiClient";
import { purchaseService, supplierService } from "../../services/erpService";
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
            <td className="strong">{row.purchaseNumber}</td>
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
    additionalCost: "",
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
  const total =
    quantityKg * Number(form.purchaseRatePerKg || 0) +
    Number(form.additionalCost || 0);

  const submitPayload = {
    supplier: form.supplier,
    ...(form.quantityUnit === "ton"
      ? { quantityTon: Number(form.quantity) }
      : { quantityKg: Number(form.quantity) }),
    purchaseRatePerKg: Number(form.purchaseRatePerKg),
    additionalCost: Number(form.additionalCost || 0),
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
            Additional cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.additionalCost}
              onChange={(event) =>
                setForm({ ...form, additionalCost: event.target.value })
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
