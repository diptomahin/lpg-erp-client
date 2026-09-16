import { useState } from "react";
import { Link, Routes, useLocation } from "react-router-dom";
import {
  Boxes,
  CircleDollarSign,
  FileText,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ReceiptText,
  UserRound,
  Settings,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Sales", icon: Receipt, to: "/sales" },
  { label: "Purchases", icon: Truck, to: "/purchases" },
  { label: "Customers", icon: Users, to: "/customers" },
  { label: "Dues", icon: WalletCards, to: "/dues" },
  { label: "Advances", icon: WalletCards, to: "/advances" },
  { label: "Suppliers", icon: Factory, to: "/suppliers" },
  { label: "Inventory", icon: Boxes, to: "/inventory" },
  { label: "Payments", icon: CircleDollarSign, to: "/payments/customer" },
  { label: "Expenses", icon: ReceiptText, to: "/expenses" },
  { label: "Salary", icon: UserRound, to: "/salary" },
  { label: "Reports", icon: FileText, to: "/reports" },
];

export default function Shell({ user, logout, routes }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const title =
    navigation.find((item) => location.pathname.startsWith(item.to))?.label ||
    "Overview";
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <Link className="wordmark" to="/dashboard">
            LP<span>G</span>
            <small>ERP</small>
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace">
          <span className="avatar">{user.name?.[0] || "A"}</span>
          <div>
            <strong>{user.name || "Admin user"}</strong>
            <small>{user.role || "Administrator"}</small>
          </div>
        </div>
        <nav>
          {navigation.map(({ label, icon: Icon, to }) => (
            <Link
              className={location.pathname.startsWith(to) ? "active" : ""}
              to={to}
              onClick={() => setOpen(false)}
              key={to}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/settings">
            <Settings size={18} />
            Settings
          </Link>
          <button onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="content">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">Workspace / {title}</p>
            <h2>{title}</h2>
          </div>
          <span className="online">
            <i className="status-dot" /> API connected
          </span>
        </header>
        <main className="page">
          <Routes>{routes}</Routes>
        </main>
      </div>
    </div>
  );
}
