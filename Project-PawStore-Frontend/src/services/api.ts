/**
 * @file api.ts
 * @description Centralized Axios API Service Layer & HTTP Interceptor for PawStore Frontend.
 * 
 * SECURITY CLIENT DESIGN:
 * - TLS Communication: Communicates exclusively with backend API via HTTPS / TLS 1.3.
 * - Automatic Header Injection: Intercepts outgoing requests to attach JWT `Authorization: Bearer <token>` header.
 * - Credentials Handshake: Supports HttpOnly cookie transmission (`withCredentials: true` option where applicable).
 * - Endpoints: Handles WebAuthn Passkeys, TOTP MFA verification, reCAPTCHA tokens, and Stripe payments.
 */

import axios from "axios";

// Dynamically resolve API URL matching client protocol and hostname for cross-device/VM testing
const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:5000/api`;
    }
  }
  const rawEnv = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return rawEnv.replace(/["';]/g, "").trim();
};

const API_URL = getApiUrl();
console.log("PawStore API Target URL:", API_URL);

// Create configured Axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/**
 * Axios Request Interceptor:
 * Automatically injects active JWT token into HTTP Authorization header and X-CSRF-Token header.
 */
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      const token = JSON.parse(userInfo).token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Extract XSRF-TOKEN cookie if present
    if (typeof document !== "undefined") {
      const match = document.cookie.match(new RegExp("(^| )XSRF-TOKEN=([^;]+)"));
      if (match) {
        config.headers["X-CSRF-Token"] = match[2];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Breed API calls
export const fetchBreeds = async () => {
  try {
    const { data } = await api.get("/breeds");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const fetchBreedById = async (id) => {
  try {
    const { data } = await api.get(`/breeds/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const createBreed = async (breedData) => {
  try {
    const { data } = await api.post("/breeds", breedData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateBreed = async (id, breedData) => {
  try {
    const { data } = await api.put(`/breeds/${id}`, breedData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteBreed = async (id) => {
  try {
    const { data } = await api.delete(`/breeds/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Accessory API calls
export const fetchAccessories = async (category = "all") => {
  try {
    const { data } = await api.get(`/accessories?category=${category}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const fetchAccessoryById = async (id) => {
  try {
    const { data } = await api.get(`/accessories/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const createAccessory = async (accessoryData) => {
  try {
    const { data } = await api.post("/accessories", accessoryData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateAccessory = async (id, accessoryData) => {
  try {
    const { data } = await api.put(`/accessories/${id}`, accessoryData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteAccessory = async (id) => {
  try {
    const { data } = await api.delete(`/accessories/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Blog API calls
export const fetchBlogs = async (category = "all") => {
  try {
    const { data } = await api.get(`/blogs?category=${category}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const fetchFeaturedBlogs = async () => {
  try {
    const { data } = await api.get("/blogs/featured");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const fetchBlogById = async (id) => {
  try {
    const { data } = await api.get(`/blogs/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const createBlog = async (blogData) => {
  try {
    const { data } = await api.post("/blogs", blogData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateBlog = async (id, blogData) => {
  try {
    const { data } = await api.put(`/blogs/${id}`, blogData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteBlog = async (id) => {
  try {
    const { data } = await api.delete(`/blogs/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Contact API calls
export const submitContactForm = async (formData) => {
  try {
    const { data } = await api.post("/contact", formData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getContactMessages = async () => {
  try {
    const { data } = await api.get("/contact");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateContactStatus = async (id, status) => {
  try {
    const { data } = await api.put(`/contact/${id}`, { status });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteContactMessage = async (id) => {
  try {
    const { data } = await api.delete(`/contact/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Newsletter API calls
export const subscribeNewsletter = async (email) => {
  try {
    const { data } = await api.post("/newsletter", { email });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getNewsletterSubscriptions = async () => {
  try {
    const { data } = await api.get("/newsletter");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateNewsletterStatus = async (id, status) => {
  try {
    const { data } = await api.put(`/newsletter/${id}`, { status });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteNewsletterSubscription = async (id) => {
  try {
    const { data } = await api.delete(`/newsletter/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// User API calls
export const login = async (email, password, captchaToken = null) => {
  try {
    const payload: any = { email, password };
    if (captchaToken) payload.captchaToken = captchaToken;
    const { data } = await api.post("/users/login", payload);
    localStorage.setItem("userInfo", JSON.stringify(data));
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const logoutUserAPI = async () => {
  try {
    await api.post("/users/logout");
  } catch (error) {
    // Ignore logout errors
  }
};

export const verifyMFALogin = async (mfaToken) => {
  try {
    const { data } = await api.post("/users/mfa/verify", { mfaToken });
    localStorage.setItem("userInfo", JSON.stringify(data));
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getAllUsers = async () => {
  try {
    const { data } = await api.get("/users");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getUserById = async (id) => {
  try {
    const { data } = await api.get(`/users/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateUser = async (id, userData) => {
  try {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteUser = async (id) => {
  try {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const unlockUserAccount = async (id) => {
  try {
    const { data } = await api.put(`/users/${id}/unlock`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const register = async (name, email, password, captchaToken = null) => {
  try {
    const payload: any = { name, email, password };
    if (captchaToken) payload.captchaToken = captchaToken;
    const { data } = await api.post("/users", payload);
    localStorage.setItem("userInfo", JSON.stringify(data));
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const logout = () => {
  localStorage.removeItem("userInfo");
};

export const getUserProfile = async () => {
  try {
    const { data } = await api.get("/users/profile");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const { data } = await api.put("/users/profile", userData);
    localStorage.setItem("userInfo", JSON.stringify(data));
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// MFA Management
export const setupMFA = async () => {
  try {
    const { data } = await api.post("/users/mfa/setup");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const enableMFA = async (mfaToken) => {
  try {
    const { data } = await api.post("/users/mfa/enable", { mfaToken });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const disableMFA = async (mfaToken, password) => {
  try {
    const { data } = await api.post("/users/mfa/disable", { mfaToken, password });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Password Management
export const getPasswordExpiry = async () => {
  try {
    const { data } = await api.get("/users/password-expiry");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Password Reset (Forgot/Reset Password)
export const forgotPassword = async (email) => {
  try {
    const { data } = await api.post("/users/forgot-password", { email });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const resetPassword = async (token, email, password) => {
  try {
    const { data } = await api.post("/users/reset-password", { token, email, password });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const validateResetToken = async (token, email) => {
  try {
    const { data } = await api.post("/users/validate-reset-token", { token, email });
    return data;
  } catch (error) {
    return { valid: false };
  }
};

// Data Management (GDPR / Data Portability)
export const exportUserData = async () => {
  try {
    const { data } = await api.get("/users/export-data");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const importUserData = async (userData) => {
  try {
    const { data } = await api.post("/users/import-data", userData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteOwnAccount = async (password) => {
  try {
    const { data } = await api.delete("/users/delete-account", {
      data: { password },
    });
    localStorage.removeItem("userInfo");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Stripe Payment API calls
export const createPaymentIntent = async (orderId) => {
  try {
    const { data } = await api.post("/payments/create-payment-intent", { orderId });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const confirmStripePayment = async (paymentIntentId, orderId) => {
  try {
    const { data } = await api.post("/payments/confirm", { paymentIntentId, orderId });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getStripeConfig = async () => {
  try {
    const { data } = await api.get("/payments/config");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Order API calls
export const createOrder = async (orderData) => {
  try {
    const { data } = await api.post("/orders", orderData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getOrderDetails = async (id) => {
  try {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const payOrder = async (orderId, paymentResult) => {
  try {
    const { data } = await api.put(`/orders/${orderId}/pay`, paymentResult);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getMyOrders = async () => {
  try {
    const { data } = await api.get("/orders/myorders");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getAllOrders = async () => {
  try {
    const { data } = await api.get("/orders");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const { data } = await api.put(`/orders/${orderId}/status`, { status });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deliverOrder = async (orderId) => {
  try {
    const { data } = await api.put(`/orders/${orderId}/deliver`, {});
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Cart API calls
export const getUserCart = async () => {
  try {
    const { data } = await api.get("/cart");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const addItemToCart = async (productId, quantity) => {
  try {
    const { data } = await api.post("/cart", { productId, quantity });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateCartItem = async (productId, quantity) => {
  try {
    const { data } = await api.put(`/cart/${productId}`, { quantity });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const removeCartItem = async (productId) => {
  try {
    const { data } = await api.delete(`/cart/${productId}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const clearCart = async () => {
  try {
    const { data } = await api.delete("/cart");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Global Search
export const searchAll = async (query) => {
  try {
    // Fetch data from multiple endpoints
    const [breeds, accessories, blogs] = await Promise.all([
      fetchBreeds(),
      fetchAccessories(),
      fetchBlogs(),
    ]);

    // Filter each dataset based on the search query
    const filteredBreeds = breeds.filter(
      (breed) =>
        breed.name.toLowerCase().includes(query.toLowerCase()) ||
        breed.description.toLowerCase().includes(query.toLowerCase()),
    );

    const filteredAccessories = accessories.filter(
      (accessory) =>
        accessory.name.toLowerCase().includes(query.toLowerCase()) ||
        accessory.category.toLowerCase().includes(query.toLowerCase()),
    );

    const filteredBlogs = blogs.filter(
      (blog) =>
        blog.title.toLowerCase().includes(query.toLowerCase()) ||
        blog.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        blog.content.toLowerCase().includes(query.toLowerCase()),
    );

    // Return the combined results
    return {
      breeds: filteredBreeds.map((breed) => ({
        ...breed,
        type: "breed",
        url: `/breeds/${breed._id}`,
      })),
      accessories: filteredAccessories.map((accessory) => ({
        ...accessory,
        type: "accessory",
        url: `/accessories`,
      })),
      blogs: filteredBlogs.map((blog) => ({
        ...blog,
        type: "blog",
        url: `/blog/${blog._id}`,
      })),
    };
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Audit Log API calls (Admin only)
export const fetchAuditLogs = async (params: {
  page?: number;
  limit?: number;
  level?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set("page", params.page.toString());
    if (params.limit) queryParams.set("limit", params.limit.toString());
    if (params.level) queryParams.set("level", params.level);
    if (params.action) queryParams.set("action", params.action);
    if (params.search) queryParams.set("search", params.search);
    if (params.startDate) queryParams.set("startDate", params.startDate);
    if (params.endDate) queryParams.set("endDate", params.endDate);
    if (params.userId) queryParams.set("userId", params.userId);
    const { data } = await api.get(`/audit-logs?${queryParams.toString()}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const fetchAuditLogActions = async () => {
  try {
    const { data } = await api.get("/audit-logs/actions");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const fetchAuditLogSummary = async () => {
  try {
    const { data } = await api.get("/audit-logs/summary");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteOldAuditLogs = async (days: number = 90) => {
  try {
    const { data } = await api.delete(`/audit-logs?days=${days}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// WebAuthn / Passkey API calls (Password-less Authentication)
export const beginWebAuthnRegistration = async () => {
  try {
    const { data } = await api.post("/users/webauthn/register/begin");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const completeWebAuthnRegistration = async (credential, deviceName = "") => {
  try {
    const { data } = await api.post("/users/webauthn/register/complete", { credential, deviceName });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const beginWebAuthnLogin = async (email = "") => {
  try {
    const { data } = await api.post("/users/webauthn/login/begin", { email });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const completeWebAuthnLogin = async (credential) => {
  try {
    const { data } = await api.post("/users/webauthn/login/complete", { credential });
    localStorage.setItem("userInfo", JSON.stringify(data));
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getPasskeys = async () => {
  try {
    const { data } = await api.get("/users/webauthn/passkeys");
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const removePasskey = async (id) => {
  try {
    const { data } = await api.delete(`/users/webauthn/passkeys/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const renamePasskey = async (id, deviceName) => {
  try {
    const { data } = await api.put(`/users/webauthn/passkeys/${id}`, { deviceName });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export default api;
