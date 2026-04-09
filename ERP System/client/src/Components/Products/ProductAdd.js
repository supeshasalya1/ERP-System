// client/src/Components/Products/ProductAdd.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar"; // ✅ FIXED: correct relative path

const AddProduct = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const productToEdit = state?.product;
  const isEditMode = !!productToEdit;

  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({
    product_code: "",
    name: "",
    supplier_id: "",
    brand: "",
  });
  const [errors, setErrors] = useState({});
  const token = localStorage.getItem("token");

  // 🔹 Refs for focusing
  const supplierRef = useRef(null);
  const productCodeRef = useRef(null);
  const brandRef = useRef(null);

  // Focus supplier when component mounts
  useEffect(() => {
    if (supplierRef.current) {
      supplierRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!token) {
      alert("Please log in first.");
      navigate("/");
      return;
    }
    fetch("/api/suppliers/list", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((d) => setSuppliers(d || []))
      .catch((e) => console.error(e));
  }, [token, navigate]);

  useEffect(() => {
    if (!isEditMode) return;

    setFormData({
      product_code: productToEdit.product_code,
      name: productToEdit.product_name,
      supplier_id: productToEdit.supplier_id,
      brand: productToEdit.brand_name,
    });

    if (productToEdit.supplier_id) {
      fetch(`/api/products/brands/by-supplier/${productToEdit.supplier_id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((r) => r.json())
        .then((d) => setBrands(d || []))
        .catch((e) => console.error(e));
    }

    // Focus product code when edit data is loaded
    if (productCodeRef.current) {
      productCodeRef.current.focus();
    }
  }, [isEditMode, productToEdit, token]);

  // 🔹 Keyboard: Supplier -> Brand on Enter
  const handleSupplierKeyDown = (e) => {
    if (e.key === "Enter" && brandRef.current) {
      e.preventDefault();
      brandRef.current.focus();
    }
  };

  const handleSupplierChange = async (e) => {
    const supplier_id = e.target.value;
    setFormData((p) => ({ ...p, supplier_id, brand: "" }));
    if (!supplier_id) {
      setBrands([]);
      return;
    }

    try {
      const r = await fetch(`/api/products/brands/by-supplier/${supplier_id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const d = await r.json();
      setBrands(d || []);
      // ❌ removed auto focus from here to avoid arrow key issues
    } catch (e) {
      console.error(e);
      setBrands([]);
    }
  };

  // 🔹 When a brand is selected, just update state
  const handleBrandChange = (e) => {
    const brand = e.target.value;
    setFormData((p) => ({ ...p, brand }));
  };

  // 🔹 Keyboard: Brand -> Product Code on Enter
  const handleBrandKeyDown = (e) => {
    if (e.key === "Enter" && productCodeRef.current) {
      e.preventDefault();
      productCodeRef.current.focus();
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.product_code.trim())
      e.product_code = "Product code is required.";
    if (!formData.name.trim()) e.name = "Product name is required.";
    if (!formData.supplier_id) e.supplier_id = "Please select a supplier.";
    if (!formData.brand.trim()) e.brand = "Please select a brand.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const url = isEditMode
      ? `/api/products/update/${productToEdit.product_id}`
      : "/api/products/add";
    const method = isEditMode ? "PUT" : "POST";

    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const d = await r.json();
    if (d.success) {
      alert(
        isEditMode
          ? "✅ Product updated successfully!"
          : "✅ Product added successfully!"
      );
      setFormData({ product_code: "", name: "", supplier_id: "", brand: "" });
      setBrands([]);

      // 🔹 After submit, focus back to Supplier
      if (supplierRef.current && !isEditMode) {
        supplierRef.current.focus();
      }

      if (isEditMode) navigate("/products/list");
    } else {
      alert("❌ Something went wrong!");
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      setFormData({
        product_code: productToEdit.product_code,
        name: productToEdit.product_name,
        supplier_id: productToEdit.supplier_id,
        brand: productToEdit.brand_name,
      });
    } else {
      setFormData({ product_code: "", name: "", supplier_id: "", brand: "" });
      setBrands([]);
    }
    setErrors({});

    // 🔹 After reset, focus Supplier again
    if (supplierRef.current) {
      supplierRef.current.focus();
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        {/* Header (bigger like Issue Note) */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📦</span>
            <h1 className="text-4xl font-semibold text-gray-800">
              {isEditMode ? "Edit Product" : "Create Product"}
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/products/list")}
              type="button"
              className="bg-gray-700 text-white px-5 py-3 rounded-xl hover:bg-gray-800"
            >
              View Products
            </button>
            <button
              onClick={() => navigate(-1)}
              type="button"
              className="bg-gray-200 text-gray-800 px-5 py-3 rounded-xl hover:bg-gray-300"
            >
              Back
            </button>
          </div>
        </div>

        {/* Big card */}
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 🔹 Reordered grid: Supplier + Brand at the top */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Supplier */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  ref={supplierRef}
                  value={formData.supplier_id}
                  onChange={handleSupplierChange}
                  onKeyDown={handleSupplierKeyDown}
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.supplier_id && (
                  <p className="text-red-600 text-sm mt-2">
                    {errors.supplier_id}
                  </p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <select
                  ref={brandRef}
                  value={formData.brand}
                  onChange={handleBrandChange}
                  onKeyDown={handleBrandKeyDown}
                  disabled={brands.length === 0}
                  className={`w-full h-14 rounded-xl border border-gray-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    brands.length === 0
                      ? "bg-gray-100 text-gray-500"
                      : "bg-gray-50"
                  }`}
                >
                  <option value="">
                    {brands.length > 0
                      ? "Select Brand"
                      : "Select Supplier first"}
                  </option>
                  {brands.map((b) => (
                    <option key={b.brand_id} value={b.brand_name}>
                      {b.brand_name}
                    </option>
                  ))}
                </select>
                {errors.brand && (
                  <p className="text-red-600 text-sm mt-2">{errors.brand}</p>
                )}
              </div>

              {/* Product Code */}
              <div className="md:col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Product Code
                </label>
                <input
                  type="text"
                  ref={productCodeRef}
                  value={formData.product_code}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      product_code: e.target.value,
                    }))
                  }
                  placeholder="Enter product code"
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.product_code && (
                  <p className="text-red-600 text-sm mt-2">
                    {errors.product_code}
                  </p>
                )}
              </div>

              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Enter product name"
                  className="w-full h-14 rounded-xl border border-gray-300 bg-gray-50 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-2">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Footer actions (bigger buttons) */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-3 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                {isEditMode ? "Reset" : "Clear"}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/products/list")}
                  className="px-6 py-3 rounded-xl bg-gray-600 text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {isEditMode ? "Update Product" : "Add Product"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddProduct;
