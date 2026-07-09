import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaPaw, FaShieldDog, FaHeart, FaStar } from "react-icons/fa6";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/40 to-teal-50/30">
      {/* Organic background blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] blob-1 bg-gradient-to-br from-amber-200/30 to-orange-300/20 animate-float-slow" />
      <div className="absolute bottom-[-10%] left-[-8%] w-[50%] h-[50%] blob-2 bg-gradient-to-tr from-teal-200/20 to-cyan-200/20 animate-float" style={{ animationDelay: "-2s" }} />
      <div className="absolute top-[40%] left-[5%] w-24 h-24 blob-3 bg-amber-300/10 animate-float-slow" style={{ animationDelay: "-1s" }} />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #c2410c 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-0">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          
          {/* ─────── Content ─────── */}
          <div className="flex-1 text-center lg:text-left">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-amber-700 px-5 py-2 rounded-full text-sm font-medium shadow-sm mb-8 border border-amber-100">
              <FaPaw className="text-amber-500" />
              Where every paw finds a home
            </div>

            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Everybody needs a{" "}
              <span className="text-gradient-paw">
                friend
              </span>{" "}
              in Life.
            </h1>

            {/* Description */}
            <p className="text-lg text-stone-600 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              The Corgi is intelligent, quick and curious — a kind, adventurous
              breed that shows a large measure of independence. They're good with
              children and normally kind with strangers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link to="/breeds" className="btn-paw">
                <span>Explore Breeds</span> <FaArrowRight />
              </Link>
              <Link to="/contact" className="btn-paw-outline">
                <FaHeart className="text-red-400" /> Contact Us
              </Link>
            </div>

            {/* Trust badges — more subtle */}
            <div className="flex flex-wrap items-center gap-8 mt-12 pt-8 border-t border-amber-100/50 justify-center lg:justify-start">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <FaShieldDog className="text-teal-500 text-sm" />
                </div>
                <span className="text-sm text-stone-500 font-medium">Certified</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <FaHeart className="text-red-400 text-sm" />
                </div>
                <span className="text-sm text-stone-500 font-medium">Loving Care</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <FaStar className="text-amber-400 text-sm" />
                </div>
                <span className="text-sm text-stone-500 font-medium">Top Rated</span>
              </div>
            </div>
          </div>

          {/* ─────── Visual - Organic image frame ─────── */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              {/* Organic photo frame */}
              <div className="relative z-10">
                <div className="mask-paw">
                  <img
                    src="/img/hero-dog.png"
                    alt="Happy Corgi"
                    className="w-full h-auto object-cover scale-110 hover:scale-125 transition-transform duration-700"
                  />
                </div>
                {/* Soft glow behind */}
                <div className="absolute -inset-8 bg-gradient-to-tr from-amber-400/20 via-transparent to-teal-400/20 rounded-full blur-3xl -z-10" />
              </div>

              {/* Floating badge 1 - top left */}
              <div className="absolute -top-4 -left-6 z-20 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 animate-float-slow" style={{ animationDelay: '-1.5s' }}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                  <FaPaw className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Breed</p>
                  <p className="text-sm font-bold text-stone-800">Corgi</p>
                </div>
              </div>

              {/* Floating badge 2 - bottom right */}
              <div className="absolute -bottom-3 -right-4 z-20 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 animate-float" style={{ animationDelay: '-0.5s' }}>
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 border-2 border-white shadow-sm" />
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Happy Owners</p>
                  <p className="text-sm font-bold text-stone-800">2k+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
