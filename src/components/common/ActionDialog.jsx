import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export default function ActionDialog({ dialog, onClose, onConfirm }) {
  if (!dialog) return null;

  const isBlocked = dialog.kind === "blocked";

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="action-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
      >
        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
          title="Close"
        >
          <X size={18} />
        </button>
        <div className={`dialog-icon ${isBlocked ? "warning" : "ready"}`}>
          {isBlocked ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <h2 id="action-dialog-title">{dialog.title}</h2>
        <p>{dialog.message}</p>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {isBlocked ? "Close" : "Cancel"}
          </button>
          {!isBlocked && (
            <button type="button" className="primary" onClick={onConfirm}>
              {dialog.confirmLabel || "Confirm"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
