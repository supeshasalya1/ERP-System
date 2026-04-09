// client/src/Components/Layout/AdminNavbar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/inventory-logo.png";

export default function AdminNavbar() {
  const nav = useNavigate();

  const Item = ({ to, label, hint }) => (
    <NavLink
      to={to}
      end
      title={hint}
      aria-label={label}
      tabIndex={-1}
      className={({ isActive }) =>
        [
          "h-11 px-7 inline-flex items-center justify-center rounded-full border select-none",
          "text-[16px] font-semibold whitespace-nowrap",
          isActive
            ? "bg-white text-emerald-700 border-white shadow-md"
            : "bg-white/10 text-white border-transparent hover:bg-white/20",
          "transition-all",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );

  return (
    <header className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md">
      {/* full width bar */}
      <div className="w-full px-4">
        <div className="h-16 relative flex items-center">
          {/* Left: logo (near left edge) */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => nav("/admin/dashboard")}
            className="flex items-center select-none rounded-xl focus:outline-none absolute left-3"
            title="Go to Admin Dashboard"
            aria-label="Go to Admin Dashboard"
          >
            <img
              src={logo}
              alt="Leelarathne & Sons logo"
              className="h-10 w-auto object-contain drop-shadow-sm"
            />
      
          </button>

          {/* Center nav */}
          <nav
            aria-label="Admin navigation"
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 flex-nowrap"
          >
            <Item
              to="/admin/stock"
              label="Current Stock"
              hint="View real-time stock"
            />
            <Item
              to="/admin/bincard"
              label="Bin Cards"
              hint="View product-wise stock history"
            />
            <Item
              to="/admin/grns"
              label="GRNs"
              hint="View all GRNs"
            />
            <Item
              to="/admin/issue-notes"
              label="Issue Notes"
              hint="View all issue notes"
            />
          </nav>

          {/* Right: logout (near right edge) */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              localStorage.clear();
              nav("/");
            }}
            className="h-10 px-6 rounded-full bg-white text-emerald-600 text-[16px] font-semibold hover:bg-emerald-50 transition-colors absolute right-3 shadow-sm"
            title="Logout"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
