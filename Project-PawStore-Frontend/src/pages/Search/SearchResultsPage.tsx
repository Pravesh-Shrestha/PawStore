import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaSpinner, FaDog, FaBoxOpen, FaBlog, FaArrowLeft } from "react-icons/fa6";
import { searchAll } from "../../services/api";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [results, setResults] = useState({
    breeds: [],
    accessories: [],
    blogs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await searchAll(query);
        setResults(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // Calculate total results
  const totalResults = results.breeds.length + results.accessories.length + results.blogs.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="flex items-center text-gray-600 hover:text-amber-600 transition-colors">
          <FaArrowLeft className="mr-2" /> Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Search Results</h1>
      <p className="text-gray-600 mb-8">
        {loading ? "Searching..." : `Found ${totalResults} results for "${query}"`}
      </p>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-amber-600 text-4xl" />
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 mb-4">No results found for "{query}"</p>
          <p className="text-gray-500">
            Try different keywords or check your spelling.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Dog Breeds Section */}
          {results.breeds.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <FaDog className="mr-2 text-amber-600" /> Dog Breeds
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.breeds.map((breed) => (
                  <Link
                    key={breed._id}
                    to={breed.url}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="h-48 overflow-hidden">
                      <img
                        src={breed.image}
                        alt={breed.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1">{breed.name}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {breed.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Accessories Section */}
          {results.accessories.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <FaBoxOpen className="mr-2 text-amber-600" /> Pet Accessories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {results.accessories.map((accessory) => (
                  <Link
                    key={accessory._id}
                    to={accessory.url}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="relative">
                      <img
                        src={accessory.image}
                        alt={accessory.name}
                        className="w-full h-48 object-cover"
                      />
                      {accessory.bestseller && (
                        <span className="absolute top-2 right-2 bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">
                          BESTSELLER
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1">{accessory.name}</h3>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">
                          NPR {accessory.price.toFixed(2)}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">
                          {accessory.category}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Blogs Section */}
          {results.blogs.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <FaBlog className="mr-2 text-amber-600" /> Blog Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.blogs.map((blog) => (
                  <Link
                    key={blog._id}
                    to={blog.url}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col md:flex-row"
                  >
                    <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
                      <img
                        src={blog.image}
                        alt={blog.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 md:w-2/3">
                      <h3 className="font-bold text-lg mb-1">{blog.title}</h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {blog.excerpt}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-4">{new Date(blog.createdAt).toLocaleDateString()}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-full capitalize">
                          {blog.category}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
