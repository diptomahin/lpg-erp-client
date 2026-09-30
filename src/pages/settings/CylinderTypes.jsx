import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { DataTable } from "../../components/common/DataState";
import PageHeader from "../../components/common/PageHeader";
import { apiError } from "../../services/apiClient";
import { cylinderService } from "../../services/erpService";
import { rowsOf } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";

export default function CylinderTypes({ user }) {
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [edits, setEdits] = useState({});
  const [newType, setNewType] = useState({
    name: "",
    capacityKg: "",
    filledQuantityKg: "",
  });
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["cylinder-types"],
    queryFn: () => cylinderService.list({ limit: 1000 }),
  });
  const cylinderTypes = rowsOf(query.data)
    .slice()
    .sort((left, right) => Number(left.capacityKg) - Number(right.capacityKg));
  const refreshTypes = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cylinder-types"] });
    setError("");
  };
  const createMutation = useMutation({
    mutationFn: cylinderService.create,
    onSuccess: async () => {
      await refreshTypes();
      setNewType({ name: "", capacityKg: "", filledQuantityKg: "" });
      showToast("Cylinder type added.");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => cylinderService.update(id, payload),
    onSuccess: async (_, variables) => {
      await refreshTypes();
      setEdits((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      showToast("Cylinder type updated.");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });

  return (
    <>
      <PageHeader
        title="Cylinder fill quantities"
        description="Keep cylinder label size separate from the LPG KG consumed from inventory."
        action={
          <Link className="secondary" to="/settings">
            <ArrowLeft size={16} /> Settings
          </Link>
        }
      />
      {isAdmin && (
        <form
          className="form-panel cylinder-type-create"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const capacityKg = Number(newType.capacityKg);
            const filledQuantityKg = Number(
              newType.filledQuantityKg || newType.capacityKg,
            );
            if (
              !newType.name.trim() ||
              !(capacityKg > 0) ||
              !(filledQuantityKg > 0) ||
              filledQuantityKg > capacityKg
            ) {
              setError(
                "Enter a label and valid KG values; actual fill cannot exceed nominal size.",
              );
              return;
            }
            createMutation.mutate({
              name: newType.name.trim(),
              capacityKg,
              filledQuantityKg,
              status: "active",
            });
          }}
        >
          <div className="panel-title">
            <div>
              <p className="eyebrow">New cylinder</p>
              <h2>Add a cylinder type</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Cylinder label
              <input
                required
                value={newType.name}
                onChange={(event) =>
                  setNewType({ ...newType, name: event.target.value })
                }
                placeholder="e.g. 22 KG"
              />
            </label>
            <label>
              Nominal size (KG)
              <input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={newType.capacityKg}
                onChange={(event) =>
                  setNewType({
                    ...newType,
                    capacityKg: event.target.value,
                    filledQuantityKg:
                      newType.filledQuantityKg || event.target.value,
                  })
                }
              />
            </label>
            <label>
              Actual fill (KG)
              <input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={newType.filledQuantityKg}
                onChange={(event) =>
                  setNewType({
                    ...newType,
                    filledQuantityKg: event.target.value,
                  })
                }
              />
            </label>
          </div>
          <button className="primary" disabled={createMutation.isPending}>
            <Plus size={16} />
            {createMutation.isPending ? "Adding..." : "Add cylinder type"}
          </button>
        </form>
      )}
      {!isAdmin && (
        <div className="form-error">
          Only administrators can change cylinder fill quantities.
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <DataTable
        query={query}
        rows={cylinderTypes}
        columns={[
          "Cylinder label",
          "Nominal size",
          "Actual LPG fill",
          "Status",
          "",
        ]}
        render={(row) => {
          const id = row._id || row.id;
          const values = {
            name: row.name,
            capacityKg: row.capacityKg,
            filledQuantityKg: row.filledQuantityKg ?? row.capacityKg,
            ...edits[id],
          };
          const validValues =
            values.name.trim() &&
            Number(values.capacityKg) > 0 &&
            Number(values.filledQuantityKg) > 0 &&
            Number(values.filledQuantityKg) <= Number(values.capacityKg);
          return (
            <tr key={id}>
              <td>
                <input
                  aria-label={`Cylinder label for ${row.name}`}
                  value={values.name}
                  disabled={!isAdmin}
                  onChange={(event) =>
                    setEdits({
                      ...edits,
                      [id]: { ...values, name: event.target.value },
                    })
                  }
                />
              </td>
              <td>
                <label className="inline-number-field">
                  <span className="sr-only">Nominal size for {row.name}</span>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={values.capacityKg}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setEdits({
                        ...edits,
                        [id]: { ...values, capacityKg: event.target.value },
                      })
                    }
                  />
                  <span>KG</span>
                </label>
              </td>
              <td>
                <label className="inline-number-field">
                  <span className="sr-only">
                    Actual LPG fill for {row.name}
                  </span>
                  <input
                    type="number"
                    min="0.001"
                    max={values.capacityKg}
                    step="0.001"
                    value={values.filledQuantityKg}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setEdits({
                        ...edits,
                        [id]: {
                          ...values,
                          filledQuantityKg: event.target.value,
                        },
                      })
                    }
                  />
                  <span>KG</span>
                </label>
              </td>
              <td>{row.status || "active"}</td>
              <td>
                {isAdmin && (
                  <button
                    type="button"
                    className="icon-button"
                    disabled={
                      updateMutation.isPending ||
                      !validValues ||
                      (values.name === row.name &&
                        Number(values.capacityKg) === Number(row.capacityKg) &&
                        Number(values.filledQuantityKg) ===
                          Number(row.filledQuantityKg ?? row.capacityKg))
                    }
                    onClick={() =>
                      updateMutation.mutate({
                        id,
                        payload: {
                          name: values.name.trim(),
                          capacityKg: Number(values.capacityKg),
                          filledQuantityKg: Number(values.filledQuantityKg),
                        },
                      })
                    }
                    aria-label={`Save cylinder type ${row.name}`}
                    title="Save cylinder type"
                  >
                    <Save size={16} />
                  </button>
                )}
              </td>
            </tr>
          );
        }}
      />
      <p className="muted">
        Existing cylinder types without a saved fill value continue to use their
        nominal size until you save a different actual fill.
      </p>
    </>
  );
}
