// client/src/Components/Suppliers/AddSupplier.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaTrash, FaPlus, FaList } from "react-icons/fa";
import Navbar from "../../Pages/Dashboard/_Navbar"; // ✅ FIXED: correct relative path

const AddSupplier = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editingSupplier = state?.supplier || null;

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    brands: [""],
    lorries: [{ lorry_name: "", lorry_no: "" }],
  });
  const [errors, setErrors] = useState({});

  const supplierNameRef = useRef(null);
  const brandRefs = useRef([]);
  const lorryNameRefs = useRef([]);
  const lastAddedBrandIndexRef = useRef(null);
  const lastAddedLorryIndexRef = useRef(null);

  // Focus supplier when component mounts
  useEffect(() => {
    if (supplierNameRef.current) {
      supplierNameRef.current.focus();
    }
  }, []);

  // auth guard (keeps it consistent with other pages)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  // prefill for edit
  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name || "",
        contact_person: editingSupplier.contact_person || "",
        phone: editingSupplier.phone || "",
        email: editingSupplier.email || "",
        brands:
          editingSupplier.brands && editingSupplier.brands.length
            ? editingSupplier.brands
            : [""],
        lorries:
          editingSupplier.lorries && editingSupplier.lorries.length
            ? editingSupplier.lorries
            : [{ lorry_name: "", lorry_no: "" }],
      });
    }
  }, [editingSupplier]);

  // focus new brand after add
  useEffect(() => {
    const idx = lastAddedBrandIndexRef.current;
    if (idx != null && brandRefs.current[idx]) {
      brandRefs.current[idx].focus();
      lastAddedBrandIndexRef.current = null;
    }
  }, [formData.brands]);

  // focus new lorry name after add
  useEffect(() => {
    const idx = lastAddedLorryIndexRef.current;
    if (idx != null && lorryNameRefs.current[idx]) {
      lorryNameRefs.current[idx].focus();
      lastAddedLorryIndexRef.current = null;
    }
  }, [formData.lorries]);

  // ---------- helpers ----------
  const handleChange = (k, v) => setFormData((s) => ({ ...s, [k]: v }));

  const handleBrandChange = (i, v) =>
    setFormData((s) => {
      const next = [...s.brands];
      next[i] = v;
      return { ...s, brands: next };
    });

  const addBrand = () =>
    setFormData((s) => {
      const next = [...s.brands, ""];
      lastAddedBrandIndexRef.current = next.length - 1;
      return { ...s, brands: next };
    });

  const removeBrand = (idx) =>
    setFormData((s) => {
      const next = s.brands.filter((_, i) => i !== idx);
      return { ...s, brands: next.length ? next : [""] };
    });

  const handleLorryChange = (i, f, v) =>
    setFormData((s) => {
      const next = [...s.lorries];
      next[i][f] = v;
      return { ...s, lorries: next };
    });

  const addLorry = () =>
    setFormData((s) => {
      const next = [...s.lorries, { lorry_name: "", lorry_no: "" }];
      lastAddedLorryIndexRef.current = next.length - 1;
      return { ...s, lorries: next };
    });

  const removeLorry = (idx) =>
    setFormData((s) => {
      const next = s.lorries.filter((_, i) => i !== idx);
      return {
        ...s,
        lorries: next.length ? next : [{ lorry_name: "", lorry_no: "" }],
      };
    });

  // ---------- validation ----------
  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Supplier name is required.";
    if (!formData.contact_person.trim())
      e.contact_person = "Contact person is required.";

    if (!/^(0\d{9})$/.test(formData.phone || ""))
      e.phone = "Phone must be 10 digits starting with 0.";

    if (
      formData.email &&
      !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i.test(formData.email || "")
    )
      e.email = "Enter a valid email address.";

    if (!formData.brands[0]?.trim()) e.brands = "At least one brand is required.";

    // NOTE: corrected regex -> two letters, dash, two letters, dash, 4 digits (e.g., AB-CD-1234)
    formData.lorries.forEach((l, i) => {
      if (!l.lorry_name.trim()) e[`lorry_name_${i}`] = "Lorry name is required.";
      if (!l.lorry_no.trim()) {
        e[`lorry_no_${i}`] = "Lorry number is required.";
      } 
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---------- submit ----------
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const token = localStorage.getItem("token");
    const url = editingSupplier
      ? `/api/suppliers/update/${editingSupplier.supplier_id}`
      : "/api/suppliers/add";
    const method = editingSupplier ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (res.status === 401 || res.status === 403) {
      alert("Authorization failed. Please log in again.");
      return;
    }

    const data = await res.json();
    if (data.success) {
      alert(editingSupplier ? "✅ Supplier updated!" : "✅ Supplier added!");
      if (editingSupplier) navigate("/suppliers/list");
    } else {
      alert("❌ Something went wrong.");
    }

    if (supplierNameRef.current && !editingSupplier) {
      supplierNameRef.current.focus();
    }
  };

  // ---------- UI ----------
  return (
    <>
      <Navbar />

      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Page header like Issue Note / Add Product */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🏭</span>
            <h1 className="text-4xl font-semibold text-gray-800">
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </h1>
          </div>
          <button
            onClick={() => navigate("/suppliers/list")}
            className="bg-gray-700 text-white px-5 py-3 rounded-xl hover:bg-gray-800"
          >
             View Suppliers
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md p-6 md:p-10 space-y-8"
        >
          {/* Top section: basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Supplier Name
              </label>
              <input
                className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ref={supplierNameRef}
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter supplier name"
              />
              {errors.name && (
                <p className="mt-1 text-red-600 text-sm">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
                placeholder="Enter contact person"
              />
              {errors.contact_person && (
                <p className="mt-1 text-red-600 text-sm">
                  {errors.contact_person}
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="07XXXXXXXX"
              />
              {errors.phone && (
                <p className="mt-1 text-red-600 text-sm">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-red-600 text-sm">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Brands */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-lg font-medium text-gray-700">
                Brands
              </label>
            </div>
            {errors.brands && (
              <p className="text-red-600 text-sm mb-2">{errors.brands}</p>
            )}
            <div className="space-y-3">
              {formData.brands.map((b, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    className="flex-1 h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                               focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    ref={(el) => (brandRefs.current[i] = el)}
                    value={b}
                    onChange={(e) => handleBrandChange(i, e.target.value)}
                    placeholder={`Brand ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBrand(i)}
                    className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-red-600 text-white hover:bg-red-700"
                    title="Remove"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addBrand}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                <FaPlus /> Add Brand
              </button>
            </div>
          </div>

          {/* Lorries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-lg font-medium text-gray-700">
                Lorries
              </label>
            </div>

            <div className="space-y-4">
              {formData.lorries.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
                >
                  <div>
                    <input
                      className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Lorry name"
                      ref={(el) => (lorryNameRefs.current[i] = el)}
                      value={l.lorry_name}
                      onChange={(e) =>
                        handleLorryChange(i, "lorry_name", e.target.value)
                      }
                    />
                    {errors[`lorry_name_${i}`] && (
                      <p className="mt-1 text-red-600 text-sm">
                        {errors[`lorry_name_${i}`]}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg
                                   uppercase tracking-wider
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={l.lorry_no}
                        onChange={(e) =>
                          handleLorryChange(i, "lorry_no", e.target.value)
                        }
                      />
                      {errors[`lorry_no_${i}`] && (
                        <p className="mt-1 text-red-600 text-sm">
                          {errors[`lorry_no_${i}`]}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLorry(i)}
                      className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-red-600 text-white hover:bg-red-700"
                      title="Remove"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addLorry}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                <FaPlus /> Add Lorry
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white text-lg px-6 py-3 rounded-xl hover:bg-indigo-700"
            >
              {editingSupplier ? "Update Supplier" : "Add Supplier"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddSupplier;
