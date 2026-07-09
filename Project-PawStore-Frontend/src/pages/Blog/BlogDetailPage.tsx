import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaSpinner,
  FaCalendar,
  FaUser,
  FaTags,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaPinterest,
} from "react-icons/fa6";
import { fetchBlogById, fetchBlogs } from "../../services/api";

const BlogDetailPage = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getBlogDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchBlogById(id);
        setBlog(data);

        // Fetch related posts from the same category
        if (data && data.category) {
          const allBlogs = await fetchBlogs(data.category);
          const filtered = allBlogs
            .filter((post) => post._id !== id)
            .slice(0, 3);
          setRelatedPosts(filtered);
        }

        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getBlogDetails();
  }, [id]);

  // Function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Function to render content with paragraphs
  const renderContent = (content) => {
    return content.split("\n").map((paragraph, index) => (
      <p key={index} className="mb-4">
        {paragraph}
      </p>
    ));
  };

  // Share URLs
  const getShareUrl = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(blog?.title || "");

    switch (platform) {
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      case "twitter":
        return `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
      case "linkedin":
        return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      case "pinterest":
        return `https://pinterest.com/pin/create/button/?url=${url}&description=${title}&media=${encodeURIComponent(
          blog?.image || ""
        )}`;
      default:
        return "#";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        to="/blog"
        className="inline-flex items-center text-amber-600 font-medium hover:text-amber-700 mb-8"
      >
        <FaArrowLeft className="mr-2" /> Back to Blog
      </Link>

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
      ) : blog ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <article className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Featured Image */}
              <div className="h-64 sm:h-80 md:h-96 overflow-hidden">
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                {/* Meta Information */}
                <div className="flex flex-wrap items-center text-sm text-gray-500 mb-4">
                  <div className="flex items-center mr-4 mb-2">
                    <FaCalendar className="mr-1" /> {formatDate(blog.date)}
                  </div>
                  <div className="flex items-center mr-4 mb-2">
                    <FaUser className="mr-1" /> {blog.author}
                  </div>
                  <div className="flex items-center mb-2">
                    <FaTags className="mr-1 text-amber-600" />
                    <span className="capitalize">{blog.category}</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold mb-6">
                  {blog.title}
                </h1>

                {/* Content */}
                <div className="prose prose-lg max-w-none">
                  {renderContent(blog.content)}
                </div>

                {/* Social Sharing */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">Share this post</h3>
                  <div className="flex space-x-4">
                    <a
                      href={getShareUrl("facebook")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaFacebook size={24} />
                    </a>
                    <a
                      href={getShareUrl("twitter")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-500 hover:text-sky-700"
                    >
                      <FaTwitter size={24} />
                    </a>
                    <a
                      href={getShareUrl("linkedin")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <FaLinkedin size={24} />
                    </a>
                    <a
                      href={getShareUrl("pinterest")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaPinterest size={24} />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Author Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">About the Author</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                  <FaUser className="text-gray-500" />
                </div>
                <div>
                  <h4 className="font-semibold">{blog.author}</h4>
                  <p className="text-sm text-gray-500">Pet Care Expert</p>
                </div>
              </div>
              <p className="text-gray-600">
                Our writers are pet care professionals dedicated to providing the best
                advice for your furry friends.
              </p>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">Related Posts</h3>
                <div className="space-y-4">
                  {relatedPosts.map((post) => (
                    <div key={post._id} className="flex items-start">
                      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 mr-4">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1 line-clamp-2">
                          <Link
                            to={`/blog/${post._id}`}
                            className="hover:text-amber-600"
                          >
                            {post.title}
                          </Link>
                        </h4>
                        <div className="text-xs text-gray-500">
                          {formatDate(post.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">Blog post not found.</p>
        </div>
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

export default BlogDetailPage;
