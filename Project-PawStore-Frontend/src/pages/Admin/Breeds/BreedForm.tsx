import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSpinner, FaFloppyDisk, FaXmark } from "react-icons/fa6";
import {
  fetchBreedById,
  createBreed,
  updateBreed,
} from "../../../services/api";
import { toast } from "react-hot-toast";

const BreedForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    image: "",
    description: "",
    traits: [],
    featured: false,
  });

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [traitInput, setTraitInput] = useState("");

  useEffect(() => {
    const fetchBreedData = async () => {
      if (isEditMode) {
        try {
          const data = await fetchBreedById(id);
          setFormData({
            name: data.name || "",
            image: data.image || "",
            description: data.description || "",
            traits: data.traits || [],
            featured: data.featured || false,
          });
          setLoading(false);
        } catch (err) {
          setError(err.toString());
          setLoading(false);
        }
      }
    };

    fetchBreedData();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTraitInputChange = (e) => {
    setTraitInput(e.target.value);
  };

  const handleAddTrait = () => {
    if (traitInput.trim() && !formData.traits.includes(traitInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        traits: [...prev.traits, traitInput.trim()],
      }));
      setTraitInput("");
    }
  };

  const handleRemoveTrait = (traitToRemove) => {
    setFormData((prev) => ({
      ...prev,
      traits: prev.traits.filter((trait) => trait !== traitToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        await updateBreed(id, formData);
        toast.success("Breed updated successfully");
      } else {
        await createBreed(formData);
        toast.success("Breed created successfully");
      }
      navigate("/admin/breeds");
    } catch (err) {
      setError(err.toString());
      toast.error(
        `Failed to ${isEditMode ? "update" : "create"} breed: ${err.toString()}`,
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
        {isEditMode ? "Edit Breed" : "Add New Breed"}
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
                Breed Name*
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
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-400 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Featured Breed
                </span>
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Traits
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={traitInput}
                  onChange={handleTraitInputChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Add a trait (e.g., Friendly)"
                />
                <button
                  type="button"
                  onClick={handleAddTrait}
                  className="bg-amber-600 text-white px-4 py-2 rounded-r-lg hover:bg-amber-700"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.traits.map((trait, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full"
                  >
                    <span>{trait}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrait(trait)}
                      className="ml-2 text-amber-800 hover:text-amber-900"
                    >
                      <FaXmark size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/admin/breeds")}
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
                <FaFloppyDisk className="mr-2" /> Save Breed
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BreedForm;
