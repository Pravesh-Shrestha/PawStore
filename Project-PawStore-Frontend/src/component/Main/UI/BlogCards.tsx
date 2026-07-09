import React from "react";
import { Link } from "react-router-dom";
import { FaCalendar, FaUser, FaArrowRight } from "react-icons/fa6";

const BlogCards = ({ image, title, id, author, date, excerpt, category }) => {
  // Format date if provided
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Link
      to={`/blog/${id}`}
      className="group block w-full h-full"
      aria-label={`Read blog post: ${title}`}
    >
      <article className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col transform hover:-translate-y-1">
        {/* Image container with overlay effect */}
        <div className="relative overflow-hidden aspect-[4/3]">
          {/* Category badge - positioned absolutely on the image */}
          {category && (
            <span className="absolute top-3 left-3 z-10 bg-amber-600 text-white text-xs font-medium px-2.5 py-1 rounded-full capitalize">
              {category}
            </span>
          )}

          {/* Image with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]"></div>

          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Title */}
          <h3 className="text-lg font-bold line-clamp-2 mb-2 group-hover:text-amber-600 transition-colors duration-300">
            {title}
          </h3>

          {/* Excerpt if available */}
          {excerpt && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">
              {excerpt}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              {author && (
                <div className="flex items-center">
                  <FaUser className="mr-1.5 text-amber-600" size={12} />
                  <span className="font-medium">{author}</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center">
                  <FaCalendar className="mr-1.5 text-amber-600" size={12} />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>

            {/* Read more with animated arrow */}
            <div className="flex items-center text-amber-600 font-medium group-hover:text-amber-700 transition-colors duration-300">
              <span className="mr-1">Read</span>
              <FaArrowRight
                className="transform group-hover:translate-x-1 transition-transform duration-300"
                size={12}
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default BlogCards;
