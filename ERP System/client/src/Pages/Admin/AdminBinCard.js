// client/src/Pages/Admin/AdminBinCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ✅ Build YYYY-MM without toISOString() (avoids timezone shifting month)
const buildMonthOptions = () => {
  const result = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1; // 1–12
    const value = `${year}-${String(monthNum).padStart(2, "0")}`; // YYYY-MM
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    result.push({ value, label });
  }
  return result;
};

const AdminBinCard = () => {
  const navigate = useNavigate();
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

  const [rawProducts, setRawProducts] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(""); // product_id (string)
  const [selectedPack, setSelectedPack] = useState("");

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const isoDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const [startDate, setStartDate] = useState(isoDate(firstOfMonth));
  const [endDate, setEndDate] = useState(isoDate(today));

  const [binData, setBinData] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- PRODUCT PICKER STATE ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const rowRefs = useRef({}); // product_id -> row element

  // ---------- Derived options ----------

  const productOptions = useMemo(() => {
    const map = new Map();
    for (const row of rawProducts) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          product_id: row.product_id,
          product_name: row.product_name,
          product_code: row.product_code || "",
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.product_name || "").localeCompare(b.product_name || "")
    );
  }, [rawProducts]);

  const selectedProductInfo = useMemo(
    () =>
      productOptions.find(
        (p) => p.product_id === Number(selectedProduct)
      ) || null,
    [productOptions, selectedProduct]
  );

  const packOptions = useMemo(() => {
    if (!selectedProduct) return [];
    const packs = new Set();
    const pidNum = Number(selectedProduct);

    rawProducts.forEach((p) => {
      if (p.product_id === pidNum && p.display_pack) {
        packs.add(p.display_pack);
      }
    });

    return Array.from(packs).sort((a, b) => a - b);
  }, [rawProducts, selectedProduct]);

  const filteredProducts = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return productOptions;
    return productOptions.filter((p) => {
      const code = (p.product_code || "").toLowerCase();
      const name = (p.product_name || "").toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [pickerQuery, productOptions]);

  // keep highlightIndex within filtered list
  useEffect(() => {
    if (highlightIndex >= filteredProducts.length) {
      setHighlightIndex(filteredProducts.length ? filteredProducts.length - 1 : 0);
    }
  }, [filteredProducts.length, highlightIndex]);

  // ---------- Load product list ----------
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await axios.get("/api/issue/products", { headers });
        setRawProducts(res.data || []);
      } catch (err) {
        console.error(err);
        if (err?.response?.status === 401) safeLogout();
        else setMessage("Error loading products");
      }
    };

    if (token) loadProducts();
  }, [headers, token]);

  // ---------- Helpers ----------
  const formatPcsAsBoxesItems = (pcs, pack) => {
    const P = asInt(pcs);
    if (!pack || pack <= 0) return String(P);

    const sign = P < 0 ? "-" : "";
    const abs = Math.abs(P);
    const boxes = Math.floor(abs / pack);
    const items = abs % pack;

    return `${sign}${String(boxes).padStart(2, "0")}-${String(
      items
    ).padStart(2, "0")}`;
  };

  const applyProductSelection = (product) => {
    if (!product) return;
    const pidStr = String(product.product_id);
    setSelectedProduct(pidStr);

    const packs = new Set();
    rawProducts.forEach((p) => {
      if (p.product_id === product.product_id && p.display_pack) {
        packs.add(p.display_pack);
      }
    });
    const list = Array.from(packs).sort((a, b) => a - b);
    if (list.length === 1) {
      setSelectedPack(String(list[0]));
    } else {
      setSelectedPack("");
    }
  };

  // ---------- Actions ----------
  const handleLoad = async (e) => {
    e && e.preventDefault();
    setMessage("");
    setBinData(null);

    const pid = asInt(selectedProduct);
    if (!pid) {
      setMessage("Please select a product.");
      return;
    }
    if (!startDate || !endDate) {
      setMessage("Please select a start and end date.");
      return;
    }

    // if more than one pack size, force explicit pack
    const packsForProduct = new Set();
    rawProducts.forEach((p) => {
      if (p.product_id === pid && p.display_pack) packsForProduct.add(p.display_pack);
    });
    const packsList = Array.from(packsForProduct);
    if (packsList.length > 1 && !selectedPack) {
      setMessage("Please select a pack size for this product.");
      return;
    }

    const params = {
      product_id: pid,
      start_date: startDate,
      end_date: endDate,
    };

    const packNum = Number(selectedPack);
    if (Number.isFinite(packNum) && packNum > 0) {
      params.pack_size = packNum;
    }

    setLoading(true);
    try {
      const res = await axios.get("/api/bincard", { headers, params });
      setBinData(res.data);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) safeLogout();
      else setMessage(err?.response?.data?.message || "Error loading bin card");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!binData) {
      setMessage("Please load a bin card before printing.");
      return;
    }
    window.print();
  };

  // ---------- PRODUCT PICKER POPUP ----------
  const openPicker = () => {
    setPickerQuery("");      // show full list
    setPickerOpen(true);
  };

  const closePicker = () => setPickerOpen(false);

  // focus search when picker opens
  useEffect(() => {
    if (!pickerOpen) return;
    const node = searchRef.current;
    setTimeout(() => node?.focus(), 0);
  }, [pickerOpen]);

  const focusRowByIndex = (idx) => {
    const row = filteredProducts[idx];
    if (!row) return;
    const el = rowRefs.current[row.product_id];
    if (el) el.focus();
  };

  // ✅ when picker opens (or when list changes), highlight the selected product
  useEffect(() => {
    if (!pickerOpen) return;

    let idx = 0;
    const currentId = Number(selectedProduct);
    if (currentId) {
      const found = filteredProducts.findIndex(
        (p) => p.product_id === currentId
      );
      if (found >= 0) idx = found;
    }
    setHighlightIndex(idx);
    // we only move focus to row on explicit Tab from search,
    // not automatically here
  }, [pickerOpen, filteredProducts, selectedProduct]);

  const handleSearchKeyDown = (e) => {
    if (!filteredProducts.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) =>
        Math.min(i + 1, filteredProducts.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Tab from search → highlighted row
      e.preventDefault();
      const idx = highlightIndex ?? 0;
      setTimeout(() => focusRowByIndex(idx), 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const product = filteredProducts[highlightIndex];
      if (product) {
        applyProductSelection(product);
        closePicker();
      }
    }
  };

  const handleRowKeyDown = (e, product_id) => {
    const idx = filteredProducts.findIndex((p) => p.product_id === product_id);
    if (idx === -1) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, filteredProducts.length - 1);
      setHighlightIndex(next);
      focusRowByIndex(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      setHighlightIndex(prev);
      focusRowByIndex(prev);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const product = filteredProducts[idx];
      if (product) {
        applyProductSelection(product);
        closePicker();
      }
    }
    // Tab → let browser go to buttons
  };

  // Esc closes picker
  useEffect(() => {
    if (!pickerOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [pickerOpen]);

  // ---------- Render ----------
  return (
    <>
      <div className="no-print">
        <AdminNavbar />
      </div>

      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6 print-container">
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-10">
          <h2 className="text-3xl font-semibold mb-6 text-gray-800 no-print">
            Admin – Bin Card
          </h2>

          {/* Filters – single line */}
          <form onSubmit={handleLoad} className="mb-6 no-print">
            <div className="flex flex-wrap items-end gap-4 justify-between">
              {/* Product */}
              <div className="flex-1 min-w-[260px]">
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Product
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={
                      selectedProductInfo
                        ? selectedProductInfo.product_code
                          ? `${selectedProductInfo.product_code} - ${selectedProductInfo.product_name}`
                          : selectedProductInfo.product_name
                        : ""
                    }
                    placeholder="No product selected"
                  />
                  <button
                    type="button"
                    onClick={openPicker}
                    className="h-14 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                  >
                    Select
                  </button>
                </div>
              </div>

              {/* Date range */}
              <div className="w-56">
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="w-56">
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Pack size */}
              <div className="w-56">
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Pack Size
                </label>
                <select
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedPack}
                  onChange={(e) => setSelectedPack(e.target.value)}
                  disabled={!selectedProduct || packOptions.length === 0}
                >
                  {!selectedProduct || packOptions.length === 0 ? (
                    <option value="">
                      {packOptions.length === 0
                        ? "-- No pack sizes --"
                        : "-- Select a product --"}
                    </option>
                  ) : packOptions.length === 1 ? (
                    <option value={packOptions[0]}>
                      {packOptions[0]} per box
                    </option>
                  ) : (
                    <>
                      <option value="">-- Select pack size --</option>
                      {packOptions.map((pack) => (
                        <option key={pack} value={pack}>
                          {pack} per box
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Show Bin Card"}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
                >
                  Print
                </button>
              </div>
            </div>
          </form>

          {message && (
            <div className="mb-3 text-sm text-red-600 font-medium no-print">
              {message}
            </div>
          )}

          {binData && (
            <div className="mt-4 border rounded-2xl bg-white shadow-sm">
              <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap gap-4 justify-between">
                <div>
                  <div className="text-sm text-gray-500">Product</div>
                  <div className="font-semibold">
                    {binData.product_code && (
                      <span className="font-mono mr-2">
                        {binData.product_code}
                      </span>
                    )}
                    {binData.product_name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Pack Size</div>
                  <div className="font-semibold">
                    {binData.pack_size} per box
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Period</div>
                  <div className="font-semibold">
                    {binData.start_date} to {binData.end_date}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Opening Balance</div>
                  <div className="font-semibold">
                    {formatPcsAsBoxesItems(
                      binData.opening.balance_pcs,
                      binData.pack_size
                    )}{" "}
                    (Boxes-Items)
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Ref</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">IN (B-I)</th>
                      <th className="px-3 py-2 text-right">OUT (B-I)</th>
                      <th className="px-3 py-2 text-right">Balance (B-I)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t bg-yellow-50">
                      <td className="px-3 py-2 text-sm text-gray-600">–</td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        Opening
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">–</td>
                      <td className="px-3 py-2 text-right text-gray-600">–</td>
                      <td className="px-3 py-2 text-right text-gray-600">–</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatPcsAsBoxesItems(
                          binData.opening.balance_pcs,
                          binData.pack_size
                        )}
                      </td>
                    </tr>

                    {binData.rows.length === 0 && (
                      <tr className="border-t">
                        <td
                          className="px-3 py-3 text-center text-gray-500"
                          colSpan={6}
                        >
                          No movements in this period.
                        </td>
                      </tr>
                    )}

                    {binData.rows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.ref_no}</td>
                        <td className="px-3 py-2">{row.source}</td>
                        <td className="px-3 py-2 text-right">
                          {row.in_pcs
                            ? formatPcsAsBoxesItems(
                                row.in_pcs,
                                binData.pack_size
                              )
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.out_pcs
                            ? formatPcsAsBoxesItems(
                                row.out_pcs,
                                binData.pack_size
                              )
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatPcsAsBoxesItems(
                            row.balance_pcs,
                            binData.pack_size
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT PICKER MODAL */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select Product"
            className="bg-white w-[900px] max-h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-800">
                Select Product
              </h3>
            </div>

            <div className="px-6 py-4 border-b">
              <input
                ref={searchRef}
                type="text"
                className="border border-gray-300 rounded-xl px-4 py-3 w-full text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search by product code or name..."
                value={pickerQuery}
                onChange={(e) => {
                  setPickerQuery(e.target.value);
                  setHighlightIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            <div className="px-4 pb-4 overflow-auto">
              <table className="w-full text-left border border-gray-300 text-[15px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border border-gray-300">Product Code</th>
                    <th className="p-2 border border-gray-300">Product Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, rowIdx) => {
                    const isActive = rowIdx === highlightIndex;
                    return (
                      <tr
                        key={p.product_id}
                        tabIndex={0}
                        ref={(el) => {
                          rowRefs.current[p.product_id] = el;
                        }}
                        className={`${
                          rowIdx % 2 ? "bg-gray-50" : "bg-white"
                        } ${
                          isActive ? "bg-indigo-50" : ""
                        } hover:bg-gray-100 cursor-pointer outline-none`}
                        onMouseEnter={() => setHighlightIndex(rowIdx)}
                        onFocus={() => setHighlightIndex(rowIdx)}
                        onClick={() => {
                          applyProductSelection(p);
                          closePicker();
                        }}
                        onKeyDown={(e) => handleRowKeyDown(e, p.product_id)}
                      >
                        <td className="p-2 border border-gray-300 font-mono text-sm whitespace-nowrap">
                          {p.product_code}
                        </td>
                        <td className="p-2 border border-gray-300 text-sm whitespace-nowrap">
                          {p.product_name}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProducts.length && (
                    <tr>
                      <td
                        className="p-3 text-center text-gray-500 border border-gray-300"
                        colSpan={2}
                      >
                        No products match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t flex justify-between items-center text-sm text-gray-600">
              <div>
                <b>Shortcuts:</b> Tab → list • ↑/↓ move highlight • Enter
                selects • Tab → buttons • Esc closes
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                  onClick={closePicker}
                  type="button"
                >
                  Cancel
                </button>
                {filteredProducts[highlightIndex] && (
                  <button
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                    type="button"
                    onClick={() => {
                      applyProductSelection(filteredProducts[highlightIndex]);
                      closePicker();
                    }}
                  >
                    Use Highlighted
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminBinCard;
