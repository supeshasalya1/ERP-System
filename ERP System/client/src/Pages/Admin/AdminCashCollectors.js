// client/src/Pages/Admin/AdminCashCollectors.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

const AdminCashCollectors = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [nic, setNic] = useState("");
  const [fullName, setFullName] = useState("");
  const [callName, setCallName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const safeLogout = () => {
    alert("Session expired. Please log in again.");
    localStorage.clear();
    navigate("/");
  };

  const resetForm = () => {
    setNic("");
    setFullName("");
    setCallName("");
    setMobileNo("");
    setAddress("");
    setDob("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!nic || !fullName || !callName || !mobileNo || !address || !dob) {
      setMessage("❌ Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        nic,
        full_name: fullName,
        call_name: callName,
        mobile_no: mobileNo,
        address,
        dob,
      };

      const res = await axios.post("/api/admin/cash-collectors", body, {
        headers,
      });

      setMessage(
        `✅ Cash collector "${res.data.full_name || fullName}" added successfully.`
      );
      resetForm();
    } catch (err) {
      console.error("Error creating cash collector:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        safeLogout();
      } else {
        setMessage(
          err.response?.data?.message ||
            "❌ Failed to create cash collector."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminNavbar />

      <div className="max-w-3xl mx-auto mt-8 px-4 md:px-6 pb-10">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
                  Add Cash Collector
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Admin-only page to register new cash collectors
                  (representatives).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="hidden md:inline-block bg-gray-200 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-300 text-sm"
            >
              Admin Dashboard
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* NIC + Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIC
                </label>
                <input
                  type="text"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="2004XXXXXXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile No
                </label>
                <input
                  type="text"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="07XXXXXXXX"
                  required
                />
              </div>
            </div>

            {/* Full name + Call name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Supesh Asalya"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Name
                </label>
                <input
                  type="text"
                  value={callName}
                  onChange={(e) => setCallName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. supesh"
                  required
                />
              </div>
            </div>

            {/* DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123 Kandy Road, Kadawatha"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm md:text-base hover:bg-gray-50"
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm md:text-base font-semibold disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Cash Collector"}
              </button>
            </div>
          </form>

          {message && (
            <p
              className={`mt-4 text-sm md:text-base font-medium ${
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

export default AdminCashCollectors;
