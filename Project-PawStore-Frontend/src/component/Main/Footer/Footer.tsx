import React from "react";
import { FaFacebook, FaInstagram, FaYoutube, FaPaw } from "react-icons/fa6";
import { Link } from "react-router-dom";

const Footer = () => {
  const navLinks = [
    { name: "Home", link: "/" },
    { name: "Breeds", link: "/breeds" },
    { name: "Accessories", link: "/accessories" },
    { name: "Blogs", link: "/blog" },
    { name: "Contact", link: "/contact" },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/main-logo.png" alt="Pawstore" className="w-9 h-9 brightness-0 invert" />
              <span className="font-bold text-xl text-white">Pawstore</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Your trusted companion for finding the perfect pet and premium accessories.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors" aria-label="Facebook">
                <FaFacebook />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors" aria-label="YouTube">
                <FaYoutube />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-pink-600 rounded-lg flex items-center justify-center transition-colors" aria-label="Instagram">
                <FaInstagram />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-3">
              {navLinks.map((item) => (
                <li key={item.name}>
                  <Link to={item.link} className="text-sm text-gray-400 hover:text-amber-400 transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Contact</h3>
            <address className="not-italic text-sm text-gray-400 space-y-3">
              <p>Kathmandu, Nepal</p>
              <p>+977 9824120601</p>
              <p>info@pawstore.com</p>
            </address>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Stay Updated</h3>
            <p className="text-sm text-gray-400 mb-4">
              Get pawsome news, tips and exclusive deals straight to your inbox.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <FaPaw /> Subscribe Now
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <span className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Pawstore. All rights reserved.
          </span>
          <span className="text-sm text-gray-600">
            Made with ❤️ for pet lovers
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

