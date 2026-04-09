// client/src/Components/EXPIRE/ExpiredNoteCreate.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const SHOP_DETAILS = {
  name: "LEELARATHNE & SONS",
  address: "No. 605 B, Galle Road, Katubedda",
  tel: "0117539810 , 0112614171",
};

const ExpiredNoteCreate = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [issueLorries, setIssueLorries] = useState([]);
  const [pickerProducts, setPickerProducts] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedIssueLorry, setSelectedIssueLorry] = useState("");
  const [capturedAt, setCapturedAt] = useState(() => new Date());
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [noteNo, setNoteNo] = useState("");

  const [items, setItems] = useState([]);

  // ---------- Product picker modal ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [qByPid, setQByPid] = useState({});

  // refs
  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const addProductsRef = useRef(null);
  const supplierSelectRef = useRef(null);
  const cellRefs = useRef({});

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

  const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const computePieces = (line) => {
    const pack = Math.max(1, asInt(line.pack_size));
    const boxes = asInt(line.boxes);
    const itemsP = asInt(line.items);
    return boxes * pack + itemsP;
  };

  // bootstrap suppliers + issue lorries + picker products
  useEffect(() => {
    if (!token) {
      alert("You must be logged in to create an expired note.");
      navigate("/");
      return;
    }

    (async () => {
      try {
        const [supRes, lorryRes, productRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/issue/lorries", { headers }), // adjust if needed
          axios.get("/api/stocks/grn-picker", { headers }),
        ]);

        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setIssueLorries(Array.isArray(lorryRes.data) ? lorryRes.data : []);
        setPickerProducts(Array.isArray(productRes.data) ? productRes.data : []);
      } catch (err) {
        console.error("Error loading bootstrap data:", err);
        if (err.response?.status === 401) safeLogout();
      }
    })();
  }, [navigate, token, headers]);

  // focus supplier on load
  useEffect(() => {
    const timer = setTimeout(() => {
      supplierSelectRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // base products (de-duplicate by product_id) – same as GRN
  const baseProducts = useMemo(() => {
    const byId = new Map();
    pickerProducts.forEach((p) => {
      if (!byId.has(p.product_id)) byId.set(p.product_id, p);
    });
    return Array.from(byId.values());
  }, [pickerProducts]);

  // filter by supplier + search
  const filteredProducts = baseProducts.filter((p) => {
    const sid = String(p.supplier_id || "");
    if (selectedSupplier && sid !== String(selectedSupplier)) return false;

    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;

    const code = (p.product_code || "").toLowerCase();
    const name = (p.product_name ?? p.name ?? "").toLowerCase();
    const packText = String(
      p.display_pack || p.default_pack_size || ""
    ).toLowerCase();

    return code.includes(q) || name.includes(q) || packText.includes(q);
  });

  // keep highlight index in bounds
  useEffect(() => {
    if (highlightIndex >= filteredProducts.length) {
      setHighlightIndex(filteredProducts.length ? filteredProducts.length - 1 : 0);
    }
  }, [filteredProducts.length, highlightIndex]);

  const getQ = (p) => {
    const pid = p.product_id;
    const defaultPack =
      asInt(p.default_pack_size) || asInt(p.display_pack) || 1;
    const current = qByPid[pid];
    if (current) return current;
    return {
      pack: String(defaultPack),
      boxes: "",
      items: "",
    };
  };

  // ✅ keep default pack when first editing boxes/items
  const setQ = (pid, patch, defaultPack) => {
    setQByPid((prev) => {
      const existing = prev[pid];
      const base =
        existing ||
        {
          pack:
            defaultPack !== undefined && defaultPack !== null
              ? defaultPack
              : "",
          boxes: "",
          items: "",
        };
      return { ...prev, [pid]: { ...base, ...patch } };
    });
  };

  const focusRowCell = (rowIdx, col = "pack") => {
    const row = filteredProducts[rowIdx];
    if (!row) return;
    const pid = row.product_id;
    const cell = cellRefs.current[pid]?.[col];
    if (cell) cell.focus();
  };

  const openPicker = () => {
    if (!selectedSupplier) {
      alert("Please select a supplier first.");
      return;
    }
    setPickerQuery("");
    setHighlightIndex(0);
    setQByPid({});
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setQByPid({});
  };

  const applyPickerToItems = () => {
    const newLines = [];

    filteredProducts.forEach((p) => {
      const pid = p.product_id;
      const q = qByPid[pid];
      if (!q) return;

      const pack = Math.max(1, asInt(q.pack));
      const boxes = asInt(q.boxes);
      const itemsP = asInt(q.items);
      const total = boxes * pack + itemsP;
      if (total <= 0) return;

      newLines.push({
        product_id: pid,
        product_code: p.product_code || "",
        product_name: p.product_name || p.name || "Unnamed",
        pack_size: pack,
        boxes,
        items: itemsP,
      });
    });

    if (!newLines.length) {
      alert("Please enter quantities for at least one product.");
      return;
    }

    setItems((prev) => [...prev, ...newLines]);
    setPickerOpen(false);
    setQByPid({});

    setTimeout(() => {
      addProductsRef.current?.focus();
    }, 0);
  };

  // focus search when picker opens
  useEffect(() => {
    if (!pickerOpen) return;
    const node = searchRef.current;
    setTimeout(() => node?.focus(), 0);
  }, [pickerOpen]);

  const handleSearchKeyDown = (e) => {
    if (!filteredProducts.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = Math.min(i + 1, filteredProducts.length - 1);
        setTimeout(() => focusRowCell(next, "pack"), 0);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = Math.max(i - 1, 0);
        setTimeout(() => focusRowCell(next, "pack"), 0);
        return next;
      });
    }
  };

  const colOrder = ["pack", "boxes", "items"];

  const handleCellKeyDown = (e, pid, col) => {
    const key = e.key;
    const rowIdx = filteredProducts.findIndex((p) => p.product_id === pid);
    if (rowIdx === -1) return;

    if (key === "Enter") {
      e.preventDefault();
      return;
    }

    if (key === "ArrowUp" || key === "ArrowDown") {
      e.preventDefault();
      const delta = key === "ArrowUp" ? -1 : 1;
      const newIdx = Math.min(
        Math.max(rowIdx + delta, 0),
        filteredProducts.length - 1
      );
      setHighlightIndex(newIdx);
      focusRowCell(newIdx, col);
      return;
    }

    if (key === "ArrowLeft" || key === "ArrowRight") {
      e.preventDefault();
      const currIdx = colOrder.indexOf(col);
      if (currIdx === -1) return;
      const delta = key === "ArrowLeft" ? -1 : 1;
      let newColIndex = currIdx + delta;
      if (newColIndex < 0) newColIndex = 0;
      if (newColIndex >= colOrder.length) newColIndex = colOrder.length - 1;
      const newCol = colOrder[newColIndex];
      const cell = cellRefs.current[pid]?.[newCol];
      if (cell) cell.focus();
    }
  };

  // global ESC / Tab trap – same as GRN
  useEffect(() => {
    if (!pickerOpen) return;

    const handleKey = (e) => {
      if (!pickerOpen) return;

      if (e.key === "Enter") {
        e.preventDefault();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
      }

      if (e.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusable).filter(
          (el) =>
            !el.hasAttribute("disabled") &&
            el.getAttribute("aria-hidden") !== "true"
        );
        if (!list.length) return;

        const first = list[0];
        const last = list[list.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [pickerOpen]);

  const setLine = (idx, patch) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeItem = (idx) =>
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });

  const handleLastItemsTab = (e, isLastRow) => {
    if (!isLastRow) return;
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      addProductsRef.current?.focus();
    }
  };

  const handleAddKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      applyPickerToItems();
    }
  };

  const resetForm = ({ preserveMessage = false } = {}) => {
    setSelectedSupplier("");
    setSelectedIssueLorry("");
    setCapturedAt(new Date());
    setRemarks("");
    setItems([]);
    setPickerOpen(false);
    setPickerQuery("");
    setHighlightIndex(0);
    setQByPid({});
    setNoteNo("");
    if (!preserveMessage) {
      setMessage("");
    }
    setTimeout(() => supplierSelectRef.current?.focus(), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const now = new Date();
    setCapturedAt(now);

    if (!selectedSupplier) return setMessage("❌ Supplier is required.");
    if (!selectedIssueLorry)
      return setMessage("❌ Issue lorry is required.");
    if (!items.length)
      return setMessage("❌ Please add at least one product.");

    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      if (!line.product_id) return setMessage("❌ Each row must have a product.");
      const pack = Math.max(1, asInt(line.pack_size));
      if (!Number.isFinite(pack) || pack <= 0)
        return setMessage("❌ Pack size must be > 0.");
      const pcs = computePieces(line);
      if (pcs <= 0) return setMessage("❌ Enter boxes/items for each line.");
      if (asInt(line.boxes) < 0 || asInt(line.items) < 0)
        return setMessage("❌ Quantities cannot be negative.");
    }

    const payload = {
      note_date: now.toISOString(),
      lorry_id: Number(selectedIssueLorry),
      remarks: remarks || null,
      items: items.map((ln) => ({
        product_id: Number(ln.product_id),
        supplier_id: Number(selectedSupplier),
        pack_size: Math.max(1, asInt(ln.pack_size)),
        boxes: asInt(ln.boxes),
        items: asInt(ln.items),
      })),
    };

    try {
      const res = await axios.post("/api/expire/receive", payload, {
        headers: { ...headers, "Content-Type": "application/json" },
      });

      const note = res.data?.note_no;
      const successMsg = note
        ? `✅ Expired note ${note} created.`
        : "✅ Expired note created successfully.";

      setMessage(successMsg);
      resetForm({ preserveMessage: true });
    } catch (err) {
      console.error("Error creating expired note:", err);
      if (err.response?.status === 401) safeLogout();
      else setMessage("❌ Error creating expired note. Check your inputs.");
    }
  };

  const supplierName = useMemo(() => {
    return (
      suppliers.find(
        (s) => String(s.supplier_id) === String(selectedSupplier)
      )?.name || ""
    );
  }, [selectedSupplier, suppliers]);

  const lorryLabel = useMemo(() => {
    return (
      issueLorries.find(
        (l) => String(l.lorry_id) === String(selectedIssueLorry)
      )?.lorry_no || ""
    );
  }, [issueLorries, selectedIssueLorry]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleString();
  };

  const handlePrint = () => {
    if (!items.length) {
      alert("Please add products before printing.");
      return;
    }
    window.print();
  };

  return (
    <>
      <div className="no-print">
        <Navbar />

        <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
          {/* Header (same style as GRN) */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🧺</span>
              <h1 className="text-3xl font-semibold text-gray-800">
                Create Expired Note
              </h1>
            </div>

            <div className="flex gap-3 flex-wrap justify-end">
              
              <button
                type="button"
                onClick={() => navigate("/expired/store")}
                className="bg-gray-700 text-white px-5 py-3 rounded-xl hover:bg-gray-800"
              >
                Expired Store
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="bg-gray-200 text-gray-800 px-5 py-3 rounded-xl hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* header fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-1">
                    Date & time 
                  </label>
                  <div className="w-full h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-lg flex items-center justify-between">
                    <span className="text-gray-800">{formatDateTime(capturedAt)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <select
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    required
                    ref={supplierSelectRef}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-1">
                    Issue Lorry
                  </label>
                  <select
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedIssueLorry}
                    onChange={(e) => setSelectedIssueLorry(e.target.value)}
                    required
                  >
                    <option value="">Select lorry</option>
                    {issueLorries.map((l) => (
                      <option key={l.lorry_id} value={l.lorry_id}>
                        {l.lorry_no || l.lorry_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* remarks */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Any notes about these expired items..."
                />
              </div>

              {/* items table – same structure as GRN create */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl text-gray-800">Expired Products</h3>
                </div>

                {!items.length && (
                  <div className="border border-dashed rounded-xl p-4 bg-gray-50 text-base text-gray-600 mb-4">
                    No products added yet.
                  </div>
                )}

                {!!items.length && (
                  <div className="border rounded-xl overflow-hidden mb-4">
                    <div className="grid grid-cols-8 bg-gray-100 border-b text-base font-semibold text-gray-700">
                      <div className="col-span-3 p-2 border-r">Product</div>
                      <div className="p-2 border-r text-center">Pack</div>
                      <div className="p-2 border-r text-center">Boxes</div>
                      <div className="p-2 border-r text-center">Items</div>
                      <div className="p-2 border-r text-center">Total pcs</div>
                      <div className="p-2 text-center">Remove</div>
                    </div>

                    {items.map((line, index) => {
                      const totalPieces = computePieces(line);
                      return (
                        <div
                          key={index}
                          className="grid grid-cols-8 border-t text-base items-center"
                        >
                          <div className="col-span-3 p-2 border-r">
                            <div className="font-mono text-sm text-gray-700">
                              {line.product_code}
                            </div>
                            <div className="text-gray-900">
                              {line.product_name}
                            </div>
                          </div>

                          <div className="p-2 border-r">
                            <input
                              type="number"
                              min="1"
                              className="border p-2 rounded-lg w-full text-base text-center"
                              value={line.pack_size}
                              onChange={(e) =>
                                setLine(index, { pack_size: e.target.value })
                              }
                              onKeyDown={(e) =>
                                handleLastItemsTab(e, index === items.length - 1)
                              }
                            />
                          </div>

                          <div className="p-2 border-r">
                            <input
                              type="number"
                              min="0"
                              className="border p-2 rounded-lg w-full text-base text-center"
                              value={line.boxes}
                              onChange={(e) =>
                                setLine(index, { boxes: e.target.value })
                              }
                            />
                          </div>

                          <div className="p-2 border-r">
                            <input
                              type="number"
                              min="0"
                              className="border p-2 rounded-lg w-full text-base text-center"
                              value={line.items}
                              onChange={(e) =>
                                setLine(index, { items: e.target.value })
                              }
                            />
                          </div>

                          <div className="p-2 border-r text-center text-gray-800">
                            {Number.isFinite(totalPieces) ? totalPieces : 0}
                          </div>

                          <div className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  ref={addProductsRef}
                  onClick={openPicker}
                  className="bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700 text-base"
                >
                  Add products
                </button>
              </div>

              {/* footer */}
              <div className="flex items-center justify-end pt-4 border-t mt-4 gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-yellow-500 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-yellow-600 mr-3"
                >
                  Print Note
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit Expired Note
                </button>
              </div>

              {message && (
                <p
                  className={`text-center mt-5 text-xl font-medium ${
                    message.startsWith("✅") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* PRINT TEMPLATE */}
      <div className="print-area">
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12 }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{SHOP_DETAILS.name}</div>
            <div style={{ fontSize: 12 }}>{SHOP_DETAILS.address}</div>
            <div style={{ fontSize: 12 }}>Tel: {SHOP_DETAILS.tel}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
              Expired Note
            </div>
          </div>

          <div style={{ fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div>Note no: {noteNo || "Draft"}</div>
              <div>Supplier: {supplierName || "-"}</div>
              <div>Issue lorry: {lorryLabel || "-"}</div>
              <div>Remarks: {remarks || "-"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>Date & time</div>
              <div>{formatDateTime(capturedAt)}</div>
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #000",
              tableLayout: "fixed",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Code</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Product</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Pack</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Boxes</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Items</th>
                <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>Total pcs</th>
              </tr>
            </thead>
            <tbody>
              {items.map((line, idx) => {
                const totalPieces = computePieces(line);
                return (
                  <tr key={`${line.product_id}-${idx}`}>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>{line.product_code}</td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>{line.product_name}</td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                      {line.pack_size}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                      {line.boxes}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                      {line.items}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                      {Number.isFinite(totalPieces) ? totalPieces : 0}
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}
                  >
                    No products added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- PRODUCT PICKER MODAL (same style as GRN) ---------- */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select Products"
            className="bg-white w-[1150px] max-h-[85vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-800">
                Select Products
              </h3>
            </div>

            <div className="px-6 py-4 border-b">
              <input
                ref={searchRef}
                type="text"
                className="border border-gray-300 rounded-xl px-4 py-3 w-full text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search by product code, name or pack size..."
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
                    <th className="p-2 border border-gray-300">Product</th>
                    <th className="p-2 border border-gray-300 text-center">
                      Pack
                    </th>
                    <th className="p-2 border border-gray-300 text-center">
                      Boxes
                    </th>
                    <th className="p-2 border border-gray-300 text-center">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, rowIdx) => {
                    const pid = p.product_id;
                    const pcode = p.product_code || "";
                    const name = p.product_name || p.name || "Unnamed";
                    const q = getQ(p);
                    const isActive = rowIdx === highlightIndex;

                    return (
                      <tr
                        key={pid}
                        className={`${rowIdx % 2 ? "bg-gray-50" : "bg-white"} ${
                          isActive ? "bg-indigo-50" : ""
                        } hover:bg-gray-100`}
                        onMouseEnter={() => setHighlightIndex(rowIdx)}
                      >
                        <td className="p-2 border border-gray-300 font-mono text-sm whitespace-nowrap">
                          {pcode}
                        </td>
                        <td className="p-2 border border-gray-300 text-sm whitespace-nowrap">
                          {name}
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={q.pack}
                            onChange={(e) =>
                              setQ(pid, { pack: e.target.value }, q.pack)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, pid, "pack")}
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[pid] =
                                cellRefs.current[pid] || {};
                              cellRefs.current[pid].pack = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-sm text-center"
                          />
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={q.boxes}
                            onChange={(e) =>
                              setQ(pid, { boxes: e.target.value }, q.pack)
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, pid, "boxes")
                            }
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[pid] =
                                cellRefs.current[pid] || {};
                              cellRefs.current[pid].boxes = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-sm text-center"
                          />
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={q.items}
                            onChange={(e) =>
                              setQ(pid, { items: e.target.value }, q.pack)
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, pid, "items")
                            }
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[pid] =
                                cellRefs.current[pid] || {};
                              cellRefs.current[pid].items = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-sm text-center"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProducts.length && (
                    <tr>
                      <td
                        className="p-3 text-center text-gray-500 border border-gray-300"
                        colSpan={5}
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
                <b>Shortcuts:</b> ↑/↓ move rows • ←/→ move columns • Tab stays inside • Esc
                closes
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                  onClick={closePicker}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={applyPickerToItems}
                  onKeyDown={handleAddKeyDown}
                >
                  Add to Expired Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpiredNoteCreate;
