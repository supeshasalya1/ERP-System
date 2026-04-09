import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/_Navbar";
import AdminNavbar from "../Admin/AdminNavbar";
import { apiFetch } from "../../utils/api";

export default function ChangePassword({ variant }) {
  const navigate = useNavigate();
  const storedRole =
    (typeof window !== "undefined" &&
      (localStorage.getItem("role") || localStorage.getItem("userRole"))) ||
    "user";

  const mode = variant || (storedRole === "admin" || storedRole === "super_admin" ? "admin" : "user");
  const endpoint = mode === "admin" ? "/api/admin/password" : "/api/password";

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState({ type: "info", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: "error", message: "New password and confirmation must match." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "info", message: "Updating password..." });
    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(form),
      });

      setStatus({
        type: "success",
        message: response?.message || "Password updated. Logging you out...",
      });

      localStorage.removeItem("token");
      setTimeout(() => {
        localStorage.clear();
        navigate("/", { replace: true });
      }, 1500);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to change password." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {mode === "admin" ? <AdminNavbar /> : <Navbar />}

      <main className="max-w-xl mx-auto px-4 md:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Change Password</h1>
            <p className="text-sm text-gray-500">{mode === "admin" ? "Admin account" : "User account"}</p>
          </div>

          {status.message && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : status.type === "error"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              {status.message}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                value={form.currentPassword}
                onChange={(event) => handleChange("currentPassword", event.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                value={form.newPassword}
                onChange={(event) => handleChange("newPassword", event.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                value={form.confirmPassword}
                onChange={(event) => handleChange("confirmPassword", event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save and sign out"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
