// client/src/Pages/Signup/Signup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../Admin/AdminNavbar";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    nic: "",
    address: "",
    dob: "",
    mobile_no: "",
    username: "",
    password: "",
    role: "user", // Default role
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!/^[A-Za-z\s]{3,50}$/.test(formData.full_name))
      newErrors.full_name = "Full name must be 3–50 letters only.";
    if (!/^[0-9]{9}[Vv]$|^[0-9]{12}$/.test(formData.nic))
      newErrors.nic = "NIC must be 9 digits + 'V' or 12 digits.";
    if (formData.address.trim().length < 5)
      newErrors.address = "Address must be at least 5 characters.";
    if (!formData.dob) newErrors.dob = "Date of birth is required.";
    if (!/^0\d{9}$/.test(formData.mobile_no))
      newErrors.mobile_no = "Mobile number must start with 0 and be 10 digits.";
    if (!/^[A-Za-z0-9_]{4,20}$/.test(formData.username))
      newErrors.username =
        "Username must be 4–20 characters (letters, digits, underscores).";
    if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters long.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const token = localStorage.getItem("token");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        setMessage("✅ User registered successfully!");
        setFormData({
          full_name: "",
          nic: "",
          address: "",
          dob: "",
          mobile_no: "",
          username: "",
          password: "",
          role: "user",
        });
      } else {
        setIsSuccess(false);
        setMessage(data.message || "Failed to register user.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setIsSuccess(false);
      setMessage("❌ Something went wrong while registering user.");
    }
  };

  return (
    <>
      <AdminNavbar />

      <main className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-8 pb-12">
          <div className="bg-white shadow-lg rounded-2xl p-8 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">
              Add New User
            </h2>

            {message && (
              <p
                className={`text-center mb-4 font-medium ${
                  isSuccess ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Full Name */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
                {errors.full_name && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* NIC */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  NIC
                </label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="123456789V or 200045678912"
                  value={formData.nic}
                  onChange={(e) =>
                    setFormData({ ...formData, nic: e.target.value })
                  }
                  required
                />
                {errors.nic && (
                  <p className="text-red-600 text-sm mt-1">{errors.nic}</p>
                )}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="123 Main Street, City"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                />
                {errors.address && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.address}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
                  }
                  required
                />
                {errors.dob && (
                  <p className="text-red-600 text-sm mt-1">{errors.dob}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="07XXXXXXXX"
                  maxLength={10}
                  value={formData.mobile_no}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile_no: e.target.value })
                  }
                  required
                />
                {errors.mobile_no && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.mobile_no}
                  </p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="john_doe"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
                {errors.username && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-1">
                  Role
                </label>
                <select
                  className="w-full border rounded-xl px-4 h-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Submit */}
              <div className="md:col-span-2 flex justify-end mt-4">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
};

export default Signup;
