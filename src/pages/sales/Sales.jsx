import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListPage from "../../components/common/ListPage";
import { DataState } from "../../components/common/DataState";
import { apiError } from "../../services/apiClient";
import {
  customerService,
  cylinderService,
  saleService,
} from "../../services/erpService";
import { kilos, mapById, money, rowsOf } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";
import { useReportSettings } from "../../utils/useReportSettings";
import { today } from "../../utils/dates";

export function Sales() {
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.list({ limit: 1000 }),
  });
  const customerMap = mapById(customers.data);

  return (
    <ListPage
      type="sales"
      service={saleService}
      title="Sales"
      description="Cylinder-based sales and customer invoices."
      action={
        <Link className="primary" to="/sales/new">
          <Plus size={17} /> New sale
        </Link>
      }
      filters={[
        { key: "saleDate", label: "Date", type: "date" },
        {
          key: "customer",
          label: "Customer",
          type: "select",
          options: rowsOf(customers.data).map((row) => ({
            value: row._id || row.id,
            label: row.name,
          })),
        },
      ]}
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
        const customer = customerMap[String(row.customer)] || {};
        const due = row.totalDue ?? row.dueAmount ?? row.due ?? 0;

        return (
          <tr key={row._id || row.id}>
            <td className="strong">
              <Link to={`/sales/${row._id || row.id}`}>
                {row.invoiceNumber || row.saleNumber}
              </Link>
            </td>
            <td>
              {row.saleDate ? new Date(row.saleDate).toLocaleDateString() : "-"}
            </td>
            <td>{customer.name || row.customerName || "-"}</td>
            <td>
              {row.totalCylinderCount ??
                row.totalCylinders ??
                row.cylinderCount ??
                "-"}
            </td>
            <td>{money(row.totalAmount || row.total)}</td>
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

export function SaleForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const clients = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.list({ limit: 100 }),
  });
  const typesQuery = useQuery({
    queryKey: ["cylinder-types"],
    queryFn: cylinderService.list,
  });
  const types = rowsOf(typesQuery.data);
  const [form, setForm] = useState({
    customer: "",
    saleDate: today(),
    discount: 0,
    totalPaid: 0,
  });
  const [items, setItems] = useState([
    { cylinderType: "", cylinderCount: 1, pricePerCylinder: "" },
  ]);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: saleService.create,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      showToast("Sale created successfully.");
      navigate(
        `/sales/${data.sale?._id || data.sale?.id || data._id || data.id}`,
      );
    },
    onError: (err) => setError(apiError(err)),
  });
  const selected = items.map((item) => ({
    ...item,
    type: types.find((type) => (type._id || type.id) === item.cylinderType),
  }));
  const totalKg = selected.reduce(
    (sum, item) =>
      sum + (item.type?.capacityKg || 0) * Number(item.cylinderCount || 0),
    0,
  );
  const subtotal = selected.reduce(
    (sum, item) =>
      sum +
      Number(item.cylinderCount || 0) * Number(item.pricePerCylinder || 0),
    0,
  );
  const update = (index, patch) =>
    setItems(
      items.map((item, rowIndex) =>
        rowIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <>
      <PageHeader
        title="New sale"
        description="Build an invoice from complete filled cylinders. Inventory and FIFO remain server-authoritative."
        action={
          <Link className="secondary" to="/sales">
            Cancel
          </Link>
        }
      />
      <form
        className="sale-layout"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          mutation.mutate({
            customer: form.customer,
            saleDate: form.saleDate,
            discount: Number(form.discount || 0),
            totalPaid: Number(form.totalPaid || 0),
            items: items.map(
              ({ cylinderType, cylinderCount, pricePerCylinder }) => {
                const type = types.find(
                  (candidate) =>
                    (candidate._id || candidate.id) === cylinderType,
                );
                const cylinderPrice = Number(pricePerCylinder || 0);
                return {
                  cylinderType,
                  cylinderCount: Number(cylinderCount),
                  pricePerCylinder: cylinderPrice,
                  ratePerKg: type
                    ? Number((cylinderPrice / type.capacityKg).toFixed(4))
                    : 0,
                };
              },
            ),
          });
        }}
      >
        <section className="form-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Invoice details</p>
              <h2>Customer & items</h2>
            </div>
            <span className="badge neutral">Draft</span>
          </div>
          <label>
            Customer
            <select
              required
              value={form.customer}
              onChange={(event) =>
                setForm({ ...form, customer: event.target.value })
              }
            >
              <option value="">Select customer</option>
              {rowsOf(clients.data).map((row) => (
                <option key={row._id || row.id} value={row._id || row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <div className="cylinder-list">
            {selected.map((item, index) => (
              <div className="cylinder-row" key={index}>
                <select
                  required
                  value={item.cylinderType}
                  onChange={(event) =>
                    update(index, { cylinderType: event.target.value })
                  }
                >
                  <option value="">Cylinder type</option>
                  {types.map((type) => (
                    <option
                      key={type._id || type.id}
                      value={type._id || type.id}
                    >
                      {type.capacityKg} KG
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.cylinderCount}
                  onChange={(event) =>
                    update(index, { cylinderCount: event.target.value })
                  }
                  required
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.pricePerCylinder}
                  onChange={(event) =>
                    update(index, { pricePerCylinder: event.target.value })
                  }
                  placeholder="Price / cylinder"
                  required
                />
                <span className="row-total">
                  {item.type
                    ? money(
                        Number(item.cylinderCount || 0) *
                          Number(item.pricePerCylinder || 0),
                      )
                    : "Select a type"}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() =>
                      setItems(
                        items.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    aria-label="Remove row"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-row"
            onClick={() =>
              setItems([
                ...items,
                { cylinderType: "", cylinderCount: 1, pricePerCylinder: "" },
              ])
            }
          >
            <Plus size={16} /> Add cylinder type
          </button>
          <div className="form-grid">
            <label>
              Sale date
              <input
                type="date"
                required
                value={form.saleDate}
                onChange={(event) =>
                  setForm({ ...form, saleDate: event.target.value })
                }
              />
            </label>
            <label>
              Discount
              <input
                type="number"
                min="0"
                value={form.discount}
                onChange={(event) =>
                  setForm({ ...form, discount: event.target.value })
                }
              />
            </label>
            <label>
              Initial payment
              <input
                type="number"
                min="0"
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
          {error && <div className="form-error">{error}</div>}
          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Submit sale"}{" "}
            <ArrowUpRight size={17} />
          </button>
        </section>
        <aside className="summary-panel">
          <p className="eyebrow">Live preview</p>
          <h2>Order summary</h2>
          <div className="summary-line">
            <span>Total cylinders</span>
            <strong>
              {items.reduce(
                (sum, item) => sum + Number(item.cylinderCount || 0),
                0,
              )}
            </strong>
          </div>
          <div className="summary-line">
            <span>Total LPG</span>
            <strong>{kilos(totalKg)}</strong>
          </div>
          {selected.map((item, index) =>
            item.type ? (
              <div className="summary-line" key={item.cylinderType || index}>
                <span>
                  {item.type.capacityKg} KG x {item.cylinderCount} x{" "}
                  {money(item.pricePerCylinder)}
                </span>
                <strong>
                  {money(
                    Number(item.cylinderCount || 0) *
                      Number(item.pricePerCylinder || 0),
                  )}
                </strong>
              </div>
            ) : null,
          )}
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>Discount</span>
            <strong>- {money(form.discount)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(subtotal - Number(form.discount || 0))}</strong>
          </div>
          <p className="summary-note">
            The backend calculates final revenue, COGS, gross profit, inventory
            consumption and FIFO allocations.
          </p>
        </aside>
      </form>
    </>
  );
}

export function SaleDetail() {
  const { showTheoreticalProfit } = useReportSettings();
  const id = useLocation().pathname.split("/").pop();
  const query = useQuery({
    queryKey: ["sale", id],
    queryFn: () => saleService.get(id),
  });
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.list({ limit: 1000 }),
  });
  const customerMap = mapById(customers.data);
  const sale = query.data?.sale || query.data;
  const customer =
    sale?.customer && typeof sale.customer === "object"
      ? sale.customer
      : customerMap[String(sale?.customer)] || {};
  const saleItems = sale?.items || [];

  return (
    <>
      <PageHeader
        title="Sale detail"
        description="Invoice results and internal costing record."
        action={
          <Link className="secondary" to="/sales">
            Back to sales
          </Link>
        }
      />
      <DataState query={query}>
        <div className="detail-grid">
          <div className="form-panel">
            <p className="eyebrow">Invoice</p>
            <h2>{sale?.invoiceNumber || id}</h2>
            <div className="detail-total">
              {money(sale?.totalAmount || sale?.total)}
            </div>
            <div className="summary-line">
              <span>Customer</span>
              <strong>{customer.name || sale?.customerName || "-"}</strong>
            </div>
            <div className="summary-line">
              <span>Paid</span>
              <strong>
                {money(sale?.totalPaid ?? sale?.paidAmount ?? sale?.paid ?? 0)}
              </strong>
            </div>
            <div className="summary-line">
              <span>Due</span>
              <strong>
                {money(sale?.totalDue ?? sale?.dueAmount ?? sale?.due ?? 0)}
              </strong>
            </div>
            <div className="summary-line">
              <span>Sale date</span>
              <strong>
                {sale?.saleDate
                  ? new Date(sale.saleDate).toLocaleDateString()
                  : "-"}
              </strong>
            </div>
            <div className="summary-line">
              <span>Status</span>
              <strong>{sale?.status || "COMPLETED"}</strong>
            </div>
            <div className="detail-section-title">
              <p className="eyebrow">Cylinder items</p>
              <span>{saleItems.length} categories</span>
            </div>
            <div className="table-wrap detail-table-wrap">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Pieces</th>
                    <th>Price / cylinder</th>
                    <th>Rate / KG</th>
                    <th>LPG</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item, index) => {
                    const type =
                      item.cylinderType && typeof item.cylinderType === "object"
                        ? item.cylinderType
                        : {};
                    const capacity = item.capacityKg || type.capacityKg || 0;
                    const pricePerCylinder =
                      item.pricePerCylinder ??
                      Number(item.ratePerKg || 0) * capacity;
                    return (
                      <tr key={`${item.cylinderType?._id || "item"}-${index}`}>
                        <td className="strong">
                          {type.name || `${capacity} KG`}
                        </td>
                        <td>{item.cylinderCount || 0}</td>
                        <td>{money(pricePerCylinder)}</td>
                        <td>{money(item.ratePerKg || 0)}</td>
                        <td>{kilos(item.totalLpgKg)}</td>
                        <td>{money(item.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {showTheoreticalProfit && (
              <div className="detail-profit">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {money(sale?.subtotal ?? sale?.totalAmount ?? 0)}
                  </strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>{money(sale?.discount || 0)}</strong>
                </div>
                <div>
                  <span>Inventory cost</span>
                  <strong>{money(sale?.totalCost || 0)}</strong>
                </div>
                <div>
                  <span>Theoretical profit</span>
                  <strong>{money(sale?.grossProfit || 0)}</strong>
                </div>
              </div>
            )}
          </div>
          <div className="form-panel">
            <p className="eyebrow">FIFO allocations</p>
            <h2>Internal inventory record</h2>
            {(query.data?.allocations || []).map((item, index) => (
              <div className="summary-line" key={index}>
                <span>
                  {item.batchNumber || item.batch?.batchNumber || "Batch"}
                </span>
                <strong>{kilos(item.quantityKg)}</strong>
              </div>
            ))}
          </div>
        </div>
      </DataState>
    </>
  );
}
