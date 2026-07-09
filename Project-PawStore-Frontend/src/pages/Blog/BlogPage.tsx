import React, { useState, useEffect } from "react";
import {
  FaCalendar,
  FaUser,
  FaMagnifyingGlass,
  FaTags,
  FaSpinner,
} from "react-icons/fa6";
import { Link } from "react-router-dom";
import { fetchBlogs, fetchFeaturedBlogs } from "../../services/api";

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [blogPosts, setBlogPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = [
    { id: "all", name: "All Posts" },
    { id: "training", name: "Training" },
    { id: "health", name: "Health & Wellness" },
    { id: "nutrition", name: "Nutrition" },
    { id: "behavior", name: "Behavior" },
  ];

  useEffect(() => {
    const getBlogs = async () => {
      try {
        setLoading(true);
        const [blogsData, featuredData] = await Promise.all([
          fetchBlogs(activeCategory),
          fetchFeaturedBlogs(),
        ]);
        setBlogPosts(blogsData);
        setFeaturedPosts(featuredData);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getBlogs();
  }, [activeCategory]);

  // Filter posts based on search query
  const filteredPosts = blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Pawsome Blog</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Expert advice, tips, and stories about pet care, training, health, and
          more. Stay informed and give your furry friends the best care
          possible.
        </p>
      </section>

      {/* Loading and Error States */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <FaSpinner className="animate-spin text-amber-600 text-4xl" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 text-xl">{error}</p>
          <p className="mt-4">Please try again later.</p>
        </div>
      ) : (
        <>
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {featuredPosts.map((post) => (
                  <div
                    key={post._id}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="md:flex">
                      <div className="md:w-2/5">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6 md:w-3/5">
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <FaCalendar className="mr-1" />{" "}
                          {new Date(post.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          <span className="mx-2">•</span>
                          <FaUser className="mr-1" /> {post.author}
                        </div>
                        <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                        <p className="text-gray-600 mb-4">{post.excerpt}</p>
                        <Link
                          to={`/blog/${post._id}`}
                          className="text-amber-600 font-medium hover:text-amber-700"
                        >
                          Read More
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Search and Filter */}
          <section className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative md:w-1/3">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 px-4 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <FaMagnifyingGlass className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

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
          </section>

          {/* Blog Posts Grid */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <div
                  key={post._id}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <FaCalendar className="mr-1" />{" "}
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                    <p className="text-gray-600 mb-4">{post.excerpt}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-sm text-gray-500">
                        <FaUser className="mr-1" /> {post.author}
                      </div>
                      <div className="flex items-center text-sm">
                        <FaTags className="mr-1 text-amber-600" />
                        <span className="capitalize">{post.category}</span>
                      </div>
                    </div>
                    <Link
                      to={`/blog/${post._id}`}
                      className="block mt-4 text-amber-600 font-medium hover:text-amber-700"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No articles found</h3>
                <p className="text-gray-600">
                  Try adjusting your search or filter to find what you're
                  looking for.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Newsletter */}
      <section className="mt-16 bg-amber-50 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Subscribe to Our Newsletter</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Get the latest articles, tips, and pet care advice delivered straight
          to your inbox.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Your email address"
            className="flex-grow px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors">
            Subscribe
          </button>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
