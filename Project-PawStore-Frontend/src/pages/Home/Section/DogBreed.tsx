import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchBreeds } from "../../../services/api";
import { FaSpinner, FaArrowRight } from "react-icons/fa6";

const DogBreed = () => {
  const [breeds, setBreeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getBreeds = async () => {
      try {
        setLoading(true);
        const data = await fetchBreeds();
        setBreeds(data.slice(0, 6));
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching breeds:", err);
        setError(err.toString());
        setLoading(false);
      }
    };
    getBreeds();
  }, []);

  return (
    <section className="section-padding max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <span className="inline-block bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          Popular Breeds
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          <span className="text-amber-600">Dog </span>Breeds
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          Find yourself a perfect friend from a wide variety of choices.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-amber-600 text-4xl" />
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500">Error loading breeds. Please try again later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
            {breeds.map((breed: any) => (
              <Link
                key={breed._id}
                to={`/breeds/${breed._id}`}
                className="flex flex-col items-center group"
              >
                <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden ring-4 ring-amber-100 group-hover:ring-amber-300 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <img
                    src={breed.image}
                    alt={breed.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-800 group-hover:text-amber-600 transition-colors">
                  {breed.name}
                </h3>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/breeds"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-600 font-semibold rounded-xl hover:bg-amber-100 transition-colors"
            >
              View All Breeds <FaArrowRight />
            </Link>
          </div>
        </>
      )}
    </section>
  );
};

export default DogBreed;
