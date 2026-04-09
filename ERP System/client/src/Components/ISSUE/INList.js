// client/src/Components/ISSUE/INList.js
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
  return Number.isFinite(Number(v)) ? Number(v) : d;
};

const IssueNoteList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");

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
      note?.supplierID;
    if (!sid) return "-";

    const match = suppliers.find(
      (s) =>
        String(s.supplier_id) === String(sid) ||
        String(s.id) === String(sid)
    );
    return match?.name || match?.supplier_name || String(sid);
  };

  // details cache: issue_id -> items[]
  const [itemsByNote, setItemsByNote] = useState({});
  const [expanded, setExpanded] = useState({}); // issue_id -> bool
  const [viewMode, setViewMode] = useState("table"); // "cards" | "table"
  const [printTarget, setPrintTarget] = useState(null); // null = full list, id = single issue note

  // focus first filter (from date)
  const startDateRef = useRef(null);
  const listRef = useRef(null);

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchFilters = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        axios.get("/api/suppliers/list", { headers }),
        axios.get("/api/products/list", { headers }),
      ]);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (err) {
      console.error("Error fetching filter dropdowns:", err);
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
      if (productId) params.product_id = productId;

      const res = await axios.get("/api/issue/list", { headers, params });
      setNotes(res.data || []);
      setMessage("");
    } catch (err) {
      console.error("Error fetching issue notes:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      } else {
        setMessage("❌ Failed to load issue notes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (issueId) => {
    if (itemsByNote[issueId]) return; // cached
    try {
      const res = await axios.get(`/api/issue/${issueId}/items`, { headers });
      const list = Array.isArray(res.data) ? res.data : [];
      setItemsByNote((m) => ({ ...m, [issueId]: list }));
    } catch (err) {
      console.error("Error loading items:", err);
      setItemsByNote((m) => ({ ...m, [issueId]: [] }));
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchNotes();
    const resetPrint = () => setPrintTarget(null);
    window.addEventListener("afterprint", resetPrint);
    return () => window.removeEventListener("afterprint", resetPrint);
    // focus first filter (from date) – so tab navigation starts inside page, not navbar
    setTimeout(() => {
      startDateRef.current?.focus();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = async (issueId) => {
    setExpanded((e) => ({ ...e, [issueId]: !e[issueId] }));
    if (!itemsByNote[issueId]) {
      await fetchItems(issueId);
    }
  };

  const handlePrintList = async () => {
    // Load items for all notes so the print list tables are populated
    await Promise.all(
      (notes || []).map((n) =>
        itemsByNote[n.issue_id] ? Promise.resolve() : fetchItems(n.issue_id)
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

  const printableNotes = useMemo(() => {
    if (!printTarget) return notes;
    return notes.filter((n) => String(n.issue_id) === String(printTarget));
  }, [notes, printTarget]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  };

  // ---------- Item header + row (clean grid, matches GRN style) ----------
  const ItemHeader = () => (
    <div className="grid grid-cols-[1.2fr_3fr_1fr_2fr] gap-3 py-2 border-b text-base font-semibold text-gray-700">
      <div>Code</div>
      <div>Product</div>
      <div>Pack</div>
      <div>Issued</div>
    </div>
  );

  const ItemRow = ({ it }) => {
    const pack = Math.max(1, toInt(it.display_pack, 1));
    const pcs = toInt(it.pcs_sent, 0);
    const boxes = Math.floor(pcs / pack);
    const items = pcs % pack;

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
  const productLabel = productId
    ? products.find((p) => String(p.product_id) === String(productId))?.product_name || productId
    : "All products";
  const dateLabel = dateRange.start && dateRange.end
    ? `${dateRange.start} to ${dateRange.end}`
    : "All dates";

  const formatQty = (it) => {
    const pack = Math.max(1, toInt(it.display_pack, 1));
    const pcs = toInt(it.pcs_sent, 0);
    const boxes = Math.floor(pcs / pack);
    const items = pcs % pack;
    return `${boxes} boxes + ${items} pcs (pcs: ${pcs})`;
  };

  return (
    <>
    <div className="no-print">
      <Navbar />
      <div className="p-6 max-w-[1400px] w-full mx-auto">
        <div ref={listRef} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          {/* Header – match Create Issue / GRN */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              🧾 Issue Notes
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
                onClick={() => navigate("/in/add")}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-lg"
              >
                + Create Issue Note
              </button>
            </div>
          </div>

          {/* Filters – dates + supplier + product (similar to GRN list) */}
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

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-xl text-lg min-w-[280px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name}
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
                          key={n.issue_id}
                          id={`issue-card-${n.issue_id}`}
                          className="border rounded-2xl p-6 shadow-sm"
                        >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-xl tracking-tight">
                        {n.issue_no}
                      </div>
                      <div className="text-gray-700 text-lg">
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(n.created_at).toLocaleString()}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Lorry:</span>{" "}
                        {n.lorry_no || "-"}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Supplier:</span>{" "}
                        {supplierNameFor(n)}
                      </div>
                      <div className="text-gray-700 text-lg">
                        <span className="font-medium">Authenticator:</span>{" "}
                        {n.authenticator}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Items:</span>{" "}
                        {n.item_count}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-base"
                      onClick={() => toggleExpand(n.issue_id)}
                    >
                      {expanded[n.issue_id] ? "Hide" : "View"} items
                    </button>
                  </div>

                  {expanded[n.issue_id] && (
                    <div className="mt-5 rounded-xl border p-4 bg-gray-50">
                      <ItemHeader />
                    <button
                      className="border px-4 py-2 rounded-lg hover:bg-gray-50 text-base"
                      onClick={() => handlePrintSingle(n.issue_id)}
                    >
                      Print
                    </button>
                      {(itemsByNote[n.issue_id] || []).map((it) => (
                      <ItemRow
                        it={it}
                        key={`${n.issue_id}-${it.product_id}-${it.display_pack}`}
                      />
                    ))}

                      {!(itemsByNote[n.issue_id] || []).length && (
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
                  No issue notes found
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
                    <th className="p-3 border">Issue No</th>
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Lorry</th>
                    <th className="p-3 border">Supplier</th>
                    <th className="p-3 border">Authenticator</th>
                    <th className="p-3 border">Items</th>
                    <th className="p-3 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => (
                    <React.Fragment key={n.issue_id}>
                      <tr className="odd:bg-white even:bg-gray-50">
                        <td className="p-3 border font-semibold">
                          {n.issue_no}
                        </td>
                        <td className="p-3 border">
                          {new Date(n.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 border">
                          {n.lorry_no || "-"}
                        </td>
                        <td className="p-3 border">{supplierNameFor(n)}</td>
                        <td className="p-3 border">
                          {n.authenticator}
                        </td>
                        <td className="p-3 border">
                          {n.item_count}
                        </td>
                        <td className="p-3 border whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(n.issue_id)}
                            className="border px-3 py-1 rounded hover:bg-gray-50"
                          >
                            {expanded[n.issue_id]
                              ? "Hide Items"
                              : "View Items"}
                          </button>
                          <button
                            onClick={() => handlePrintSingle(n.issue_id)}
                            className="ml-2 border px-3 py-1 rounded hover:bg-gray-50"
                          >
                            Print
                          </button>
                        </td>
                      </tr>

                      {/* Expanded items row */}
                      {expanded[n.issue_id] && (
                        <tr className="bg-gray-50">
                          <td className="p-0 border-t" colSpan={7}>
                            <div className="p-4">
                              <ItemHeader />
                              {(itemsByNote[n.issue_id] || []).map((it) => (
                                <ItemRow
                                  it={it}
                                  key={`${n.issue_id}-${it.product_id}-${it.display_pack}`}
                                />
                              ))}

                              {!(itemsByNote[n.issue_id] || []).length && (
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
                        colSpan={6}
                      >
                        No issue notes found
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
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>Issue Notes</div>
          </div>

          {!printTarget && (
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div>Date range: {dateLabel}</div>
              <div>Supplier: {supplierLabel}</div>
              <div>Product: {productLabel}</div>
              <div>Printed: {new Date().toLocaleString()}</div>
            </div>
          )}

          {printableNotes.map((n) => {
            const items = itemsByNote[n.issue_id] || [];
            const showPerNotePrinted = Boolean(printTarget); // only show on single-note print
            return (
              <div key={`print-${n.issue_id}`} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Issue: {n.issue_no}</div>
                    <div>Date: {formatDate(n.created_at)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Lorry: {n.lorry_no || "-"}</div>
                    <div>Supplier: {supplierNameFor(n)}</div>
                    <div>Authenticator: {n.authenticator || "-"}</div>
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
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`print-${n.issue_id}-${idx}`}>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>{it.product_code}</td>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>{it.product_name}</td>
                        <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                          {Math.max(1, toInt(it.display_pack, 1))}
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
            <div style={{ fontSize: 12 }}>No issue notes for the selected filters.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default IssueNoteList;
