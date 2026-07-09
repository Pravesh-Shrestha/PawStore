import React from "react";
import { Link } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaShoppingCart } from "react-icons/fa";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    image: string;
    price: number;
    category: string;
    rating?: number;
    bestseller?: boolean;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { _id, name, image, price, category, rating = 0, bestseller } = product;

  const formatCategory = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1);

  const renderStars = (rate: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rate)) {
        stars.push(<FaStar key={i} className="text-amber-400 text-[10px]" />);
      } else if (i - 0.5 <= rate) {
        stars.push(<FaStarHalfAlt key={i} className="text-amber-400 text-[10px]" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-200 text-[10px]" />);
      }
    }
    return stars;
  };

  return (
    <Link to="/accessories" className="block group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className="bg-white/90 backdrop-blur-sm text-amber-700 text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize shadow-sm">
              {formatCategory(category)}
            </span>
          </div>
          {bestseller && (
            <div className="absolute top-3 right-3">
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                BESTSELLER
              </span>
            </div>
          )}
          {/* Quick add overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <span className="bg-white/90 backdrop-blur-sm text-amber-600 px-4 py-2 rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 shadow-lg">
              <FaShoppingCart /> View Details
            </span>
          </div>
        </div>
        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-sm text-gray-800 line-clamp-1 mb-1.5 group-hover:text-amber-600 transition-colors">
            {name}
          </h3>
          {rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {renderStars(rating)}
              <span className="text-[10px] text-gray-400 ml-1">({rating.toFixed(1)})</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-amber-600">
              NPR {price.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              In Stock
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
