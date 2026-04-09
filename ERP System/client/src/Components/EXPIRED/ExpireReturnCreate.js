// client/src/Components/EXPIRE/ExpiredReturnCreate.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const ExpiredReturnCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const supplierId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("supplier_id");
  }, [location.search]);

  const [supplier, setSupplier] = useState(null);
  const [rows, setRows] = useState([]);
  const [noteDate, setNoteDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lorryId, setLorryId] = useState("");
  const [supplierLorries, setSupplierLorries] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
  const computeTotal = (pack, boxes, items) =>
    asInt(boxes) * asInt(pack) + asInt(items);

  useEffect(() => {
    if (!token) {
      alert("You must be logged in to create an expire return note.");
      navigate("/");
      return;
    }

    if (!supplierId) {
      alert("No supplier selected for return.");
      navigate("/expired/store");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setMessage("");

        const [supRes, storeRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/expire/store", {
            headers,
            params: { supplier_id: supplierId },
          }),
        ]);

        const suppliers = Array.isArray(supRes.data) ? supRes.data : [];
        const sup = suppliers.find(
          (s) => String(s.supplier_id) === String(supplierId)
        );

        if (!sup) {
          alert("Supplier not found.");
          navigate("/expired/store");
          return;
        }
        setSupplier(sup);

        const storeRows = Array.isArray(storeRes.data) ? storeRes.data : [];
        const mapped = storeRows.map((r) => ({
          id: r.id,
          product_id: r.product_id,
          product_code: r.product_code,
          product_name: r.product_name,
          pack_size: r.pack_size,
          available_boxes: asInt(r.boxes),
          available_items: asInt(r.items),
          available_total: asInt(r.total_pcs),
          return_boxes: asInt(r.boxes),
          return_items: asInt(r.items),
          selected: true,
        }));
        setRows(mapped);

        const lRes = await axios.get(`/api/stocks/lorries/${supplierId}`, {
          headers,
        });
        setSupplierLorries(Array.isArray(lRes.data) ? lRes.data : []);
      } catch (err) {
        console.error("Error loading expire return data:", err);
        if (err.response?.status === 401) safeLogout();
        else setMessage("❌ Failed to load expire return data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, token, headers, supplierId]);

  const toggleRowSelected = (idx) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], selected: !copy[idx].selected };
      return copy;
    });
  };

  const updateRow = (idx, patch) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleSelectAll = (checked) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!noteDate) return setMessage("❌ Date is required.");
    if (!supplier) return setMessage("❌ Supplier is missing.");
    if (!rows.length)
      return setMessage("❌ No expired items for this supplier.");

    const selectedRows = rows.filter((r) => r.selected);
    if (!selectedRows.length)
      return setMessage("❌ Select at least one product to return.");

    const items = [];

    for (const r of selectedRows) {
      const pack = asInt(r.pack_size) || 1;
      const boxes = asInt(r.return_boxes);
      const itemsP = asInt(r.return_items);

      if (boxes < 0 || itemsP < 0)
        return setMessage("❌ Return quantities cannot be negative.");

      const totalReturn = computeTotal(pack, boxes, itemsP);
      if (totalReturn === 0) continue;

      if (totalReturn > r.available_total) {
        return setMessage(
          `❌ Cannot return more than available for ${r.product_code} (${r.product_name}).`
        );
      }

      items.push({
        product_id: r.product_id,
        pack_size: pack,
        boxes,
        items: itemsP,
      });
    }

    if (!items.length)
      return setMessage("❌ All selected rows have 0 quantity to return.");

    const payload = {
      note_date: noteDate,
      supplier_id: supplier.supplier_id,
      lorry_id: lorryId ? Number(lorryId) : null,
      remarks: remarks || null,
      items,
    };

    try {
      const res = await axios.post("/api/expire/return", payload, {
        headers: { ...headers, "Content-Type": "application/json" },
      });

      if (res.data?.note_no) {
        setMessage(`✅ Expire return note ${res.data.note_no} created.`);
      } else {
        setMessage("✅ Expire return note created.");
      }

      setTimeout(() => {
        navigate("/expired/store");
      }, 1200);
    } catch (err) {
      console.error("Error creating expire return note:", err);
      if (err.response?.status === 401) safeLogout();
      else setMessage("❌ Error creating expire return note.");
    }
  };

  const allSelected = rows.length && rows.every((r) => r.selected);

  return (
    <>
      <Navbar />

      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header styled like GRN */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📤</span>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">
                Expire Return Note
              </h1>
              {supplier && (
                <p className="text-sm text-gray-500 mt-1">
                  Returning expired items to{" "}
                  <span className="font-semibold">{supplier.name}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/expired/store")}
            className="bg-gray-200 text-gray-800 px-5 py-3 rounded-xl hover:bg-gray-300 text-sm md:text-base"
          >
            Back to Expired Store
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          {loading ? (
            <p className="text-center text-gray-600">Loading...</p>
          ) : !supplier ? (
            <p className="text-center text-red-600">
              Supplier not found. Go back to expired store.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* top fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    required
                    className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={supplier.name}
                    disabled
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-100 px-3 text-sm md:text-base text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lorry (optional)
                  </label>
                  <select
                    value={lorryId}
                    onChange={(e) => setLorryId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select lorry</option>
                    {supplierLorries.map((l) => (
                      <option key={l.lorry_id} value={l.lorry_id}>
                        {l.lorry_no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Any notes about this return..."
                />
              </div>

              {/* table */}
              <div>
                <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                  <div>
                    {rows.length
                      ? `Products in expired store for ${supplier.name}: ${rows.length}`
                      : `No expired items for this supplier.`}
                  </div>
                  {rows.length > 0 && (
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                      <span>Select all</span>
                    </label>
                  )}
                </div>

                <div className="border rounded-xl overflow-x-auto">
                  <table className="min-w-full text-xs md:text-sm border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-2 text-center">Sel</th>
                        <th className="border px-2 py-2 text-left">
                          Product code
                        </th>
                        <th className="border px-2 py-2 text-left">Product</th>
                        <th className="border px-2 py-2 text-center">Pack</th>
                        <th className="border px-2 py-2 text-center">
                          Available boxes
                        </th>
                        <th className="border px-2 py-2 text-center">
                          Available items
                        </th>
                        <th className="border px-2 py-2 text-center">
                          Return boxes
                        </th>
                        <th className="border px-2 py-2 text-center">
                          Return items
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr
                          key={r.id}
                          className={`${
                            idx % 2 ? "bg-gray-50" : "bg-white"
                          } hover:bg-gray-100`}
                        >
                          <td className="border px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => toggleRowSelected(idx)}
                            />
                          </td>
                          <td className="border px-2 py-1.5 font-mono whitespace-nowrap">
                            {r.product_code}
                          </td>
                          <td className="border px-2 py-1.5 whitespace-nowrap">
                            {r.product_name}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {r.pack_size}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {r.available_boxes}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {r.available_items}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              className="w-20 border rounded-lg px-1 py-0.5 text-center"
                              value={r.return_boxes}
                              onChange={(e) =>
                                updateRow(idx, { return_boxes: e.target.value })
                              }
                            />
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              className="w-20 border rounded-lg px-1 py-0.5 text-center"
                              value={r.return_items}
                              onChange={(e) =>
                                updateRow(idx, { return_items: e.target.value })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                      {!rows.length && (
                        <tr>
                          <td
                            colSpan={8}
                            className="border px-3 py-4 text-center text-gray-500"
                          >
                            No expired items available for this supplier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* submit */}
              <div className="flex justify-end border-t pt-4 mt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm md:text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={!rows.length}
                >
                  Submit Expire Return
                </button>
              </div>

              {message && (
                <p
                  className={`text-center mt-3 text-sm md:text-base ${
                    message.startsWith("✅") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ExpiredReturnCreate;
