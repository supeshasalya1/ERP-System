// client/src/Components/ADJUSTMENTS/AdjustmentCreate.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const pad2 = (value) => String(value).padStart(2, "0");
const getLocalDateTimeString = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const MAX_PRINT_ROWS = 25;

const AdjustmentCreate = () => {
  const navigate = useNavigate();

  // ---------- top-level state ----------
  /*const [noteDate, setNoteDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );*/
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [reasons, setReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [sourceType, setSourceType] = useState("DIRECT");
  const [sourceRef, setSourceRef] = useState("");
  const [remark, setRemark] = useState("");
  const [products, setProducts] = useState([]); // rows from /api/adjustments/products
  const [items, setItems] = useState([]); // adjustment lines
  const [message, setMessage] = useState("");

  // picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [pickerGlobalError, setPickerGlobalError] = useState("");
  const [qByKey, setQByKey] = useState({}); // { "pid|pack": { boxes: string, items: string } }

  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );
  const createdByUsername = useMemo(
    () => localStorage.getItem("username") || "",
    []
  );

  // refs
  //const dateRef = useRef(null);
  const supplierRef = useRef(null);
  const addProductsBtnRef = useRef(null);
  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const cellRefs = useRef({}); // { rowKey: { boxes: ref, items: ref } }

  // ---------- helpers ----------
  const keyFor = (pid, pack) => `${pid}|${pack}`;

  const selectedSupplierObj = suppliers.find(
    (s) => String(s.supplier_id) === String(selectedSupplier)
  );
  const selectedSupplierName = selectedSupplierObj?.name || "";

  const selectedReasonObj = reasons.find(
    (r) => String(r.reason_id) === String(selectedReason)
  );
  const selectedReasonLabel =
    selectedReasonObj?.display_name || selectedReasonObj?.code || "";

  const toInt = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (s === "" || s === "-" || s === "+") return 0;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? 0 : n;
  };

  const asPositiveInt = (v, d = 1) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return d;
    return Math.floor(n);
  };

  const computeNetPcs = (line) => {
    if (!line) return 0;
    const pack = asPositiveInt(line.pack_size, 1);
    const boxes = toInt(line.delta_boxes);
    const items = toInt(line.delta_items);
    return boxes * pack + items;
  };

  const resetForm = () => {
    // Reset header fields
    setSelectedSupplier("");
    setSelectedReason("");
    setSourceType("DIRECT");
    setSourceRef("");
    setRemark("");

    // Clear loaded products and adjustment lines
    setProducts([]);
    setItems([]);

    // Clear any messages
    setMessage("");

    // Reset picker state
    setPickerOpen(false);
    setPickerQuery("");
    setHighlightIndex(0);
    setPickerGlobalError("");
    setQByKey({});

    // Clear cell refs
    cellRefs.current = {};

    // Focus supplier select for convenience
    setTimeout(() => supplierRef.current?.focus(), 0);
  }
  // base stock per product+pack (pcs) from backend
  const baseStockMap = useMemo(() => {
    const m = new Map();
    products.forEach((p) => {
      const pack = asPositiveInt(p.display_pack, 1);
      m.set(keyFor(p.product_id, pack), Number(p.available_qty_pcs) || 0);
    });
    return m;
  }, [products]);

  const totalNetForKey = (pid, pack) => {
    const key = keyFor(pid, pack);
    let sum = 0;
    items.forEach((ln) => {
      if (
        String(ln.product_id) === String(pid) &&
        asPositiveInt(ln.pack_size, 1) === pack
      ) {
        sum += computeNetPcs(ln);
      }
    });
    return sum;
  };

  const stockAfterForLine = (idx) => {
    const line = items[idx];
    if (!line) return null;
    const pack = asPositiveInt(line.pack_size, 1);
    const key = keyFor(line.product_id, pack);
    const base = baseStockMap.get(key) || 0;
    const netAll = totalNetForKey(line.product_id, pack);
    return base + netAll;
  };

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

    useEffect(() => {
      supplierRef.current?.focus();
    }, []);
  

  // ---------- bootstrap ----------
  useEffect(() => {
    if (!token) {
      alert("You must be logged in to create adjustments.");
      navigate("/");
      return;
    }

    (async () => {
      try {
        const [supRes, reasonRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/adjustments/reasons", { headers }),
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setReasons(Array.isArray(reasonRes.data) ? reasonRes.data : []);
      } catch (err) {
        console.error("Error loading adjustment bootstrap data:", err);
        if (err.response?.status === 401) safeLogout();
      }
    })();
  }, [navigate, token, headers]);

  // focus date on mount
  /*useEffect(() => {
    dateRef.current?.focus();
  }, [])  ;*/

  // load products when supplier changes
  useEffect(() => {
    

    if (!selectedSupplier) {
      setProducts([]);
      return;
    }
    (async () => {
      try {
        const res = await axios.get(
          `/api/adjustments/products?supplier_id=${selectedSupplier}`,
          { headers }
        );
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading adjustment products:", err);
        if (err.response?.status === 401) safeLogout();
      }
    })();
  }, [selectedSupplier, headers]);

  // ---------- items helpers ----------
  const setLine = (index, patch) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const removeLine = (index) =>
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });

  // ---------- PICKER ----------
  const openPicker = () => {
    if (!selectedSupplier) {
      alert("Please select a supplier first.");
      supplierRef.current?.focus();
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
    setPickerGlobalError("");
    setQByKey({});
    setTimeout(() => addProductsBtnRef.current?.focus(), 0);
  };

  const filteredProducts = products.filter((p) => {
    if (
      selectedSupplier &&
      String(p.supplier_id) !== String(selectedSupplier)
    ) {
      return false;
    }
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    const code = (p.product_code || "").toLowerCase();
    const name = (p.product_name || p.name || "").toLowerCase();
    const packText = String(p.display_pack || "").toLowerCase();
    return code.includes(q) || name.includes(q) || packText.includes(q);
  });

  useEffect(() => {
    if (highlightIndex >= filteredProducts.length) {
      setHighlightIndex(filteredProducts.length ? filteredProducts.length - 1 : 0);
    }
  }, [filteredProducts.length, highlightIndex]);

  const getQ = (rowKey) => {
    const existing = qByKey[rowKey];
    if (existing) return existing;
    return { boxes: "", items: "" };
  };

  const setQ = (rowKey, patch) => {
    setQByKey((prev) => {
      const base = prev[rowKey] || { boxes: "", items: "" };
      return { ...prev, [rowKey]: { ...base, ...patch } };
    });
  };

  const focusRowCell = (rowIdx, col = "boxes") => {
    const p = filteredProducts[rowIdx];
    if (!p) return;
    const pack = asPositiveInt(p.display_pack, 1);
    const rowKey = keyFor(p.product_id, pack);
    const cell = cellRefs.current[rowKey]?.[col];
    if (cell) cell.focus();
  };

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

    // we fully own Arrow keys + Enter for navigation (no value change)
    if (
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "Enter"
    ) {
      e.preventDefault();
    } else {
      return; // let typing / backspace / delete behave normally
    }

    if (key === "Enter") {
      // stay inside picker
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

  // global key handler in picker: Esc + Tab trap
  useEffect(() => {
    if (!pickerOpen) return;

    const handleKey = (e) => {
      if (!pickerOpen) return;
      const inModal =
        modalRef.current && modalRef.current.contains(document.activeElement);

      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
      }

      if (e.key === "Enter" && inModal) {
        // prevent accidental submit of main form
        e.preventDefault();
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

  useEffect(() => {
    if (!pickerOpen) return;
    setTimeout(() => searchRef.current?.focus(), 0);
  }, [pickerOpen]);

  const netFromItemsForKey = (pid, pack) => {
    let sum = 0;
    items.forEach((ln) => {
      if (
        String(ln.product_id) === String(pid) &&
        asPositiveInt(ln.pack_size, 1) === pack
      ) {
        sum += computeNetPcs(ln);
      }
    });
    return sum;
  };

  const applyPickerToItems = () => {
    setPickerGlobalError("");
    const newLines = [];
    let hasNegativeError = false;

    filteredProducts.forEach((p) => {
      const pack = asPositiveInt(p.display_pack, 1);
      const rowKey = keyFor(p.product_id, pack);
      const q = qByKey[rowKey];
      if (!q) return;
      const deltaBoxes = q.boxes;
      const deltaItems = q.items;

      const netDelta = toInt(deltaBoxes) * pack + toInt(deltaItems);
      if (netDelta === 0) return;

      // stock checks
      const base = baseStockMap.get(rowKey) || 0;
      const existingNet = netFromItemsForKey(p.product_id, pack);
      const stockAfter = base + existingNet + netDelta;

      if (stockAfter < 0) {
        hasNegativeError = true;
        return;
      }

      newLines.push({
        product_id: p.product_id,
        product_code: p.product_code || "",
        product_name: p.product_name || p.name || "Unnamed",
        pack_size: pack,
        delta_boxes: deltaBoxes,
        delta_items: deltaItems,
      });
    });

    if (hasNegativeError) {
      setPickerGlobalError(
        "Some rows would make stock negative. Please reduce the minus values shown in red."
      );
      return;
    }

    if (!newLines.length) {
      alert("Please enter non-zero adjustments for at least one product.");
      return;
    }

    setItems((prev) => [...prev, ...newLines]);
    setQByKey({});
    setPickerOpen(false);
    setTimeout(() => addProductsBtnRef.current?.focus(), 0);
  };

  const buildPrintHtml = () => {
    const rowsHtml = Array.from({ length: MAX_PRINT_ROWS })
      .map((_, idx) => {
        const line = items[idx];
        if (!line) {
          return `
          <tr>
            <td class="code"></td>
            <td class="name"></td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num"></td>
          </tr>
        `;
        }

        const pack = asPositiveInt(line.pack_size, 1);
        const boxes = toInt(line.delta_boxes);
        const pieces = toInt(line.delta_items);
        const net = computeNetPcs(line);

        return `
          <tr>
            <td class="code">${line.product_code || ""}</td>
            <td class="name">${line.product_name || ""}</td>
            <td class="num">${pack}</td>
            <td class="num">${boxes}</td>
            <td class="num">${pieces}</td>
            <td class="num">${net}</td>
          </tr>
        `;
      })
      .join("");

    const supplier = selectedSupplierName || "SUPPLIER";
    const reason = selectedReasonLabel || "--";
    const sourceRefTrimmed = sourceRef?.trim() || "";
    const sourceDetails = sourceType
      ? `${sourceType}${sourceRefTrimmed ? ` (${sourceRefTrimmed})` : ""}`
      : "";
    const remarkText = remark?.trim() || "";
    const dateText = getLocalDateTimeString();
    const totalNet = items.reduce((sum, ln) => sum + computeNetPcs(ln), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stock Adjustment</title>
  <style>
    @page { size: auto; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #000; }
    .wrap { width: 100%; margin: 0 auto; }
    .header-main { text-align: center; margin-bottom: 6px; }
    .header-main .title { font-weight: 700; font-size: 18px; letter-spacing: 1px; }
    .header-main .line { font-size: 11px; margin-top: 2px; text-transform: uppercase; }
    .meta { font-size: 12px; margin-bottom: 8px; }
    .meta div { margin-bottom: 2px; }
    .meta strong { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
    th, td { border: 1px solid #000; padding: 2px 4px; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    th { text-align: left; font-weight: 600; }
    th.num, td.num { text-align: center; }
    td.code { font-family: monospace; }
    tr { page-break-inside: avoid; }
    .summary { margin-top: 10px; font-size: 12px; font-weight: 600; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; }
    .sign-block { width: 45%; }
    .sign-line { margin-top: 22px; border-top: 1px solid #000; width: 100%; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-main">
      <div class="title">LEELARATHNE &amp; SONS</div>
      <div class="line">Stock Adjustment Note</div>
    </div>

    <div class="meta">
      <div>Supplier: <strong>${supplier}</strong></div>
      <div>Reason: <strong>${reason}</strong></div>
      <div>Date: <strong>${dateText}</strong></div>
      ${sourceDetails ? `<div>Source: <strong>${sourceDetails}</strong></div>` : ""}
      ${remarkText ? `<div>Remark: <strong>${remarkText}</strong></div>` : ""}
      <div>Prepared By: <strong>${createdByUsername}</strong></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:18%;">Product Code</th>
          <th style="width:36%;">Name</th>
          <th class="num" style="width:10%;">Pack</th>
          <th class="num" style="width:12%;">Boxes (+/-)</th>
          <th class="num" style="width:12%;">Items (+/-)</th>
          <th class="num" style="width:12%;">Net Pcs</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="summary">
      Total Net Adjustment (pcs): <strong>${totalNet}</strong>
    </div>

    <div class="sign-row">
      <div class="sign-block">
        <div>Checked By</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-block" style="text-align:right;">
        <div>Approved By</div>
        <div class="sign-line"></div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // ---------- Validation + submit ----------
  const validateAll = () => {
    //if (!noteDate) return "❌ Date is required.";
    if (!selectedSupplier) return "❌ Supplier is required.";
    if (!selectedReason) return "❌ Reason is required.";
    if (!sourceType) return "❌ Source type is required.";
    if (!items.length) return "❌ Please add at least one adjustment line.";

    for (let i = 0; i < items.length; i++) {
      const ln = items[i];
      if (!ln.product_id) return "❌ Each line must have a product.";
      const pack = asPositiveInt(ln.pack_size, 1);
      if (!Number.isFinite(pack) || pack <= 0)
        return "❌ Pack size must be greater than 0.";

      const net = computeNetPcs(ln);
      if (net === 0)
        return "❌ Each line must have a non-zero adjustment (boxes/items).";
    }

    // stock cannot go negative per (product, pack)
    const byKey = new Map();

    items.forEach((ln) => {
      const pack = asPositiveInt(ln.pack_size, 1);
      const key = keyFor(ln.product_id, pack);
      const net = computeNetPcs(ln);
      byKey.set(key, (byKey.get(key) || 0) + net);
    });

    for (const [key, netSum] of byKey.entries()) {
      const base = baseStockMap.get(key) || 0;
      const finalStock = base + netSum;
      if (finalStock < 0) {
        return "❌ Adjustment would make stock negative for at least one product/pack.";
      }
    }

    return "";
  };

  const handlePrint = () => {
    const errMsg = validateAll();
    if (errMsg) {
      setMessage(errMsg);
      return;
    }

    const html = buildPrintHtml();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      }
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const errMsg = validateAll();
    if (errMsg) {
      setMessage(errMsg);
      return;
    }

    // Build payload exactly as backend expects
    const payload = {
      //note_date: noteDate,
      reason_id: Number(selectedReason),
      remark: remark || null,
      source_type: sourceType,
      // backend's column is INT; if user types non-numeric, just store 0
      source_id: Number.isFinite(Number(sourceRef)) ? Number(sourceRef) : 0,
      items: items.map((ln) => ({
        product_id: Number(ln.product_id),
        pack_size: asPositiveInt(ln.pack_size, 1),
        delta_boxes: toInt(ln.delta_boxes),
        delta_items: toInt(ln.delta_items),
      })),
    };

    try {
      // 1) create adjustment as DRAFT
      const res = await axios.post("/api/adjustments", payload, {
        headers: { ...headers, "Content-Type": "application/json" },
      });

      const noteId = res.data?.note_id;
      const noteNo = res.data?.note_no;

      if (!noteId) {
        setMessage(
          "❌ Failed to create adjustment note. Please check your inputs."
        );
        return;
      }

      // 2) immediately POST it so stock is updated
      try {
        const postRes = await axios.post(
          `/api/adjustments/${noteId}/post`,
          {},
          { headers }
        );

        if (postRes.data?.success) {
          setMessage(
            `✅ Adjustment note ${noteNo || noteId} created and applied to stock.`
          );
          resetForm();
        } else {
          setMessage(
            `⚠️ Adjustment ${noteNo || noteId} created, but failed to apply to stock.`
          );
        }
      } catch (postErr) {
        console.error("Error posting adjustment note:", postErr);
        setMessage(
          `⚠️ Adjustment ${noteNo || noteId} created, but an error occurred while applying to stock.`
        );
      }
    } catch (err) {
      console.error("Error creating adjustment note:", err);
      if (err.response?.status === 401) {
        safeLogout();
      } else {
        setMessage(
          "❌ Failed to create adjustment note. Please check console for details."
        );
      }
    }
  };


  // ---------- UI ----------
  return (
    <>
      <Navbar />

      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🛠️</span>
            <h1 className="text-3xl font-semibold text-gray-800">
              Stock Adjustment
            </h1>
          </div>

          <div className="flex gap-3">
  
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
            {/* Header fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  ref={supplierRef}
                  value={selectedSupplier}
                  onChange={(e) => {
                    setSelectedSupplier(e.target.value);
                    setItems([]); // clear existing lines when supplier changes
                  }}
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

            {/* Reason / source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Reason</option>
                  {reasons.map((r) => (
                    <option key={r.reason_id} value={r.reason_id}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Source Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DIRECT">DIRECT</option>
                  <option value="GRN">GRN</option>
                  <option value="ISSUE">ISSUE</option>
                  <option value="UNLOAD">UNLOAD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Source Ref (GRN / Issue / Unload No)
                </label>
                <input
                  type="text"
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional (e.g. GRN-0002)"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Remark
                </label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional remark"
                />
              </div>
            </div>

            {/* Adjustment lines */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl text-gray-800">Adjustment Lines</h3>
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
                    <div className="p-2 border-r text-center">Boxes (+ / -)</div>
                    <div className="p-2 border-r text-center">Items (+ / -)</div>
                    <div className="p-2 border-r text-center">Net pcs</div>
                    <div className="p-2 text-center">Remove</div>
                  </div>

                  {items.map((line, index) => {
                    const net = computeNetPcs(line);
                    const after = stockAfterForLine(index);
                    const pack = asPositiveInt(line.pack_size, 1);

                    let afterBoxes = 0,
                      afterItems = 0;
                    if (after !== null && after >= 0) {
                      afterBoxes = Math.floor(after / pack);
                      afterItems = after % pack;
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
                          {after !== null && (
                            <div
                              className={`text-xs mt-1 ${
                                after < 0 ? "text-red-600" : "text-gray-500"
                              }`}
                            >
                              New stock for pack {pack}:{" "}
                              {after >= 0 ? (
                                <>
                                  <b>
                                    {afterBoxes} box
                                    {afterBoxes === 1 ? "" : "es"} +{" "}
                                    {afterItems} pcs
                                  </b>{" "}
                                  (pcs: {after})
                                </>
                              ) : (
                                <>would become negative — not allowed</>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-2 border-r text-center">
                          <input
                            className="border p-2 rounded-lg w-full text-base text-center bg-gray-100"
                            value={pack}
                            readOnly
                          />
                        </div>

                        <div className="p-2 border-r text-center">
                          <input
                            type="text"
                            className="border p-2 rounded-lg w-full text-base text-center"
                            value={line.delta_boxes ?? ""}
                            onChange={(e) =>
                              setLine(index, { delta_boxes: e.target.value })
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </div>

                        <div className="p-2 border-r text-center">
                          <input
                            type="text"
                            className="border p-2 rounded-lg w-full text-base text-center"
                            value={line.delta_items ?? ""}
                            onChange={(e) =>
                              setLine(index, { delta_items: e.target.value })
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </div>

                        <div className="p-2 border-r text-center text-gray-800">
                          {net}
                        </div>

                        <div className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
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
                ref={addProductsBtnRef}
                onClick={openPicker}
                className="bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700 text-base"
              >
                Add products
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t mt-4 flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-yellow-500 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-yellow-600"
              >
                🖨️ Print Adjustment
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Submit Adjustment
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

      {/* ---------- PRODUCT PICKER MODAL ---------- */}
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
              <table className="w-full text-left border border-gray-300 text-[15px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border border-gray-300">Product Code</th>
                    <th className="p-2 border border-gray-300">Product</th>
                    <th className="p-2 border border-gray-300 text-center">
                      Pack
                    </th>
                    <th className="p-2 border border-gray-300 text-center">
                      Current Stock
                    </th>
                    <th className="p-2 border border-gray-300 text-center">
                      Boxes (+ / -)
                    </th>
                    <th className="p-2 border border-gray-300 text-center">
                      Items (+ / -)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, rowIdx) => {
                    const pack = asPositiveInt(p.display_pack, 1);
                    const rowKey = keyFor(p.product_id, pack);
                    const code = p.product_code || "";
                    const name = p.product_name || p.name || "Unnamed";
                    const base = baseStockMap.get(rowKey) || 0;

                    const baseBoxes = Math.floor(Math.max(0, base) / pack);
                    const baseItems = Math.max(0, base) % pack;

                    const q = getQ(rowKey);
                    const isActive = rowIdx === highlightIndex;

                    const existingNet = netFromItemsForKey(p.product_id, pack);
                    const requestedNet =
                      toInt(q.boxes) * pack + toInt(q.items);
                    const finalStock = base + existingNet + requestedNet;
                    const willNegative = finalStock < 0;

                    const finalBoxes =
                      finalStock >= 0
                        ? Math.floor(finalStock / pack)
                        : 0;
                    const finalItems =
                      finalStock >= 0 ? finalStock % pack : 0;

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
                          {pack}
                        </td>
                        <td className="p-2 border border-gray-300 text-center">
                          {baseBoxes} box
                          {baseBoxes === 1 ? "" : "es"} + {baseItems} pcs{" "}
                          <span className="text-gray-500"> (pcs: {base})</span>
                          {existingNet !== 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              After current note (before this row):{" "}
                              {finalStock - requestedNet >= 0 && (
                                <>
                                  {Math.floor(
                                    (base + existingNet) / pack
                                  )}{" "}
                                  boxes +{" "}
                                  {(base + existingNet) % pack} pcs (pcs:{" "}
                                  {base + existingNet})
                                </>
                              )}
                            </div>
                          )}
                          {finalStock >= 0 && requestedNet !== 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              After including this row:{" "}
                              <b>
                                {finalBoxes} box
                                {finalBoxes === 1 ? "" : "es"} + {finalItems} pcs
                              </b>{" "}
                              (pcs: {finalStock})
                            </div>
                          )}
                          {willNegative && (
                            <div className="text-xs text-red-600 mt-1">
                              Adjustment would make stock negative. Reduce the
                              minus values.
                            </div>
                          )}
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={q.boxes}
                            onChange={(e) =>
                              setQ(rowKey, { boxes: e.target.value })
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
                            className={`border rounded-lg px-2 py-1 w-24 text-base text-center ${
                              willNegative ? "border-red-500" : ""
                            }`}
                          />
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={q.items}
                            onChange={(e) =>
                              setQ(rowKey, { items: e.target.value })
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
                            className={`border rounded-lg px-2 py-1 w-24 text-base text-center ${
                              willNegative ? "border-red-500" : ""
                            }`}
                          />
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
                  <b>Shortcuts:</b> ↑/↓ move rows • ←/→ move between
                  Boxes/Items • Tab stays inside • Esc closes
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
                  Add to Adjustment
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

export default AdjustmentCreate;
