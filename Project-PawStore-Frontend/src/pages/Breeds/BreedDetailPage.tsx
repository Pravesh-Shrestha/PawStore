import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaSpinner, FaPaw } from "react-icons/fa6";
import { fetchBreedById } from "../../services/api";

const BreedDetailPage = () => {
  const { id } = useParams();
  const [breed, setBreed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getBreedDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchBreedById(id);
        setBreed(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    getBreedDetails();
  }, [id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        to="/breeds"
        className="inline-flex items-center text-amber-600 font-medium hover:text-amber-700 mb-8"
      >
        <FaArrowLeft className="mr-2" /> Back to Breeds
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
      ) : breed ? (
        <div>
          {/* Breed Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src={breed.image}
                alt={breed.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-4">{breed.name}</h1>
              <p className="text-lg text-gray-600 mb-8">{breed.description}</p>
              
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Traits</h2>
                <div className="flex flex-wrap gap-3">
                  {breed.traits.map((trait, index) => (
                    <span
                      key={index}
                      className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-md flex items-center"
                    >
                      <FaPaw className="mr-2" /> {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">About This Breed</h2>
                <div className="bg-amber-50 rounded-lg p-6">
                  <p className="text-gray-700">
                    {breed.name} dogs are known for their {breed.traits.join(", ").toLowerCase()} nature. 
                    They make excellent companions for {breed.traits.includes("Friendly") ? "families and children" : "active individuals"}.
                    These dogs require {breed.traits.includes("Energetic") ? "plenty of exercise and mental stimulation" : "moderate exercise and regular grooming"}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
            <h2 className="text-2xl font-bold mb-6">Care Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-3">Exercise Needs</h3>
                <p className="text-gray-600">
                  {breed.traits.includes("Energetic") || breed.traits.includes("Active") 
                    ? "High - Requires daily vigorous exercise and mental stimulation."
                    : breed.traits.includes("Calm") || breed.traits.includes("Gentle")
                    ? "Low to Moderate - Enjoys walks but doesn't require intense exercise."
                    : "Moderate - Regular walks and playtime are sufficient."}
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-3">Grooming</h3>
                <p className="text-gray-600">
                  {breed.name.includes("Retriever") || breed.name.includes("Shepherd") || breed.name.includes("Husky")
                    ? "Moderate to High - Regular brushing required to manage shedding."
                    : breed.name.includes("Poodle") || breed.name.includes("Terrier")
                    ? "High - Professional grooming recommended every 4-6 weeks."
                    : "Low to Moderate - Basic grooming with occasional brushing."}
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-3">Temperament</h3>
                <p className="text-gray-600">
                  {breed.traits.join(", ")}. {breed.traits.includes("Friendly") 
                    ? "Great with families and other pets."
                    : breed.traits.includes("Protective") || breed.traits.includes("Alert")
                    ? "Makes an excellent watchdog and loyal companion."
                    : "Loyal and devoted to their owners."}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <section className="bg-amber-50 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Interested in a {breed.name}?</h2>
            <p className="text-lg mb-6 max-w-3xl mx-auto">
              Contact our team to learn more about adopting a {breed.name} or to schedule a visit to meet our available puppies.
            </p>
            <Link
              to="/contact"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors inline-block"
            >
              Contact Us
            </Link>
          </section>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">Breed not found.</p>
        </div>
      )}
    </div>
  );
};

export default BreedDetailPage;
