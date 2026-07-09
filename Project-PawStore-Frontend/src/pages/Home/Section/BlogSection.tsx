import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BlogCards from "../../../component/Main/UI/BlogCards";
import { fetchBlogs } from "../../../services/api";
import { FaSpinner, FaArrowRight } from "react-icons/fa6";

const BlogSection = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getBlogs = async () => {
      try {
        setLoading(true);

        // Fetch all blogs
        const allBlogs = await fetchBlogs();

        // Get a mix of featured and regular blogs
        const featuredBlogs = allBlogs.filter((blog) => blog.featured);
        const regularBlogs = allBlogs.filter((blog) => !blog.featured);

        // Prioritize featured blogs, then fill with regular blogs to get 4 total
        let selectedBlogs = [];

        // Add featured blogs first (up to 4)
        if (featuredBlogs.length > 0) {
          selectedBlogs = featuredBlogs.slice(0, 4);
        }

        // If we don't have 4 blogs yet, add regular blogs
        if (selectedBlogs.length < 4 && regularBlogs.length > 0) {
          const neededBlogs = 4 - selectedBlogs.length;
          selectedBlogs = [
            ...selectedBlogs,
            ...regularBlogs.slice(0, neededBlogs),
          ];
        }

        // If we still don't have 4 blogs, just use whatever we have
        setBlogs(
          selectedBlogs.length > 0 ? selectedBlogs : allBlogs.slice(0, 4),
        );
        setLoading(false);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError(err.toString());
        setLoading(false);
      }
    };

    getBlogs();
  }, []);

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-white to-amber-50/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            <span className="text-amber-600 ">Pawsome</span> Insights
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Latest tips, advice, and stories for pet lovers
          </p>
          <div className="w-24 h-1 bg-amber-500 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64 w-full">
            <FaSpinner className="animate-spin text-amber-600 text-4xl" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center max-w-2xl mx-auto">
            <p className="font-medium text-lg mb-1">
              Unable to load blog posts
            </p>
            <p className="text-sm">
              Please try again later or check out our social media for the
              latest updates.
            </p>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {blogs.map((blog) => (
              <BlogCards
                key={blog._id}
                title={blog.title}
                image={blog.image}
                id={blog._id}
                author={blog.author}
                date={blog.date}
                excerpt={blog.excerpt}
                category={blog.category}
              />
            ))}
          </div>
        )}

        {/* View All Button */}
        {!loading && !error && blogs.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to="/blog"
              className="inline-flex items-center px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors duration-300"
            >
              View All Articles
              <FaArrowRight className="ml-2" size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
