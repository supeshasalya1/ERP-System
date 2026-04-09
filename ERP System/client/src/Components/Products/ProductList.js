// client/src/Components/Products/ProductList.js
import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Pages/Dashboard/_Navbar"; // ✅ FIXED: correct relative path

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/products/list", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.status === 401 || res.status === 403 ? [] : res.json()))
      .then((data) => setProducts(data || []))
      .catch((e) => console.error(e));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/products/delete/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return alert("Please log in again.");
    const data = await res.json();
    if (data.success) setProducts((p) => p.filter((x) => x.product_id !== id));
  };

  const filtered = products.filter((p) => {
    const t = (s) => String(s || "").toLowerCase();
    const s = q.toLowerCase();
    return t(p.product_code).includes(s) || t(p.product_name).includes(s) || t(p.brand_name).includes(s) || t(p.supplier_name).includes(s);
  });

  return (
    <>
    <Navbar />

    <div className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-4">
          <span className="text-5xl">📦</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-800 leading-tight">
            Products
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-gray-200 text-gray-900 text-lg px-6 py-3 rounded-xl hover:bg-gray-300"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/products/add")}
            className="flex items-center gap-2 bg-indigo-600 text-white text-lg px-6 py-3 rounded-xl hover:bg-indigo-700"
          >
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-7">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by product / brand / supplier…"
          className="w-full h-16 rounded-xl border border-gray-300 bg-gray-50 px-5 text-xl md:text-2xl
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-xl md:text-2xl py-12">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
            {filtered.map((product) => (
              <div
                key={product.product_id}
                className="rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  
                  
                  <div>

                    <h2 className="text-xl md:text-xl  text-gray-900">
                      {product.product_code}
                    </h2>

                    <h2 className="text-xl md:text-xl  text-gray-900">
                     {product.product_name}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700
                                       text-base md:text-lg px-3.5 py-1.5">
                        Brand: {product.brand_name || "-"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700
                                       text-base md:text-lg px-3.5 py-1.5">
                        Supplier: {product.supplier_name || "-"}
                      </span>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-3 mt-7">
                  <button
                    onClick={() => navigate("/products/add", { state: { product } })}
                    className="flex items-center gap-2 bg-yellow-500 text-white text-base md:text-lg
                               px-5 py-2.5 rounded-lg hover:bg-yellow-600"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.product_id)}
                    className="flex items-center gap-2 bg-red-600 text-white text-base md:text-lg
                               px-5 py-2.5 rounded-lg hover:bg-red-700"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ProductList;

