// client/src/Pages/Admin/AdminAdjustments.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

const SHOP_DETAILS = {
  name: "LEELARATHNE & SONS",
  address: "No. 605 B, Galle Road, Katubedda",
  tel: "0117539810 , 0112614171",
};

const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n) : d;
};

export default function AdminAdjustments() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const [notes, setNotes] = useState([]);
  const [itemsByNote, setItemsByNote] = useState({});
  const [expanded, setExpanded] = useState({}); // note_id -> bool (kept for future detail use)
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reasons, setReasons] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [reasonId, setReasonId] = useState("");
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [sourceType, setSourceType] = useState("");

  const [viewMode, setViewMode] = useState("table"); // default TABLE
  const [printTarget, setPrintTarget] = useState(null);

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchDropdowns = async () => {
    try {
      const [reasonRes, productRes, supplierRes] = await Promise.all([
        axios.get("/api/adjustments/reasons", { headers }),
        axios.get("/api/products/list", { headers }),
        axios.get("/api/suppliers/list", { headers }),
      ]);

      setReasons(Array.isArray(reasonRes.data) ? reasonRes.data : []);
      setProducts(Array.isArray(productRes.data) ? productRes.data : []);
      setSuppliers(Array.isArray(supplierRes.data) ? supplierRes.data : []);
    } catch (err) {
      console.error("Failed to load adjustment dropdowns:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      }
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.start = dateRange.start;
        params.end = dateRange.end;
      }
      if (reasonId) params.reason_id = reasonId;
      if (productId) params.product_id = productId;
      if (supplierId) params.supplier_id = supplierId;
      if (status) params.status = status;
      if (sourceType) params.source_type = sourceType;

      const res = await axios.get("/api/admin/adjustments", {
        headers,
        params,
      });

      const raw = Array.isArray(res.data) ? res.data : [];

      // 🔴 Frontend filter: never show drafts even if backend sends them
      const cleaned = raw.filter(
        (n) => String(n.status || "").toUpperCase() !== "DRAFT"
      );

      setNotes(cleaned);
      setMessage("");
    } catch (err) {
      console.error("Failed to load admin adjustment notes:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      } else {
        setMessage("❌ Failed to load adjustment notes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (noteId) => {
    if (itemsByNote[noteId]) return; // cache
    try {
      // keep using admin endpoint; it already returns allocations
      const res = await axios.get(`/api/admin/adjustments/${noteId}/items`, {
        headers,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setItemsByNote((m) => ({ ...m, [noteId]: list }));
    } catch (err) {
      console.error("Failed to load adjustment items:", err);
      setItemsByNote((m) => ({ ...m, [noteId]: [] }));
    }
  };

  const toggleExpand = async (noteId) => {
    setExpanded((e) => ({ ...e, [noteId]: !e[noteId] }));
    if (!itemsByNote[noteId]) {
      await fetchItems(noteId);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchNotes();
    const resetPrint = () => setPrintTarget(null);
    window.addEventListener("afterprint", resetPrint);
    return () => window.removeEventListener("afterprint", resetPrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Item header + row ----------
  const supplierNameFor = (note) => {
    const fromApi = note?.supplier_name;
    if (fromApi) return fromApi;
    const sid = note?.supplier_id;
    if (!sid) return "-";
    const match = suppliers.find((s) => String(s.supplier_id) === String(sid));
    return match?.name || String(sid);
  };

  // --- Item details (no allocations column) ---
  const ItemHeader = () => (
    <div className="grid grid-cols-[1.2fr_3fr_1fr_2fr] gap-3 py-2 border-b text-base font-semibold text-gray-700">
      <div>Code</div>
      <div>Product</div>
      <div>Pack</div>
      <div>Change</div>
    </div>
  );

  const ItemRow = ({ it }) => {
    const pack = Math.max(1, toInt(it.pack_size, 1));

    // fall back to delta columns if net_pcs missing
    const netRaw =
      toInt(it.net_pcs, 0) ||
      toInt(it.delta_boxes, 0) * pack + toInt(it.delta_items, 0);

    const boxes = netRaw >= 0 ? Math.floor(netRaw / pack) : Math.ceil(netRaw / pack);
    const items = netRaw - boxes * pack;

    const pcsLabel = netRaw > 0 ? `+${netRaw} pcs` : netRaw < 0 ? `${netRaw} pcs` : "0 pcs";

    return (
      <div className="grid grid-cols-[1.2fr_3fr_1fr_2fr] gap-3 py-2 border-b text-base items-center">
        <div className="font-mono text-sm text-gray-700">{it.product_code || "-"}</div>
        <div className="font-medium truncate">
          {it.product_name}
          {it.expiry_date && (
            <span className="block text-xs text-gray-500">
              Exp: {new Date(it.expiry_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <div>{pack}</div>
        <div className={`text-base font-semibold ${
          netRaw > 0 ? "text-green-700" : netRaw < 0 ? "text-red-700" : "text-gray-800"
        }`}>
          {pcsLabel} — Boxes: {boxes} | Pieces: {items}
        </div>
      </div>
    );
  };

  const handlePrintList = async () => {
    await Promise.all(
      (notes || []).map((n) =>
        itemsByNote[n.note_id] ? Promise.resolve() : fetchItems(n.note_id)
      )
    );
    setPrintTarget(null);
    setTimeout(() => window.print(), 0);
  };

  const handlePrintSingle = async (id) => {
    if (!itemsByNote[id]) {
      await fetchItems(id);
    }
    setPrintTarget(id);
    setTimeout(() => window.print(), 0);
  };

  const printableNotes = React.useMemo(() => {
    if (!printTarget) return notes;
    return notes.filter((n) => String(n.note_id) === String(printTarget));
  }, [notes, printTarget]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  };

  const formatQty = (it) => {
    const pack = Math.max(1, toInt(it.pack_size, 1));
    const netRaw =
      toInt(it.net_pcs, 0) ||
      toInt(it.delta_boxes, 0) * pack + toInt(it.delta_items, 0);
    const boxes = netRaw >= 0 ? Math.floor(netRaw / pack) : Math.ceil(netRaw / pack);
    const items = netRaw - boxes * pack;
    return `${boxes} boxes + ${items} pcs (pcs: ${netRaw})`;
  };

  return (
    <>
      <div className="no-print">
        <AdminNavbar />

        <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-10 border border-gray-200">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🛠️</span>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                  Adjustment Notes (Admin)
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  All adjustment notes from all users, with reasons and batch-level
                  changes.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrintList}
                className="border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 text-base"
              >
                Print List
              </button>
              <button
                onClick={() =>
                  setViewMode((mode) => (mode === "table" ? "cards" : "table"))
                }
                className="border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 text-base"
              >
                {viewMode === "table" ? "Card View" : "Table View"}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            {/* Dates */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                From date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="border border-gray-300 px-3 py-2 rounded-xl text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                To date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="border border-gray-300 px-3 py-2 rounded-xl text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Reason
              </label>
              <select
                value={reasonId}
                onChange={(e) => setReasonId(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-base min-w-[220px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All reasons</option>
                {reasons.map((r) => (
                  <option key={r.reason_id} value={r.reason_id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-base min-w-[260px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_code
                      ? `${p.product_code} – ${p.product_name}`
                      : p.product_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-base min-w-[220px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status (no DRAFT) */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="POSTED">Posted</option>
              </select>
            </div>

            {/* Source type */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Source
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="DIRECT">Direct</option>
                <option value="GRN">GRN</option>
                <option value="ISSUE">Issue note</option>
                <option value="UNLOAD">Unload note</option>
              </select>
            </div>

            {/* Apply */}
            <button
              type="button"
              onClick={fetchNotes}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 text-base ml-auto"
            >
              Apply
            </button>
          </div>

          {loading && (
            <div className="text-gray-500 mb-4 text-base">Loading…</div>
          )}

          {/* ============ TABLE VIEW (default) ============ */}
          {viewMode === "table" && (
            <div className="overflow-auto">
              <table className="w-full border border-gray-200 text-base">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-3 border border-gray-200">Note No</th>
                    <th className="p-3 border border-gray-200">Date</th>
                    <th className="p-3 border border-gray-200">Reason</th>
                    <th className="p-3 border border-gray-200">Supplier</th>
                    <th className="p-3 border border-gray-200">Source</th>
                    <th className="p-3 border border-gray-200">Status</th>
                    <th className="p-3 border border-gray-200">Created By</th>
                    <th className="p-3 border border-gray-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => {
                    const net = toInt(n.total_delta_pcs, 0);
                    const netLabel = net > 0 ? `+${net} pcs` : net < 0 ? `${net} pcs` : "0 pcs";
                    const sourceLabel = n.source_type
                      ? `${n.source_type}${n.source_ref ? ` (${n.source_ref})` : ""}`
                      : "-";

                    return (
                      <React.Fragment key={n.note_id}>
                        <tr className="odd:bg-white even:bg-gray-50">
                          <td className="p-3 border border-gray-200 font-semibold">{n.note_no}</td>
                          <td className="p-3 border border-gray-200">
                            {n.note_date ? new Date(n.note_date).toLocaleDateString() : "-"}
                          </td>
                          <td className="p-3 border border-gray-200">
                            <div className="font-medium">{n.reason_name || "-"}</div>
                            {n.remark && <div className="text-xs text-gray-500 mt-1">{n.remark}</div>}
                          </td>
                          <td className="p-3 border border-gray-200">{supplierNameFor(n)}</td>
                          <td className="p-3 border border-gray-200">{sourceLabel}</td>
                          <td className="p-3 border border-gray-200">{n.status}</td>
                          <td className="p-3 border border-gray-200">
                            <div className="font-medium">{n.created_by_full_name}</div>
                            <div className="text-xs text-gray-500">({n.created_by_username})</div>
                          </td>
                          <td className="p-3 border border-gray-200 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleExpand(n.note_id)}
                              className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm"
                            >
                              {expanded[n.note_id] ? "Hide items" : "View items"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintSingle(n.note_id)}
                              className="ml-2 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm"
                            >
                              Print
                            </button>
                          </td>
                        </tr>

                        {expanded[n.note_id] && (
                          <tr className="bg-gray-50">
                            <td className="p-0 border-t border-gray-200" colSpan={8}>
                              <div className="p-4">
                                <ItemHeader />
                                {(itemsByNote[n.note_id] || []).map((it) => (
                                  <ItemRow it={it} key={`${n.note_id}-${it.item_id}`} />
                                ))}
                                {!(itemsByNote[n.note_id] || []).length && (
                                  <div className="text-center text-gray-500 py-4 text-sm">No items</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {!notes.length && !loading && (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 p-4">
                        No adjustment notes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============ CARDS VIEW ============ */}
          {viewMode === "cards" && (
            <div className="grid 2xl:grid-cols-2 gap-6">
              {notes.map((n) => {
                const sourceLabel = n.source_type
                  ? `${n.source_type}${n.source_ref ? ` (${n.source_ref})` : ""}`
                  : "-";

                return (
                  <div key={n.note_id} className="border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-xl tracking-tight">{n.note_no}</div>
                        <div className="text-gray-700 text-base">
                          <span className="font-medium">Date:</span> {n.note_date ? new Date(n.note_date).toLocaleDateString() : "-"}
                        </div>
                        <div className="text-gray-700 text-base">
                          <span className="font-medium">Reason:</span> {n.reason_name}
                        </div>
                        <div className="text-gray-700 text-base">
                          <span className="font-medium">Supplier:</span> {supplierNameFor(n)}
                        </div>
                        <div className="text-gray-700 text-base">
                          <span className="font-medium">Source:</span> {sourceLabel}
                        </div>
                        <div className="text-gray-700 text-base">
                          <span className="font-medium">Status:</span> {n.status}
                        </div>
                        <div className="text-gray-700 text-base">
                          <span className="font-medium">Created by:</span> {n.created_by_full_name} ({n.created_by_username})
                        </div>
                        {n.remark && (
                          <div className="text-gray-600 text-sm mt-1 italic">“{n.remark}”</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="border px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm"
                          onClick={() => toggleExpand(n.note_id)}
                        >
                          {expanded[n.note_id] ? "Hide" : "View"} items
                        </button>
                        <button
                          className="border px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm"
                          onClick={() => handlePrintSingle(n.note_id)}
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!notes.length && !loading && (
                <div className="text-gray-500 col-span-full text-center text-base">
                  No adjustment notes found.
                </div>
              )}
            </div>
          )}

          {message && (
            <p
              className={`text-center mt-5 text-base font-medium ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

            <p className="text-xs text-gray-500 mt-6">
              Read-only admin view. Use the regular Adjustment page to create or
              modify notes; this page is for audit and review (all users, all reasons).
            </p>
          </div>
        </div>
      </div>

      {/* Printable layout */}
      <div className="print-area">
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{SHOP_DETAILS.name}</div>
            <div style={{ fontSize: 12 }}>{SHOP_DETAILS.address}</div>
            <div style={{ fontSize: 12 }}>Tel: {SHOP_DETAILS.tel}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
              Admin – Adjustment Notes
            </div>
          </div>

          {!printTarget && (
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div>
                Date range: {dateRange.start && dateRange.end ? `${dateRange.start} to ${dateRange.end}` : "All dates"}
              </div>
              <div>
                Supplier: {
                  supplierId
                    ? suppliers.find((s) => String(s.supplier_id) === String(supplierId))?.name || supplierId
                    : "All suppliers"
                }
              </div>
              <div>Printed: {new Date().toLocaleString()}</div>
            </div>
          )}

          {printableNotes.map((n) => {
            const items = itemsByNote[n.note_id] || [];
            const sourceLabel = n.source_type
              ? `${n.source_type}${n.source_ref ? ` (${n.source_ref})` : ""}`
              : "-";
            const showPerNotePrinted = Boolean(printTarget);

            return (
              <div key={`print-${n.note_id}`} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Note: {n.note_no}</div>
                    <div>Date: {formatDate(n.note_date)}</div>
                    <div>Reason: {n.reason_name || "-"}</div>
                    {n.remark && <div>Remark: {n.remark}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Supplier: {supplierNameFor(n)}</div>
                    <div>Source: {sourceLabel}</div>
                    <div>Status: {n.status}</div>
                    <div>Created by: {n.created_by_full_name} ({n.created_by_username})</div>
                    {showPerNotePrinted && (
                      <div>Printed: {new Date().toLocaleString()}</div>
                    )}
                  </div>
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #000",
                    fontSize: 11,
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Code</th>
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Product</th>
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Pack</th>
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`print-${n.note_id}-${idx}`}>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>{it.product_code}</td>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>{it.product_name}</td>
                        <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                          {Math.max(1, toInt(it.pack_size, 1))}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                          {formatQty(it)}
                        </td>
                      </tr>
                    ))}
                    {!items.length && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}
                        >
                          No items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}

          {!printableNotes.length && (
            <div style={{ fontSize: 12 }}>
              No adjustment notes for the selected filters.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
