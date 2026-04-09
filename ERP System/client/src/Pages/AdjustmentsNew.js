// client/src/Components/Adjustments/AdjustmentsNew.js
// client/src/Components/GRN/GRNCreate.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const GRNCreate = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedLorry, setSelectedLorry] = useState("");
  const [items, setItems] = useState([
    { product_id: "", pack_size: "", boxes_received: "", items_received: "" },
  ]);
  const [grnNo, setGrnNo] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    navigate("/");
  };

  const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const pickPack = (p) =>
    asInt(p?.display_pack ?? p?.default_pack_size ?? p?.pack_size ?? 1);

  const deriveBoxesItems = (pcs, pack) => {
    const P = Math.max(1, asInt(pack));
    const T = Math.max(0, asInt(pcs));
    return { boxes: Math.floor(T / P), items: T % P };
  };

  const productOptionLabel = (p) => {
    const pack = pickPack(p);
    const pcs = asInt(p?.available_qty_pcs ?? p?.available_qty ?? p?.quantity ?? 0);
    const b = p?.boxes_equiv !== undefined ? asInt(p.boxes_equiv) : deriveBoxesItems(pcs, pack).boxes;
    const i = p?.items_equiv !== undefined ? asInt(p.items_equiv) : deriveBoxesItems(pcs, pack).items;
    const name = p?.product_name ?? p?.name ?? "Unnamed";
    return `${name} — Stock: ${b} boxes + ${i} items (pcs: ${pcs}) • Pack: ${pack}`;
  };

  useEffect(() => {
    if (!token) {
      alert("You must be logged in to create a GRN.");
      navigate("/");
      return;
    }
    axios
      .get("/api/suppliers/list", { headers: authHeader })
      .then((res) => setSuppliers(res.data))
      .catch((err) => {
        console.error("Error fetching suppliers:", err);
        if (err.response?.status === 401) safeLogout();
      });
  }, [navigate, token, authHeader]);

  useEffect(() => {
    if (!selectedSupplier || !token) return;

    axios
      .get(`/api/stocks/lorries/${selectedSupplier}`, { headers: authHeader })
      .then((res) => setLorries(res.data))
      .catch((err) => {
        console.error("Error fetching lorries:", err);
        if (err.response?.status === 401) safeLogout();
      });

    const fetchProducts = async () => {
      try {
        const r = await axios.get(
          `/api/products/with-stock?supplier_id=${selectedSupplier}`,
          { headers: authHeader }
        );
        setProducts(r.data || []);
      } catch (e) {
        const r2 = await axios.get(`/api/stocks/products/${selectedSupplier}`, {
          headers: authHeader,
        });
        setProducts(r2.data || []);
      }
    };
    fetchProducts().catch((e) => {
      console.error("Error fetching products:", e);
      if (e.response?.status === 401) safeLogout();
    });
  }, [selectedSupplier, token, authHeader]);

  const computePieces = (line) => {
    const pack = Number(line.pack_size) || 0;
    const boxes = Number(line.boxes_received) || 0;
    const items = Number(line.items_received) || 0;
    if (pack <= 0) return items;
    return boxes * pack + items;
  };

  const handleProductChange = (index, product_id) => {
    const updated = [...items];
    updated[index].product_id = product_id;

    const p = products.find((x) => String(x.product_id) === String(product_id));
    const suggested = pickPack(p);

    if (!updated[index].pack_size) {
      updated[index].pack_size = suggested;
    }
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      { product_id: "", pack_size: "", boxes_received: "", items_received: "" },
    ]);
  };

  const removeItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      alert("You must be logged in to submit a GRN.");
      navigate("/");
      return;
    }

    if (!items.length) {
      setMessage("❌ Add at least one product line.");
      return;
    }

    const preparedItems = items.map((i) => {
      const pack = Number(i.pack_size) || 0;
      const boxes = Number(i.boxes_received) || 0;
      const pcsItems = Number(i.items_received) || 0;
      return {
        product_id: Number(i.product_id),
        pack_size: pack > 0 ? pack : 1,
        boxes_received: boxes,
        items_received: pcsItems,
      };
    });

    for (const line of preparedItems) {
      if (!line.product_id) return setMessage("❌ Each row must have a product selected.");
      if (line.pack_size <= 0) return setMessage("❌ Pack size must be greater than 0.");
      if (line.boxes_received < 0 || line.items_received < 0)
        return setMessage("❌ Quantities cannot be negative.");
      if (line.boxes_received === 0 && line.items_received === 0)
        return setMessage("❌ Enter boxes and/or items for each line.");
    }

    const grnData = {
      grn_no: grnNo.trim(),
      supplier_id: selectedSupplier,
      lorry_id: selectedLorry,
      items: preparedItems,
    };

    try {
      const res = await axios.post("/api/stocks/add", grnData, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });

      if (res.data?.success) {
        setMessage("✅ GRN successfully created!");
        setTimeout(() => navigate("/grn/list"), 1000);
      } else {
        setMessage("❌ " + (res.data?.message || "Failed to create GRN."));
      }
    } catch (err) {
      console.error("Error creating GRN:", err);
      if (err.response?.status === 401) safeLogout();
      else setMessage("❌ Error creating GRN. Please check your inputs.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 px-6 md:px-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">📄</span>
          <h1 className="text-4xl font-semibold text-gray-800">Create GRN</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 px-5 rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 text-base"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/grn/list")}
            className="h-10 px-5 rounded-xl bg-gray-800 text-white hover:bg-gray-900 text-base"
          >
            View GRNs
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow border p-6 space-y-6"
      >
        {/* GRN No */}
        <div>
          <label className="block text-base font-medium text-gray-800 mb-1">
            GRN No
          </label>
          <input
            type="text"
            value={grnNo}
            onChange={(e) => setGrnNo(e.target.value)}
            required
            className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter GRN number"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-base font-medium text-gray-800 mb-1">
            Supplier
          </label>
          <select
            className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        {/* Lorry */}
        <div>
          <label className="block text-base font-medium text-gray-800 mb-1">
            Lorry
          </label>
          <select
            className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedLorry}
            onChange={(e) => setSelectedLorry(e.target.value)}
            required
            disabled={!lorries.length}
          >
            <option value="">Select Lorry</option>
            {lorries.map((l) => (
              <option key={l.lorry_id} value={l.lorry_id}>
                {l.lorry_no}
              </option>
            ))}
          </select>
        </div>

        {/* Helper text */}
        <p className="text-sm text-gray-600">
          Enter <b>Pack size</b> (pcs/box), then <b>Boxes</b> and <b>Items</b>. Stock is stored
          in pieces; totals are shown for clarity.
        </p>

        {/* Product Items */}
        <div className="space-y-4">
          {items.map((item, index) => {
            const totalPieces = computePieces(item);
            return (
              <div
                key={index}
                className="rounded-xl border bg-gray-50 p-4 space-y-3"
              >
                {/* Product */}
                <div>
                  <label className="block text-base font-medium text-gray-800 mb-1">
                    Product
                  </label>
                  <select
                    className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={item.product_id}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {productOptionLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-base font-medium text-gray-800 mb-1">
                      Pack (pcs/box)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Pack"
                      value={item.pack_size}
                      onChange={(e) =>
                        handleItemChange(index, "pack_size", e.target.value)
                      }
                      className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-800 mb-1">
                      Boxes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.boxes_received}
                      onChange={(e) =>
                        handleItemChange(index, "boxes_received", e.target.value)
                      }
                      className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-800 mb-1">
                      Items
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.items_received}
                      onChange={(e) =>
                        handleItemChange(index, "items_received", e.target.value)
                      }
                      className="w-full h-12 text-base border rounded-xl px-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Total pieces: <b>{Number.isFinite(totalPieces) ? totalPieces : 0}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="h-10 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600"
                    title="Remove line"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addItem}
            className="h-10 px-5 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            + Add Product
          </button>
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Submit GRN
        </button>

        {message && (
          <p
            className={`text-center text-base mt-2 ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default GRNCreate;
