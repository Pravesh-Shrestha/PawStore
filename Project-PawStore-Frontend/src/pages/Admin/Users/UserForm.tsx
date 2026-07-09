import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSpinner, FaFloppyDisk, FaUserShield, FaUser } from "react-icons/fa6";
import { getUserById, updateUser } from "../../../services/api";
import { toast } from "react-hot-toast";

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    isAdmin: false,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserById(id);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          isAdmin: data.isAdmin || false,
        });
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await updateUser(id, formData);
      toast.success("User updated successfully");
      navigate("/admin/users");
    } catch (err) {
      setError(err.toString());
      toast.error(`Failed to update user: ${err.toString()}`);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-amber-600 text-4xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit User</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <div className="space-y-6 max-w-md">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isAdmin"
                checked={formData.isAdmin}
                onChange={handleChange}
                className="h-4 w-4 text-amber-600 focus:ring-amber-400 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Admin Privileges
              </span>
            </label>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Current Role
            </h3>
            <div className="flex items-center">
              {formData.isAdmin ? (
                <>
                  <FaUserShield className="text-purple-600 mr-2" />
                  <span className="text-purple-600 font-medium">
                    Administrator
                  </span>
                </>
              ) : (
                <>
                  <FaUser className="text-green-600 mr-2" />
                  <span className="text-green-600 font-medium">Customer</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`bg-amber-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-amber-700 transition-colors ${
              submitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin mr-2" /> Saving...
              </>
            ) : (
              <>
                <FaFloppyDisk className="mr-2" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
