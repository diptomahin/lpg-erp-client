import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Edit3, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListPage from "../../components/common/ListPage";
import { apiError } from "../../services/apiClient";
import { customerService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";

export function Customers() {
  return (
    <ListPage
      type="customers"
      service={customerService}
      title="Customers"
      description="Manage relationships and customer balances."
      action={
        <Link className="primary" to="/customers/new">
          <Plus size={17} /> Add customer
        </Link>
      }
      columns={["Name", "Company", "Phone", "Receivable", "Status", ""]}
      render={(row) => (
        <tr key={row._id || row.id}>
          <td className="strong">{row.name}</td>
          <td>{row.companyName || "-"}</td>
          <td>{row.phone || "-"}</td>
          <td className="strong">
            {money(row.totalDue ?? row.existingReceivable ?? 0)}
          </td>
          <td>
            <span className="badge success">{row.status || "ACTIVE"}</span>
          </td>
          <td>
            <Link
              className="icon-button"
              to={`/customers/${row._id || row.id}/edit`}
              aria-label={`Edit ${row.name}`}
              title="Edit customer"
            >
              <Edit3 size={16} />
            </Link>
          </td>
        </tr>
      )}
    />
  );
}

export function CustomerForm() {
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
    existingReceivable: 0,
    creditLimit: 0,
    notes: "",
  });
  const [error, setError] = useState("");
  const existing = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customerService.get(id),
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
        creditLimit: existing.data.creditLimit || 0,
        notes: existing.data.notes || "",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [existing.data]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? customerService.update(id, payload)
        : customerService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast(`Customer ${isEdit ? "updated" : "created"} successfully.`);
      navigate("/customers");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });

  const fields = [
    ["name", "Name", "text"],
    ["companyName", "Company name", "text"],
    ["phone", "Phone", "text"],
    ["address", "Address", "text"],
    ...(isEdit
      ? []
      : [["existingReceivable", "Existing receivable", "number"]]),
    ["creditLimit", "Credit limit", "number"],
    ["notes", "Notes", "text"],
  ];

  return (
    <>
      <PageHeader
        title={`${isEdit ? "Edit" : "New"} customer`}
        description="Maintain customer information without changing calculated receivables."
        action={
          <Link className="secondary" to="/customers">
            Cancel
          </Link>
        }
      />
      <form
        className="form-panel narrow-form"
        onSubmit={(event) => {
          event.preventDefault();
          const payload = { ...form };
          if (isEdit) {
            delete payload.existingReceivable;
          } else {
            payload.existingReceivable = Number(
              payload.existingReceivable || 0,
            );
          }
          payload.creditLimit = Number(payload.creditLimit || 0);
          mutation.mutate(payload);
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
              : "Create customer"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </>
  );
}
