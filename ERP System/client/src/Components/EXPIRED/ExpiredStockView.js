// client/src/Components/EXPIRE/ExpiredStoreView.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar";

const ExpiredStoreView = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  // bootstrap
  useEffect(() => {
    if (!token) {
      alert("You must be logged in to view expired store.");
      navigate("/");
      return;
    }

    (async () => {
      try {
        const [supRes, storeRes] = await Promise.all([
          axios.get("/api/suppliers/list", { headers }),
          axios.get("/api/expire/store", { headers }),
        ]);

        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setRows(Array.isArray(storeRes.data) ? storeRes.data : []);
      } catch (err) {
        console.error("Error loading expire store data:", err);
        if (err.response?.status === 401) safeLogout();
        else setMessage("❌ Failed to load expire store.");
      }
    })();
  }, [navigate, token, headers]);

  const fetchStore = async (opts = {}) => {
    const supplierId = opts.supplierId ?? selectedSupplier;
    const q = opts.search ?? search;

    const params = {};
    if (supplierId) params.supplier_id = supplierId;
    if (q?.trim()) params.search = q.trim();

    try {
      setLoading(true);
      setMessage("");
      const res = await axios.get("/api/expire/store", {
        headers,
        params,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching expire store:", err);
      if (err.response?.status === 401) safeLogout();
      else setMessage("❌ Error fetching expire store.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (e) => {
    const value = e.target.value;
    setSelectedSupplier(value);
    fetchStore({ supplierId: value });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStore();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchStore();
    }
  };

  const formatDateTimeLocal = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPcs = rows.reduce((sum, r) => sum + asInt(r.total_pcs), 0);

  const handleReturnToSupplier = () => {
    if (!selectedSupplier) {
      alert("Please select a supplier first.");
      return;
    }
    navigate(`/expired/return?supplier_id=${selectedSupplier}`);
  };

  return (
    <>
      <Navbar />

      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header aligned with GRN */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📦</span>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">
                Expired Store
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                View all expired stock currently in expired store (separate from main
                stock).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/expired/add")}
              className="bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 text-sm md:text-base"
            >
              + Create Expired Note
            </button>

            <button
              type="button"
              onClick={handleReturnToSupplier}
              className="bg-indigo-600 text-white px-5 py-3 rounded-xl hover:bg-indigo-700 text-sm md:text-base"
            >
              Return to supplier
            </button>

            <button
              type="button"
              onClick={() => navigate("/expired/report")}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 text-sm md:text-base"
            >
              Movement report
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-gray-200 text-gray-800 px-5 py-3 rounded-xl hover:bg-gray-300 text-sm md:text-base"
            >
              Back
            </button>
          </div>
        </div>

        {/* Filters card (same card look as GRN body) */}
        <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-6">
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedSupplier}
                onChange={handleSupplierChange}
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Product code, name or supplier..."
              />
            </div>

            <div className="flex items-center gap-3 md:justify-end">
              <button
                type="submit"
                className="mt-5 md:mt-0 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-base"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSupplier("");
                  setSearch("");
                  fetchStore({ supplierId: "", search: "" });
                }}
                className="mt-5 md:mt-0 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm md:text-base hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-md p-4 md:p-6">
          <div className="flex justify-between items-center mb-3 text-sm text-gray-600">
            <div>
              {loading
                ? "Loading expired store..."
                : `Showing ${rows.length} record${
                    rows.length !== 1 ? "s" : ""
                  }`}
            </div>
            <div className="font-medium">
              Total pieces in expired store:{" "}
              <span className="text-indigo-600">{totalPcs}</span>
            </div>
          </div>

          <div className="border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm md:text-base border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-2 text-left">Product Code</th>
                  <th className="border px-2 py-2 text-left">Product</th>
                  <th className="border px-2 py-2 text-left">Supplier</th>
                  <th className="border px-2 py-2 text-center">Pack size</th>
                  <th className="border px-2 py-2 text-center">Boxes</th>
                  <th className="border px-2 py-2 text-center">Items</th>
                  <th className="border px-2 py-2 text-center">Total pcs</th>
                  <th className="border px-2 py-2 text-center">Updated at</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
                  >
                    <td className="border px-2 py-1.5 font-mono text-xs md:text-sm whitespace-nowrap">
                      {r.product_code}
                    </td>
                    <td className="border px-2 py-1.5 whitespace-nowrap">
                      {r.product_name}
                    </td>
                    <td className="border px-2 py-1.5 whitespace-nowrap">
                      {r.supplier_name}
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      {r.pack_size}
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      {asInt(r.boxes)}
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      {asInt(r.items)}
                    </td>
                    <td className="border px-2 py-1.5 text-center font-semibold">
                      {asInt(r.total_pcs)}
                    </td>
                    <td className="border px-2 py-1.5 text-center text-xs md:text-sm whitespace-nowrap">
                      {formatDateTimeLocal(r.updated_at)}
                    </td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No expired store records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {message && (
            <p
              className={`text-center mt-4 text-sm md:text-base ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ExpiredStoreView;
