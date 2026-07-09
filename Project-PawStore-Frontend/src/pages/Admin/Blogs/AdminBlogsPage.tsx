import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaPen,
  FaTrash,
  FaMagnifyingGlass,
  FaSpinner,
} from "react-icons/fa6";
import { fetchBlogs, deleteBlog } from "../../../services/api";
import { toast } from "react-hot-toast";

const AdminBlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Posts" },
    { id: "care", name: "Pet Care" },
    { id: "training", name: "Training" },
    { id: "health", name: "Health" },
    { id: "nutrition", name: "Nutrition" },
  ];

  useEffect(() => {
    const getBlogs = async () => {
      try {
        setLoading(true);
        const data = await fetchBlogs(activeCategory);
        setBlogs(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getBlogs();
  }, [activeCategory]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteBlog(confirmDelete);
      setBlogs(blogs.filter((blog) => blog._id !== confirmDelete));
      toast.success("Blog post deleted successfully");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(`Failed to delete blog post: ${err.toString()}`);
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

  // Function to truncate text
  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Blog Posts</h1>
        <Link
          to="/admin/blogs/new"
          className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-amber-700 transition-colors"
        >
          <FaPlus className="mr-2" /> Add New Post
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
            placeholder="Search by title or author..."
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
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBlogs.length > 0 ? (
                filteredBlogs.map((blog) => (
                  <tr key={blog._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={blog.image}
                        alt={blog.title}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {blog.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {truncateText(blog.content)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{blog.author}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                        {blog.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(blog.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/blogs/edit/${blog._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaPen />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(blog._id)}
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
                    No blog posts found
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
              Are you sure you want to delete this blog post? This action cannot
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

export default AdminBlogsPage;
