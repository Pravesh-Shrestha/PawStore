import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaPen,
  FaTrash,
  FaMagnifyingGlass,
  FaSpinner,
  FaUserShield,
  FaUser,
} from "react-icons/fa6";
import { getAllUsers, deleteUser } from "../../../services/api";
import { toast } from "react-hot-toast";

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'admin', 'customer'

  useEffect(() => {
    const getUsers = async () => {
      try {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getUsers();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "all") return matchesSearch;
    if (filter === "admin") return matchesSearch && user.isAdmin;
    if (filter === "customer") return matchesSearch && !user.isAdmin;

    return matchesSearch;
  });

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteUser(confirmDelete);
      setUsers(users.filter((user) => user._id !== confirmDelete));
      toast.success("User deleted successfully");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(`Failed to delete user: ${err.toString()}`);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: "numeric" as const, month: "short" as const, day: "numeric" as const };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Users</h1>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full transition-colors ${
              filter === "all"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setFilter("admin")}
            className={`px-4 py-2 rounded-full transition-colors ${
              filter === "admin"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Admins
          </button>
          <button
            onClick={() => setFilter("customer")}
            className={`px-4 py-2 rounded-full transition-colors ${
              filter === "customer"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Customers
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-amber-600 text-4xl" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-600 font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isAdmin
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.isAdmin ? (
                          <>
                            <FaUserShield className="mr-1" /> Admin
                          </>
                        ) : (
                          <>
                            <FaUser className="mr-1" /> Customer
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/users/edit/${user._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaPen />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(user._id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={user.isAdmin} // Prevent deleting admin users
                          title={
                            user.isAdmin
                              ? "Cannot delete admin users"
                              : "Delete user"
                          }
                        >
                          <FaTrash
                            className={
                              user.isAdmin
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this user? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
