// client/src/Components/GRN/GRNEdit.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar"; // ✅ FIXED: correct relative path

const asInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const GRNEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // auth
  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );
  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  // header/dropdowns
  const [suppliers, setSuppliers] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [products, setProducts] = useState([]); // from /api/issue/products

  const [grnNo, setGrnNo] = useState("");
  const [grnDate, setGrnDate] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedLorry, setSelectedLorry] = useState("");

  // lines (pack + boxes + items)
  const [items, setItems] = useState([
    { product_id: "", pack_size: "", boxes_received: "", items_received: "" },
  ]);

  // product picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState(null);
  const [pickerQuery, setPickerQuery] = useState("");

  // ui
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // ---------- helpers ----------
  const pickPack = (p) =>
    asInt(p?.display_pack ?? p?.default_pack_size ?? p?.pack_size ?? 1, 1);

  // make a quick product index
  const getProduct = (pid) =>
    products.find((pp) => String(pp.product_id) === String(pid)) || null;

  // live stock compute from /api/issue/products rows
  const computeStockForLine = (line) => {
    const p = getProduct(line.product_id);
    const pcs =
      asInt(p?.available_qty_pcs) ||
      asInt(p?.available_qty) ||
      asInt(p?.quantity) ||
      0;
    const packNow = Math.max(1, asInt(line.pack_size || pickPack(p), 1));
    const stockBoxes = Math.floor(pcs / packNow);
    const stockItems = pcs % packNow;
    return { stockBoxes, stockItems, stockPcs: pcs, packNow };
  };

  const computeLinePieces = (line) => {
    const P = Math.max(1, asInt(line.pack_size, 1));
    const B = asInt(line.boxes_received, 0);
    const I = asInt(line.items_received, 0);
    return B * P + I;
  };

  const setLine = (idx, patch) =>
    setItems((prev) => {
      const cp = [...prev];
      cp[idx] = { ...cp[idx], ...patch };
      return cp;
    });

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { product_id: "", pack_size: "", boxes_received: "", items_received: "" },
    ]);
  const removeItem = (i) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  // ---------- bootstrap + prefill ----------
  useEffect(() => {
    if (!token) return safeLogout();
    (async () => {
      try {
        // suppliers + GRN header
        const [supRes, hdrRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get(`/api/stocks/grn/${id}`, { headers }), // {grn_no, grn_date, supplier_id, lorry_id, items:[...]}
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);

        const g = hdrRes.data || {};
        setGrnNo(g.grn_no || "");
        setGrnDate(g.grn_date ? g.grn_date.slice(0, 10) : "");
        setSelectedSupplier(String(g.supplier_id || ""));
        setSelectedLorry(String(g.lorry_id || ""));

        // IMPORTANT: use the SAME endpoint as Create
        // products are NOT filtered by supplier here; we filter in UI
        const [lorryRes, prodRes] = await Promise.all([
          axios.get(`/api/stocks/lorries/${g.supplier_id}`, { headers }),
          axios.get(`/api/issue/products`, { headers }),
        ]);
        setLorries(Array.isArray(lorryRes.data) ? lorryRes.data : []);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);

        // map items; if server only kept pcs, split using pack
        const mapped =
          Array.isArray(g.items) && g.items.length
            ? g.items.map((it) => {
                const p = (prodRes.data || []).find(
                  (pp) => String(pp.product_id) === String(it.product_id)
                );
                const pack = Math.max(
                  1,
                  asInt(it.pack_size || it.display_pack || pickPack(p), 1)
                );
                const pcs = asInt(it.quantity_received, 0);
                const fallbackBoxes = Math.floor(pcs / pack);
                const fallbackItems = pcs % pack;
                return {
                  product_id: it.product_id,
                  pack_size: asInt(it.pack_size, pack),
                  boxes_received: asInt(it.boxes_received, fallbackBoxes),
                  items_received: asInt(it.items_received, fallbackItems),
                };
              })
            : [
                {
                  product_id: "",
                  pack_size: "",
                  boxes_received: "",
                  items_received: "",
                },
              ];

        setItems(mapped);
      } catch (e) {
        console.error("load GRN edit failed:", e);
        if (e.response?.status === 401 || e.response?.status === 403)
          return safeLogout();
        setMessage("❌ Failed to load GRN.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // supplier change -> reload lorries and (re)pull products from /api/issue/products, then filter in UI
  const onSupplierChange = async (sid) => {
    setSelectedSupplier(sid);
    try {
      const [lorryRes, prodRes] = await Promise.all([
        axios.get(`/api/stocks/lorries/${sid}`, { headers }),
        axios.get(`/api/issue/products`, { headers }), // same as Create
      ]);
      setLorries(Array.isArray(lorryRes.data) ? lorryRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setSelectedLorry("");
      setItems([
        {
          product_id: "",
          pack_size: "",
          boxes_received: "",
          items_received: "",
        },
      ]);
    } catch (e) {
      console.error("supplier change load failed:", e);
    }
  };

  // product picker
  const openPicker = (index) => {
    setPickerLineIndex(index);
    setPickerQuery("");
    setPickerOpen(true);
  };
  const closePicker = () => {
    setPickerOpen(false);
    setPickerLineIndex(null);
  };

  // filter products by supplier + search (same behavior as Create)
  const filteredProducts = products.filter((p) => {
    const sid = String(p.supplier_id || "");
    if (selectedSupplier && sid !== String(selectedSupplier)) return false;

    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    const product_code = (p.product_code ?? "").toLowerCase();
    const name = (p.product_name ?? p.name ?? "").toLowerCase();
    const packText = String(
      p.display_pack || p.default_pack_size || ""
    ).toLowerCase();
    return name.includes(q) || packText.includes(q);
  });

  const selectProductForLine = (product) => {
    if (pickerLineIndex == null) return;
    const pack = Math.max(1, pickPack(product));
    const pname = product.product_name || product.name || "Unnamed";
    setLine(pickerLineIndex, {
      product_id: product.product_id,
      pack_size: pack, // prefill; user can change
      boxes_received: "",
      items_received: "",
      product_name: pname,
    });
    closePicker();
  };

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const payload = {
      grn_no: grnNo.trim(),
      grn_date: grnDate,
      supplier_id: Number(selectedSupplier),
      lorry_id: Number(selectedLorry),
      items: items.map((i) => ({
        product_id: Number(i.product_id),
        pack_size: Math.max(1, asInt(i.pack_size, 1)),
        boxes_received: Math.max(0, asInt(i.boxes_received, 0)),
        items_received: Math.max(0, asInt(i.items_received, 0)),
      })),
    };

    if (!payload.grn_no) return setMessage("❌ GRN No is required.");
    if (!payload.supplier_id) return setMessage("❌ Supplier is required.");
    if (!payload.lorry_id) return setMessage("❌ Lorry is required.");
    if (!payload.items.length) return setMessage("❌ Add at least one product line.");

    for (const line of payload.items) {
      if (!line.product_id) return setMessage("❌ Each row needs a product.");
      if (line.boxes_received === 0 && line.items_received === 0)
        return setMessage("❌ Enter boxes and/or items for each line.");
    }

    try {
      const res = await axios.put(`/api/stocks/grn/${id}`, payload, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.data?.success) {
        setMessage("✅ GRN updated.");
        setTimeout(() => navigate("/grn/list"), 900);
      } else {
        setMessage("❌ " + (res.data?.message || "Failed to update GRN."));
      }
    } catch (err) {
      console.error("Update GRN error:", err);
      if (err.response?.status === 401 || err.response?.status === 403)
        return safeLogout();
      setMessage("❌ Server error while updating GRN.");
    }
  };

  if (loading)
    return (
      <div className="p-6 max-w-[1400px] w-full mx-auto">Loading…</div>
    );

  return (
    <>
    <Navbar />
    <div className="p-6 max-w-[1400px] w-full mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-lg mt-4 mb-10 border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-bold text-gray-800">✏️ Edit GRN</h2>
          <button
            type="button"
            onClick={() => navigate("/grn/list")}
            className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition text-lg"
          >
            Back to List
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold">GRN No</label>
              <input
                type="text"
                value={grnNo}
                onChange={(e) => setGrnNo(e.target.value)}
                className="border p-3 rounded-lg w-full"
                required
              />
            </div>
            <div>
              <label className="block font-semibold">GRN Date</label>
              <input
                type="date"
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
                className="border p-3 rounded-lg w-full"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block font-semibold">Supplier</label>
            <select
              className="border p-3 rounded-lg w-full"
              value={selectedSupplier}
              onChange={(e) => onSupplierChange(e.target.value)}
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

          {/* Lorry */}
          <div>
            <label className="block font-semibold">Lorry</label>
            <select
              className="border p-3 rounded-lg w-full"
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

          {/* Lines */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-2xl font-semibold text-gray-800">
                Received Products
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600"
              >
                + Add Product
              </button>
            </div>

            {items.map((line, index) => {
              const { stockBoxes, stockItems, stockPcs, packNow } =
                computeStockForLine(line);
              const totalPieces = computeLinePieces(line);

              return (
                <div
                  key={index}
                  className="grid grid-cols-8 gap-4 mb-4 items-start"
                >
                  {/* Product with picker */}
                  <div className="col-span-3">
                    <label className="block text-sm text-gray-600 mb-1">
                      Product
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="border p-3 rounded-lg text-lg flex-1 bg-gray-50"
                        value={
                          (() => {
                            const p = getProduct(line.product_id);
                            return p ? p.product_name || p.name : "";
                          })()
                        }
                        placeholder="No product selected"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => openPicker(index)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                      >
                        Pick
                      </button>
                    </div>

                    {line.product_id && (
                      <div className="text-xs text-gray-500 mt-1">
                        Stock:{" "}
                        <b>
                          {stockBoxes} box{stockBoxes === 1 ? "" : "es"} +{" "}
                          {stockItems} pcs
                        </b>
                        <span className="ml-2">(pcs: {stockPcs})</span> • pack:{" "}
                        {packNow}
                      </div>
                    )}
                  </div>

                  {/* Pack */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      Pack (pcs/box)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={line.pack_size}
                      onChange={(e) =>
                        setLine(index, { pack_size: e.target.value })
                      }
                      className="border p-3 rounded-lg text-lg w-full"
                      required
                    />
                  </div>

                  {/* Boxes */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Boxes
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={line.boxes_received}
                      onChange={(e) =>
                        setLine(index, { boxes_received: e.target.value })
                      }
                      className="border p-3 rounded-lg text-lg w-full"
                    />
                  </div>

                  {/* Items */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Items
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={line.items_received}
                      onChange={(e) =>
                        setLine(index, { items_received: e.target.value })
                      }
                      className="border p-3 rounded-lg text-lg w-full"
                    />
                  </div>

                  {/* Remove */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="col-span-8 text-sm text-gray-600 -mt-1">
                    Total pieces:{" "}
                    <b>{Number.isFinite(totalPieces) ? totalPieces : 0}</b>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-700"
          >
            Update GRN
          </button>

          {message && (
            <p
              className={`text-center mt-5 text-lg font-medium ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>

      {/* PRODUCT PICKER MODAL */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[1100px] max-w-[95vw] max-h-[85vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold">Select Product</h3>
              <button
                className="text-gray-600 hover:text-black"
                onClick={closePicker}
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <input
                type="text"
                className="border p-3 rounded w-full"
                placeholder="Search by product name..."
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
            </div>

            <div className="px-4 pb-4 overflow-auto">
              <table className="w-full text-left border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Stock</th>
                    <th className="p-2 border">Pack</th>
                    <th className="p-2 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const name = p.product_name ?? p.name ?? "Unnamed";
                    const pack = Math.max(1, pickPack(p));
                    const pcs =
                      asInt(p.available_qty_pcs) ||
                      asInt(p.available_qty) ||
                      asInt(p.quantity);
                    const boxes = Math.floor(pcs / pack);
                    const items = pcs % pack;

                    return (
                      <tr
                        key={p.product_id}
                        className="odd:bg-white even:bg-gray-50"
                      >
                        <td className="p-2 border">{name}</td>
                        <td className="p-2 border">
                          {boxes} box{boxes === 1 ? "" : "es"} + {items} item
                          {items === 1 ? "" : "s"}{" "}
                          <span className="text-gray-500">(pcs: {pcs})</span>
                        </td>
                        <td className="p-2 border">{pack}</td>
                        <td className="p-2 border">
                          <button
                            className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                            onClick={() => selectProductForLine(p)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProducts.length && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={4}>
                        No products match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t flex justify-end">
              <button
                className="px-4 py-2 rounded border hover:bg-gray-50"
                onClick={closePicker}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* /PRODUCT PICKER MODAL */}
    </div>
    </>
  );
};

export default GRNEdit;
