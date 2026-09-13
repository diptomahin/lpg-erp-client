import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiError } from "../../services/apiClient";
import { authService } from "../../services/erpService";
import { useToast } from "../../components/common/useToast";

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    email: "admin@example.com",
    password: "",
  });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      if (!data?.token) {
        setError("Login response did not include a valid token.");
        return;
      }

      localStorage.setItem("lpg_token", data.token);
      localStorage.setItem("lpg_user", JSON.stringify(data.user || null));
      window.dispatchEvent(new Event("storage"));
      showToast("Signed in successfully.");
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => setError(apiError(err)),
  });
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark">
          LP<span>G</span>
        </div>
        <p className="eyebrow">Operations platform</p>
        <h1>Welcome back.</h1>
        <p className="muted">
          Sign in to manage your LPG distribution business.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            mutation.mutate(form);
          }}
        >
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary full" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in..." : "Sign in"}{" "}
            <ArrowUpRight size={17} />
          </button>
        </form>
      </section>
      <section className="login-aside">
        <span>
          <i className="status-dot" /> System ready
        </span>
        <h2>
          Every kilogram
          <br />
          accounted for.
        </h2>
        <p>
          Purchases, FIFO inventory, cylinder sales and ledgers in one clear
          operational view.
        </p>
      </section>
    </main>
  );
}
