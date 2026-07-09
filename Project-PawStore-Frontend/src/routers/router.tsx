import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/Home/HomePage";
import BreedsPage from "../pages/Breeds/BreedsPage";
import BreedDetailPage from "../pages/Breeds/BreedDetailPage";
import AccessoriesPage from "../pages/Accessories/AccessoriesPage";
import BlogPage from "../pages/Blog/BlogPage";
import BlogDetailPage from "../pages/Blog/BlogDetailPage";
import ContactPage from "../pages/Contact/ContactPage";
import LoginPage from "../pages/Auth/LoginPage";
import RegisterPage from "../pages/Auth/RegisterPage";
import ForgotPasswordPage from "../pages/Auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import CartPage from "../pages/Cart/CartPage";
import CheckoutPage from "../pages/Checkout/CheckoutPage";
import OrderConfirmationPage from "../pages/Checkout/OrderConfirmationPage";
import UserOrdersPage from "../pages/User/UserOrdersPage";
import ProfilePage from "../pages/User/ProfilePage";
import SearchResultsPage from "../pages/Search/SearchResultsPage";
import AdminLayout from "../pages/Admin/AdminLayout";
import AdminDashboard from "../pages/Admin/Dashboard/AdminDashboard";
import AdminBreedsPage from "../pages/Admin/Breeds/AdminBreedsPage";
import BreedForm from "../pages/Admin/Breeds/BreedForm";
import AdminAccessoriesPage from "../pages/Admin/Accessories/AdminAccessoriesPage";
import AccessoryForm from "../pages/Admin/Accessories/AccessoryForm";
import AdminBlogsPage from "../pages/Admin/Blogs/AdminBlogsPage";
import BlogForm from "../pages/Admin/Blogs/BlogForm";
import AdminUsersPage from "../pages/Admin/Users/AdminUsersPage";
import UserForm from "../pages/Admin/Users/UserForm";
import AdminOrdersPage from "../pages/Admin/Orders/AdminOrdersPage";
import OrderDetailPage from "../pages/Admin/Orders/OrderDetailPage";
import AdminMessagesPage from "../pages/Admin/Messages/AdminMessagesPage";
import AdminAuditLogs from "../pages/Admin/AuditLogs/AdminAuditLogs";
import ProtectedRoute from "../components/ProtectedRoute";

const router = createBrowserRouter([
  //Users View Route
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/breeds", element: <BreedsPage /> },
      { path: "/breeds/:id", element: <BreedDetailPage /> },
      { path: "/accessories", element: <AccessoriesPage /> },
      { path: "/blog", element: <BlogPage /> },
      { path: "/blog/:id", element: <BlogDetailPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/search", element: <SearchResultsPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/cart", element: <CartPage /> },
      {
        path: "/checkout",
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/order-confirmation/:id",
        element: (
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/my-orders",
        element: (
          <ProtectedRoute>
            <UserOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Admin Routes
  {
    path: "/admin",
    element: (
      <ProtectedRoute adminOnly={true}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <AdminDashboard /> },

      // Breeds Management
      { path: "breeds", element: <AdminBreedsPage /> },
      { path: "breeds/new", element: <BreedForm /> },
      { path: "breeds/edit/:id", element: <BreedForm /> },

      // Accessories Management
      { path: "accessories", element: <AdminAccessoriesPage /> },
      { path: "accessories/new", element: <AccessoryForm /> },
      { path: "accessories/edit/:id", element: <AccessoryForm /> },

      // Blogs Management
      { path: "blogs", element: <AdminBlogsPage /> },
      { path: "blogs/new", element: <BlogForm /> },
      { path: "blogs/edit/:id", element: <BlogForm /> },

      // Users Management
      { path: "users", element: <AdminUsersPage /> },
      { path: "users/edit/:id", element: <UserForm /> },

      // Orders Management
      { path: "orders", element: <AdminOrdersPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },

      // Messages Management
      { path: "messages", element: <AdminMessagesPage /> },

      // Audit Logs
      { path: "audit-logs", element: <AdminAuditLogs /> },
    ],
  },
]);

export default router;
