// client/src/Pages/Dashboard/ProDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./_Navbar";

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const todayStr = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function ProDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState([]);
  const [allProducts, setAllProducts] = useState();
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );
  const username = localStorage.getItem("username");

  const fetchWithAuth = async (url, { tolerate404 = false } = {}) => {
    const res = await fetch(url, { headers });
    if (tolerate404 && res.status === 404) return null;
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  };

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    (async () => {
      try {
        const [sum, prods] = await Promise.all([
          fetchWithAuth("/api/inventory/stock-summary"),
          fetchWithAuth("/api/products/list", { tolerate404: true }),
        ]);

        setSummary(Array.isArray(sum) ? sum : []);
        setAllProducts(Array.isArray(prods) ? prods : null);
      } catch (e) {
        console.error("Dashboard load error:", e);
        if (String(e).includes("401")) {
          alert("Session expired. Please log in again.");
          localStorage.removeItem("token");
          navigate("/");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, token, headers]);

  // KPIs
  const productIdsWithStock = new Set(summary.map((s) => String(s.product_id)));
  const totalProducts = Array.isArray(allProducts) ? allProducts.length : null;

  const outOfStockCount = Array.isArray(allProducts)
    ? allProducts.reduce(
        (acc, p) =>
          acc + (productIdsWithStock.has(String(p.product_id)) ? 0 : 1),
        0
      )
    : null;

  const lowStockList = summary.filter(
    (s) => asInt(s.total_pcs) > 0 && asInt(s.total_pcs) < 10
  );
  const lowStockCount = lowStockList.length;

  const multiPackProducts = summary.filter((s) => (s.packs || []).length > 1);
  const multiPackCount = multiPackProducts.length;

  const lowestFive = [...summary]
    .sort((a, b) => asInt(a.total_pcs) - asInt(b.total_pcs))
    .slice(0, 5);

  const go = (path) => navigate(path);

  return (
    // 🌈 match navbar vibe, fill whole window
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-100">
      <Navbar />

      {/* make content wider so it feels full */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">
        {/* HEADER CARD */}
        <section className="rounded-3xl bg-white/95 shadow-md border border-emerald-100 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Welcome, {username}
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">
              {todayStr()}
            </p>

          </div>

          {/* small KPIs on right */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 border border-emerald-100">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700">
                Total Products
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? "—" : totalProducts ?? "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3 border border-rose-100">
              <div className="text-[11px] uppercase tracking-wide text-rose-700">
                Out of Stock
              </div>
              <div className="mt-1 text-2xl font-bold text-rose-700">
                {loading ? "—" : outOfStockCount ?? "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3 border border-amber-100">
              <div className="text-[11px] uppercase tracking-wide text-amber-700">
                Low Stock (&lt; 10)
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-700">
                {loading ? "—" : lowStockCount}
              </div>
            </div>
            <div className="rounded-2xl bg-cyan-50 px-4 py-3 border border-cyan-100">
              <div className="text-[11px] uppercase tracking-wide text-cyan-700">
                Multi-Pack
              </div>
              <div className="mt-1 text-2xl font-bold text-cyan-700">
                {loading ? "—" : multiPackCount}
              </div>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS – match soft colorful style */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Stock */}
          {/*<button
            onClick={() => go("/stock/view")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl text-emerald-500 group-hover:scale-110 transition-transform">
              📦
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Current Stock
              </div>
              <div className="text-sm text-slate-600 mt-1">
                View all products and quantities in main store.
              </div>
            </div>
          </button>
          */}

          {/* Bin Card */}
          <button
            onClick={() => go("/bincard")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl text-cyan-500 group-hover:scale-110 transition-transform">
              📋
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Bin Card / Stock Card
              </div>
              <div className="text-sm text-slate-600 mt-1">
                See product-wise IN / OUT history and running balance by month.
              </div>
            </div>
          </button>

          {/* Expired Note */}
          <button
            onClick={() => go("/expired/add")} // adjust route if needed
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl text-orange-500 group-hover:scale-110 transition-transform">
              ⏰
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Expired Note
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Record expired goods returned from retail shops to expire store.
              </div>
            </div>
          </button>

                    {/* Expire Store – full width */}
          <button
            onClick={() => go("/expired/store")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all md:col-span-2"
          >
            <div className="mt-1 text-3xl text-amber-500 group-hover:scale-110 transition-transform">
              🧺
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Expire Store
              </div>
              <div className="text-sm text-slate-600 mt-1">
                View all expired stock in expire store and return to suppliers.
              </div>
            </div>
          </button>

          {/* Stock Adjustment */}
          <button
            onClick={() => go("/adjustments/new")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl text-emerald-500 group-hover:scale-110 transition-transform">
              ✏️
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Stock Adjustment
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Correct stock (IN / OUT) when physical stock doesn&apos;t match.
              </div>
            </div>
          </button>

          {/* 🔹 NEW: Add Issue Lorry */}
          <button
            onClick={() => go("/issue-lorries/add")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl text-emerald-500 group-hover:scale-110 transition-transform">
              🚛
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Add Issue Lorry
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Register a new lorry that can be used in issue notes.
              </div>
            </div>
          </button>

          <button
            onClick={() => go("/account/password")}
            className="group rounded-2xl bg-white/95 px-5 py-4 shadow-sm border border-sky-100 text-left flex items-start gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="mt-1 text-3xl text-emerald-500 group-hover:scale-110 transition-transform">
              🔐
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Change Password
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Rotate your credentials and force sign-out on other devices.
              </div>
            </div>
          </button>

        </section>

        {/* LOWEST STOCK */}
        <section className="rounded-3xl bg-white/95 shadow-md border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Lowest Stock (top 5)
            </h2>
            <button
              onClick={() => go("/stock/view")}
              className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Open Stock
            </button>
          </div>

          {lowestFive.length ? (
            <ul className="space-y-2">
              {lowestFive.map((s) => (
                <li
                  key={s.product_id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 bg-slate-50"
                >
                  <span className="text-slate-800 truncate pr-3 text-sm">
                    {s.product_name}
                  </span>
                  <span className="text-slate-900 font-semibold text-sm">
                    {asInt(s.total_pcs)} pcs
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-500 text-sm">No data</div>
          )}
        </section>
      </main>
    </div>
  );
}
