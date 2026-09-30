import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CircleDollarSign,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListPage from "../../components/common/ListPage";
import ActionDialog from "../../components/common/ActionDialog";
import { apiError } from "../../services/apiClient";
import { supplierService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";

export default function Suppliers() {
  const [dialog, setDialog] = useState(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) =>
      active
        ? supplierService.update(id, { status: "active" })
        : supplierService.remove(id),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast(
        `Supplier ${variables.active ? "reactivated" : "deactivated"} successfully.`,
      );
    },
    onError: (requestError) => showToast(apiError(requestError)),
  });

  return (
    <>
      <ListPage
        type="suppliers"
        service={supplierService}
        title="Suppliers"
        description="Track supply partners and outstanding payables."
        action={
          <Link className="primary" to="/suppliers/new">
            <Plus size={17} /> Add supplier
          </Link>
        }
        columns={[
          "Name",
          "Company",
          "Phone",
          "Payable",
          "Advance",
          "Status",
          "",
        ]}
        render={(row) => {
          const due = Math.max(
            Number(row.existingPayable || 0),
            Number(row.totalDue || 0),
          );
          const advance = Number(row.advanceBalance || 0);
          const canDeactivate =
            row.status !== "inactive" && due <= 0 && advance <= 0;

          return (
            <tr key={row._id || row.id}>
              <td className="strong">
                <Link to={`/suppliers/${row._id || row.id}`}>{row.name}</Link>
              </td>
              <td>{row.companyName || "-"}</td>
              <td>{row.phone || "-"}</td>
              <td className="strong">
                {money(row.existingPayable ?? row.totalDue ?? 0)}
              </td>
              <td className="supplier-advance-amount">
                {Number(row.advanceBalance || 0) > 0
                  ? `+${money(row.advanceBalance)}`
                  : "-"}
              </td>
              <td>
                <span className="badge success">{row.status || "ACTIVE"}</span>
              </td>
              <td>
                <div className="row-actions">
                  <Link
                    className="icon-button"
                    to={`/suppliers/${row._id || row.id}/payments`}
                    aria-label={`Make payment to ${row.name}`}
                    title="Make supplier payment"
                  >
                    <CircleDollarSign size={16} />
                  </Link>
                  <Link
                    to={`/suppliers/${row._id || row.id}/edit`}
                    aria-label={`Edit ${row.name}`}
                    title="Edit supplier"
                    className="icon-button"
                  >
                    <Edit3 size={16} />
                  </Link>
                  <button
                    type="button"
                    className={`icon-button ${
                      row.status !== "inactive" && !canDeactivate
                        ? "is-disabled"
                        : ""
                    }`}
                    disabled={statusMutation.isPending}
                    onClick={() => {
                      if (row.status === "inactive") {
                        setDialog({
                          title: `Reactivate ${row.name}?`,
                          message:
                            "This supplier will be available for new purchases again.",
                          confirmLabel: "Reactivate",
                          onConfirm: () => {
                            setDialog(null);
                            statusMutation.mutate({
                              id: row._id || row.id,
                              active: true,
                            });
                          },
                        });
                        return;
                      }
                      if (!canDeactivate) {
                        setDialog({
                          kind: "blocked",
                          title: "Supplier cannot be deactivated",
                          message: `Clear the outstanding payable (${money(due)}) and advance (${money(advance)}) before deactivating this supplier.`,
                        });
                        return;
                      }
                      setDialog({
                        title: `Deactivate ${row.name}?`,
                        message:
                          "This supplier will remain visible in history but cannot be used for new purchases.",
                        confirmLabel: "Deactivate",
                        onConfirm: () => {
                          setDialog(null);
                          statusMutation.mutate({
                            id: row._id || row.id,
                            active: false,
                          });
                        },
                      });
                    }}
                    aria-label={`${row.status === "inactive" ? "Reactivate" : "Deactivate"} ${row.name}`}
                    title={
                      row.status === "inactive"
                        ? "Reactivate supplier"
                        : canDeactivate
                          ? "Deactivate supplier"
                          : "Cannot deactivate: clear payable and advance first"
                    }
                  >
                    {row.status === "inactive" ? (
                      <RotateCcw size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          );
        }}
      />
      <ActionDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onConfirm={dialog?.onConfirm}
      />
    </>
  );
}

export function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    phone: "",
    address: "",
    existingPayable: 0,
    notes: "",
  });
  const [error, setError] = useState("");
  const existing = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => supplierService.get(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing.data) return;
    const timer = window.setTimeout(() => {
      setForm({
        name: existing.data.name || "",
        companyName: existing.data.companyName || "",
        phone: existing.data.phone || "",
        address: existing.data.address || "",
        notes: existing.data.notes || "",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [existing.data]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? supplierService.update(id, payload)
        : supplierService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast(`Supplier ${isEdit ? "updated" : "created"} successfully.`);
      navigate("/suppliers");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });

  const fields = [
    ["name", "Name", "text"],
    ["companyName", "Company name", "text"],
    ["phone", "Phone", "text"],
    ["address", "Address", "text"],
    ...(isEdit ? [] : [["existingPayable", "Existing payable", "number"]]),
    ["notes", "Notes", "text"],
  ];

  return (
    <>
      <PageHeader
        title={`${isEdit ? "Edit" : "New"} supplier`}
        description="Maintain supplier information without changing calculated payables."
        action={
          <Link className="secondary" to="/suppliers">
            Cancel
          </Link>
        }
      />
      <form
        className="form-panel narrow-form"
        onSubmit={(event) => {
          event.preventDefault();
          const payload = {
            name: form.name.trim(),
            companyName: form.companyName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            notes: form.notes.trim(),
          };
          if (isEdit) {
            mutation.mutate(payload);
          } else {
            payload.existingPayable = Number(form.existingPayable || 0);
            mutation.mutate(payload);
          }
        }}
      >
        <h2>Basic information</h2>
        {fields.map(([field, label, inputType]) => (
          <label key={field}>
            {label}
            <input
              type={inputType}
              min={inputType === "number" ? "0" : undefined}
              required={field === "name"}
              value={form[field]}
              onChange={(event) =>
                setForm({ ...form, [field]: event.target.value })
              }
            />
            {field === "existingPayable" && form[field] !== "" && (
              <span className="amount-preview">
                Amount entered: {money(form[field])}
              </span>
            )}
          </label>
        ))}
        {error && <div className="form-error">{error}</div>}
        <button className="primary" disabled={mutation.isPending}>
          {mutation.isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save changes"
              : "Create supplier"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </>
  );
}
