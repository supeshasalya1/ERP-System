// client/src/Pages/Admin/AdminUnloadNotes.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  return Number.isFinite(n) ? n : d;
};

const AdminUnloadNotes = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");

  const supplierNameFor = (note) => {
    const direct =
      note?.supplier_name ||
      note?.supplier ||
      note?.supplierName ||
      note?.supplier?.name ||
      note?.supplier?.supplier_name ||
      note?.supplier?.supplierName;
    if (direct) return direct;

    const sid =
      note?.supplier_id ||
      note?.supplierId ||
      note?.supplierid ||
      note?.supplierID ||
      note?.supplier_code ||
      note?.supplier?.id;
    if (!sid) return "-";

    const match = suppliers.find(
      (s) =>
        String(s.supplier_id) === String(sid) ||
        String(s.id) === String(sid)
    );
    return match?.name || match?.supplier_name || String(sid);
  };

  // details cache: unload_id -> items[]
  const [itemsByNote, setItemsByNote] = useState({});
  const [expanded, setExpanded] = useState({}); // unload_id -> bool
  const [viewMode, setViewMode] = useState("table"); // "cards" | "table"
  const [printTarget, setPrintTarget] = useState(null);

  // focus first filter (from date)
  const startDateRef = useRef(null);
  const listRef = useRef(null);

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  // helper: support both id and unload_id from backend
  const getNoteId = (n) => n.id ?? n.unload_id;

  const fetchFilters = async () => {
    try {
      const supRes = await axios.get("/api/suppliers/list", { headers });
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
    } catch (err) {
      console.error("Error fetching supplier dropdowns:", err);
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
      if (supplierId) params.supplier_id = supplierId;

      // 🔁 admin route, not user route
      const res = await axios.get("/api/admin/unload-notes", {
        headers,
        params,
      });
      setNotes(res.data || []);
      setMessage("");
    } catch (err) {
      console.error("Error fetching unload notes (admin):", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      } else {
        setMessage("❌ Failed to load unload notes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (unloadId) => {
    if (itemsByNote[unloadId]) return; // cached
    try {
      // reuse existing items endpoint
      const res = await axios.get(`/api/unload/${unloadId}/items`, { headers });
      const list = Array.isArray(res.data) ? res.data : [];
      setItemsByNote((m) => ({ ...m, [unloadId]: list }));
    } catch (err) {
      console.error("Error loading unload items:", err);
      setItemsByNote((m) => ({ ...m, [unloadId]: [] }));
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchNotes();
    const resetPrint = () => setPrintTarget(null);
    window.addEventListener("afterprint", resetPrint);
    return () => window.removeEventListener("afterprint", resetPrint);
    setTimeout(() => {
      startDateRef.current?.focus();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = async (unloadId) => {
    setExpanded((e) => ({ ...e, [unloadId]: !e[unloadId] }));
    if (!itemsByNote[unloadId]) {
      await fetchItems(unloadId);
    }
  };

  const handlePrintList = async () => {
    // Preload items so list print tables show products
    await Promise.all(
      (notes || []).map((n) => {
        const id = getNoteId(n);
        return itemsByNote[id] ? Promise.resolve() : fetchItems(id);
      })
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

  const printableNotes = useMemo(() => {
    if (!printTarget) return notes;
    return notes.filter((n) => String(getNoteId(n)) === String(printTarget));
  }, [notes, printTarget]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  };

  // ---------- Item header + row ----------
  const ItemHeader = () => (
    <div className="grid grid-cols-[1.2fr_3fr_1fr_2fr] gap-3 py-2 border-b text-base font-semibold text-gray-700">
      <div>Code</div>
      <div>Product</div>
      <div>Pack</div>
      <div>Returned</div>
    </div>
  );

  const ItemRow = ({ it }) => {
    const pack = Math.max(1, toInt(it.pack_size, 1));
    const pcs = toInt(it.quantity_returned, 0);
    const boxes = toInt(it.boxes_returned, 0);
    const items = toInt(it.items_returned, 0);

    return (
      <div className="grid grid-cols-[1.2fr_3fr_1fr_2fr] gap-3 py-2 border-b text-base">
        <div className="font-mono text-sm text-gray-700">
          {it.product_code || "-"}
        </div>
        <div className="font-medium truncate">{it.product_name}</div>
        <div>{pack}</div>
        <div>
          <b>
            {boxes} box{boxes === 1 ? "" : "es"} + {items} pcs
          </b>{" "}
          <span className="text-gray-500">({pcs} pcs)</span>
        </div>
      </div>
    );
  };

  const supplierLabel = supplierId
    ? suppliers.find((s) => String(s.supplier_id) === String(supplierId))?.name || supplierId
    : "All suppliers";
  const dateLabel = dateRange.start && dateRange.end
    ? `${dateRange.start} to ${dateRange.end}`
    : "All dates";

  const formatQty = (it) => {
    const pack = Math.max(1, toInt(it.pack_size, 1));
    const pcs = toInt(it.quantity_returned, 0);
    const boxes = toInt(it.boxes_returned, Math.floor(pcs / pack));
    const items = toInt(it.items_returned, pcs % pack);
    return `${boxes} boxes + ${items} pcs (pcs: ${pcs})`;
  };

  return (
    <>
      <div className="no-print">
        <AdminNavbar />
        <div className="p-6 max-w-[1400px] w-full mx-auto">
          <div ref={listRef} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              🧾 Admin – Unload Notes
            </h2>
            <div className="flex gap-3">
              <button
                onClick={handlePrintList}
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 text-lg"
              >
                Print List
              </button>
              <button
                onClick={() =>
                  setViewMode(viewMode === "cards" ? "table" : "cards")
                }
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 text-lg"
              >
                {viewMode === "cards" ? "Table View" : "Card View"}
              </button>
              {/* Admin should NOT create unload notes from here */}
            </div>
          </div>

          {/* Filters – dates + supplier */}
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                From date
              </label>
              <input
                ref={startDateRef}
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="border border-gray-300 px-3 py-2 rounded-xl text-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="border border-gray-300 px-3 py-2 rounded-xl text-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-lg min-w-[240px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchNotes}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 text-lg"
            >
              Apply
            </button>
          </div>

          {loading && (
            <div className="text-gray-500 mb-4 text-lg">Loading…</div>
          )}

          {/* ================== CARDS VIEW ================== */}
          {viewMode === "cards" && (
            <div className="grid 2xl:grid-cols-2 gap-6">
              {notes.map((n) => {
                const noteId = getNoteId(n);
                return (
                  <div
                    key={noteId}
                    id={`admin-unload-card-${noteId}`}
                    className="border rounded-2xl p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-xl tracking-tight">
                          {n.unload_no}
                        </div>
                        <div className="text-gray-700 text-lg">
                          <span className="font-medium">Date:</span>{" "}
                          {formatDate(n.unload_date || n.created_at)}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Lorry:</span>{" "}
                          {n.lorry_no || "-"}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Supplier:</span>{" "}
                          {supplierNameFor(n)}
                        </div>
                        <div className="text-gray-700 text-lg">
                          <span className="font-medium">Issue:</span>{" "}
                          {n.issue_no || n.issue_id}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Items:</span>{" "}
                          {n.item_count}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Total returned:</span>{" "}
                          {n.total_pcs} pcs
                        </div>
                        <div className="text-gray-700 text-lg">
                          <span className="font-medium">Created by:</span>{" "}
                          {n.created_by_username || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-base"
                        onClick={() => toggleExpand(noteId)}
                      >
                        {expanded[noteId] ? "Hide" : "View"} items
                      </button>
                      <button
                        className="border px-4 py-2 rounded-lg hover:bg-gray-50 text-base"
                        onClick={() => handlePrintSingle(noteId)}
                      >
                        Print
                      </button>
                    </div>

                    {expanded[noteId] && (
                      <div className="mt-5 rounded-xl border p-4 bg-gray-50">
                        <ItemHeader />
                        {(itemsByNote[noteId] || []).map((it) => (
                          <ItemRow
                            it={it}
                            key={`${noteId}-${it.product_id}-${it.pack_size}`}
                          />
                        ))}

                        {!(itemsByNote[noteId] || []).length && (
                          <div className="text-center text-gray-500 py-4 text-base">
                            No items
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!notes.length && !loading && (
                <div className="text-gray-500 col-span-full text-center text-lg">
                  No unload notes found
                </div>
              )}
            </div>
          )}

          {/* ================== TABLE VIEW ================== */}
          {viewMode === "table" && (
            <div className="overflow-auto">
              <table className="w-full border text-lg">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-3 border">Unload No</th>
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Issue No</th>
                    <th className="p-3 border">Lorry</th>
                    <th className="p-3 border">Supplier</th>
                    <th className="p-3 border">Items</th>
                    <th className="p-3 border">Total pcs</th>
                    <th className="p-3 border">Created by</th>
                    <th className="p-3 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => {
                    const noteId = getNoteId(n);
                    return (
                      <React.Fragment key={noteId}>
                        <tr className="odd:bg-white even:bg-gray-50">
                          <td className="p-3 border font-semibold">
                            {n.unload_no}
                          </td>
                          <td className="p-3 border">{formatDate(n.unload_date || n.created_at)}</td>
                          <td className="p-3 border">{n.issue_no || n.issue_id}</td>
                          <td className="p-3 border">{n.lorry_no || "-"}</td>
                          <td className="p-3 border">{supplierNameFor(n)}</td>
                          <td className="p-3 border">{n.item_count}</td>
                          <td className="p-3 border">{n.total_pcs}</td>
                          <td className="p-3 border">
                            {n.created_by_username || "-"}
                          </td>
                          <td className="p-3 border whitespace-nowrap">
                            <button
                              onClick={() => toggleExpand(noteId)}
                              className="border px-3 py-1 rounded hover:bg-gray-50"
                            >
                              {expanded[noteId] ? "Hide Items" : "View Items"}
                            </button>
                            <button
                              onClick={() => handlePrintSingle(noteId)}
                              className="ml-2 border px-3 py-1 rounded hover:bg-gray-50"
                            >
                              Print
                            </button>
                          </td>
                        </tr>

                        {/* Expanded items row */}
                        {expanded[noteId] && (
                          <tr className="bg-gray-50">
                            <td className="p-0 border-t" colSpan={9}>
                              <div className="p-4">
                                <ItemHeader />
                                {(itemsByNote[noteId] || []).map((it) => (
                                  <ItemRow
                                    it={it}
                                    key={`${noteId}-${it.product_id}-${it.pack_size}`}
                                  />
                                ))}

                                {!(itemsByNote[noteId] || []).length && (
                                  <div className="text-center text-gray-500 py-4">
                                    No items
                                  </div>
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
                      <td
                        className="text-center text-gray-500 p-3"
                        colSpan={9}
                      >
                        No unload notes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {message && (
            <p
              className={`text-center mt-5 text-lg font-medium ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
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
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>Admin – Unload Notes</div>
          </div>

          {!printTarget && (
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div>Date range: {dateLabel}</div>
              <div>Supplier: {supplierLabel}</div>
              <div>Printed: {new Date().toLocaleString()}</div>
            </div>
          )}

          {printableNotes.map((n) => {
            const id = getNoteId(n);
            const items = itemsByNote[id] || [];
            const showPerNotePrinted = Boolean(printTarget); // only for single-note prints
            return (
              <div key={`print-${id}`} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Unload: {n.unload_no || id}</div>
                    <div>Date: {formatDate(n.unload_date || n.created_at)}</div>
                    <div>Issue: {n.issue_no || n.issue_id || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Supplier: {supplierNameFor(n)}</div>
                    <div>Lorry: {n.lorry_number || n.lorry_no || "-"}</div>
                    <div>Created by: {n.created_by_username || "-"}</div>
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
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Returned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`print-${id}-${idx}`}>
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
            <div style={{ fontSize: 12 }}>No unload notes for the selected filters.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminUnloadNotes;
