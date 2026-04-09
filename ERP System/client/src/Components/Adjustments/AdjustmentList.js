import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const AdjustmentList = () => {
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

  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const [notes, setNotes] = useState([]);
  const [itemsByNote, setItemsByNote] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [itemsLoadingId, setItemsLoadingId] = useState(null);

  // load suppliers once
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await axios.get("/api/suppliers/list", { headers });
        setSuppliers(res.data || []);
      } catch (err) {
        console.error(err);
        if (err?.response?.status === 401) safeLogout();
      }
    };
    if (token) loadSuppliers();
  }, [headers, token]);

  const loadNotes = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.get("/api/adjustments/list", {
        headers,
        params: {
          start: dateRange.start || undefined,
          end: dateRange.end || undefined,
          supplier_id: selectedSupplier || undefined,
        },
      });
      setNotes(res.data || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) safeLogout();
      else setMessage("Error loading adjustments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    loadNotes();
  };

  const toggleItems = async (noteId) => {
    if (expandedId === noteId) {
      setExpandedId(null);
      return;
    }

    if (itemsByNote[noteId]) {
      setExpandedId(noteId);
      return;
    }

    setItemsLoadingId(noteId);
    try {
      const res = await axios.get(`/api/adjustments/${noteId}/items`, {
        headers,
      });
      setItemsByNote((prev) => ({ ...prev, [noteId]: res.data || [] }));
      setExpandedId(noteId);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) safeLogout();
      else setMessage("Error loading adjustment items");
    } finally {
      setItemsLoadingId(null);
    }
  };

  const formatSignedTotal = (inPcs, outPcs) => {
    const ins = asInt(inPcs);
    const outs = asInt(outPcs);
    if (!ins && !outs) return "0 pcs";
    const parts = [];
    if (ins) parts.push(`IN ${ins} pcs`);
    if (outs) parts.push(`OUT ${outs} pcs`);
    return parts.join(" • ");
  };

  return (
    <>
      <Navbar />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-semibold">Adjustment Notes</h2>
            <p className="text-sm text-gray-500">
              Manual stock corrections (opening stock, damage, count
              differences, etc.)
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/adjustments/new")}
            className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm"
          >
            + Add Adjustment
          </button>
        </div>

        {/* Filters */}
        <form
          onSubmit={handleApplyFilter}
          className="flex flex-wrap gap-3 items-end mb-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">
              From date
            </label>
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, start: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">To date</label>
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, end: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Supplier</label>
            <select
              className="border rounded px-3 py-2 text-sm min-w-[160px]"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
          >
            Apply
          </button>
        </form>

        {message && (
          <div className="mb-3 text-sm text-red-600 font-medium">{message}</div>
        )}

        {loading && <div className="text-sm text-gray-500">Loading...</div>}

        {!loading && notes.length === 0 && (
          <div className="text-sm text-gray-500">
            No adjustments found for this period.
          </div>
        )}

        <div className="space-y-3">
          {notes.map((note) => {
            const totalIn = asInt(note.total_in_pcs);
            const totalOut = asInt(note.total_out_pcs);
            const isOpen = expandedId === note.note_id;
            const items = itemsByNote[note.note_id] || [];

            return (
              <div
                key={note.note_id}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">
                        {note.note_no || `ADJ-${note.note_id}`}
                      </h3>
                      {note.supplier_name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {note.supplier_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Date: {note.note_date}
                      {note.supplier_id
                        ? ` • Supplier ID: ${note.supplier_id}`
                        : ""}
                    </p>
                    {note.remark && (
                      <p className="mt-1 text-xs text-gray-600">
                        Remark: {note.remark}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-sm">
                    <div className="font-semibold">
                      {formatSignedTotal(totalIn, totalOut)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    className="w-full sm:w-auto border rounded-full px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    onClick={() => toggleItems(note.note_id)}
                  >
                    {itemsLoadingId === note.note_id
                      ? "Loading..."
                      : isOpen
                      ? "Hide items"
                      : "View items"}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 border-t pt-3">
                    {items.length === 0 ? (
                      <div className="text-xs text-gray-500">
                        No item details found.
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="pb-1">Product</th>
                            <th className="pb-1 text-right">Type</th>
                            <th className="pb-1 text-right">Quantity (pcs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it) => {
                            const qty = asInt(it.quantity);
                            const direction = qty >= 0 ? "IN" : "OUT";
                            const absQty = Math.abs(qty);

                            return (
                              <tr key={it.item_id}>
                                <td className="py-0.5 pr-2">
                                  {it.product_name}
                                </td>
                                <td className="py-0.5 text-right">
                                  {direction}
                                </td>
                                <td className="py-0.5 text-right">
                                  {absQty}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AdjustmentList;

