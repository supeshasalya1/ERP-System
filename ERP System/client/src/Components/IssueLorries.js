// client/src/Components/Lorries/IssueLorryAdd.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../Pages/Dashboard/_Navbar";

const IssueLorryAdd = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [lorryName, setLorryName] = useState("");
  const [lorryNo, setLorryNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.clear();
    navigate("/");
  };

  const resetForm = () => {
    setLorryName("");
    setLorryNo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!lorryName || !lorryNo) {
      setMessage("❌ Please fill both Lorry Name and Lorry No.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        lorry_name: lorryName,
        lorry_no: lorryNo,
      };

      const res = await axios.post("/api/issue-lorries/add", body, { headers });

      setMessage(
        `✅ Issue lorry "${res.data.lorry_name || lorryName}" added successfully.`
      );
      resetForm();
    } catch (err) {
      console.error("Error creating issue lorry:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      } else {
        setMessage(
          err.response?.data?.message || "❌ Failed to create issue lorry."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-3xl mx-auto pt-10 px-4 md:px-6 pb-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Add Issue Lorry</h1>
              <p className="text-sm text-gray-500 mt-1">
                Add a lorry to make it available when creating issue notes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/user/dashboard")}
              className="hidden md:inline-flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-200 text-sm"
            >
              Dashboard
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lorry Name</label>
              <input
                type="text"
                value={lorryName}
                onChange={(e) => setLorryName(e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Issue_lorry_1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lorry No</label>
              <input
                type="text"
                value={lorryNo}
                onChange={(e) => setLorryNo(e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="WA-SP-3030"
                required
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-base hover:bg-gray-50"
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Issue Lorry"}
              </button>
            </div>
          </form>

          {message && (
            <p
              className={`mt-5 text-base font-medium ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueLorryAdd;
