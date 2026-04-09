// client/src/Components/Adjustments/AdjustmentsView.js
// client/src/Components/Adjustments/AdjustmentsView.js
// client/src/Components/Adjustments/AdjustmentsView.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function AdjustmentsView() {
  const navigate = useNavigate();
  const { id } = useParams(); // /adjustments/:id
  const [header, setHeader] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    async function load() {
      try {
        const res = await fetch(`/api/adjustments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setHeader(data.header);
        setItems(data.items || []);
      } catch (e) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate, token]);

  const totalQty = useMemo(
    () => items.reduce((s, it) => s + Number(it.quantity || 0), 0),
    [items]
  );

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 md:px-6">
      {/* Print-only CSS to hide chrome on paper */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .card { box-shadow: none !important; border: 0 !important; }
          .paper-tight td, .paper-tight th { padding: 8px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🧾</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-800">
            Adjustment Details
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="h-12 px-6 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 text-lg"
          >
            Print
          </button>
          <button
            onClick={() => navigate("/adjustments")}
            className="h-12 px-6 rounded-2xl bg-gray-100 text-gray-800 hover:bg-gray-200 text-lg"
          >
            Back
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-16 text-xl">Loading…</div>
      )}
      {!loading && error && (
        <div className="text-center text-red-600 py-12 text-xl">{error}</div>
      )}

      {/* Header card */}
      {header && (
        <div className="card bg-white rounded-2xl shadow border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {header.note_no}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-block text-sm px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  📅 {fmtDate(header.note_date)}
                </span>
                <span className="inline-block text-sm px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  🏷️ {header.reason || "—"}
                </span>
                <span className="inline-block text-sm px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Source: {header.source_type}
                  {header.source_id ? ` #${header.source_id}` : ""}
                </span>
                <span
                  className={`inline-block text-sm px-2.5 py-1 rounded-full border ${
                    (header.status || "POSTED") === "POSTED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {header.status || "POSTED"}
                </span>
              </div>
              {header.remark && (
                <div className="mt-3 text-gray-700">
                  <span className="font-medium">Remark: </span>
                  {header.remark}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">Created by</div>
              <div className="text-lg font-medium text-gray-800">
                {header.created_by || "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items table */}
      {!loading && !error && (
        <div className="card overflow-hidden rounded-2xl border bg-white shadow">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-2xl font-semibold text-gray-800">Items</h2>
            <div className="text-gray-700">
              <span className="font-medium">Lines:</span> {items.length} &nbsp;•&nbsp; 
              <span className="font-medium">Total Qty:</span> {totalQty}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left paper-tight">
              <thead className="bg-gray-50 text-gray-700 text-lg">
                <tr>
                  <th className="py-3.5 px-5">#</th>
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-5">Quantity</th>
                  <th className="py-3.5 px-5">Batch</th>
                  <th className="py-3.5 px-5">Expiry</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {items.length === 0 && (
                  <tr>
                    <td className="py-8 px-5 text-gray-500" colSpan={5}>
                      No items.
                    </td>
                  </tr>
                )}
                {items.map((it, i) => (
                  <tr key={it.item_id} className="odd:bg-white even:bg-gray-50 border-t">
                    <td className="py-3.5 px-5 text-gray-600">{i + 1}</td>
                    <td className="py-3.5 px-5">
                      {it.product_name}{" "}
                      <span className="text-gray-500">(ID: {it.product_id})</span>
                    </td>
                    <td className="py-3.5 px-5">{it.quantity}</td>
                    <td className="py-3.5 px-5">{it.batch_no || "—"}</td>
                    <td className="py-3.5 px-5">
                      {it.expiry_date ? fmtDate(it.expiry_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note (print-visible by default) */}
          <div className="px-5 py-4 text-sm text-gray-500">
            * Negative stock is prevented during creation. All quantities reflect
            posted adjustments.
          </div>
        </div>
      )}
    </div>
  );
}
