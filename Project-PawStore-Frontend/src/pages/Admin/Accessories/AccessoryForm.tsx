import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSpinner, FaFloppyDisk } from "react-icons/fa6";
import {
  fetchAccessoryById,
  createAccessory,
  updateAccessory,
} from "../../../services/api";
import { toast } from "react-hot-toast";

const AccessoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    image: "",
    description: "",
    category: "toys",
    price: "",
    countInStock: "",
    rating: 5,
    bestseller: false,
  });

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    { id: "food", name: "Food & Treats" },
    { id: "toys", name: "Toys" },
    { id: "beds", name: "Beds & Furniture" },
    { id: "collars", name: "Collars & Leashes" },
    { id: "grooming", name: "Grooming" },
  ];

  useEffect(() => {
    const fetchAccessoryData = async () => {
      if (isEditMode) {
        try {
          const data = await fetchAccessoryById(id);
          setFormData({
            name: data.name || "",
            image: data.image || "",
            description: data.description || "",
            category: data.category || "toys",
            price: data.price || "",
            countInStock: data.countInStock || "",
            rating: data.rating || 5,
            bestseller: data.bestseller || false,
          });
          setLoading(false);
        } catch (err) {
          setError(err.toString());
          setLoading(false);
        }
      }
    };

    fetchAccessoryData();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseFloat(value)
            : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate form
    if (Number(formData.price) <= 0) {
      setError("Price must be greater than 0");
      setSubmitting(false);
      return;
    }

    if (Number(formData.countInStock) < 0) {
      setError("Stock count cannot be negative");
      setSubmitting(false);
      return;
    }

    try {
      const accessoryData = {
        ...formData,
        price: parseFloat(formData.price),
        countInStock: parseInt(formData.countInStock),
        rating: formData.rating,
      };

      if (isEditMode) {
        await updateAccessory(id, accessoryData);
        toast.success("Accessory updated successfully");
      } else {
        await createAccessory(accessoryData);
        toast.success("Accessory created successfully");
      }
      navigate("/admin/accessories");
    } catch (err) {
      setError(err.toString());
      toast.error(
        `Failed to ${isEditMode ? "update" : "create"} accessory: ${err.toString()}`,
      );
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
      <h1 className="text-2xl font-semibold mb-6">
        {isEditMode ? "Edit Accessory" : "Add New Accessory"}
      </h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Product Name*
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
                htmlFor="image"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Image URL*
              </label>
              <input
                type="text"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {formData.image && (
                <div className="mt-2">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="h-32 w-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category*
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price ($)*
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="countInStock"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Stock Count*
                </label>
                <input
                  type="number"
                  id="countInStock"
                  name="countInStock"
                  value={formData.countInStock || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description*
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              ></textarea>
            </div>

            <div>
              <label
                htmlFor="rating"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rating (1-5)
              </label>
              <input
                type="number"
                id="rating"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                min="1"
                max="5"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="bestseller"
                  checked={formData.bestseller}
                  onChange={handleChange}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-400 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Bestseller</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/admin/accessories")}
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
                <FaFloppyDisk className="mr-2" /> Save Accessory
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccessoryForm;

