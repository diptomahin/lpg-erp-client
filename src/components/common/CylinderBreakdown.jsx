import { Boxes } from "lucide-react";
import { kilos } from "../../utils/formatters";

export default function CylinderBreakdown({ items = [] }) {
  return (
    <section
      className="cylinder-breakdown"
      aria-labelledby="cylinder-breakdown-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cylinder mix</p>
          <h2 id="cylinder-breakdown-title">Cylinders by category</h2>
        </div>
        <span className="muted">Selected report period</span>
      </div>
      {items.length ? (
        <div className="cylinder-grid">
          {items.map((item) => (
            <div className="cylinder-card" key={item.name}>
              <span className="metric-icon" aria-hidden="true">
                <Boxes size={17} />
              </span>
              <div>
                <strong>{item.name}</strong>
                <span>{Number(item.quantity || 0).toLocaleString()} units</span>
                <small>{kilos(item.lpgKg)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
