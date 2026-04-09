// client/src/Components/ISSUE/INCreate.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const IssueNoteCreate = () => {
  const navigate = useNavigate();

  // ---------- top-level state ----------
  const [issueNo, setIssueNo] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [lorries, setLorries] = useState([]);
  const [cashCollectors, setCashCollectors] = useState([]);
  const [products, setProducts] = useState([]); // rows per (product_id, display_pack)
  const [selectedLorry, setSelectedLorry] = useState("");
  const [selectedCollector, setSelectedCollector] = useState("");
  const [authenticator, setAuthenticator] = useState("");
  const [initiator, setInitiator] = useState("");
  const [message, setMessage] = useState("");
  const [isPrinted, setIsPrinted] = useState(false);

  // issued lines on main page
  const [items, setItems] = useState([]); // start empty

  // product picker (multi-add)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [pickerGlobalError, setPickerGlobalError] = useState("");

  // per-row temporary quantities in picker, key = "productId|pack"
  const [qByKey, setQByKey] = useState({}); // { [rowKey]: { boxes, items } }

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // refs
  const issueNoRef = useRef(null);
  const addProductsBtnRef = useRef(null);
  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const cellRefs = useRef({}); // { [rowKey]: { boxes: ref, items: ref } }

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  // ---------- helpers ----------
  const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const keyFor = (product_id, pack) => `${product_id}|${pack}`;

  const computePieces = (line) => {
    const pack = Math.max(1, asInt(line.display_pack));
    const boxes = asInt(line.boxes_sent);
    const itemsPcs = asInt(line.items_sent);
    return boxes * pack + itemsPcs;
  };

  // base stock map from backend (pcs), per (product, pack)
  const baseStockMap = useMemo(() => {
    const m = new Map();
    for (const p of products) {
      const pack = Math.max(1, asInt(p.display_pack));
      m.set(keyFor(p.product_id, pack), asInt(p.available_qty_pcs));
    }
    return m;
  }, [products]);

  // how much is already used in this Issue Note (main page) for a given product+pack
  const usedExistingFor = (pid, pack) => {
    let used = 0;
    items.forEach((ln) => {
      if (String(ln.product_id) === String(pid) && asInt(ln.display_pack) === pack) {
        used += computePieces(ln);
      }
    });
    return used;
  };

  // live remaining pcs for a given line index (main page)
  const remainingForLine = (idx) => {
    const line = items[idx] || {};
    const pid = line.product_id;
    const pack = Math.max(1, asInt(line.display_pack));
    if (!pid || !pack) return null;

    const base = baseStockMap.get(keyFor(pid, pack)) ?? 0;
    let used = 0;

    items.forEach((ln) => {
      if (String(ln.product_id) === String(pid) && asInt(ln.display_pack) === pack) {
        used += computePieces(ln);
      }
    });

    return base - used;
  };

  const normalizeRep = (r) => {
    const id = r?.rep_id ?? r?.representative_id ?? r?.id ?? r?.user_id ?? r?.uid;
    const name =
      r?.rep_name ||
      r?.full_name ||
      r?.name ||
      [r?.first_name, r?.last_name].filter(Boolean).join(" ").trim() ||
      r?.username ||
      "(Unnamed)";
    return { _id: String(id), _name: String(name) };
  };

  const pickName = (obj) => {
    if (!obj) return "";
    const parts = [obj.first_name, obj.last_name].filter(Boolean).join(" ").trim();
    return obj.full_name || obj.name || parts || obj.username || "";
  };

  const resolveInitiatorName = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return pickName(u);
    } catch {
      return "";
    }
  };

  // ---------- focus Issue No on mount ----------
  useEffect(() => {
    issueNoRef.current?.focus();
  }, []);

  // ---------- bootstrap data ----------
  useEffect(() => {
    if (!token) {
      alert("You must be logged in to create an Issue Note.");
      navigate("/");
      return;
    }

    const name = resolveInitiatorName();
    if (name) setInitiator(name);

    (async () => {
      try {
        const [supRes, lorryRes, repRes, productRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/issue/lorries", { headers }),
          axios.get("/api/issue/representatives", { headers }),
          axios.get("/api/issue/products", { headers }), // all products initially
        ]);

        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setLorries(lorryRes.data || []);

        const reps = Array.isArray(repRes.data)
          ? repRes.data.map(normalizeRep).filter((r) => r._id)
          : [];
        setCashCollectors(reps);

        setProducts(Array.isArray(productRes.data) ? productRes.data : []);
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.response?.status === 401) safeLogout();
      }
    })();
  }, [navigate, token, headers]);

  // ---------- reload products when supplier changes ----------
  useEffect(() => {
    if (!selectedSupplier) return;
    (async () => {
      try {
        const res = await axios.get(
          `/api/issue/products?supplier_id=${selectedSupplier}`,
          { headers }
        );
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading supplier products:", err);
      }
    })();
  }, [selectedSupplier, headers]);

  // ---------- item helpers ----------
  const setLine = (index, patch) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const removeItem = (index) =>
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });

  // ---------- product picker (multi-add) ----------
  const openPicker = () => {
    if (!selectedSupplier) {
      alert("Please select a supplier first.");
      return;
    }
    setPickerQuery("");
    setHighlightIndex(0);
    setQByKey({});
    setPickerGlobalError("");
    setPickerOpen(true);
  };

const closePicker = () => {
  setPickerOpen(false);
  setQByKey({});
  setPickerGlobalError("");
  // 🔁 after closing, return focus to Add products button
  setTimeout(() => {
    addProductsBtnRef.current?.focus();
  }, 0);
};


  // filter products by code/name/pack + selectedSupplier
  const filteredProducts = products.filter((p) => {
    if (selectedSupplier && String(p.supplier_id) !== String(selectedSupplier)) {
      return false;
    }
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    const code = (p.product_code || "").toLowerCase();
    const name = (p.product_name ?? p.name ?? "").toLowerCase();
    const packText = String(p.display_pack || "").toLowerCase();
    return code.includes(q) || name.includes(q) || packText.includes(q);
  });

  // keep highlightIndex in bounds
  useEffect(() => {
    if (highlightIndex >= filteredProducts.length) {
      setHighlightIndex(filteredProducts.length ? filteredProducts.length - 1 : 0);
    }
  }, [filteredProducts.length, highlightIndex]);

  // picker quantities per rowKey
  const getQ = (rowKey) => {
    const current = qByKey[rowKey];
    if (current) return current;
    return { boxes: 0, items: 0 };
  };

  const setQ = (rowKey, patch) => {
    setQByKey((prev) => {
      const base = prev[rowKey] || { boxes: 0, items: 0 };
      return { ...prev, [rowKey]: { ...base, ...patch } };
    });
  };

  // focus helpers for grid navigation
  const focusRowCell = (rowIdx, col = "boxes") => {
    const p = filteredProducts[rowIdx];
    if (!p) return;
    const pack = Math.max(1, asInt(p.display_pack));
    const rowKey = keyFor(p.product_id, pack);
    const cell = cellRefs.current[rowKey]?.[col];
    if (cell) cell.focus();
  };

  // search field keyboard
  const handleSearchKeyDown = (e) => {
    if (!filteredProducts.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = Math.min(i + 1, filteredProducts.length - 1);
        setTimeout(() => focusRowCell(next, "boxes"), 0);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = Math.max(i - 1, 0);
        setTimeout(() => focusRowCell(next, "boxes"), 0);
        return next;
      });
    }
  };

  const colOrder = ["boxes", "items"];

  const handleCellKeyDown = (e, rowIdx, rowKey, col) => {
    const key = e.key;

    if (
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "Enter"
    ) {
      e.preventDefault();
    } else {
      return; // other keys go through (typing, backspace, etc.)
    }

    if (key === "Enter") {
      // stay inside picker, don't submit
      return;
    }

    if (key === "ArrowUp" || key === "ArrowDown") {
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
      const currIdx = colOrder.indexOf(col);
      if (currIdx === -1) return;
      const delta = key === "ArrowLeft" ? -1 : 1;
      let newColIndex = currIdx + delta;
      if (newColIndex < 0) newColIndex = 0;
      if (newColIndex >= colOrder.length) newColIndex = colOrder.length - 1;
      const newCol = colOrder[newColIndex];
      const cell = cellRefs.current[rowKey]?.[newCol];
      if (cell) cell.focus();
    }
  };

  // global key handler inside picker: Esc + Tab trap + prevent Enter from bubbling
  useEffect(() => {
    if (!pickerOpen) return;

    const handleKey = (e) => {
      if (!pickerOpen) return;
      const inModal =
        modalRef.current &&
        modalRef.current.contains(document.activeElement);

      if (e.key === "Enter" && inModal) {
        e.preventDefault();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
      }

      if (e.key === "Tab" && inModal) {
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

  // focus search when picker opens
  useEffect(() => {
    if (!pickerOpen) return;
    setTimeout(() => searchRef.current?.focus(), 0);
  }, [pickerOpen]);

  // ---------- validation shared by print + submit ----------
  const validateAll = () => {
    if (!issueNo.trim()) return "❌ Issue Note No is required.";
    if (!selectedSupplier) return "❌ Supplier is required.";
    if (!selectedLorry) return "❌ Lorry is required.";
    if (!selectedCollector) return "❌ Cash Collector is required.";
    if (!authenticator.trim()) return "❌ Authenticator name is required.";
    if (!items.length) return "❌ Please add at least one product.";

    const seenKeys = new Set();

    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      if (!line.product_id)
        return "❌ Each row must have a product selected.";
      const pack = Math.max(1, asInt(line.display_pack));
      if (!Number.isFinite(pack) || pack <= 0)
        return "❌ Pack size must be greater than 0.";

      const pcs = computePieces(line);
      if (pcs <= 0)
        return "❌ Enter boxes and/or items for each line.";
      if (asInt(line.boxes_sent) < 0 || asInt(line.items_sent) < 0)
        return "❌ Quantities cannot be negative.";

      const remaining = remainingForLine(i);
      if (remaining != null && remaining < 0) {
        return "❌ Issued quantity exceeds available stock for a selected pack.";
      }

      const key = keyFor(line.product_id, pack);
      if (seenKeys.has(key)) {
        return "❌ Duplicate product + pack size lines are not allowed.";
      }
      seenKeys.add(key);
    }

    return "";
  };

  // ---------- apply picker quantities -> main items ----------
  const applyPickerToItems = () => {
    setPickerGlobalError("");

    // block if any row exceeds available stock
    let hasError = false;
    filteredProducts.forEach((p) => {
      const pack = Math.max(1, asInt(p.display_pack));
      const rowKey = keyFor(p.product_id, pack);
      const q = qByKey[rowKey];
      if (!q) return;

      const requested =
        asInt(q.boxes) * pack + asInt(q.items);
      if (requested <= 0) return;

      const base = asInt(p.available_qty_pcs);
      const used = usedExistingFor(p.product_id, pack);
      const remainingAfter = base - used - requested;
      if (remainingAfter < 0) {
        hasError = true;
      }
    });

    if (hasError) {
      setPickerGlobalError(
        "Some rows exceed available stock (shown in red). Please correct them before adding."
      );
      return;
    }

    const newLines = [];

    filteredProducts.forEach((p) => {
      const pack = Math.max(1, asInt(p.display_pack));
      const rowKey = keyFor(p.product_id, pack);
      const q = qByKey[rowKey];
      if (!q) return;

      const boxes = asInt(q.boxes);
      const itemsPcs = asInt(q.items);
      const total = boxes * pack + itemsPcs;
      if (total <= 0) return;

      newLines.push({
        product_id: p.product_id,
        product_code: p.product_code || "",
        product_name: p.product_name || p.name || "Unnamed",
        display_pack: pack,
        boxes_sent: boxes,
        items_sent: itemsPcs,
      });
    });

    if (!newLines.length) {
      alert("Please enter boxes/items for at least one product.");
      return;
    }

    setItems((prev) => [...prev, ...newLines]);
    setPickerOpen(false);
    setQByKey({});
    setPickerGlobalError("");
    // keep focus on Add products button so next Tab stays in form
    setTimeout(() => addProductsBtnRef.current?.focus(), 0);
  };

  // ---------- submit / print ----------
  const handlePrint = () => {
    const errMsg = validateAll();
    if (errMsg) {
      setMessage(errMsg);
      return;
    }
    window.print();
    setIsPrinted(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const errMsg = validateAll();
    if (errMsg) {
      setMessage(errMsg);
      return;
    }

    if (!isPrinted) {
      alert("⚠️ Please print the Issue Note before submitting.");
      return;
    }

    const preparedItems = items.map((i) => ({
      product_id: Number(i.product_id),
      boxes_sent: asInt(i.boxes_sent),
      items_sent: asInt(i.items_sent),
      display_pack: Math.max(1, asInt(i.display_pack)),
    }));

    const issueData = {
      issue_no: issueNo.trim(),
      lorry_id: Number(selectedLorry),
      authenticator,
      reps: [Number(selectedCollector)],
      items: preparedItems,
    };

    try {
      const res = await axios.post("/api/issue", issueData, {
        headers: { ...headers, "Content-Type": "application/json" },
      });

      if (res.data?.success) {
        setMessage("✅ Issue Note successfully created!");
        setTimeout(() => navigate("/issue/list"), 1200);
      } else {
        setMessage(
          "❌ " + (res.data?.message || "Failed to create issue note.")
        );
      }
    } catch (err) {
      console.error("Error creating Issue Note:", err);
      if (err.response?.status === 401) safeLogout();
      else
        setMessage(
          "❌ Error creating Issue Note. Please check your inputs."
        );
    }
  };

  // ---------- UI ----------
  return (
    <>
      <Navbar />

      {/* match GRN / AddProduct layout */}
      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🧾</span>
            <h1 className="text-3xl font-semibold text-gray-800">
              Loading Issue Note
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/issue/list")}
              className="bg-gray-700 text-white px-5 py-3 rounded-xl hover:bg-gray-800"
            >
              View Issue Notes
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
            {/* Issue info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Issue Note No
                </label>
                <input
                  ref={issueNoRef}
                  type="text"
                  value={issueNo}
                  onChange={(e) => setIssueNo(e.target.value)}
                  required
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter issue note number"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Supplier (for product list)
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lorry & Collector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Lorry
                </label>
                <div className="flex gap-3">
                  <select
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedLorry}
                    onChange={(e) => setSelectedLorry(e.target.value)}
                    required
                  >
                    <option value="">Select Lorry</option>
                    {lorries.map((l) => (
                      <option key={l.lorry_id} value={l.lorry_id}>
                        {l.lorry_no}
                      </option>
                    ))}
                  </select>
                  
                </div>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Cash Collector
                </label>
                <div className="flex gap-3">
                  <select
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedCollector}
                    onChange={(e) => setSelectedCollector(e.target.value)}
                    required
                  >
                    <option value="">Select Cash Collector</option>
                    {cashCollectors.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c._name || "(Unnamed)"}
                      </option>
                    ))}
                  </select>
                  
                </div>
              </div>
            </div>

            {/* Authenticator & Initiator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Authenticator Name
                </label>
                <input
                  type="text"
                  value={authenticator}
                  onChange={(e) => setAuthenticator(e.target.value)}
                  required
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter authenticator's name"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Initiator
                </label>
                <input
                  type="text"
                  value={initiator}
                  readOnly
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-100 px-4 text-lg text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Issued Products */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl  text-gray-800">
                  Issued Products
                </h3>
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
                    const remaining = remainingForLine(index);
                    const packNow = Math.max(1, asInt(line.display_pack));

                    let remBoxes = 0,
                      remItems = 0;
                    if (remaining != null) {
                      remBoxes = Math.floor(Math.max(0, remaining) / packNow);
                      remItems = Math.max(0, remaining) % packNow;
                    }

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
                          {remaining != null && (
                            <div
                              className={`text-xs mt-1 ${
                                remaining < 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              Remaining for Pack {packNow}:{" "}
                              <b>
                                {remBoxes} box
                                {remBoxes === 1 ? "" : "es"} + {remItems} pcs
                              </b>{" "}
                              (pcs: {Math.max(0, remaining)})
                              {remaining < 0 && (
                                <span className="ml-2">
                                  — exceeds available
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-2 border-r">
                          <input
                            className="border p-2 rounded-lg w-full text-base text-center bg-gray-100"
                            value={packNow || ""}
                            readOnly
                          />
                        </div>

                        <div className="p-2 border-r">
                          <input
                            type="number"
                            min="0"
                            className="border p-2 rounded-lg w-full text-base text-center"
                            value={line.boxes_sent}
                            onChange={(e) =>
                              setLine(index, {
                                boxes_sent: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="p-2 border-r">
                          <input
                            type="number"
                            min="0"
                            className="border p-2 rounded-lg w-full text-base text-center"
                            value={line.items_sent}
                            onChange={(e) =>
                              setLine(index, {
                                items_sent: e.target.value,
                              })
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

              {/* Add products button (opens picker) */}
              <button
                type="button"
                ref={addProductsBtnRef}
                onClick={openPicker}
                className="bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700 text-base"
              >
                Add products
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-yellow-500 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-yellow-600"
              >
                🖨️ Print Issue Note
              </button>

              <button
                type="submit"
                disabled={!isPrinted}
                className={`px-6 py-3 rounded-xl text-lg font-semibold ${
                  isPrinted
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-gray-400 text-gray-700 cursor-not-allowed"
                }`}
              >
                Submit Issue Note
              </button>
            </div>

            {message && (
              <p
                className={`text-center mt-5 text-xl font-medium ${
                  message.startsWith("✅")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* ---------- PRODUCT PICKER MODAL (multi-add) ---------- */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select Products"
            className="bg-white w-[1250px] max-h-[85vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
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
                className="border border-gray-300 rounded-xl px-4 py-3 w-full text-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <table className="w-full text-left border border-gray-300 text-[16px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border border-gray-300">
                      Product Code
                    </th>
                    <th className="p-2 border border-gray-300">Product</th>
                    <th className="p-2 border border-gray-300 text-center">
                      Stock
                    </th>
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
                    const pack = Math.max(1, asInt(p.display_pack));
                    const rowKey = keyFor(p.product_id, pack);
                    const code = p.product_code || "";
                    const name = p.product_name || p.name || "Unnamed";
                    const basePcs = asInt(p.available_qty_pcs);
                    const used = usedExistingFor(p.product_id, pack);
                    const maxPcs = Math.max(0, basePcs - used);

const boxesStock = Math.floor(maxPcs / pack);
const itemsStock = maxPcs % pack;


                    const q = getQ(rowKey);
                    const isActive = rowIdx === highlightIndex;

                    const requested =
                      asInt(q.boxes) * pack + asInt(q.items);
                    
                    const remainingAfter = basePcs - used - requested;
                    const exceeds = requested > 0 && remainingAfter < 0;

                    const maxBoxes = Math.floor(maxPcs / pack);
                    const maxItems = maxPcs % pack;

                    return (
                      <tr
                        key={rowKey}
                        className={`${rowIdx % 2 ? "bg-gray-50" : "bg-white"} ${
                          isActive ? "bg-indigo-50" : ""
                        } hover:bg-gray-100`}
                        onMouseEnter={() => setHighlightIndex(rowIdx)}
                      >
                        <td className="p-2 border border-gray-300 font-mono text-sm whitespace-nowrap">
                          {code}
                        </td>
                        <td className="p-2 border border-gray-300 text-sm whitespace-nowrap">
                          {name}
                        </td>
                        <td className="p-2 border border-gray-300 text-center">
                          {boxesStock} box{boxesStock === 1 ? "" : "es"} + {itemsStock} pcs{" "}
                          <span className="text-gray-500">(pcs: {maxPcs})</span>
                        </td>
                        <td className="p-2 border border-gray-300 text-center">
                          {pack}
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            min="0"
                            value={q.boxes}
                            onChange={(e) =>
                              setQ(rowKey, {
                                boxes: Math.max(0, asInt(e.target.value)),
                              })
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, rowIdx, rowKey, "boxes")
                            }
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[rowKey] =
                                cellRefs.current[rowKey] || {};
                              cellRefs.current[rowKey].boxes = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-base text-center"
                          />
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            min="0"
                            value={q.items}
                            onChange={(e) =>
                              setQ(rowKey, {
                                items: Math.max(0, asInt(e.target.value)),
                              })
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, rowIdx, rowKey, "items")
                            }
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[rowKey] =
                                cellRefs.current[rowKey] || {};
                              cellRefs.current[rowKey].items = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-base text-center"
                          />
                          {exceeds && (
                            <div className="text-xs text-red-600 mt-1 text-left">
                              Exceeds available for this pack. Max you can
                              issue now:{" "}
                              <b>
                                {maxBoxes} box
                                {maxBoxes === 1 ? "" : "es"} + {maxItems} pcs
                              </b>{" "}
                              (pcs: {maxPcs})
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProducts.length && (
                    <tr>
                      <td
                        className="p-3 text-center text-gray-500 border border-gray-300"
                        colSpan={6}
                      >
                        No products match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t flex justify-between items-center text-sm text-gray-600">
              <div className="space-y-1">
                <div>
                  <b>Shortcuts:</b> ↑/↓ move rows • ←/→ move between Boxes/Items
                  • Tab stays inside • Esc closes
                </div>
                {pickerGlobalError && (
                  <div className="text-red-600 text-xs">
                    {pickerGlobalError}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                  onClick={closePicker}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      closePicker();
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={applyPickerToItems}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyPickerToItems();
                    }
                  }}
                >
                  Add to Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ---------- /PRODUCT PICKER MODAL ---------- */}
    </>
  );
};

export default IssueNoteCreate;
