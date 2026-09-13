import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import Shell from "./layouts/Shell";
import { Customers, CustomerForm } from "./pages/customers/Customers";
import Suppliers, { SupplierForm } from "./pages/suppliers/Suppliers";
import { Purchases, PurchaseForm } from "./pages/purchases/Purchases";
import { Sales, SaleForm, SaleDetail } from "./pages/sales/Sales";
import Inventory, { InventoryBatchDetail } from "./pages/inventory/Inventory";
import Payments from "./pages/payments/Payments";
import Expenses, { ExpenseForm } from "./pages/expenses/Expenses";
import Reports from "./pages/reports/Reports";
import Salary from "./pages/salary/Salary";
import Settings from "./pages/settings/Settings";
import { ToastProvider } from "./components/common/Toast";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const getStoredAuthState = () => {
  const token = localStorage.getItem("lpg_token");
  const rawUser = localStorage.getItem("lpg_user");
  let user = null;

  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    user = null;
  }

  return { token, user };
};

function ProtectedRoute() {
  const [auth, setAuth] = useState(() => getStoredAuthState());

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuthState());
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const { token, user } = auth;
  if (!token || !user) return <Navigate to="/login" replace />;

  return (
    <Shell
      user={user}
      logout={() => {
        localStorage.clear();
        setAuth({ token: null, user: null });
        queryClient.clear();
      }}
      routes={
        <>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/new" element={<SaleForm />} />
          <Route path="/sales/:id" element={<SaleDetail />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/:id/edit" element={<CustomerForm />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/new" element={<SupplierForm />} />
          <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
          <Route
            path="/suppliers/:supplierId/payments"
            element={<Payments type="supplier" />}
          />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/new" element={<PurchaseForm />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route
            path="/inventory/batches/:id"
            element={<InventoryBatchDetail />}
          />
          <Route
            path="/payments/customer"
            element={<Payments type="customer" />}
          />
          <Route
            path="/payments/supplier"
            element={<Payments type="supplier" />}
          />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/expenses/new" element={<ExpenseForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/salary" element={<Salary user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route
            path="/settings/cylinder-types"
            element={<Settings user={user} />}
          />
          <Route path="*" element={<ComingSoon />} />
        </>
      }
    />
  );
}
function ComingSoon() {
  return (
    <div className="empty-hero">
      <h2>Workspace ready</h2>
      <p>Connect the API to populate records and continue operations.</p>
    </div>
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<ProtectedRoute />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
export default App;
