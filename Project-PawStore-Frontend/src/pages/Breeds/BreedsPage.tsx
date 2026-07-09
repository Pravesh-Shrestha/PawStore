import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaSpinner } from "react-icons/fa6";
import { fetchBreeds } from "../../services/api";

const BreedsPage = () => {
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getBreeds = async () => {
      try {
        setLoading(true);
        const data = await fetchBreeds();
        setBreeds(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getBreeds();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Dog Breeds</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Discover the perfect companion for your family from our selection of
          lovable and well-tempered dog breeds. Each breed has its own unique
          characteristics and charm.
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
          {/* Breeds Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {breeds.map((breed) => (
              <div
                key={breed._id}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="h-64 overflow-hidden">
                  <img
                    src={breed.image}
                    alt={breed.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{breed.name}</h2>
                  <p className="text-gray-600 mb-4">{breed.description}</p>
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Traits:</h3>
                    <div className="flex flex-wrap gap-2">
                      {breed.traits.map((trait, index) => (
                        <span
                          key={index}
                          className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    to={`/breeds/${breed._id}`}
                    className="inline-flex items-center text-amber-600 font-medium hover:text-amber-700"
                  >
                    Learn more <FaArrowRight className="ml-2" />
                  </Link>
                </div>
              </div>
            ))}
          </section>

          {/* Fallback for no breeds */}
          {breeds.length === 0 && !loading && !error && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-xl">No breeds found.</p>
            </div>
          )}
        </>
      )}

      {/* CTA Section */}
      <section className="bg-amber-50 rounded-2xl p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Find Your Perfect Companion</h2>
        <p className="text-lg mb-6 max-w-3xl mx-auto">
          Not sure which breed is right for your lifestyle? Our experts can help
          you find the perfect match based on your living situation, activity
          level, and preferences.
        </p>
        <Link
          to="/contact"
          className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors inline-block"
        >
          Contact Us For Advice
        </Link>
      </section>
    </div>
  );
};

export default BreedsPage;
