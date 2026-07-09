import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaGauge,
  FaDog,
  FaBoxOpen,
  FaBlog,
  FaUsers,
  FaCartShopping,
  FaEnvelope,
  FaBars,
  FaRightFromBracket,
  FaArrowLeft,
  FaClipboardList,
} from "react-icons/fa6";
import { useAuth } from "../../context/AuthContext";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: <FaGauge />, path: "/admin/dashboard" },
    { name: "Breeds", icon: <FaDog />, path: "/admin/breeds" },
    { name: "Accessories", icon: <FaBoxOpen />, path: "/admin/accessories" },
    { name: "Blogs", icon: <FaBlog />, path: "/admin/blogs" },
    { name: "Users", icon: <FaUsers />, path: "/admin/users" },
    { name: "Orders", icon: <FaCartShopping />, path: "/admin/orders" },
    { name: "Messages", icon: <FaEnvelope />, path: "/admin/messages" },
    { name: "Audit Logs", icon: <FaClipboardList />, path: "/admin/audit-logs" },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-gray-800 text-white flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 ease-in-out hidden md:block`}
      >
        <div className="p-4 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center">
            <img
              src="/main-logo.png"
              alt="Pawstore Logo"
              className="w-10 h-10"
            />
            {sidebarOpen && (
              <span className="ml-2 font-semibold text-lg">Admin Panel</span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="text-white focus:outline-none"
          >
            <FaBars />
          </button>
        </div>

        <nav className="mt-6 flex-1">
          <ul>
            {menuItems.map((item) => (
              <li key={item.name} className="mb-2">
                <Link
                  to={item.path}
                  className={`flex items-center py-3 px-4 ${
                    location.pathname === item.path
                      ? "bg-gray-700 text-amber-400"
                      : "hover:bg-gray-700"
                  } transition-colors`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {sidebarOpen && <span className="ml-3">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Back to Website & Logout */}
        <div className="p-4 border-t border-gray-700">
          <Link
            to="/"
            className={`flex items-center py-2 px-4 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
          >
            <FaArrowLeft />
            {sidebarOpen && <span className="ml-3">Back to Website</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center py-2 px-4 mt-1 cursor-pointer text-red-400 hover:bg-gray-700 rounded-md transition-colors w-full ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
          >
            <FaRightFromBracket />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${
          mobileMenuOpen ? "block" : "hidden"
        }`}
        onClick={toggleMobileMenu}
      ></div>

      <aside
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 z-30 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center">
            <img
              src="/main-logo.png"
              alt="Pawstore Logo"
              className="w-10 h-10"
            />
            <span className="ml-2 font-semibold text-lg">Admin Panel</span>
          </Link>
          <button
            onClick={toggleMobileMenu}
            className="text-white focus:outline-none"
          >
            <FaBars />
          </button>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto">
          <ul>
            {menuItems.map((item) => (
              <li key={item.name} className="mb-2">
                <Link
                  to={item.path}
                  className={`flex items-center py-3 px-4 ${
                    location.pathname === item.path
                      ? "bg-gray-700 text-amber-400"
                      : "hover:bg-gray-700"
                  } transition-colors`}
                  onClick={toggleMobileMenu}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="ml-3">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <Link
            to="/"
            className="flex items-center py-2 px-4 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
            onClick={toggleMobileMenu}
          >
            <FaArrowLeft />
            <span className="ml-3">Back to Website</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center py-2 px-4 mt-1 text-red-400 hover:bg-gray-700 rounded transition-colors w-full"
          >
            <FaRightFromBracket />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 focus:outline-none md:hidden"
            >
              <FaBars />
            </button>

            <div className="flex items-center">
              <div className="relative">
                <div className="flex items-center cursor-pointer">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-2">
                    <span className="font-semibold text-amber-600">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium">{user?.name}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
