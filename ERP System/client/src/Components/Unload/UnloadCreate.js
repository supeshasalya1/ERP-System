// client/src/Components/UNLOAD/UnloadCreate.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const pad2 = (value) => String(value).padStart(2, "0");
const getLocalDateTimeString = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampNonNegative = (v) => Math.max(0, asInt(v));

const UnloadCreate = () => {
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

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);

  // bootstrap
  const [suppliers, setSuppliers] = useState([]);
  const [lorries, setLorries] = useState([]); // issue lorries
  const [pickerProducts, setPickerProducts] = useState([]); // from /api/stocks/grn-picker?supplier_id=

  // header fields
  const [unloadNo, setUnloadNo] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedLorry, setSelectedLorry] = useState("");
  const [remarks, setRemarks] = useState("");

  const createdByUsername = localStorage.getItem("username") || "";

  // line items
  // {
  //   product_id, product_code, product_name,
  //   pack_size, boxes, items, current_pcs, error
  // }
  const [items, setItems] = useState([]);

  // ---------- Product picker modal (multi-add, cashier-style) ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  // per-product staging quantities: { [product_id]: { pack, boxes, items } }
  const [qByPid, setQByPid] = useState({});

  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const cellRefs = useRef({}); // { [pid]: { pack, boxes, items } }

  // focus control inside Unload No field
  const unloadNoRef = useRef(null);
  const addProductsRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
    }
  }, [token, navigate]);

  useEffect(() => {
    unloadNoRef.current?.focus();
  }, []);

  const computePieces = (line) => {
    const pack = Math.max(1, asInt(line.pack_size));
    const boxes = asInt(line.boxes);
    const items = asInt(line.items);
    return boxes * pack + items;
  };

  const totalPiecesAll = items.reduce(
    (sum, ln) => sum + (ln.current_pcs || 0),
    0
  );

  const MAX_PRINT_ROWS = 25;

  const selectedSupplierObj = suppliers.find(
    (s) => String(s.supplier_id) === String(selectedSupplier)
  );
  const selectedSupplierName = selectedSupplierObj?.name || "";

  const selectedLorryObj = lorries.find(
    (l) => String(l.lorry_id) === String(selectedLorry)
  );
  const selectedLorryNo = selectedLorryObj?.lorry_no || "";

  const buildPrintHtml = () => {
    const rowsHtml = Array.from({ length: MAX_PRINT_ROWS })
      .map((_, idx) => {
        const line = items[idx];
        const code = line?.product_code ?? "";
        const name = line?.product_name ?? "";
        if (!line) {
          return `
          <tr>
            <td class="code"></td>
            <td class="name"></td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num"></td>
          </tr>
        `;
        }

        const pack = line.pack_size ?? "";
        const boxes = asInt(line.boxes);
        const pieces = asInt(line.items);

        return `
          <tr>
            <td class="code">${code}</td>
            <td class="name">${name}</td>
            <td class="num">${pack}</td>
            <td class="num">${boxes}</td>
            <td class="num">${pieces}</td>
          </tr>
        `;
      })
      .join("");

    const dateText = getLocalDateTimeString();
    const supplier = selectedSupplierName || "";
    const lorry = selectedLorryNo || "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Unload Note - ${unloadNo || "UNLOAD"}</title>
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
    .sign-row { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; }
    .sign-block { width: 45%; }
    .sign-line { margin-top: 22px; border-top: 1px solid #000; width: 100%; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-main">
      <div class="title">LEELARATHNE &amp; SONS</div>
    </div>

    <div class="meta">
      <div>Unload No: <strong>${unloadNo || ""}</strong></div>
      <div>Supplier: <strong>${supplier}</strong></div>
      <div>Vehicle: <strong>${lorry}</strong></div>
      <div>Date: <strong>${dateText}</strong></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:18%;">Product Code</th>
          <th style="width:40%;">Name</th>
          <th class="num" style="width:12%;">Pack Size</th>
          <th class="num" style="width:15%;">Boxes</th>
          <th class="num" style="width:15%;">Pieces</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="sign-row">
      <div class="sign-block">
        <div>Returned By</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-block" style="text-align:right;">
        <div>Received By</div>
        <div class="sign-line"></div>
        <div style="margin-top:6px;">${createdByUsername}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = () => {
    if (!unloadNo.trim()) return setMessage("❌ Unload Note No is required to print.");
    if (!selectedSupplier) return setMessage("❌ Supplier is required to print.");
    if (!selectedLorry) return setMessage("❌ Lorry is required to print.");
    if (!items.length) return setMessage("❌ No lines available to print.");

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

    setIsPrinted(true);
  };

  const setLine = (index, patch) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      if (!cur) return prev;
      const next = { ...cur, ...patch };

      const pack = asInt(next.pack_size);
      const boxes = asInt(next.boxes);
      const pieces = asInt(next.items);

      let error = "";
      if (next.pack_size === "" || pack <= 0) {
        error = "Pack size is required";
      }

      copy[index] = {
        ...next,
        current_pcs:
          next.pack_size === "" ? 0 : Math.max(0, boxes) * Math.max(1, pack) + Math.max(0, pieces),
        error,
      };
      return copy;
    });
  };

  const removeItem = (index) =>
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });

  const resetForm = ({ preserveMessage = false } = {}) => {
    setUnloadNo("");
    setSelectedSupplier("");
    setSelectedLorry("");
    setRemarks("");
    setItems([]);
    setPickerProducts([]);
    setQByPid({});
    setPickerOpen(false);
    if (!preserveMessage) {
      setMessage("");
    }
    setTimeout(() => unloadNoRef.current?.focus(), 0);
  };

  // ---------- bootstrap suppliers + lorries ----------
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    (async () => {
      try {
        const [supRes, lorryRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/issue/lorries", { headers }),
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setLorries(Array.isArray(lorryRes.data) ? lorryRes.data : []);
      } catch (err) {
        console.error("Error loading unload bootstrap:", err);
        if (err.response?.status === 401) safeLogout();
      }
    })();
  }, [navigate, token, headers]);

  // ---------- load products for picker when supplier changes ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setItems([]);
        setQByPid({});
        setPickerQuery("");
        setHighlightIndex(0);

        if (!selectedSupplier) {
          if (!cancelled) setPickerProducts([]);
          return;
        }

        const res = await axios.get(
          `/api/stocks/grn-picker?supplier_id=${selectedSupplier}`,
          { headers }
        );
        if (!cancelled) {
          setPickerProducts(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Error loading unload picker products:", err);
        if (!cancelled && err.response?.status === 401) safeLogout();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSupplier, headers]);

  // ---------- picker helpers ----------
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

  // de-duplicate by product_id
  const baseProducts = useMemo(() => {
    const byId = new Map();
    (pickerProducts || []).forEach((p) => {
      if (!byId.has(p.product_id)) byId.set(p.product_id, p);
    });
    return Array.from(byId.values());
  }, [pickerProducts]);

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

  useEffect(() => {
    setHighlightIndex((i) =>
      Math.max(0, Math.min(i, Math.max(0, filteredProducts.length - 1)))
    );
  }, [filteredProducts.length]);

  const getQ = (p) => {
    const pid = p.product_id;
    const existing = qByPid[pid];
    if (existing) return existing;

    const defaultPack =
      asInt(p.display_pack) || asInt(p.default_pack_size) || 1;
    return { pack: defaultPack, boxes: 0, items: 0 };
  };

  const setQ = (pid, patch) => {
    const id = Number(pid);
    setQByPid((prev) => {
      const existing = prev[id];
      if (existing) return { ...prev, [id]: { ...existing, ...patch } };

      const prod = baseProducts.find((p) => p.product_id === id);
      const defaultPack =
        (prod && (asInt(prod.default_pack_size) || asInt(prod.display_pack))) || 1;

      return {
        ...prev,
        [id]: {
          pack: defaultPack,
          boxes: 0,
          items: 0,
          ...patch,
        },
      };
    });
  };

  const focusRowCell = (rowIdx, col = "pack") => {
    const row = filteredProducts[rowIdx];
    if (!row) return;
    const pid = row.product_id;
    const cell = cellRefs.current[pid]?.[col];
    if (cell) cell.focus();
  };

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

    if (
      key !== "ArrowDown" &&
      key !== "ArrowUp" &&
      key !== "ArrowLeft" &&
      key !== "ArrowRight" &&
      key !== "Enter"
    ) {
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    const colIdx = colOrder.indexOf(col);
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (key === "ArrowDown") nextRow = Math.min(rowIdx + 1, filteredProducts.length - 1);
    if (key === "ArrowUp") nextRow = Math.max(rowIdx - 1, 0);
    if (key === "ArrowLeft") nextCol = Math.max(colIdx - 1, 0);
    if (key === "ArrowRight") nextCol = Math.min(colIdx + 1, colOrder.length - 1);

    const target = filteredProducts[nextRow];
    if (!target) return;
    setHighlightIndex(nextRow);
    setTimeout(() => focusRowCell(nextRow, colOrder[nextCol]), 0);
  };

  // Global handler: Esc + Tab trap (inside picker)
  useEffect(() => {
    if (!pickerOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
        return;
      }

      if (e.key !== "Tab") return;

      const root = modalRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const node = searchRef.current;
    setTimeout(() => node?.focus(), 0);
  }, [pickerOpen]);

  const applyPickerToItems = () => {
    const newLines = [];

    // IMPORTANT: apply staged quantities across ALL searches.
    baseProducts.forEach((p) => {
      const pid = p.product_id;
      const q = qByPid[pid];
      if (!q) return;

      const pack = Math.max(1, asInt(q.pack));
      const boxes = asInt(q.boxes);
      const pieces = asInt(q.items);
      const total = boxes * pack + pieces;
      if (total <= 0) return;

      newLines.push({
        product_id: pid,
        product_code: p.product_code || "",
        product_name: p.product_name || p.name || "Unnamed",
        pack_size: pack,
        boxes,
        items: pieces,
        current_pcs: total,
        error: "",
      });
    });

    if (!newLines.length) {
      alert("Please enter quantities for at least one product.");
      return;
    }

    setItems((prev) => [...prev, ...newLines]);
    setPickerOpen(false);
    setQByPid({});
    setTimeout(() => addProductsRef.current?.focus(), 0);
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!unloadNo.trim()) {
      setMessage("Please enter an Unload No.");
      return;
    }
    if (!selectedSupplier) {
      setMessage("Please select a supplier.");
      return;
    }
    if (!selectedLorry) {
      setMessage("Please select a lorry.");
      return;
    }
    if (!items.length) {
      setMessage("Please add at least one product.");
      return;
    }
    if (items.some((ln) => ln.error)) {
      setMessage("Please fix invalid lines before saving.");
      return;
    }

    // there can be products not unloaded – we filter them out (quantity = 0)
    const cleanedItems = items
      .map((ln) => ({
        product_id: asInt(ln.product_id),
        pack_size: Math.max(1, asInt(ln.pack_size)),
        quantity: ln.current_pcs || 0,
        issue_item_id: null,
      }))
      .filter((row) => row.product_id && row.quantity > 0);

    if (!cleanedItems.length) {
      setMessage(
        "Please enter a quantity (boxes/items) for at least one product."
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        unload_no: unloadNo.trim(),
        lorry_id: asInt(selectedLorry),
        remarks: remarks || "",
        items: cleanedItems,
      };

      const res = await axios.post("/api/unload", payload, {
        headers: { ...headers, "Content-Type": "application/json" },
      });

      const rawMessage = res.data?.message || "Unload note saved and stock updated.";
      const successMessage = rawMessage.startsWith("✅")
        ? rawMessage
        : `✅ ${rawMessage}`;

      setMessage(successMessage);
      resetForm({ preserveMessage: true });
      setTimeout(() => navigate("/unload/list"), 800);
    } catch (err) {
      console.error("Error saving unload:", err);
      if (err.response?.status === 401) {
        safeLogout();
      } else {
        const duplicateMessage =
          err.response?.status === 409
            ? "Unload Note number already exists. Please use a unique number."
            : null;

        const serverMessage =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.response?.data?.detail ||
          (err.response?.status === 400
            ? "Invalid data sent. Please review and try again."
            : null);

        const networkMessage = !err.response
          ? "Cannot reach server. Please check your connection and try again."
          : null;

        const msg = duplicateMessage || serverMessage || networkMessage || "Failed to save unload.";
        setMessage(msg.startsWith("❌") ? msg : `❌ ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- RENDER ----------
  return (
    <>
      <div className="no-print">
        <Navbar />

        <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
          {/* Header (match IssueNoteCreate style) */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">📦</span>
              <h1 className="text-3xl font-semibold text-gray-800">
                Create Unload Note
              </h1>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/unload/list")}
                className="bg-gray-700 text-white px-5 py-3 rounded-xl hover:bg-gray-800"
              >
                View Unload Notes
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
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-10 mb-10">
            {message && (
              <p
                className={`text-center mb-5 text-xl font-medium ${
                  message.startsWith("✅")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Unload No / Supplier / Lorry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Unload No */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-1">
                    Unload Note No
                  </label>
                  <input
                    ref={unloadNoRef}
                    type="text"
                    value={unloadNo}
                    onChange={(e) => setUnloadNo(e.target.value)}
                    required
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter unload note number"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lorry */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-1">
                    Lorry
                  </label>
                  <select
                    value={selectedLorry}
                    onChange={(e) => setSelectedLorry(e.target.value)}
                    className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select lorry</option>
                    {lorries.map((l) => (
                      <option key={l.lorry_id} value={l.lorry_id}>
                        {l.lorry_no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional note"
                />
              </div>

              {/* Returned Products */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl text-gray-800">Returned Products</h3>
                </div>

                {!selectedSupplier && (
                  <div className="border border-dashed rounded-xl p-4 bg-gray-50 text-base text-gray-600 mb-4">
                    Select a supplier to add products.
                  </div>
                )}

                {selectedSupplier && !items.length && (
                  <div className="border border-dashed rounded-xl p-4 bg-gray-50 text-base text-gray-600 mb-4">
                    No products added yet.
                  </div>
                )}

                {items.length > 0 && (
                  <div className="border rounded-xl overflow-hidden mb-4">
                    <div className="grid grid-cols-7 bg-gray-100 border-b text-base font-semibold text-gray-700">
                      <div className="col-span-3 p-2 border-r">Product</div>
                      <div className="p-2 border-r text-center">Pack</div>
                      <div className="p-2 border-r text-center">Boxes</div>
                      <div className="p-2 border-r text-center">Items</div>
                      <div className="p-2 border-r text-center">Total pcs</div>
                      <div className="p-2 text-center">Remove</div>
                    </div>

                    {items.map((line, index) => {
                      const pack = Math.max(1, asInt(line.pack_size));
                      const totalPcs = line.current_pcs || 0;

                      return (
                        <div
                          key={`${line.product_id}-${line.pack_size}-${index}`}
                          className="grid grid-cols-7 border-t text-base items-start"
                        >
                          <div className="col-span-3 p-2 border-r">
                            <div className="font-mono text-sm text-gray-700">
                              {line.product_code}
                            </div>
                            <div className="text-gray-900">
                              {line.product_name}
                            </div>
                          </div>

                          <div className="p-2 border-r flex items-center">
                            <input
                              type="number"
                              min="1"
                              value={line.pack_size}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const next = raw === "" ? "" : Math.max(1, asInt(raw));
                                setLine(index, { pack_size: next });
                              }}
                              className="border p-2 rounded-lg w-full text-base text-center"
                              placeholder="1"
                            />
                          </div>

                          <div className="p-2 border-r flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={line.boxes}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const next = raw === "" ? "" : clampNonNegative(raw);
                                setLine(index, { boxes: next });
                              }}
                              className="border p-2 rounded-lg w-full text-base text-center"
                              placeholder="0"
                            />
                          </div>

                          <div className="p-2 border-r flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={line.items}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const next = raw === "" ? "" : clampNonNegative(raw);
                                setLine(index, { items: next });
                              }}
                              className="border p-2 rounded-lg w-full text-base text-center"
                              placeholder="0"
                            />
                          </div>

                          <div className="p-2 border-r text-center text-gray-800 flex items-center justify-center">
                            {totalPiecesAll >= 0 ? totalPcs : 0}
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

                {items.length > 0 && (
                  <div className="mt-2 text-sm text-gray-700">
                    Total pieces (all lines):{" "}
                    <span className="font-semibold">{totalPiecesAll}</span>
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

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="text-sm text-gray-500">
                  Enter returned quantities per product.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-6 py-3 rounded-xl bg-yellow-500 text-white text-base font-semibold hover:bg-yellow-600"
                  >
                    🖨️ Print Unload
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 text-base font-semibold hover:bg-gray-300"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-base font-semibold disabled:opacity-60 hover:bg-indigo-700"
                  >
                    {loading ? "Saving..." : "Save Unload Note"}
                  </button>
                </div>
              </div>
            </form>
          </div>
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
            className="bg-white w-[1150px] max-h-[85vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-800">Select Products</h3>
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
                    <th className="p-2 border border-gray-300 text-center">Pack</th>
                    <th className="p-2 border border-gray-300 text-center">Boxes</th>
                    <th className="p-2 border border-gray-300 text-center">Items</th>
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
                        <td className="p-2 border border-gray-300 text-sm whitespace-nowrap">{name}</td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            min="1"
                            value={q.pack}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setQ(pid, { pack: "" });
                              } else {
                                setQ(pid, { pack: Math.max(1, asInt(val)) });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, pid, "pack")}
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[pid] = cellRefs.current[pid] || {};
                              cellRefs.current[pid].pack = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-sm text-center"
                          />
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            min="0"
                            value={q.boxes}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setQ(pid, { boxes: "" });
                              } else {
                                setQ(pid, { boxes: Math.max(0, asInt(val)) });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, pid, "boxes")}
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[pid] = cellRefs.current[pid] || {};
                              cellRefs.current[pid].boxes = el;
                            }}
                            className="border rounded-lg px-2 py-1 w-24 text-sm text-center"
                          />
                        </td>

                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            min="0"
                            value={q.items}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setQ(pid, { items: "" });
                              } else {
                                setQ(pid, { items: Math.max(0, asInt(val)) });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, pid, "items")}
                            onFocus={(e) => e.target.select()}
                            ref={(el) => {
                              cellRefs.current[pid] = cellRefs.current[pid] || {};
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
                <b>Shortcuts:</b> ↑/↓ move rows • ←/→ move columns • Tab stays inside • Esc closes
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
                >
                  Add to Unload
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

export default UnloadCreate;
