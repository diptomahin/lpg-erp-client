import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { DataState } from "../../components/common/DataState";
import { apiError } from "../../services/apiClient";
import { customerService } from "../../services/erpService";
import { money } from "../../utils/formatters";
import { useToast } from "../../components/common/useToast";
import { today } from "../../utils/dates";

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export default function CustomerAdvanceRefund({ user }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [advancePayment, setAdvancePayment] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["customer-advance-details", id],
    queryFn: () => customerService.advanceDetails(id),
  });
  const customer = query.data?.customer || {};
  const advances = query.data?.advances || [];
  const selectedAdvance = advances.find(
    (advance) => String(advance._id) === String(advancePayment),
  );
  const requestedAmount = Number(amount || 0);
  const remainingAfterRefund = Math.max(
    0,
    Number(selectedAdvance?.remainingAmount || 0) - requestedAmount,
  );
  const mutation = useMutation({
    mutationFn: (payload) => customerService.refundAdvance(id, payload),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["customer-advance-details", id],
        }),
        queryClient.invalidateQueries({ queryKey: ["customer-advances"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-overview", id] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-report"] }),
        queryClient.invalidateQueries({ queryKey: ["monthly-report"] }),
      ]);
      setAmount("");
      setReference("");
      setNotes("");
      setAdvancePayment("");
      setError("");
      showToast(
        `${money(result.refundedAmount)} refunded to ${customer.name}.`,
      );
    },
    onError: (requestError) => setError(apiError(requestError)),
  });

  return (
    <>
      <PageHeader
        title="Refund customer advance"
        description={
          customer.name
            ? `Record a refund for ${customer.name}.`
            : "Return part or all of an unused customer advance."
        }
        action={
          <Link className="secondary" to={`/customers/${id}`}>
            <ArrowLeft size={16} /> Customer details
          </Link>
        }
      />
      <DataState query={query}>
        <div className="customer-summary-grid">
          <div className="summary-panel">
            <span>Customer</span>
            <strong>{customer.name || "-"}</strong>
          </div>
          <div className="summary-panel advance-summary">
            <span>Available advance</span>
            <strong>{money(customer.advanceBalance)}</strong>
          </div>
        </div>
        {advances.length === 0 ? (
          <div className="state">
            No unused customer advances are available to refund.
          </div>
        ) : (
          <form
            className="form-panel narrow-form"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              if (!selectedAdvance) {
                setError("Select an available advance to refund.");
                return;
              }
              if (!(requestedAmount > 0)) {
                setError("Enter a refund amount greater than zero.");
                return;
              }
              if (requestedAmount > Number(selectedAdvance.remainingAmount)) {
                setError(
                  "Refund cannot exceed this advance's remaining amount.",
                );
                return;
              }
              mutation.mutate({
                advancePayment: selectedAdvance._id,
                amount: requestedAmount,
                paymentDate,
                paymentMethod,
                reference: reference.trim(),
                notes: notes.trim(),
              });
            }}
          >
            <p className="eyebrow">Unused advance</p>
            <h2>Select advance to refund</h2>
            <label>
              Advance receipt
              <select
                required
                value={advancePayment}
                onChange={(event) => {
                  setAdvancePayment(event.target.value);
                  setAmount("");
                }}
              >
                <option value="">Select available advance</option>
                {advances.map((advance) => (
                  <option key={advance._id} value={advance._id}>
                    {advance.paymentNumber} · {dateText(advance.paymentDate)} ·
                    Remaining {money(advance.remainingAmount)}
                  </option>
                ))}
              </select>
            </label>
            {selectedAdvance && (
              <div className="due-callout">
                <span>Available on selected receipt</span>
                <strong>{money(selectedAdvance.remainingAmount)}</strong>
              </div>
            )}
            <label>
              Refund amount
              <input
                type="number"
                min="0.01"
                max={selectedAdvance?.remainingAmount || undefined}
                step="0.01"
                required
                value={amount}
                disabled={!selectedAdvance}
                onChange={(event) => setAmount(event.target.value)}
              />
              {selectedAdvance && (
                <button
                  type="button"
                  className="text-link compact-row"
                  onClick={() =>
                    setAmount(String(selectedAdvance.remainingAmount))
                  }
                >
                  Refund full remaining amount
                </button>
              )}
            </label>
            {requestedAmount > 0 && selectedAdvance && (
              <div className="due-callout">
                <div>
                  <span>Refund amount</span>
                  <strong>{money(requestedAmount)}</strong>
                </div>
                <div>
                  <span>Advance remaining after refund</span>
                  <strong>{money(remainingAfterRefund)}</strong>
                </div>
              </div>
            )}
            <div className="form-grid">
              <label>
                Refund date
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </label>
              <label>
                Refund method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="cheque">Cheque</option>
                </select>
              </label>
            </div>
            <label>
              Reference
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Refund receipt or transfer reference"
              />
            </label>
            <label>
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {user?.role !== "admin" && (
              <div className="form-error">
                Only administrators can issue customer advance refunds.
              </div>
            )}
            {error && <div className="form-error">{error}</div>}
            <button
              className="primary"
              disabled={user?.role !== "admin" || mutation.isPending}
            >
              <CircleDollarSign size={16} />
              {mutation.isPending ? "Recording refund..." : "Record refund"}
            </button>
          </form>
        )}
      </DataState>
    </>
  );
}
