import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSpinner, FaFloppyDisk } from "react-icons/fa6";
import { fetchBlogById, createBlog, updateBlog } from "../../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

const BlogForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image: "",
    category: "care",
    author: "",
    featured: false,
  });

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    { id: "care", name: "Pet Care" },
    { id: "training", name: "Training" },
    { id: "health", name: "Health" },
    { id: "nutrition", name: "Nutrition" },
    { id: "lifestyle", name: "Lifestyle" },
  ];

  useEffect(() => {
    // Set author name from logged in user if not in edit mode
    if (!isEditMode && user) {
      setFormData((prev) => ({
        ...prev,
        author: user.name,
      }));
    }

    const fetchBlogData = async () => {
      if (isEditMode) {
        try {
          const data = await fetchBlogById(id);
          setFormData({
            title: data.title || "",
            content: data.content || "",
            image: data.image || "",
            category: data.category || "care",
            author: data.author || (user ? user.name : ""),
            featured: data.featured || false,
          });
          setLoading(false);
        } catch (err) {
          setError(err.toString());
          setLoading(false);
        }
      }
    };

    fetchBlogData();
  }, [id, isEditMode, user]);

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
      if (isEditMode) {
        await updateBlog(id, formData);
        toast.success("Blog post updated successfully");
      } else {
        await createBlog(formData);
        toast.success("Blog post created successfully");
      }
      navigate("/admin/blogs");
    } catch (err) {
      setError(err.toString());
      toast.error(
        `Failed to ${isEditMode ? "update" : "create"} blog post: ${err.toString()}`,
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
        {isEditMode ? "Edit Blog Post" : "Create New Blog Post"}
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
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
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
                Featured Image URL*
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
                    className="h-32 w-full object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
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
              <div className="flex-1">
                <label
                  htmlFor="author"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Author*
                </label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
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
                  Featured Post
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Content*
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Write your blog post content here..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/admin/blogs")}
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
                <FaFloppyDisk className="mr-2" />{" "}
                {isEditMode ? "Update Post" : "Publish Post"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogForm;
