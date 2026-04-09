// client/src/Components/Adjustments/Adjustments.js
// client/src/Components/Adjustments/Adjustments.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Adjustments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [query, setQuery]   = useState("");

  const token = localStorage.getItem("token");

  const fetchList = async () => {
    try {
      const res = await fetch("/api/adjustments/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.note_no,
        r.note_date,
        r.reason,
        r.remark,
        r.created_by,
        r.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="max-w-7xl mx-auto mt-10 px-5 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <span className="text-6xl">🚫</span>
          <h1 className="text-5xl font-semibold text-gray-800">
            Expired / Rejected — History
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-12 px-6 rounded-2xl bg-gray-100 text-gray-800 hover:bg-gray-200 text-lg"
          >
            Back
          </button>
          <button
            onClick={() => navigate("/adjustments/new")}
            className="h-12 px-6 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 text-lg"
          >
            + New Adjustment
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-3xl shadow border p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by note no / reason / remark / user / date…"
            className="w-full h-14 text-xl border rounded-2xl px-5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              fetchList();
            }}
            className="h-14 px-6 rounded-2xl bg-gray-100 text-gray-800 hover:bg-gray-200 text-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && (
        <div className="text-center text-gray-500 py-16 text-xl">Loading…</div>
      )}
      {!loading && error && (
        <div className="text-center text-red-600 py-12 text-xl">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-3xl border bg-white shadow">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-700 text-lg">
              <tr>
                <th className="py-4 px-5">Note No</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Reason</th>
                <th className="py-4 px-5">Items</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Created By</th>
                <th className="py-4 px-5">Action</th>
              </tr>
            </thead>
            <tbody className="text-base">
              {filtered.length === 0 && (
                <tr>
                  <td className="py-8 px-5 text-gray-500" colSpan={7}>
                    No adjustments found.
                  </td>
                </tr>
              )}

              {filtered.map((r) => (
                <tr
                  key={r.note_id}
                  className="odd:bg-white even:bg-gray-50 border-t last:border-b-0"
                >
                  <td className="py-4 px-5 font-semibold">{r.note_no}</td>
                  <td className="py-4 px-5">
                    {r.note_date
                      ? new Date(r.note_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-4 px-5">{r.reason || "—"}</td>
                  <td className="py-4 px-5">{r.item_count ?? 0}</td>
                  <td className="py-4 px-5">
                    <span
                      className={`inline-block text-sm px-3 py-1.5 rounded-full border ${
                        (r.status || "POSTED") === "POSTED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {r.status || "POSTED"}
                    </span>
                  </td>
                  <td className="py-4 px-5">{r.created_by || "—"}</td>
                  <td className="py-4 px-5">
                    <button
                      onClick={() => navigate(`/adjustments/${r.note_id}`)}
                      className="h-11 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-base"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
