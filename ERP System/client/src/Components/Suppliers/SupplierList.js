// client/src/Components/Suppliers/SupplierList.js
import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaArrowLeft, FaPhone, FaUser, FaEnvelope, FaTruck, FaTags } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar"; // ✅ FIXED: correct relative path


const Chip = ({ children }) => (
  <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-sm font-medium">
    {children}
  </span>
);

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to view suppliers.");
      navigate("/");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/suppliers/list", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 401) {
          alert("Session expired or unauthorized. Please log in again.");
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching suppliers:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to delete suppliers.");
      return;
    }

    const res = await fetch(`/api/suppliers/delete/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (data.success) {
      setSuppliers((prev) => prev.filter((s) => s.supplier_id !== id));
    } else {
      alert(data.message || "Failed to delete supplier.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter((s) => {
      const hay =
        [
          s.name,
          s.phone,
          s.email,
          s.contact_person,
          ...(s.brands || []),
          ...(s.lorries?.map((l) => `${l.lorry_name} ${l.lorry_no}`) || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      return hay.includes(q);
    });
  }, [suppliers, query]);

  return (
    <>
    <Navbar  />
    <div className="max-w-6xl mx-auto mt-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🏭</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-800">Suppliers</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 hover:bg-gray-200 px-4 py-2 rounded-xl"
          >
            <FaArrowLeft /> Back
          </button>
          <button
            onClick={() => navigate("/suppliers/add")}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700"
          >
            <FaPlus /> Add Supplier
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by supplier / brand / lorry / phone / email…"
          className="w-full h-12 rounded-2xl border border-gray-300 bg-white px-5 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-500 text-lg mt-10">Loading suppliers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 text-lg mt-10">No suppliers found.</div>
      ) : (
        <div className="space-y-5">
          {filtered.map((supplier) => {
            const brandCount = supplier.brands?.length || 0;
            const lorryCount = supplier.lorries?.length || 0;

            return (
              <div
                key={supplier.supplier_id}
                className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6 hover:shadow-lg transition"
              >
                {/* Top row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-gray-900">{supplier.name}</h2>
                  <div className="flex items-center gap-2">
                    <Chip>
                      <FaTags className="inline mr-1" />
                      {brandCount} {brandCount === 1 ? "Brand" : "Brands"}
                    </Chip>
                    <Chip>
                      <FaTruck className="inline mr-1" />
                      {lorryCount} {lorryCount === 1 ? "Lorry" : "Lorries"}
                    </Chip>
                  </div>
                </div>

                {/* Contacts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-gray-700">
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-gray-500" />
                    <span className="text-lg">{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaUser className="text-gray-500" />
                    <span className="text-lg">{supplier.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-gray-500" />
                    <span className="text-lg">{supplier.email || "No email provided"}</span>
                  </div>
                </div>

                {/* Brands */}
                <div className="mt-4">
                  <p className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <FaTags className="text-gray-500" /> Brands
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.brands && supplier.brands.length > 0 ? (
                      supplier.brands.map((b, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm"
                        >
                          {b}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No brands</span>
                    )}
                  </div>
                </div>

                {/* Lorries */}
                <div className="mt-4">
                  <p className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <FaTruck className="text-gray-500" /> Lorries
                  </p>
                  {supplier.lorries && supplier.lorries.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {supplier.lorries.map((l, i) => (
                        <span
                          key={i}
                          className="rounded-xl bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 text-sm"
                        >
                          {l.lorry_name} ({l.lorry_no})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">No lorries</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => navigate("/suppliers/add", { state: { supplier } })}
                    className="inline-flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-xl hover:bg-yellow-600"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.supplier_id)}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
};

export default SupplierList;
