import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const CurrentStock = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const t = localStorage.getItem("token");
        if (!t) return navigate("/login");
        const res = await fetch("/api/stock/current", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed");
        setRows(data);
      } catch (e) {
        console.error(e);
        setError(e.message);
      }
    };
    load();
  }, [navigate]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      (r.product_name || "").toLowerCase().includes(needle) ||
      (r.brand || "").toLowerCase().includes(needle) ||
      (r.supplier || "").toLowerCase().includes(needle)
    );
  }, [q, rows]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Current Stock</h1>
        <button
          className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by product / brand / supplier..."
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Available Qty</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={5}>
                  No items found.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{r.product_name}</td>
                  <td className="px-4 py-2">{r.brand}</td>
                  <td className="px-4 py-2">{r.supplier}</td>
                  <td className="px-4 py-2">{r.available_qty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrentStock;
