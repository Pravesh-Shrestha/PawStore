import React, { useState, useEffect, useCallback } from "react";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaShieldAlt,
  FaBug,
  FaChevronLeft,
  FaChevronRight,
  FaTrashAlt,
  FaSpinner,
} from "react-icons/fa";
import {
  fetchAuditLogs,
  fetchAuditLogSummary,
  deleteOldAuditLogs,
} from "../../../services/api";

interface LogEntry {
  _id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SECURITY";
  action: string;
  userId: string;
  userName: string;
  userEmail: string;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  statusCode: number;
  duration: string;
  details: Record<string, any>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Summary {
  totalLogs: number;
  todayCount: number;
  weekCount: number;
  byLevel: Record<string, number>;
  topActions: { _id: string; count: number }[];
}

const levelConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  INFO: {
    label: "Info",
    color: "bg-blue-100 text-blue-800",
    icon: <FaInfoCircle />,
  },
  WARN: {
    label: "Warning",
    color: "bg-yellow-100 text-yellow-800",
    icon: <FaExclamationTriangle />,
  },
  ERROR: {
    label: "Error",
    color: "bg-red-100 text-red-800",
    icon: <FaBug />,
  },
  SECURITY: {
    label: "Security",
    color: "bg-purple-100 text-purple-800",
    icon: <FaShieldAlt />,
  },
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDays, setDeleteDays] = useState(90);
  const [deleting, setDeleting] = useState(false);

  // Selected log detail
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = { page: currentPage, limit: 50 };
      if (levelFilter) params.level = levelFilter;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await fetchAuditLogs(params);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [currentPage, levelFilter, search, startDate, endDate]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchAuditLogSummary();
      setSummary(data);
    } catch {
      // Silently fail - summary is non-critical
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadLogs();
  };

  const handleFilterChange = (level: string) => {
    setLevelFilter(level === levelFilter ? "" : level);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setLevelFilter("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleDeleteOldLogs = async () => {
    setDeleting(true);
    try {
      const result = await deleteOldAuditLogs(deleteDays);
      alert(result.message);
      setShowDeleteModal(false);
      loadLogs();
      loadSummary();
    } catch (err: any) {
      alert(err.message || "Failed to delete old logs");
    } finally {
      setDeleting(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getLevelBadge = (level: string) => {
    const config = levelConfig[level] || levelConfig.INFO;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getStatusCodeBadge = (code: number) => {
    if (!code) return null;
    const color =
      code >= 500
        ? "bg-red-100 text-red-800"
        : code >= 400
          ? "bg-yellow-100 text-yellow-800"
          : "bg-green-100 text-green-800";
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {code}
      </span>
    );
  };

  const formatDuration = (duration: string) => {
    if (!duration) return "";
    const ms = parseInt(duration);
    if (isNaN(ms)) return duration;
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms}ms`;
  };

  /**
   * Map raw action strings to human-readable names
   */
  const getActionName = (action: string, method: string, url: string): string => {
    // System/programmatic actions (uppercase with underscores)
    const systemActions: Record<string, string> = {
      LOGIN_SUCCESS: "Login Successful",
      LOGIN_FAILED_USER_NOT_FOUND: "Login Failed — Unknown User",
      LOGIN_FAILED_WRONG_PASSWORD: "Login Failed — Wrong Password",
      LOGIN_LOCKED_ACCOUNT: "Login Blocked — Account Locked",
      LOGIN_MISSING_FIELDS: "Login Failed — Missing Fields",
      LOGIN_INACTIVE_ACCOUNT: "Login Blocked — Inactive Account",
      LOGIN_PASSWORD_EXPIRED: "Login — Password Expired",
      AUTH_NO_TOKEN: "Auth Failed — No Token",
      AUTH_USER_NOT_FOUND: "Auth Failed — User Not Found",
      AUTH_INACTIVE_ACCOUNT: "Auth Failed — Inactive Account",
      AUTH_LOCKED_ACCOUNT: "Auth Failed — Account Locked",
      AUTH_PASSWORD_EXPIRED: "Auth Failed — Password Expired",
      AUTH_SESSION_INVALIDATED: "Auth — Session Invalidated",
      AUTH_SESSION_USER_AGENT_MISMATCH: "Auth — Session Mismatch",
      AUTH_INVALID_TOKEN: "Auth Failed — Invalid Token",
      AUTH_EXPIRED_TOKEN: "Auth Failed — Expired Token",
      MFA_ENABLED: "MFA Enabled",
      MFA_DISABLED: "MFA Disabled",
      MFA_DISABLE_FAILED_WRONG_PASSWORD: "MFA Disable Failed — Wrong Password",
      MFA_DISABLE_FAILED_WRONG_TOKEN: "MFA Disable Failed — Wrong Token",
      PASSWORD_CHANGED: "Password Changed",
      ACCOUNT_DELETED: "Account Deleted",
      ADMIN_DELETED_USER: "Admin Deleted User",
      ADMIN_UNLOCKED_USER: "Admin Unlocked User",
      ORDER_CREATED: "Order Created",
      ORDER_CREATE_NO_ITEMS: "Order Failed — No Items",
      ORDER_CREATE_PRODUCT_NOT_FOUND: "Order Failed — Product Not Found",
      ORDER_CREATE_INSUFFICIENT_STOCK: "Order Failed — Insufficient Stock",
      PAYMENT_INTENT_FAILED: "Payment Failed",
      WEBHOOK_SIGNATURE_INVALID: "Webhook — Invalid Signature",
      WEBHOOK_STOCK_INSUFFICIENT: "Webhook — Insufficient Stock",
      STOCK_INSUFFICIENT_ON_PAYMENT: "Payment — Insufficient Stock",
    };

    if (systemActions[action]) return systemActions[action];

    // HTTP route-based actions
    const routeMap: Record<string, string> = {
      "GET /": "Home Page",
      "GET /api/breeds": "View Breeds",
      "GET /api/accessories": "View Accessories",
      "GET /api/blogs": "View Blogs",
      "GET /api/blogs/featured": "View Featured Blogs",
      "GET /api/users": "View Users",
      "GET /api/users/profile": "View Profile",
      "GET /api/users/password-expiry": "Check Password Expiry",
      "GET /api/users/export-data": "Export User Data",
      "GET /api/orders": "View Orders",
      "GET /api/orders/myorders": "View My Orders",
      "GET /api/cart": "View Cart",
      "GET /api/contact": "View Messages",
      "GET /api/newsletter": "View Subscribers",
      "GET /api/monitoring/events": "View Monitoring Events",
      "GET /api/monitoring/summary": "View Monitoring Summary",
      "GET /api/monitoring/logs": "View Audit Files",
      "GET /api/audit-logs": "View Audit Logs",
      "GET /api/audit-logs/summary": "View Audit Summary",
      "GET /api/audit-logs/actions": "View Audit Actions",
      "GET /api/payments/config": "View Payment Config",
      "POST /api/users/login": "User Login",
      "POST /api/users": "User Registration",
      "POST /api/users/logout": "User Logout",
      "POST /api/users/mfa/setup": "MFA Setup",
      "POST /api/users/mfa/enable": "MFA Enable",
      "POST /api/users/mfa/disable": "MFA Disable",
      "POST /api/users/mfa/verify": "MFA Verify",
      "POST /api/users/change-password": "Change Password",
      "POST /api/users/import-data": "Import User Data",
      "POST /api/orders": "Create Order",
      "POST /api/cart": "Add to Cart",
      "POST /api/contact": "Submit Contact",
      "POST /api/newsletter": "Newsletter Subscribe",
      "POST /api/breeds": "Create Breed",
      "POST /api/accessories": "Create Accessory",
      "POST /api/blogs": "Create Blog",
      "POST /api/payments/create-payment-intent": "Create Payment",
      "POST /api/payments/confirm": "Confirm Payment",
      "PUT /api/users/profile": "Update Profile",
      "PUT /api/cart": "Update Cart",
      "PUT /api/contact": "Update Message",
      "PUT /api/newsletter": "Update Subscription",
      "DELETE /api/cart": "Clear Cart",
      "DELETE /api/audit-logs": "Cleanup Audit Logs",
      "DELETE /api/users/delete-account": "Delete My Account",
    };

    // Try exact match first
    const routeKey = `${method} ${url}`;
    if (routeMap[routeKey]) return routeMap[routeKey];

    // Try matching just the method + base path (strip query params and trailing IDs)
    const basePath = url.split("?")[0];
    const parts = basePath.split("/");
    // Try matching progressively shorter paths
    for (let i = parts.length; i >= 2; i--) {
      const partial = parts.slice(0, i).join("/");
      const key = `${method} ${partial}`;
      if (routeMap[key]) return routeMap[key];
    }

    // Handle param-based routes (e.g., PUT /api/users/:id, PUT /api/orders/:id/status)
    const paramPatterns: { pattern: RegExp; name: string }[] = [
      { pattern: /^GET \/api\/breeds\/(.+)$/, name: "View Breed Detail" },
      { pattern: /^PUT \/api\/breeds\/(.+)$/, name: "Update Breed" },
      { pattern: /^DELETE \/api\/breeds\/(.+)$/, name: "Delete Breed" },
      { pattern: /^GET \/api\/accessories\/(.+)$/, name: "View Accessory Detail" },
      { pattern: /^PUT \/api\/accessories\/(.+)$/, name: "Update Accessory" },
      { pattern: /^DELETE \/api\/accessories\/(.+)$/, name: "Delete Accessory" },
      { pattern: /^GET \/api\/blogs\/(.+)$/, name: "View Blog Detail" },
      { pattern: /^PUT \/api\/blogs\/(.+)$/, name: "Update Blog" },
      { pattern: /^DELETE \/api\/blogs\/(.+)$/, name: "Delete Blog" },
      { pattern: /^GET \/api\/users\/(.+)$/, name: "View User Detail" },
      { pattern: /^PUT \/api\/users\/(.+)\/unlock$/, name: "Unlock User" },
      { pattern: /^PUT \/api\/users\/(.+)$/, name: "Update User" },
      { pattern: /^DELETE \/api\/users\/(.+)$/, name: "Delete User" },
      { pattern: /^GET \/api\/orders\/(.+)$/, name: "View Order Detail" },
      { pattern: /^PUT \/api\/orders\/(.+)\/pay$/, name: "Order Payment" },
      { pattern: /^PUT \/api\/orders\/(.+)\/deliver$/, name: "Order Delivery" },
      { pattern: /^PUT \/api\/orders\/(.+)\/status$/, name: "Update Order Status" },
      { pattern: /^PUT \/api\/cart\/(.+)$/, name: "Update Cart Item" },
      { pattern: /^DELETE \/api\/cart\/(.+)$/, name: "Remove from Cart" },
      { pattern: /^PUT \/api\/contact\/(.+)$/, name: "Update Message" },
      { pattern: /^DELETE \/api\/contact\/(.+)$/, name: "Delete Message" },
      { pattern: /^PUT \/api\/newsletter\/(.+)$/, name: "Update Subscription" },
      { pattern: /^DELETE \/api\/newsletter\/(.+)$/, name: "Delete Subscription" },
    ];

    const fullRoute = `${method} ${basePath}`;
    for (const { pattern, name } of paramPatterns) {
      if (pattern.test(fullRoute)) return name;
    }

    // Fallback: derive name from the action string
    return action
      .replace(/^(GET|POST|PUT|DELETE|PATCH) \//, "")
      .replace(/\//g, " ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || action;
  };

  const getShortId = (id: string) => id.substring(id.length - 8).toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track all user activities and security events
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FaFilter />
            Filters
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <FaTrashAlt className="text-sm" />
            Cleanup
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold mt-1">{summary.totalLogs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Today</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{summary.todayCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">This Week</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600">{summary.weekCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Errors</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {summary.byLevel.ERROR || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Warnings</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">
              {summary.byLevel.WARN || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Security</p>
            <p className="text-2xl font-bold mt-1 text-purple-600">
              {summary.byLevel.SECURITY || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search action, user, email, IP..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </form>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              onClick={handleSearch}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Level Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(levelConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              levelFilter === key
                ? `${config.color} ring-2 ring-offset-1 ring-${key === "INFO" ? "blue" : key === "WARN" ? "yellow" : key === "ERROR" ? "red" : "purple"}-400`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {config.icon}
            {config.label}
          </button>
        ))}
        {levelFilter && (
          <button
            onClick={() => setLevelFilter("")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <FaTimes />
            Clear
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <>
          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <FaSearch className="text-gray-300 text-2xl" />
                          <p>No audit logs found</p>
                          <p className="text-sm text-gray-400">
                            Try adjusting your filters or create some activity
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedLog(selectedLog?._id === log._id ? null : log)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500">
                          {getShortId(log._id)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getLevelBadge(log.level)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {log.userName || "Anonymous"}
                          </div>
                          {log.userEmail && (
                            <div className="text-xs text-gray-500">{log.userEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 max-w-[240px] truncate">
                          {getActionName(log.action, log.method, log.url)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell font-mono">
                          {log.ip}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Expanded Detail Row */}
            {selectedLog && (
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Action</p>
                    <p className="font-medium">{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">URL</p>
                    <p className="font-medium break-all">{selectedLog.url || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Level</p>
                    <p className="font-medium">{getLevelBadge(selectedLog.level)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User ID</p>
                    <p className="font-medium font-mono text-xs">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">IP Address</p>
                    <p className="font-medium font-mono">{selectedLog.ip}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User Agent</p>
                    <p className="font-medium text-xs truncate" title={selectedLog.userAgent}>
                      {selectedLog.userAgent?.length > 40
                        ? selectedLog.userAgent.substring(0, 40) + "..."
                        : selectedLog.userAgent}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Timestamp</p>
                    <p className="font-medium">{formatTimestamp(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status Code</p>
                    <p className="font-medium">{getStatusCodeBadge(selectedLog.statusCode)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Duration</p>
                    <p className="font-medium">{formatDuration(selectedLog.duration)}</p>
                  </div>
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-500 text-sm mb-2">Details Payload</p>
                    <pre className="bg-gray-800 text-green-300 p-4 rounded-lg overflow-x-auto text-xs max-h-60">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft className="text-sm" />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-amber-500 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!pagination.hasNextPage}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight className="text-sm" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Old Logs Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Clean Up Old Audit Logs</h3>
            <p className="text-gray-500 text-sm mb-4">
              Delete audit logs older than a specified number of days. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delete logs older than (days)
              </label>
              <input
                type="number"
                value={deleteDays}
                onChange={(e) => setDeleteDays(parseInt(e.target.value) || 90)}
                min={1}
                max={365}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOldLogs}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Logs"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
