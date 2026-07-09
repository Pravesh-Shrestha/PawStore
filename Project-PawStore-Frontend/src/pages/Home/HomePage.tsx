import React, { useEffect } from "react";
import HeroSection from "./Section/HeroSection";
import DogBreed from "./Section/DogBreed";
import PetProducts from "./Section/PetProducts";
import BlogSection from "./Section/BlogSection";
import NewsLetter from "./Section/NewsLetter";
import { toast } from "react-hot-toast";

const HomePage = () => {
  // Error boundary for child components
  useEffect(() => {
    const handleError = (event) => {
      console.error("Error caught by error handler:", event.error);
      toast.error("Something went wrong. Please try refreshing the page.");
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <div>
      <HeroSection />
      <DogBreed />
      <PetProducts />
      <BlogSection />
      <NewsLetter />
    </div>
  );
};

export default HomePage;
