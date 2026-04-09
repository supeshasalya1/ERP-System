// client/src/Components/GRN/GrnEditDetail.js
// client/src/Components/GRN/GrnEditDetail.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function GrnEditDetail() {
  const navigate = useNavigate();
  const { grn_id } = useParams();

  const [header, setHeader] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const t = localStorage.getItem("token");
      if (!t) { navigate("/login"); return; }

      const res = await fetch(`/api/grn/${grn_id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load GRN");

      setHeader(data.header);
      setItems((data.items || []).map(r => ({ ...r, editQty: String(r.grn_qty) })));
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [grn_id]);

  async function saveLine(item) {
    const newQty = Number(item.editQty);
    if (Number.isNaN(newQty) || newQty < 0) {
      setErr("Quantity must be a number ≥ 0");
      return;
    }

    try {
      setErr("");
      setSavingId(item.item_id);
      const t = localStorage.getItem("token");
      const res = await fetch(`/api/grn/items/${item.item_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ new_quantity: newQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");

      setItems(prev =>
        prev.map(r =>
          r.item_id === item.item_id ? { ...r, grn_qty: newQty, editQty: String(newQty) } : r
        )
      );
    } catch (e) {
      setErr(e.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-5xl">📝</span>
          <h1 className="text-5xl font-semibold text-gray-800">Edit GRN</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="h-12 px-6 rounded-2xl bg-gray-100 text-gray-900 hover:bg-gray-200 text-lg"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate("/grn/edit")}
            className="h-12 px-6 rounded-2xl bg-gray-800 text-white hover:bg-gray-900 text-lg"
          >
            Back
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-lg mb-5">{err}</p>}
      {loading && <p className="text-gray-600 text-lg">Loading…</p>}

      {/* Header card */}
      {header && (
        <div className="mb-8 rounded-2xl border bg-white p-6 text-lg">
          <div className="grid gap-2 sm:grid-cols-2">
            <p><span className="font-medium text-gray-700">GRN No:</span> {header.grn_no}</p>
            <p><span className="font-medium text-gray-700">Date:</span> {header.grn_date}</p>
            <p className="sm:col-span-2">
              <span className="font-medium text-gray-700">Supplier:</span> {header.supplier_name}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto rounded-3xl border bg-white">
          <table className="min-w-full text-lg">
            <thead className="bg-gray-50 text-gray-800">
              <tr>
                <th className="p-5 text-left font-semibold">Product</th>
                <th className="p-5 text-left font-semibold">Current Qty</th>
                <th className="p-5 text-left font-semibold">New Qty</th>
                <th className="p-5 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.item_id} className="border-t align-middle">
                  <td className="p-5 text-gray-900">
                    {it.product_name} <span className="text-gray-500">(ID: {it.product_id})</span>
                  </td>
                  <td className="p-5">{it.grn_qty}</td>
                  <td className="p-5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.editQty}
                      onChange={e => {
                        const v = e.target.value;
                        setItems(prev =>
                          prev.map(r => r.item_id === it.item_id ? { ...r, editQty: v } : r)
                        );
                      }}
                      className="w-44 h-12 px-4 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-5">
                    <button
                      onClick={() => saveLine(it)}
                      disabled={savingId === it.item_id}
                      className="h-12 px-6 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 text-lg"
                    >
                      {savingId === it.item_id ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-6 text-gray-500" colSpan={4}>No items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
