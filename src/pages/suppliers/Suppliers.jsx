import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CircleDollarSign, Edit3, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListPage from "../../components/common/ListPage";
import { apiError } from "../../services/apiClient";
import { supplierService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";

export default function Suppliers() {
  return (
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
      columns={["Name", "Company", "Phone", "Payable", "Advance", "Status", ""]}
      render={(row) => (
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
          </td>
        </tr>
      )}
    />
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
