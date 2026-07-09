import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaPen,
  FaTrash,
  FaMagnifyingGlass,
  FaSpinner,
} from "react-icons/fa6";
import { fetchAccessories, deleteAccessory } from "../../../services/api";
import { toast } from "react-hot-toast";

const AdminAccessoriesPage = () => {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Products" },
    { id: "food", name: "Food & Treats" },
    { id: "toys", name: "Toys" },
    { id: "beds", name: "Beds & Furniture" },
    { id: "collars", name: "Collars & Leashes" },
    { id: "grooming", name: "Grooming" },
  ];

  useEffect(() => {
    const getAccessories = async () => {
      try {
        setLoading(true);
        const data = await fetchAccessories(activeCategory);
        setAccessories(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getAccessories();
  }, [activeCategory]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredAccessories = accessories.filter((accessory) =>
    accessory.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteAccessory(confirmDelete);
      setAccessories(
        accessories.filter((accessory) => accessory._id !== confirmDelete),
      );
      toast.success("Accessory deleted successfully");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(`Failed to delete accessory: ${err.toString()}`);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Accessories</h1>
        <Link
          to="/admin/accessories/new"
          className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-amber-700 transition-colors"
        >
          <FaPlus className="mr-2" /> Add New Accessory
        </Link>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full transition-colors ${
                activeCategory === category.id
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search accessories..."
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
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccessories.length > 0 ? (
                filteredAccessories.map((accessory) => (
                  <tr key={accessory._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={accessory.image}
                        alt={accessory.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {accessory.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                        {accessory.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        NPR {accessory.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          accessory.countInStock > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {accessory.countInStock > 0
                          ? `${accessory.countInStock} in stock`
                          : "Out of stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/accessories/edit/${accessory._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaPen />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(accessory._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No accessories found
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
              Are you sure you want to delete this accessory? This action cannot
              be undone.
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

export default AdminAccessoriesPage;
