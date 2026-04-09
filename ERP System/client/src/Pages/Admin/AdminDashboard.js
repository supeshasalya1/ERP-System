// client/src/Pages/Admin/AdminDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

const todayStr = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function AdminDashboard() {
  const navigate = useNavigate();
  const go = (path) => navigate(path);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-100">
      <AdminNavbar />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">
        {/* Header */}
        <section className="rounded-3xl bg-white/95 shadow-md border border-emerald-100 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Admin
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">
              {todayStr()}
            </p>
            <p className="text-sm md:text-base text-slate-600 mt-2">
              Central panel for stock audit, documents and user management.
            </p>
          </div>
        </section>

        {/* All admin actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Current stock */}
          <button
            onClick={() => go("/admin/stock")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">📦</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Current stock
              </div>
              <div className="text-sm text-slate-600 mt-1">
                View real-time quantities in main store.
              </div>
            </div>
          </button>

          {/* 2. Bin cards */}
          <button
            onClick={() => go("/admin/bincard")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">📋</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Bin cards
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Product-wise IN / OUT history and balances.
              </div>
            </div>
          </button>

          {/* 3. View GRNs */}
          <button
            onClick={() => go("/admin/grns")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">📑</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                View GRNs
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Review supplier deliveries and item counts.
              </div>
            </div>
          </button>

          {/* 4. View issue notes */}
          <button
            onClick={() => go("/admin/issue-notes")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">🚚</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                View issue notes
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Track loaded stock sent out in lorries.
              </div>
            </div>
          </button>

          {/* 5. View unload notes */}
          <button
            onClick={() => go("/admin/unload-notes")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">🔁</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                View unload notes
              </div>
              <div className="text-sm text-slate-600 mt-1">
                See remaining stock returned from lorries.
              </div>
            </div>
          </button>

          {/* 6. View expire store */}
          <button
            onClick={() => go("/admin/expire-store")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">🧺</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                View expire store
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Monitor expired items waiting to be returned.
              </div>
            </div>
          </button>

          {/* 7. View adjustment notes */}
          <button
            onClick={() => go("/admin/adjustments")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">✏️</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Adjustment notes
              </div>
              <div className="text-sm text-slate-600 mt-1">
                See manual stock IN / OUT corrections.
              </div>
            </div>
          </button>

          {/* 8. Add new users */}
          <button
            onClick={() => go("/admin/signup")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">👤</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Add new users
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Create system logins for staff.
              </div>
            </div>
          </button>

          {/* 9. Add cash collectors */}
          <button
            onClick={() => go("/admin/cash-collectors")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">💰</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Add cash collectors
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Manage cash collector records used in issue notes.
              </div>
            </div>
          </button>

          <button
            onClick={() => go("/admin/account/password")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl">🔐</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Reset admin password
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Force a fresh login on every device immediately.
              </div>
            </div>
          </button>
        </section>
      </main>
    </div>
  );
}
