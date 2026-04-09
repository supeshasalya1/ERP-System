// client/src/Pages/Admin/AdminStock.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function AdminStock() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchFilters = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        axios.get("/api/suppliers/list", { headers }),
        axios.get("/api/inventory/products", { headers }),
      ]);

      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (err) {
      console.error("Failed to load stock filters (admin):", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      }
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = {};
      if (supplierId) params.supplier_id = supplierId;
      if (productId) params.product_id = productId;

      // 🔴 IMPORTANT: use the same backend as user page
      const res = await axios.get("/api/inventory/stock-by-pack", {
        headers,
        params,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load stock (admin):", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const getShopDetails = () => ({
    shopName: "LEELARATHNE & SONS",
    shopAddress: "No. 605 B, Galle Road, Katubedda",
    phone: "0117539810 , 0112614171",
  });

  const handlePrint = () => {
    if (!filtered.length) {
      alert("No stock data to print. Apply filters first.");
      return;
    }
    window.print();
  };

  useEffect(() => {
    (async () => {
      await fetchFilters();
      await fetchStock();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filter by product code, name, or pack size
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.product_name || "").toLowerCase();
      const code = (r.product_code || "").toLowerCase();
      const pack = String(r.pack_size || "").toLowerCase();
      return name.includes(q) || code.includes(q) || pack.includes(q);
    });
  }, [rows, query]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-100 no-print">
        <AdminNavbar />

        <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6 pb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-10 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
                  📦 Current Stock
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="border border-gray-300 bg-gray-50 px-4 h-14 rounded-xl text-lg min-w-[220px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-lg font-medium text-gray-700 mb-1">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="border border-gray-300 bg-gray-50 px-4 h-14 rounded-xl text-lg min-w-[260px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_code
                      ? `${p.product_code} - ${p.product_name}`
                      : p.product_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchStock}
              className="bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 text-base"
            >
              Apply
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 text-base"
            >
              Print
            </button>

            {/* Search */}
            <div className="ml-auto w-full md:w-auto">
              <label className="block text-lg font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full md:w-[340px] border border-gray-300 bg-gray-50 px-4 h-14 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search by code, name, or pack size…"
              />
            </div>
          </div>

          {loading && (
            <div className="text-gray-500 mb-4 text-base">Loading…</div>
          )}

          {/* Grid header */}
          <div className="grid grid-cols-5 gap-2 text-base font-semibold text-gray-700 bg-gray-100 p-4 rounded-lg border">
            <div>Code</div>
            <div className="col-span-2">Product</div>
            <div>Pack Size</div>
            <div className="text-right">Stock</div>
          </div>

          {/* Grid rows */}
          <div className="divide-y text-base leading-7">
            {filtered.map((r, i) => {
              const pack = Math.max(1, asInt(r.pack_size));
              const pcs = asInt(r.available_qty_pcs);
              const boxes = Math.floor(pcs / pack);
              const items = pcs % pack;

              return (
                <div
                  key={`${r.product_id}-${pack}-${i}`}
                  className="grid grid-cols-5 gap-2 p-4 hover:bg-gray-50"
                >
                  <div className="font-mono text-sm text-gray-700">
                    {r.product_code || ""}
                  </div>
                  <div className="col-span-2 font-medium text-gray-900 truncate">
                    {r.product_name || "Unnamed"}
                  </div>
                  <div className="text-gray-800">Pack {pack}</div>
                  <div className="text-gray-900 font-semibold text-right">
                    {boxes} box{boxes === 1 ? "" : "es"} + {items} item
                    {items === 1 ? "" : "s"}{" "}
                    <span className="text-gray-500 text-sm">
                      (pcs: {pcs})
                    </span>
                  </div>
                </div>
              );
            })}

            {!filtered.length && !loading && (
              <div className="p-6 text-center text-gray-500 text-base">
                No stock found.
              </div>
            )}
          </div>

   
          </div>
        </div>
      </div>

      <div className="print-area">
        {(() => {
          const { shopName, shopAddress, phone } = getShopDetails();
          const supplierName = suppliers.find((s) => String(s.supplier_id) === String(supplierId))?.name || "";
          const productName = products.find((p) => String(p.product_id) === String(productId))?.product_name || "";
          const now = new Date();
          const dateStr = now.toLocaleDateString();
          const timeStr = now.toLocaleTimeString();
          return (
            <div style={{ fontFamily: "Arial, sans-serif" }}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{shopName}</div>
                <div style={{ fontSize: 12 }}>{shopAddress}</div>
                <div style={{ fontSize: 12 }}>Tel: {phone}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>Stock Card</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <div>
                  {supplierName && <span>Supplier: {supplierName} </span>}
                  {productName && <span>| Product: {productName}</span>}
                  {!supplierName && !productName && <span>All suppliers & products</span>}
                </div>
                <div>
                  <span>Date: {dateStr} {timeStr}</span>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Code</th>
                    <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Product</th>
                    <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Pack</th>
                    <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const pack = Math.max(1, asInt(r.pack_size));
                    const pcs = asInt(r.available_qty_pcs);
                    const boxes = Math.floor(pcs / pack);
                    const items = pcs % pack;
                    return (
                      <tr key={`${r.product_id}-${pack}-${i}`}>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>{r.product_code || ""}</td>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>{r.product_name || ""}</td>
                        <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{pack}</td>
                        <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                          {boxes} box{boxes === 1 ? "" : "es"} + {items} item{items === 1 ? "" : "s"} (pcs: {pcs})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

            </div>
          );
        })()}
      </div>
    </>
  );
}
