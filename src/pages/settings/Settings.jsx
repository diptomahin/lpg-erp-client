import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Eye, EyeOff, LockKeyhole } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { apiError } from "../../services/apiClient";
import { authService } from "../../services/erpService";
import { useToast } from "../../components/common/useToast";
import {
  getReportSettings,
  setReportSettings,
} from "../../utils/reportSettings";

export default function Settings({ user }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(getReportSettings);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const passwordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setError("");
      showToast("Password updated successfully.");
    },
    onError: (requestError) => setError(apiError(requestError)),
  });
  const isAdmin = user?.role === "admin";

  const updateVisibility = (value) => {
    const next = { ...settings, showTheoreticalProfit: value };
    setSettings(next);
    setReportSettings(next);
    window.dispatchEvent(new Event("report-settings-changed"));
    showToast(`Theoretical profit ${value ? "shown" : "hidden"}.`);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Control report visibility and secure your account."
      />
      <div className="settings-grid">
        <section className="form-panel settings-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Reports</p>
              <h2>Visibility</h2>
            </div>
            {settings.showTheoreticalProfit ? (
              <Eye size={20} />
            ) : (
              <EyeOff size={20} />
            )}
          </div>
          <div className="setting-row">
            <div>
              <strong>Theoretical profit</strong>
              <p className="muted">
                Show profit in sale details and sales profitability reports.
              </p>
            </div>
            <button
              type="button"
              className={`toggle ${settings.showTheoreticalProfit ? "active" : ""}`}
              onClick={() =>
                isAdmin && updateVisibility(!settings.showTheoreticalProfit)
              }
              disabled={!isAdmin}
              aria-pressed={settings.showTheoreticalProfit}
              title={
                isAdmin ? "Toggle theoretical profit" : "Admin access required"
              }
            >
              <span />
            </button>
          </div>
          {!isAdmin && (
            <p className="form-error">
              Only administrators can change report visibility.
            </p>
          )}
        </section>

        <section className="form-panel settings-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Change password</h2>
            </div>
            <LockKeyhole size={20} />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              if (form.newPassword !== form.confirmPassword) {
                setError("New passwords do not match.");
                return;
              }
              passwordMutation.mutate({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
              });
            }}
          >
            <label>
              Current password
              <input
                type="password"
                required
                value={form.currentPassword}
                onChange={(event) =>
                  setForm({ ...form, currentPassword: event.target.value })
                }
              />
            </label>
            <label>
              New password
              <input
                type="password"
                minLength="8"
                required
                value={form.newPassword}
                onChange={(event) =>
                  setForm({ ...form, newPassword: event.target.value })
                }
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                minLength="8"
                required
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm({ ...form, confirmPassword: event.target.value })
                }
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary" disabled={passwordMutation.isPending}>
              <Check size={17} />
              {passwordMutation.isPending ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
