import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, BriefcaseBusiness, HandCoins, Plus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataState";
import { apiError } from "../../services/apiClient";
import { salaryService } from "../../services/erpService";
import { money, rowsOf } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";
import { today } from "../../utils/dates";

const upcomingPartnerFeatureText =
  "Feature not implemented yet. Partner profit-share management will be released in a future version. For now, only employee salary tracking is available in this section.";

const defaultPersonForm = () => ({
  name: "",
  phone: "",
  email: "",
  isEmployee: true,
  isPartner: false,
  partnerSharePercent: "",
  monthlySalary: "",
  notes: "",
});

export default function Salary({ user }) {
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const people = useQuery({
    queryKey: ["salary-people"],
    queryFn: () => salaryService.people({ page: 1, limit: 100 }),
  });
  const salaries = useQuery({
    queryKey: ["salary-payments"],
    queryFn: () => salaryService.salaries({ page: 1, limit: 20 }),
  });
  const [personForm, setPersonForm] = useState(defaultPersonForm());
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    person: "",
    amount: "",
    period: "",
    paymentDate: today(),
    paymentMethod: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [shareForm, setShareForm] = useState({
    person: "",
    amount: "",
    period: "",
    paymentDate: today(),
    paymentMethod: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["salary-people"] }),
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["profit-shares"] }),
      queryClient.invalidateQueries({ queryKey: ["report"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: ({ kind, payload }) => {
      if (kind === "person") return salaryService.createPerson(payload);
      if (kind === "person-edit")
        return salaryService.updatePerson(payload.id, payload.data);
      if (kind === "salary") return salaryService.createSalary(payload);
      return salaryService.createProfitShare(payload);
    },
    onSuccess: async (_, variables) => {
      await refresh();
      setError("");
      setModal(null);
      setEditingPersonId(null);
      setPersonForm(defaultPersonForm());
      showToast(
        variables.kind === "person"
          ? "Person created successfully."
          : variables.kind === "person-edit"
            ? "Employee updated successfully."
            : variables.kind === "salary"
              ? "Salary payment recorded successfully."
              : "Profit share recorded successfully.",
      );
    },
    onError: (requestError) => setError(apiError(requestError)),
  });
  const peopleRows = rowsOf(people.data);
  const employees = peopleRows.filter((person) => person.isEmployee);
  const partners = peopleRows.filter((person) => person.isPartner);
  const salaryByPerson = new Map();
  for (const payment of rowsOf(salaries.data || [])) {
    const personId =
      typeof payment.person === "object"
        ? payment.person?._id || payment.person?.id
        : payment.person;
    if (!personId) continue;
    const value = Number(payment.amount || 0);
    const paymentDate = payment.paymentDate
      ? new Date(payment.paymentDate)
      : null;
    const isCurrentMonth =
      paymentDate &&
      paymentDate.getFullYear() === new Date().getFullYear() &&
      paymentDate.getMonth() === new Date().getMonth();
    if (!isCurrentMonth) continue;
    salaryByPerson.set(personId, (salaryByPerson.get(personId) || 0) + value);
  }

  const openPersonModal = (person = null) => {
    if (person) {
      setEditingPersonId(person._id || person.id);
      setPersonForm({
        name: person.name || "",
        phone: person.phone || "",
        email: person.email || "",
        isEmployee: Boolean(person.isEmployee),
        isPartner: Boolean(person.isPartner),
        partnerSharePercent: person.partnerSharePercent ?? "",
        monthlySalary:
          person.monthlySalary ??
          person.fixedMonthlySalary ??
          person.salaryAmount ??
          person.salary ??
          "",
        notes: person.notes || "",
      });
    } else {
      setEditingPersonId(null);
      setPersonForm(defaultPersonForm());
    }
    setModal("person");
  };

  const submitPerson = (event) => {
    event.preventDefault();
    const payload = {
      ...personForm,
      name: personForm.name.trim(),
      partnerSharePercent: Number(personForm.partnerSharePercent || 0),
      monthlySalary: Number(personForm.monthlySalary || 0),
      notes: personForm.notes.trim(),
    };
    if (editingPersonId) {
      mutation.mutate({
        kind: "person-edit",
        payload: { id: editingPersonId, data: payload },
      });
      return;
    }
    mutation.mutate({
      kind: "person",
      payload,
    });
  };

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Salary"
          description="Salary and partner distributions."
        />
        <div className="state error">
          Only administrators can manage salary and profit-share payments.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Salary"
        description="Manage employees, partners, salary payments, and profit distributions separately from operating expenses."
      />
      <div className="action-row">
        <button className="primary" onClick={() => openPersonModal()}>
          <BriefcaseBusiness size={17} /> Add person
        </button>
        <button className="secondary" onClick={() => setModal("salary")}>
          <HandCoins size={17} /> Record salary
        </button>
        <button
          className="secondary"
          onClick={() => setModal("partner-locked")}
        >
          <ArrowUpRight size={17} /> Record profit share
        </button>
      </div>
      {error && <div className="form-error salary-error">{error}</div>}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-title modal-head">
              <div>
                <p className="eyebrow">
                  {modal === "person"
                    ? "People"
                    : modal === "salary"
                      ? "Salary"
                      : modal === "partner-locked"
                        ? "Partner feature"
                        : "Distribution"}
                </p>
                <h2>
                  {modal === "person"
                    ? editingPersonId
                      ? "Edit employee or partner"
                      : "Add employee or partner"
                    : modal === "salary"
                      ? "Record employee salary"
                      : modal === "partner-locked"
                        ? "Partner profit share"
                        : "Record partner profit share"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            {modal === "partner-locked" ? (
              <div className="state error">
                <strong>Feature not implemented yet.</strong>
                <span>{upcomingPartnerFeatureText}</span>
              </div>
            ) : modal === "person" ? (
              <form onSubmit={submitPerson}>
                <label>
                  Name
                  <input
                    required
                    value={personForm.name}
                    onChange={(event) =>
                      setPersonForm({ ...personForm, name: event.target.value })
                    }
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Phone
                    <input
                      value={personForm.phone}
                      onChange={(event) =>
                        setPersonForm({
                          ...personForm,
                          phone: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={personForm.email}
                      onChange={(event) =>
                        setPersonForm({
                          ...personForm,
                          email: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="setting-row compact-row">
                  <label className="check-control">
                    <input
                      type="checkbox"
                      checked={personForm.isEmployee}
                      onChange={(event) =>
                        setPersonForm({
                          ...personForm,
                          isEmployee: event.target.checked,
                        })
                      }
                    />{" "}
                    Employee
                  </label>
                  <label className="check-control">
                    <input
                      type="checkbox"
                      checked={personForm.isPartner}
                      onChange={(event) =>
                        setPersonForm({
                          ...personForm,
                          isPartner: event.target.checked,
                        })
                      }
                    />{" "}
                    Partner
                  </label>
                </div>
                {personForm.isPartner && (
                  <label>
                    Partner share %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={personForm.partnerSharePercent}
                      onChange={(event) =>
                        setPersonForm({
                          ...personForm,
                          partnerSharePercent: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                <label>
                  Monthly salary
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={personForm.monthlySalary}
                    onChange={(event) =>
                      setPersonForm({
                        ...personForm,
                        monthlySalary: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={personForm.notes}
                    onChange={(event) =>
                      setPersonForm({
                        ...personForm,
                        notes: event.target.value,
                      })
                    }
                  />
                </label>
                <button className="primary full" disabled={mutation.isPending}>
                  <Plus size={17} />{" "}
                  {editingPersonId ? "Save changes" : "Add person"}
                </button>
              </form>
            ) : (
              <PayoutForm
                form={modal === "salary" ? salaryForm : shareForm}
                setForm={modal === "salary" ? setSalaryForm : setShareForm}
                people={modal === "salary" ? employees : partners}
                label={modal === "salary" ? "Employee" : "Partner"}
                onSubmit={(payload) =>
                  mutation.mutate({
                    kind: modal === "salary" ? "salary" : "share",
                    payload,
                  })
                }
                pending={mutation.isPending}
                onCancel={() => setModal(null)}
              />
            )}
          </div>
        </div>
      )}
      <div className="section-heading">
        <div>
          <p className="eyebrow">People register</p>
          <h2>Employees and partners</h2>
        </div>
      </div>
      <DataTable
        query={people}
        columns={[
          "Name",
          "Role",
          "Fixed salary",
          "Paid this month",
          "Status",
          "Action",
        ]}
        render={(person) => {
          const personId = person._id || person.id;
          const monthlySalary = Number(
            person.monthlySalary ?? person.fixedMonthlySalary ?? 0,
          );
          const paidThisMonth = Number(salaryByPerson.get(personId) || 0);

          return (
            <tr key={personId}>
              <td className="strong">{person.name}</td>
              <td>
                {[
                  person.isEmployee && "Employee",
                  person.isPartner && "Partner",
                ]
                  .filter(Boolean)
                  .join(" / ") || "-"}
              </td>
              <td>{person.isEmployee ? money(monthlySalary) : "-"}</td>
              <td>{money(paidThisMonth)}</td>
              <td>
                <span className="badge success">
                  {person.status || "active"}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => openPersonModal(person)}
                >
                  Edit
                </button>
              </td>
            </tr>
          );
        }}
      />
      <div className="section-heading">
        <div>
          <p className="eyebrow">Payment history</p>
          <h2>Salary payments</h2>
        </div>
      </div>
      <DataTable
        query={salaries}
        columns={[
          "Employee",
          "Period",
          "Date",
          "Amount",
          "Method",
          "Reference",
        ]}
        render={(row) => (
          <tr key={row._id || row.id}>
            <td className="strong">{row.person?.name || "-"}</td>
            <td>{row.period || "-"}</td>
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
      <div className="section-heading">
        <div>
          <p className="eyebrow">Partner history</p>
          <h2>Profit-share payments</h2>
        </div>
      </div>
      <div className="state error">
        <strong>Feature not implemented yet.</strong>
        <span>{upcomingPartnerFeatureText}</span>
      </div>
    </>
  );
}

function PayoutForm({
  form,
  setForm,
  people,
  label,
  onSubmit,
  pending,
  onCancel,
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          person: form.person,
          amount: Number(form.amount),
          period: form.period.trim(),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          reference: form.reference.trim(),
          notes: form.notes.trim(),
        });
      }}
    >
      <label>
        {label}
        <select
          required
          value={form.person}
          onChange={(event) => setForm({ ...form, person: event.target.value })}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {people.map((person) => (
            <option
              key={person._id || person.id}
              value={person._id || person.id}
            >
              {person.name}
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
        </label>
        <label>
          Period
          <input
            placeholder="September 2026"
            value={form.period}
            onChange={(event) =>
              setForm({ ...form, period: event.target.value })
            }
          />
        </label>
      </div>
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
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
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
        />
      </label>
      <div className="modal-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="primary" disabled={pending}>
          <ArrowUpRight size={17} /> Record payment
        </button>
      </div>
    </form>
  );
}
