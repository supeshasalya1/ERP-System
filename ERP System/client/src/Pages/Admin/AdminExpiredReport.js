// client/src/Pages/Admin/AdminExpiredReport.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

const SHOP_DETAILS = {
  name: "LEELARATHNE & SONS",
  address: "No. 605 B, Galle Road, Katubedda",
  tel: "0117539810 , 0112614171",
};

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const toDateOnly = (value) => {
  if (!value) return "";
  const dateObj = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "";
  return dateObj.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "-";
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return value;
  return dateObj.toLocaleDateString();
};

const formatBoxesItems = (boxes, items) => {
  const b = asInt(boxes);
  const i = asInt(items);
  return `${b} box${b === 1 ? "" : "es"} + ${i} item${i === 1 ? "" : "s"}`;
};

export default function AdminExpiredReport() {
  const navigate = useNavigate();

  const defaultDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start: toDateOnly(start), end: toDateOnly(end) };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchReport = async (overrides = {}) => {
    const from = overrides.from ?? startDate;
    const to = overrides.to ?? endDate;
    const supplier = overrides.supplier ?? supplierId;
    const product = overrides.product ?? productId;

    if (!from || !to) {
      setMessage("❌ Please select both start and end dates.");
      return;
    }

    if (new Date(from) > new Date(to)) {
      setMessage("❌ Start date cannot be after end date.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const params = { start_date: from, end_date: to };
      if (supplier) params.supplier_id = supplier;
      if (product) params.product_id = product;

      const res = await axios.get("/api/expire/report", { headers, params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading admin expire report:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      } else {
        setMessage("❌ Failed to load expire report.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      alert("You must be logged in to view expire reports.");
      navigate("/");
      return;
    }

    (async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/inventory/products", { headers }),
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      } catch (err) {
        console.error("Error loading expire report filters:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          safeLogout();
        }
      }
    })();

    fetchReport({ from: defaultDates.start, to: defaultDates.end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supplierName = supplierId
    ? suppliers.find((s) => String(s.supplier_id) === String(supplierId))?.name || ""
    : "";
  const productName = productId
    ? products.find((p) => String(p.product_id) === String(productId))?.product_name || ""
    : "";

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const direction = String(row.direction || "").toUpperCase();
          const boxes = asInt(row.boxes);
          const items = asInt(row.items);
          if (direction === "IN") {
            acc.in.boxes += boxes;
            acc.in.items += items;
          } else {
            acc.out.boxes += boxes;
            acc.out.items += items;
          }
          return acc;
        },
        {
          in: { boxes: 0, items: 0 },
          out: { boxes: 0, items: 0 },
        }
      ),
    [rows]
  );

  const handleApply = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handleReset = () => {
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    setSupplierId("");
    setProductId("");
    fetchReport({ from: defaultDates.start, to: defaultDates.end, supplier: "", product: "" });
  };

  const handlePrint = () => {
    if (!rows.length) {
      alert("No records to print. Please run the report first.");
      return;
    }
    window.print();
  };

  const supplierLabel = supplierName || "All suppliers";
  const productLabel = productName || "All products";
  const dateLabel = startDate && endDate ? `${startDate} to ${endDate}` : "All dates";

  return (
    <>
      <div className="no-print">
        <AdminNavbar />

        <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">📊</span>
              <div>
                <h1 className="text-3xl font-semibold text-gray-800">Admin – Expired Stock Movements</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Read-only tracking of expired store inbound and outbound quantities with filters and printing.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin/expire-store")}
                className="bg-gray-200 text-gray-800 px-5 py-3 rounded-xl hover:bg-gray-300 text-sm md:text-base"
              >
                Back to Expired Store
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 text-sm md:text-base"
              >
                Print
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-6">
            <form
              onSubmit={handleApply}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 items-end"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_code ? `${p.product_code} - ${p.product_name}` : p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 md:justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-base"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm md:text-base hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 text-sm text-gray-600">
              <div>
                {loading
                  ? "Loading report..."
                  : `Showing ${rows.length} record${rows.length === 1 ? "" : "s"}`}
              </div>
              <div className="space-y-1">
                <div>Date range: {dateLabel}</div>
                <div>Supplier: {supplierLabel}</div>
                <div>Product: {productLabel}</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-2 text-left">Date</th>
                    <th className="border px-2 py-2 text-left">Note no.</th>
                    <th className="border px-2 py-2 text-left">Movement</th>
                    <th className="border px-2 py-2 text-left">Supplier</th>
                    <th className="border px-2 py-2 text-left">Product</th>
                    <th className="border px-2 py-2 text-center">Pack</th>
                    <th className="border px-2 py-2 text-center">In (boxes+items)</th>
                    <th className="border px-2 py-2 text-center">Out (boxes+items)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const direction = String(row.direction || "").toUpperCase();
                    const movementLabel = row.movement_type === "RETURN" ? "Return" : "Receive";
                    const inText = direction === "IN" ? formatBoxesItems(row.boxes, row.items) : "-";
                    const outText = direction === "OUT" ? formatBoxesItems(row.boxes, row.items) : "-";
                    return (
                      <tr
                        key={`${row.note_no}-${row.product_id}-${idx}`}
                        className={idx % 2 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="border px-2 py-1.5 whitespace-nowrap">{formatDate(row.note_date)}</td>
                        <td className="border px-2 py-1.5 whitespace-nowrap font-mono text-xs md:text-sm">
                          {row.note_no}
                        </td>
                        <td className="border px-2 py-1.5 whitespace-nowrap">{movementLabel}</td>
                        <td className="border px-2 py-1.5 whitespace-nowrap">{row.supplier_name}</td>
                        <td className="border px-2 py-1.5 whitespace-nowrap">
                          {row.product_code ? `${row.product_code} - ${row.product_name}` : row.product_name || "-"}
                        </td>
                        <td className="border px-2 py-1.5 text-center">{row.pack_size}</td>
                        <td className="border px-2 py-1.5 text-center">{inText}</td>
                        <td className="border px-2 py-1.5 text-center">{outText}</td>
                      </tr>
                    );
                  })}
                  {!rows.length && !loading && (
                    <tr>
                      <td colSpan={8} className="border px-3 py-4 text-center text-gray-500">
                        No movements found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border p-3 bg-green-50">
                <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  Total incoming
                </div>
                <div className="text-base text-gray-800 mt-1">
                  {formatBoxesItems(totals.in.boxes, totals.in.items)}
                </div>
              </div>
              <div className="rounded-xl border p-3 bg-rose-50">
                <div className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                  Total outgoing
                </div>
                <div className="text-base text-gray-800 mt-1">
                  {formatBoxesItems(totals.out.boxes, totals.out.items)}
                </div>
              </div>
            </div>

            {message && (
              <p
                className={`text-center mt-4 text-sm md:text-base ${
                  message.startsWith("✅") ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="print-area">
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{SHOP_DETAILS.name}</div>
            <div style={{ fontSize: 12 }}>{SHOP_DETAILS.address}</div>
            <div style={{ fontSize: 12 }}>Tel: {SHOP_DETAILS.tel}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
              Admin Expired Stock Movement Report
            </div>
          </div>

          <div style={{ fontSize: 12, marginBottom: 6 }}>
            <div>Date range: {dateLabel}</div>
            <div>Supplier: {supplierLabel}</div>
            <div>Product: {productLabel}</div>
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
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Date</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Note</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Movement</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Supplier</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Product</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Pack</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>In qty</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Out qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const direction = String(row.direction || "").toUpperCase();
                const movementLabel = row.movement_type === "RETURN" ? "Return" : "Receive";
                const inQty = direction === "IN" ? formatBoxesItems(row.boxes, row.items) : "-";
                const outQty = direction === "OUT" ? formatBoxesItems(row.boxes, row.items) : "-";
                return (
                  <tr key={`${row.note_no}-print-${idx}`}>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>{formatDate(row.note_date)}</td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>{row.note_no}</td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>{movementLabel}</td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>{row.supplier_name}</td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>
                      {row.product_code ? `${row.product_code} - ${row.product_name}` : row.product_name || "-"}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>{row.pack_size}</td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {inQty}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {outQty}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                    No movements for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 8, fontSize: 11 }}>
            <div>Total incoming: {formatBoxesItems(totals.in.boxes, totals.in.items)}</div>
            <div>Total outgoing: {formatBoxesItems(totals.out.boxes, totals.out.items)}</div>
          </div>
        </div>
      </div>
    </>
  );
}