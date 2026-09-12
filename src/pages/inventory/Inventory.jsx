import { useQuery } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataState, DataTable } from "../../components/common/DataState";
import { inventoryService } from "../../services/erpService";
import { kilos, money } from "../../utils/formatters";

export default function Inventory() {
  const query = useQuery({
    queryKey: ["inventory"],
    queryFn: inventoryService.get,
  });
  const batches = query.data?.batches || [];
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Authoritative LPG stock, tracked in kilograms and consumed FIFO."
      />
      <div className="inventory-hero">
        <div>
          <span className="eyebrow">Available LPG</span>
          <strong>{kilos(query.data?.availableKg)}</strong>
          <p>Across {batches.length} purchase batches</p>
        </div>
        <Boxes size={45} />
      </div>
      <DataTable
        query={query}
        columns={[
          "Batch",
          "Purchase date",
          "Original KG",
          "Remaining KG",
          "Cost / KG",
          "Status",
        ]}
        render={(row) => (
          <tr key={row._id || row.id}>
            <td className="strong">
              <Link to={`/inventory/batches/${row._id || row.id}`}>
                {row.batchNumber}
              </Link>
            </td>
            <td>
              {row.batchDate || row.purchaseDate || row.purchase?.purchaseDate
                ? new Date(
                    row.batchDate ||
                      row.purchaseDate ||
                      row.purchase.purchaseDate,
                  ).toLocaleDateString()
                : "-"}
            </td>
            <td>{kilos(row.originalKg || row.originalQuantityKg)}</td>
            <td>{kilos(row.remainingKg || row.remainingQuantityKg)}</td>
            <td>{money(row.costPerKg || row.acquisitionCostPerKg)}</td>
            <td>
              <span className="badge success">{row.status || "AVAILABLE"}</span>
            </td>
          </tr>
        )}
      />
    </>
  );
}

export function InventoryBatchDetail() {
  const id = useLocation().pathname.split("/").pop();
  const query = useQuery({
    queryKey: ["inventory-batch", id],
    queryFn: () => inventoryService.getBatch(id),
  });
  const data = query.data || {};
  const batch = data.batch || {};
  const totals = data.totals || {};
  const history = data.history || [];

  return (
    <>
      <PageHeader
        title={batch.batchNumber || "Batch history"}
        description="Purchase origin, FIFO sales, and realized batch profit."
        action={
          <Link className="secondary" to="/inventory">
            Back to inventory
          </Link>
        }
      />
      <DataState query={query}>
        <div className="metric-grid">
          <div className="metric">
            <span>Original quantity</span>
            <strong>{kilos(batch.originalQuantityKg)}</strong>
          </div>
          <div className="metric">
            <span>Remaining quantity</span>
            <strong>{kilos(batch.remainingQuantityKg)}</strong>
          </div>
          <div className="metric">
            <span>Sold quantity</span>
            <strong>{kilos(totals.soldKg)}</strong>
          </div>
          <div className="metric">
            <span>Realized profit</span>
            <strong>{money(totals.realizedProfit)}</strong>
          </div>
        </div>
        <div className="detail-grid batch-detail-grid">
          <section className="form-panel">
            <div className="detail-section-title">
              <div>
                <p className="eyebrow">Purchase origin</p>
                <h2>Batch details</h2>
              </div>
            </div>
            <div className="summary-line">
              <span>Purchase date</span>
              <strong>
                {batch.batchDate
                  ? new Date(batch.batchDate).toLocaleDateString()
                  : "-"}
              </strong>
            </div>
            <div className="summary-line">
              <span>Purchase cost / KG</span>
              <strong>{money(batch.purchaseCostPerKg)}</strong>
            </div>
            <div className="summary-line">
              <span>Acquisition cost / KG</span>
              <strong>{money(batch.acquisitionCostPerKg)}</strong>
            </div>
            <div className="summary-line">
              <span>Sold revenue</span>
              <strong>{money(totals.revenue)}</strong>
            </div>
            <div className="summary-line">
              <span>Inventory cost</span>
              <strong>{money(totals.cost)}</strong>
            </div>
          </section>
          <section className="form-panel">
            <div className="detail-section-title">
              <div>
                <p className="eyebrow">FIFO history</p>
                <h2>How this batch was sold</h2>
              </div>
            </div>
            <DataTable
              query={{ ...query, data: history }}
              columns={["Sale", "Date", "Sold KG", "Revenue", "Profit"]}
              render={(item) => (
                <tr key={item._id || item.id}>
                  <td className="strong">
                    <Link to={`/sales/${item.sale?._id || item.sale?.id}`}>
                      {item.sale?.invoiceNumber || "Sale"}
                    </Link>
                  </td>
                  <td>
                    {item.sale?.saleDate
                      ? new Date(item.sale.saleDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{kilos(item.quantityKg)}</td>
                  <td>{money(item.saleRevenue)}</td>
                  <td>{money(item.realizedProfit)}</td>
                </tr>
              )}
            />
          </section>
        </div>
      </DataState>
    </>
  );
}
