import React, { useState, useEffect, useRef } from "react";
import {
  FaMagnifyingGlass,
  FaBars,
  FaXmark,
  FaUser,
  FaCartShopping,
  FaRightFromBracket,
  FaUserShield,
} from "react-icons/fa6";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";

const NavBar = () => {
  const navItems = [
    { name: "Home", link: "/" },
    { name: "Breeds", link: "/breeds" },
    { name: "Accessories", link: "/accessories" },
    { name: "Blogs", link: "/blog" },
    { name: "Contact", link: "/contact" },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();

  // Track scroll for header styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsProfileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      if (isOpen) setIsOpen(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 font-poppins transition-all duration-500 ${
          scrolled
            ? "paw-glass shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 z-20">
              <img
                src="/main-logo.png"
                alt="Pawstore"
                className="w-9 h-9 sm:w-10 sm:h-10"
              />
              <span className="font-bold text-lg sm:text-xl text-gradient-paw">
                Pawstore
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.link;
                return (
                  <Link
                    key={item.name}
                    to={item.link}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "text-amber-700 bg-amber-50"
                        : "text-gray-600 hover:text-amber-600 hover:bg-amber-50/50"
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Right Section */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 xl:w-56 pl-9 pr-3 py-2 text-sm bg-gray-100 border border-transparent rounded-full focus:outline-none focus:bg-white focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-all"
                />
                <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </form>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
              >
                <FaCartShopping className="text-lg" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>

              {/* Auth */}
              {isAuthenticated ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 pl-3 pr-2 py-2 text-sm font-medium text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                  >
                    <span className="max-w-[100px] truncate">{user?.name}</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link to="/profile" onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                        <FaUser className="text-gray-400 w-4" /> My Profile
                      </Link>
                      <Link to="/my-orders" onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                        <FaCartShopping className="text-gray-400 w-4" /> My Orders
                      </Link>
                      {isAdmin && (
                        <Link to="/admin/dashboard" onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors font-medium">
                          <FaUserShield className="w-4" /> Admin Dashboard
                        </Link>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <FaRightFromBracket className="w-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-amber-600 rounded-lg transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register"
                    className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-200 transition-all">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link to="/cart" className="relative p-2 text-gray-600">
                <FaCartShopping className="text-xl" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
              <button onClick={toggleMenu} className="p-2 text-gray-600 hover:text-amber-600 focus:outline-none" aria-label="Toggle menu">
                {isOpen ? <FaXmark className="text-2xl" /> : <FaBars className="text-2xl" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white/95 backdrop-blur-xl z-40 transform transition-transform duration-300 ease-out shadow-2xl lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-20 px-6">
          {/* User Info */}
          {isAuthenticated && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              {isAdmin && (
                <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors">
                  <FaUserShield /> Admin Dashboard
                </Link>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.link;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.link}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 text-base font-medium rounded-xl transition-all ${
                        isActive
                          ? "text-amber-700 bg-amber-50"
                          : "text-gray-700 hover:text-amber-600 hover:bg-gray-50"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}

              {isAuthenticated ? (
                <>
                  <li className="border-t border-gray-100 pt-2 mt-2">
                    <Link to="/profile" onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50 rounded-xl transition-all">
                      <FaUser className="text-gray-400 w-4" /> My Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/my-orders" onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50 rounded-xl transition-all">
                      <FaCartShopping className="text-gray-400 w-4" /> My Orders
                    </Link>
                  </li>
                  <li>
                    <button onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <FaRightFromBracket className="w-4" /> Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                  <Link to="/login" onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-4 py-3 text-base font-medium text-amber-600 border-2 border-amber-200 rounded-xl hover:bg-amber-50 transition-all">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all">
                    Sign Up
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="mt-auto mb-8">
            <div className="flex items-center bg-gray-100 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-amber-300 transition-all">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent py-3 px-5 w-full text-sm focus:outline-none"
              />
              <button type="submit" className="bg-amber-500 text-white p-3 px-4 hover:bg-amber-600 transition-colors" aria-label="Search">
                <FaMagnifyingGlass />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default NavBar;
