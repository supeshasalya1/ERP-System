import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const pad2 = (value) => String(value).padStart(2, "0");
const getLocalDateTimeString = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const GRNCreate = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [pickerProducts, setPickerProducts] = useState([]); // from /api/stocks/grn-picker

  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedLorry, setSelectedLorry] = useState("");
  const [grnNo, setGrnNo] = useState("");
  const [message, setMessage] = useState("");

  const [items, setItems] = useState([]); // start with no rows

  // ---------- Product picker modal ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  // per-product temporary quantities while in the picker: { [product_id]: { pack, boxes, items } }
  const [qByPid, setQByPid] = useState({});

  // refs
  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const grnNoRef = useRef(null);
  const addProductsRef = useRef(null);

  // table cell refs: { [product_id]: { pack: ref, boxes: ref, items: ref } }
  const cellRefs = useRef({});

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  
  const [isPrinted, setIsPrinted] = useState(false);

  const selectedSupplierObj = suppliers.find(
    (s) => String(s.supplier_id) === String(selectedSupplier)
  );
  const selectedSupplierName = selectedSupplierObj?.name || "";

  const selectedLorryObj = lorries.find(
    (l) => String(l.lorry_id) === String(selectedLorry)
  );
  const selectedLorryNo = selectedLorryObj?.lorry_no || "";

  const createdByUsername = localStorage.getItem("username") || "";

  const MAX_PRINT_ROWS = 25;

  const buildPrintHtml = () => {
    const rowsHtml = Array.from({ length: MAX_PRINT_ROWS })
      .map((_, idx) => {
        const line = items[idx];
        const code = line?.product_code ?? "";
        const name = line?.product_name ?? "";
        const pack = line?.pack_size ?? "";
        const boxes = line?.boxes_received ?? "";
        const pieces = line?.items_received ?? "";

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

    const supplierTitle = selectedSupplierName || "SUPPLIER";
    const createdBy = createdByUsername || "";
    const dateText = getLocalDateTimeString();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GRN - ${grnNo}</title>
  <style>
    @page { size: auto; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #000; }
    .wrap { width: 100%; margin: 0; padding: 0; }
    .header-main { text-align: center; margin-bottom: 4px; }
    .header-main .title { font-weight: 700; font-size: 18px; letter-spacing: 1px; }
    .header-main .line { font-size: 11px; margin-top: 2px; }
    .grn-no { text-align: right; font-size: 11px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; margin-top: 4px; }
    th, td { border: 1px solid #000; padding: 2px 4px; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    th { text-align: left; font-weight: 600; }
    th.num, td.num { text-align: center; }
    td.code { font-family: monospace; }
    tr { page-break-inside: avoid; }
    .sign-row { display:flex; justify-content:space-between; margin-top:24px; font-size:11px; }
    .sign-block { width:45%; }
    .sign-line { margin-top:26px; border-top:1px solid #000; width:100%; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-main">
      <div class="title">LEELARATHNE &amp; SONS</div>
      <div class="line">Goods Received Note</div>
    </div>

    <div class="grn-no">GRN No: <strong>${grnNo}</strong></div>

    <div style="margin-bottom:8px; font-size:12px;">
      Supplier: <strong>${supplierTitle}</strong>
      &nbsp;&nbsp; Vehicle: <strong>${selectedLorryNo || ""}</strong>
      &nbsp;&nbsp; Date: <strong>${dateText}</strong>
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
        <div>Received By</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-block" style="text-align:right;">
        <div>Created By</div>
        <div class="sign-line"></div>
        <div style="margin-top:6px;">${createdBy}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = () => {
    if (!grnNo.trim()) return setMessage("❌ GRN No is required to print.");
    if (!items.length) return setMessage("❌ No items to print.");

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

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const clampNonNegative = (v) => Math.max(0, asInt(v));
  const computePieces = (line) => {
    const pack = Math.max(1, asInt(line.pack_size));
    const boxes = asInt(line.boxes_received);
    const itemsP = asInt(line.items_received);
    return boxes * pack + itemsP;
  };

  // ---------- Focus GRN No on mount ----------
  useEffect(() => {
    grnNoRef.current?.focus();
  }, []);

  // ---------- Bootstrap ----------
  useEffect(() => {
    if (!token) {
      alert("You must be logged in to create a GRN.");
      navigate("/");
      return;
    }
    (async () => {
      try {
        const [supRes, productRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/stocks/grn-picker", { headers }),
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setPickerProducts(Array.isArray(productRes.data) ? productRes.data : []);
      } catch (err) {
        console.error("Error loading bootstrap data:", err);
        if (err.response?.status === 401) safeLogout();
      }
    })();
  }, [navigate, token, headers]);

  // ---------- Load lorries when supplier changes ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!selectedSupplier) {
          if (cancelled) return;
          setLorries([]);
          setSelectedLorry("");
          // refresh picker to all suppliers
          try {
            const r = await axios.get(`/api/stocks/grn-picker`, { headers });
            if (!cancelled) {
              setPickerProducts(Array.isArray(r.data) ? r.data : []);
            }
          } catch {
            /* ignore */
          }
          return;
        }

        const res = await axios.get(`/api/stocks/lorries/${selectedSupplier}`, { headers });
        if (!cancelled) {
          setLorries(Array.isArray(res.data) ? res.data : []);
          setSelectedLorry("");
        }

        // narrow picker rows to this supplier
        const pickerRes = await axios.get(
          `/api/stocks/grn-picker?supplier_id=${selectedSupplier}`,
          { headers }
        );
        if (!cancelled) {
          setPickerProducts(Array.isArray(pickerRes.data) ? pickerRes.data : []);
        }
      } catch (err) {
        console.error("Error loading lorries:", err);
        if (!cancelled && err.response?.status === 401) safeLogout();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSupplier, headers]);

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

  // ---------- OPEN picker (multi-add mode) ----------
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

  // ---------- Base products: de-duplicate by product_id ----------
  const baseProducts = useMemo(() => {
    const byId = new Map();
    pickerProducts.forEach((p) => {
      // if multiple rows for same product_id (different packs), keep only the first
      if (!byId.has(p.product_id)) {
        byId.set(p.product_id, p);
      }
    });
    return Array.from(byId.values());
  }, [pickerProducts]);

  // ---------- Filter products (supports product_code search) ----------
  const filteredProducts = baseProducts.filter((p) => {
    const sid = String(p.supplier_id || "");
    if (selectedSupplier && sid !== String(selectedSupplier)) return false;

    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;

    const code = (p.product_code || "").toLowerCase();
    const name = (p.product_name ?? p.name ?? "").toLowerCase();
    const packText = String(p.display_pack || p.default_pack_size || "").toLowerCase();

    return code.includes(q) || name.includes(q) || packText.includes(q);
  });


  // keep highlightIndex in bounds
  useEffect(() => {
    if (highlightIndex >= filteredProducts.length) {
      setHighlightIndex(filteredProducts.length ? filteredProducts.length - 1 : 0);
    }
  }, [filteredProducts.length, highlightIndex]);

  // ---------- staging quantities ----------
  const getQ = (p) => {
    const pid = p.product_id;
    const defaultPack = asInt(p.default_pack_size) || asInt(p.display_pack) || 1;
    const current = qByPid[pid];
    if (current) return current;
    return { pack: defaultPack, boxes: 0, items: 0 };
  };

const setQ = (pid, patch) => {
  setQByPid((prev) => {
    const existing = prev[pid];
    if (existing) {
      // already have something for this product: just merge
      return { ...prev, [pid]: { ...existing, ...patch } };
    }

    // first time we touch this product: start with its default pack size
    const prod = baseProducts.find((p) => p.product_id === pid);
    const defaultPack =
      (prod && (asInt(prod.default_pack_size) || asInt(prod.display_pack))) || 1;

    return {
      ...prev,
      [pid]: {
        pack: defaultPack,
        boxes: 0,
        items: 0,
        ...patch, // override with whatever field we're actually setting
      },
    };
  });
};

  // ---------- focus helper ----------
  const focusRowCell = (rowIdx, col = "pack") => {
    const row = filteredProducts[rowIdx];
    if (!row) return;
    const pid = row.product_id;
    const cell = cellRefs.current[pid]?.[col];
    if (cell) cell.focus();
  };

  // ---------- Apply picker -> main items ----------
  const applyPickerToItems = () => {
    const newLines = [];

    // IMPORTANT: apply staged quantities across ALL searches.
    // Using filteredProducts here would drop quantities for products
    // that were staged under a previous search query.
    baseProducts.forEach((p) => {
      const sid = String(p.supplier_id || "");
      if (selectedSupplier && sid !== String(selectedSupplier)) return;

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
        boxes_received: boxes,
        items_received: itemsP,
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

  // ---------- Focus search when picker opens ----------
  useEffect(() => {
    if (!pickerOpen) return;
    const node = searchRef.current;
    setTimeout(() => node?.focus(), 0);
  }, [pickerOpen]);

  // ---------- Keyboard: search field (up/down to move & focus row) ----------
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

  // ---------- Keyboard: inside table inputs (grid navigation) ----------
  const colOrder = ["pack", "boxes", "items"];

  const handleCellKeyDown = (e, pid, col) => {
    const key = e.key;
    const rowIdx = filteredProducts.findIndex((p) => p.product_id === pid);
    if (rowIdx === -1) return;

    if (key === "Enter") {
      // stay inside picker, don't submit main form
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

  // ---------- Global handler: only Esc + Tab focus trap ----------
  useEffect(() => {
    if (!pickerOpen) return;

    const handleKey = (e) => {
      if (!pickerOpen) return;

      // prevent main form submit from Enter anywhere in picker
      if (e.key === "Enter") {
        e.preventDefault();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
      }

      // Focus trap (Tab cycling)
      if (e.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusable).filter(
          (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!grnNo.trim()) return setMessage("❌ GRN No is required.");
    if (!selectedSupplier) return setMessage("❌ Supplier is required.");
    if (!selectedLorry) return setMessage("❌ Lorry is required.");
    if (!items.length) return setMessage("❌ Please add at least one product.");

    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      if (!line.product_id) return setMessage("❌ Each row must have a product.");
      const pack = Math.max(1, asInt(line.pack_size));
      if (!Number.isFinite(pack) || pack <= 0)
        return setMessage("❌ Pack size must be > 0.");
      const pcs = computePieces(line);
      if (pcs <= 0) return setMessage("❌ Enter boxes/items for each line.");
      if (asInt(line.boxes_received) < 0 || asInt(line.items_received) < 0)
        return setMessage("❌ Quantities cannot be negative.");
    }

    const payload = {
      grn_no: grnNo.trim(),
      supplier_id: Number(selectedSupplier),
      lorry_id: Number(selectedLorry),
      items: items.map((ln) => ({
        product_id: Number(ln.product_id),
        pack_size: Math.max(1, asInt(ln.pack_size)),
        boxes_received: asInt(ln.boxes_received),
        items_received: asInt(ln.items_received),
      })),
    };

    try {
      const res = await axios.post("/api/stocks/add", payload, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.data?.success) {
        setMessage("✅ GRN created successfully.");
        setTimeout(() => navigate("/grn/list"), 1200);
      } else {
        setMessage("❌ " + (res.data?.error || "Failed to create GRN."));
      }
    } catch (err) {
      console.error("Error creating GRN:", err);
      if (err.response?.status === 401) safeLogout();
      else setMessage("❌ Error creating GRN. Check your inputs.");
    }
  };

  const handleLastItemsTab = (e, isLastRow) => {
  if (!isLastRow) return;

  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();               // stop default tabbing
    addProductsRef.current?.focus();  // move to Add products button
  }
};

  const handleAddToGrnKeyDown = (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    applyPickerToItems();
  }
};



  return (
    <>
      <Navbar />

      {/* ✅ match AddProduct layout */}
      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header similar to ProductAdd */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📥</span>
            <h1 className="text-3xl font-semibold text-gray-800">
              Create GRN
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/grn/list")}
              className="bg-gray-700 text-white px-5 py-3 rounded-xl hover:bg-gray-800"
            >
              View GRNs
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

        {/* Card similar to ProductAdd */}
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* GRN header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  GRN No
                </label>
                <input
                  ref={grnNoRef}
                  type="text"
                  value={grnNo}
                  onChange={(e) => setGrnNo(e.target.value)}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter GRN number"
                  required
                />
              </div>
            </div>

            {/* Supplier & Lorry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  required
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
                  Lorry
                </label>
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

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xltext-gray-800">
                  Received Products
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
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === "" ? "" : Math.max(1, asInt(raw));
                              setLine(index, { pack_size: next });
                            }}
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
                            value={line.boxes_received}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === "" ? "" : clampNonNegative(raw);
                              setLine(index, { boxes_received: next });
                            }}
                          />
                        </div>

                        <div className="p-2 border-r">
                          <input
                            type="number"
                            min="0"
                            className="border p-2 rounded-lg w-full text-base text-center"
                            value={line.items_received}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === "" ? "" : clampNonNegative(raw);
                              setLine(index, { items_received: next });
                            }}
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

            {/* Footer actions */}
            <div className="flex items-center justify-end pt-4 border-t mt-4">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-yellow-500 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-yellow-600 mr-3"
              >
                🖨️ Print GRN
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Submit GRN
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

      {/* ---------- PRODUCT PICKER MODAL (multi-add, cashier-style) ---------- */}
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
                            type="number"
                            min="1"
                            value={q.pack}
                            onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              // allow empty while editing
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
                  onKeyDown={handleAddToGrnKeyDown}
                >
                  Add to GRN
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

export default GRNCreate;
