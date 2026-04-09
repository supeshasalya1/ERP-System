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
  return Number.isFinite(n) ? Number(n) : d;
};

export default function AdminGrns() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const listRef = useRef(null);

  const [grns, setGrns] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // details cache: grn_id -> items[]
  const [itemsByGrn, setItemsByGrn] = useState({});
  const [expanded, setExpanded] = useState({}); // grn_id -> bool
  const [viewMode, setViewMode] = useState("table"); // "cards" | "table"
  const [printTarget, setPrintTarget] = useState(null);

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchGrns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start) params.start = dateRange.start;
      if (dateRange.end) params.end = dateRange.end;
      if (productId) params.product_id = productId;
      if (supplierId) params.supplier_id = supplierId;

      const res = await axios.get("/api/admin/grns", { headers, params });
      const data = Array.isArray(res.data) ? res.data : [];

      // Keep full list visible; only prefetch item details for first few rows.
      const prefetched = await Promise.all(
        data.slice(0, 10).map(async (g) => {
          try {
            const ir = await axios.get(`/api/admin/grns/${g.grn_id}/items`, {
              headers,
            });
            return { ...g, __items: Array.isArray(ir.data) ? ir.data : [] };
          } catch {
            return { ...g, __items: [] };
          }
        })
      );

      setGrns(data);
      const primed = {};
      prefetched.forEach((g) => {
        primed[g.grn_id] = g.__items;
      });
      setItemsByGrn((m) => ({ ...m, ...primed }));
      setMessage("");
    } catch (err) {
      console.error("Error fetching admin GRNs:", err);
      if (err.response?.status === 401 || err.response?.status === 403)
        safeLogout();
      else setMessage("❌ Failed to load GRNs (admin).");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/api/products/list", { headers });
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching products:", err);
      if (err.response?.status === 401 || err.response?.status === 403)
        safeLogout();
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get("/api/suppliers/list", { headers });
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      if (err.response?.status === 401 || err.response?.status === 403)
        safeLogout();
    }
  };

  const fetchItems = async (grnId) => {
    if (itemsByGrn[grnId]) return; // cached already
    try {
      const res = await axios.get(`/api/admin/grns/${grnId}/items`, {
        headers,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setItemsByGrn((m) => ({ ...m, [grnId]: list }));
    } catch (err) {
      console.error("Error loading GRN items (admin):", err);
      setItemsByGrn((m) => ({ ...m, [grnId]: [] }));
    }
  };

  useEffect(() => {
    (async () => {
      await fetchProducts();
      await fetchSuppliers();
      await fetchGrns();
    })();
    const resetPrint = () => setPrintTarget(null);
    window.addEventListener("afterprint", resetPrint);
    return () => window.removeEventListener("afterprint", resetPrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = async (grnId) => {
    setExpanded((e) => ({ ...e, [grnId]: !e[grnId] }));
    if (!itemsByGrn[grnId]) {
      await fetchItems(grnId);
    }
  };

  const handlePrintList = () => {
    setPrintTarget(null);
    setTimeout(() => window.print(), 0);
  };

  const handlePrintSingle = async (id) => {
    if (!itemsByGrn[id]) {
      await fetchItems(id);
    }
    setPrintTarget(id);
    setTimeout(() => window.print(), 0);
  };

  const printableGrns = useMemo(() => {
    if (!printTarget) return grns;
    return grns.filter((g) => String(g.grn_id) === String(printTarget));
  }, [grns, printTarget]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  };

  // ---- ITEM ROW (shared for both views) ----
  const ItemRow = ({ it }) => {
    const pack = Math.max(1, toInt(it.pack_size, 1));
    const pcs = toInt(it.quantity_received, 0);
    const boxes = toInt(
      it.boxes_received,
      Math.floor(pcs / (pack || 1))
    );
    const items = toInt(it.items_received, pcs % (pack || 1));

    return (
      <div className="grid grid-cols-5 gap-2 py-2 border-b text-base items-center">
        <div className="font-mono text-sm text-gray-700">{it.product_code}</div>
        <div className="col-span-2 text-gray-900">{it.product_name}</div>
        <div className="text-gray-800">Pack: {pack}</div>
        <div>
          <span className="font-semibold">
            {boxes} box{boxes === 1 ? "" : "es"} + {items} pcs
          </span>
          <span className="text-gray-500"> ({pcs} pcs)</span>
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

  const formatQty = (item) => {
    const pack = Math.max(1, toInt(item.pack_size, 1));
    const pcs = toInt(item.quantity_received, 0);
    const boxes = toInt(item.boxes_received, Math.floor(pcs / pack));
    const items = toInt(item.items_received, pcs % pack);
    return `${boxes} boxes + ${items} pcs (pcs: ${pcs})`;
  };

  return (
    <>
    <div className="no-print">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📦</span>
            <h1 className="text-4xl font-semibold text-gray-800">
              Admin – GRNs
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrintList}
              className="border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 text-lg"
            >
              Print List
            </button>
            <button
              onClick={() =>
                setViewMode((mode) => (mode === "cards" ? "table" : "cards"))
              }
              className="border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 text-lg"
            >
              {viewMode === "cards" ? "Table View" : "Card View"}
            </button>
          </div>
        </div>

        {/* Main card */}
        <div ref={listRef} className="bg-white rounded-2xl shadow-md p-6 md:p-10">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="border border-gray-300 px-3 py-2 rounded-xl text-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="border border-gray-300 px-3 py-2 rounded-xl text-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Supplier filter */}
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-xl text-lg min-w-[240px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Product filter */}
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-xl text-lg min-w-[280px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_code
                    ? `${p.product_code} – ${p.product_name || p.name}`
                    : p.product_name || p.name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchGrns}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 text-lg"
            >
              Apply
            </button>
          </div>

          {loading && (
            <div className="text-gray-500 mb-4 text-lg">Loading…</div>
          )}

          {/* CARDS VIEW */}
          {viewMode === "cards" && (
            <div className="grid 2xl:grid-cols-2 gap-6">
              {grns.map((g) => (
                <div
                  key={g.grn_id}
                  id={`admin-grn-card-${g.grn_id}`}
                  className="border border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="text-xl tracking-tight">{g.grn_no}</div>
                    <div className="text-gray-700 text-lg">
                      <span className="font-medium">Date:</span>{" "}
                      {g.grn_date
                        ? new Date(g.grn_date).toLocaleDateString()
                        : "-"}
                      <span className="mx-2">•</span>
                      <span className="font-medium">Supplier:</span>{" "}
                      {g.supplier_name || "-"}
                      <span className="mx-2">•</span>
                      <span className="font-medium">Lorry:</span>{" "}
                      {g.lorry_no || g.lorry_name || "-"}
                    </div>
                    <div className="text-gray-700 text-lg">
                      <span className="font-medium">Items:</span>{" "}
                      {g.item_count ?? (itemsByGrn[g.grn_id]?.length || 0)}
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-base"
                      onClick={() => toggleExpand(g.grn_id)}
                    >
                      {expanded[g.grn_id] ? "Hide items" : "View items"}
                    </button>
                    <button
                      className="border px-4 py-2 rounded-lg hover:bg-gray-50 text-base"
                      onClick={() => handlePrintSingle(g.grn_id)}
                    >
                      Print
                    </button>
                  </div>

                  {expanded[g.grn_id] && (
                    <div className="mt-5 rounded-xl border border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-5 gap-2 py-2 border-b text-base font-semibold text-gray-700">
                        <div>Product Code</div>
                        <div className="col-span-2">Product Name</div>
                        <div>Pack</div>
                        <div>Received</div>
                      </div>
                      {(itemsByGrn[g.grn_id] || []).map((it) => (
                        <ItemRow it={it} key={`${g.grn_id}-${it.entry_id}`} />
                      ))}
                      {!(itemsByGrn[g.grn_id] || []).length && (
                        <div className="text-center text-gray-500 py-4 text-base">
                          No items
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!grns.length && !loading && (
                <div className="text-gray-500 col-span-full text-center text-lg">
                  No GRNs found
                </div>
              )}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === "table" && (
            <div className="overflow-auto">
              <table className="w-full border border-gray-200 text-lg">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-3 border border-gray-200">GRN No</th>
                    <th className="p-3 border border-gray-200">Date</th>
                    <th className="p-3 border border-gray-200">Supplier</th>
                    <th className="p-3 border border-gray-200">Lorry</th>
                    <th className="p-3 border border-gray-200">Items</th>
                    <th className="p-3 border border-gray-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((g) => (
                    <React.Fragment key={g.grn_id}>
                      <tr className="odd:bg-white even:bg-gray-50">
                        <td className="p-3 border border-gray-200 font-semibold">
                          {g.grn_no}
                        </td>
                        <td className="p-3 border border-gray-200">
                          {g.grn_date
                            ? new Date(g.grn_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-3 border border-gray-200">
                          {g.supplier_name || "-"}
                        </td>
                        <td className="p-3 border border-gray-200">
                          {g.lorry_no || g.lorry_name || "-"}
                        </td>
                        <td className="p-3 border border-gray-200">
                          {g.item_count ?? (itemsByGrn[g.grn_id]?.length || 0)}
                        </td>
                        <td className="p-3 border border-gray-200 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(g.grn_id)}
                            className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-base"
                          >
                            {expanded[g.grn_id] ? "Hide Items" : "View Items"}
                          </button>
                          <button
                            onClick={() => handlePrintSingle(g.grn_id)}
                            className="ml-2 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-base"
                          >
                            Print
                          </button>
                        </td>
                      </tr>

                      {expanded[g.grn_id] && (
                        <tr className="bg-gray-50">
                          <td
                            className="p-0 border-t border-gray-200"
                            colSpan={6}
                          >
                            <div className="p-4">
                              <div className="grid grid-cols-5 gap-2 py-2 border-b font-semibold text-gray-700">
                                <div>Product Code</div>
                                <div className="col-span-2">
                                  Product Name
                                </div>
                                <div>Pack</div>
                                <div>Received</div>
                              </div>
                              {(itemsByGrn[g.grn_id] || []).map((it) => (
                                <ItemRow
                                  it={it}
                                  key={`${g.grn_id}-${it.entry_id}`}
                                />
                              ))}
                              {!(itemsByGrn[g.grn_id] || []).length && (
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

                  {!grns.length && !loading && (
                    <tr>
                      <td
                        className="text-center text-gray-500 p-3"
                        colSpan={6}
                      >
                        No GRNs found
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
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>Admin – Goods Received Notes</div>
          </div>

          {!printTarget && (
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div>Date range: {dateLabel}</div>
              <div>Supplier: {supplierLabel}</div>
              <div>Product: {productLabel}</div>
              <div>Printed: {new Date().toLocaleString()}</div>
            </div>
          )}

          {printableGrns.map((g) => {
            const items = itemsByGrn[g.grn_id] || [];
            const showPerNotePrinted = Boolean(printTarget); // only for single-GRN prints
            return (
              <div key={`print-${g.grn_id}`} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>GRN: {g.grn_no}</div>
                    <div>Date: {formatDate(g.grn_date)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Supplier: {g.supplier_name || "-"}</div>
                    <div>Lorry: {g.lorry_number || g.lorry_no || "-"}</div>
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
                      <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`print-${g.grn_id}-${idx}`}>
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

          {!printableGrns.length && (
            <div style={{ fontSize: 12 }}>No GRNs for the selected filters.</div>
          )}
        </div>
      </div>
    </>
  );
}
