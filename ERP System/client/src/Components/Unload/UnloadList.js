// client/src/Components/UNLOAD/UNList.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const SHOP_DETAILS = {
  name: "LEELARATHNE & SONS",
  address: "No. 605 B, Galle Road, Katubedda",
  tel: "0117539810 , 0112614171",
};

const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const UnloadNoteList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const getNoteId = (note) => note?.unload_id ?? note?.id;
  const issueRefFor = (note) =>
    note?.issue_no ||
    note?.issue_number ||
    note?.issue ||
    note?.issue_ref ||
    note?.issueNo ||
    note?.issueRef ||
    note?.issue_id ||
    note?.issueId ||
    note?.issueID ||
    "-";
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
      note?.supplier_id_fk ||
      note?.supplier_code ||
      note?.supplier?.id;
    if (!sid) return "-";

    const match = suppliers.find(
      (s) =>
        String(s.supplier_id) === String(sid) ||
        String(s.id) === String(sid)
    );
    return (
      match?.name ||
      match?.supplier_name ||
      match?.supplierName ||
      String(sid)
    );
  };

  const listRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");

  // details cache: unload_id -> items[]
  const [itemsByNote, setItemsByNote] = useState({});
  const [expanded, setExpanded] = useState({}); // unload_id -> bool
  const [viewMode, setViewMode] = useState("table"); // "cards" | "table"
  const [printTarget, setPrintTarget] = useState(null);

  // focus first filter (from date)
  const startDateRef = useRef(null);

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

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

      const res = await axios.get("/api/unload/list", { headers, params });
      setNotes(res.data || []);
      setMessage("");
    } catch (err) {
      console.error("Error fetching unload notes:", err);
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
      const res = await axios.get(`/api/unload/${unloadId}/items`, { headers });
      const list = Array.isArray(res.data) ? res.data : [];
      setItemsByNote((m) => ({ ...m, [unloadId]: list }));
    } catch (err) {
      console.error("Error loading unload items:", err);
      setItemsByNote((m) => ({ ...m, [unloadId]: [] }));
    }
  };

  useEffect(() => {
    (async () => {
      await fetchFilters();
      await fetchNotes();
    })();
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
    // Preload items so print list tables are populated
    await Promise.all(
      (notes || []).map((n) => {
        const nid = getNoteId(n);
        return itemsByNote[nid] ? Promise.resolve() : fetchItems(nid);
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

  // ---------- Item header + row (same layout, but for returned qty) ----------
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
        <Navbar />
        <div className="p-6 max-w-[1400px] w-full mx-auto">
          <div ref={listRef} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          {/* Header – same style as Issue Notes */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              🧾 Unload Notes
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
              <button
                onClick={() => navigate("/unload/create")} // adjust route if different
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-lg"
              >
                + Create Unload Note
              </button>
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
              {notes.map((n) => (
                <div
                  key={n.id}
                  id={`unload-card-${n.id}`}
                  className="border rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-xl tracking-tight">
                        {n.unload_no}
                      </div>
                      <div className="text-gray-700 text-lg">
                        <span className="font-medium">Date:</span>{" "}
                        {n.unload_date}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Lorry:</span>{" "}
                        {n.lorry_no || "-"}
                      </div>
                      <div className="text-gray-700 text-lg">
                        <span className="font-medium">Supplier:</span>{" "}
                        {supplierNameFor(n)}
                      </div>
                      <div className="text-gray-700 text-lg">
                        <span className="font-medium">Issue Note:</span>{" "}
                        {issueRefFor(n)}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Items:</span>{" "}
                        {n.item_count}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Total returned:</span>{" "}
                        {n.total_pcs} pcs
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-base"
                      onClick={() => toggleExpand(getNoteId(n))}
                    >
                      {expanded[n.id] ? "Hide" : "View"} items
                    </button>
                    <button
                      className="border px-4 py-2 rounded-lg hover:bg-gray-50 text-base"
                      onClick={() => handlePrintSingle(getNoteId(n))}
                    >
                      Print
                    </button>
                  </div>

                  {expanded[getNoteId(n)] && (
                    <div className="mt-5 rounded-xl border p-4 bg-gray-50">
                      <ItemHeader />
                      {(itemsByNote[getNoteId(n)] || []).map((it) => (
                        <ItemRow
                          it={it}
                          key={`${getNoteId(n)}-${it.product_id}-${it.pack_size}`}
                        />
                      ))}

                      {!(itemsByNote[getNoteId(n)] || []).length && (
                        <div className="text-center text-gray-500 py-4 text-base">
                          No items
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
                    <th className="p-3 border">Issue Note</th>
                    <th className="p-3 border">Lorry</th>
                    <th className="p-3 border">Supplier</th>
                    <th className="p-3 border">Items</th>
                    <th className="p-3 border">Total pcs</th>
                    <th className="p-3 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => (
                    <React.Fragment key={n.id}>
                      <tr className="odd:bg-white even:bg-gray-50">
                        <td className="p-3 border font-semibold">
                          {n.unload_no}
                        </td>
                        <td className="p-3 border">{n.unload_date}</td>
                        <td className="p-3 border">{issueRefFor(n)}</td>
                        <td className="p-3 border">{n.lorry_no || "-"}</td>
                        <td className="p-3 border">{supplierNameFor(n)}</td>
                        <td className="p-3 border">{n.item_count}</td>
                        <td className="p-3 border">{n.total_pcs}</td>
                        <td className="p-3 border whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(getNoteId(n))}
                            className="border px-3 py-1 rounded hover:bg-gray-50"
                          >
                            {expanded[getNoteId(n)] ? "Hide Items" : "View Items"}
                          </button>
                          <button
                            onClick={() => handlePrintSingle(getNoteId(n))}
                            className="ml-2 border px-3 py-1 rounded hover:bg-gray-50"
                          >
                            Print
                          </button>
                        </td>
                      </tr>

                      {/* Expanded items row */}
                      {expanded[getNoteId(n)] && (
                        <tr className="bg-gray-50">
                          <td className="p-0 border-t" colSpan={8}>
                            <div className="p-4">
                              <ItemHeader />
                              {(itemsByNote[getNoteId(n)] || []).map((it) => (
                                <ItemRow
                                  it={it}
                                  key={`${getNoteId(n)}-${it.product_id}-${it.pack_size}`}
                                />
                              ))}

                              {!(itemsByNote[getNoteId(n)] || []).length && (
                                <div className="text-center text-gray-500 py-4">
                                  No items
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {!notes.length && !loading && (
                    <tr>
                      <td
                        className="text-center text-gray-500 p-3"
                        colSpan={7}
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
                message.startsWith("✅")
                  ? "text-green-600"
                  : "text-red-600"
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
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>Unload Notes</div>
          </div>

          {!printTarget && (
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div>Date range: {dateLabel}</div>
              <div>Supplier: {supplierLabel}</div>
              <div>Printed: {new Date().toLocaleString()}</div>
            </div>
          )}

          {printableNotes.map((n) => {
            const noteId = getNoteId(n);
            const items = itemsByNote[noteId] || [];
            const showPerNotePrinted = Boolean(printTarget); // only on single-note prints
            return (
              <div key={`print-${noteId}`} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Unload: {n.unload_no || noteId}</div>
                    <div>Issue Note: {issueRefFor(n)}</div>
                    <div>Date: {formatDate(n.unload_date || n.created_at)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Supplier: {supplierNameFor(n)}</div>
                    <div>Lorry: {n.lorry_number || n.lorry_no || n.lorry_name || "-"}</div>
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
                      <tr key={`print-${noteId}-${idx}`}>
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

export default UnloadNoteList;
