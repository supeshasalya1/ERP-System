// client/src/Components/GRN/GrnEditList.js
// client/src/Components/GRN/GrnEditList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function GrnEditList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load(search = "") {
    try {
      setLoading(true);
      setErr("");
      const t = localStorage.getItem("token");
      if (!t) { navigate("/login"); return; }

      const url = new URL("/api/grn/list", window.location.origin);
      if (search) url.searchParams.set("search", search);
      url.searchParams.set("limit", "50");

      const res = await fetch(url.toString().replace(window.location.origin, ""), {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load GRNs");
      setRows(data);
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(""); }, []);

  function onSearch(e) {
    e.preventDefault();
    load(q.trim());
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 mt-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📝</span>
          <h1 className="text-4xl font-semibold text-gray-800">Edit GRN</h1>
        </div>
        <button
          onClick={() => navigate("/user/dashboard")}
          className="h-10 px-5 rounded-xl bg-gray-800 text-white hover:bg-gray-900"
        >
          Back
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={onSearch} className="flex gap-3 mb-6">
        <input
          className="flex-1 h-12 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
          placeholder="Search by GRN No or Supplier…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="h-12 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-lg"
          type="submit"
        >
          Search
        </button>
      </form>

      {err && <p className="text-red-600 text-base mb-4">{err}</p>}
      {loading ? (
        <p className="text-gray-600 text-base">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-base">
            <thead className="bg-gray-50 text-gray-800">
              <tr>
                <th className="p-4 text-left font-semibold">GRN No</th>
                <th className="p-4 text-left font-semibold">Date</th>
                <th className="p-4 text-left font-semibold">Supplier</th>
                <th className="p-4 text-left font-semibold">Edited?</th>
                <th className="p-4 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.grn_id} className="border-t">
                  <td className="p-4 text-gray-800">
                    {r.grn_no || r.reference_no || `#${r.grn_id}`}
                  </td>
                  <td className="p-4">{r.grn_date}</td>
                  <td className="p-4">{r.supplier_name}</td>
                  <td className="p-4">
                    {r.edited ? (
                      <span className="px-3 py-1 rounded-full bg-yellow-500/90 text-white">
                        Edited
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-green-600 text-white">
                        Original
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => navigate(`/grn/edit/${r.grn_id}`)}
                      className="h-10 px-5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="p-6 text-gray-500" colSpan={5}>
                    No GRNs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
