import React, { useState, useEffect } from "react";
import {
  FaTrash,
  FaMagnifyingGlass,
  FaSpinner,
  FaEnvelope,
  FaNewspaper,
  FaCircleCheck,
  FaCircleXmark,
  FaEye,
  FaXmark,
} from "react-icons/fa6";
import {
  getContactMessages,
  getNewsletterSubscriptions,
  updateContactStatus,
  deleteContactMessage,
  updateNewsletterStatus,
  deleteNewsletterSubscription,
} from "../../../services/api";
import { toast } from "react-hot-toast";

const AdminMessagesPage = () => {
  const [activeTab, setActiveTab] = useState("contact");
  const [contactMessages, setContactMessages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (activeTab === "contact") {
          const data = await getContactMessages();
          setContactMessages(data);
        } else {
          const data = await getNewsletterSubscriptions();
          setSubscriptions(data);
        }
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        toast.error(`Error loading data: ${err.toString()}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (activeTab === "contact") {
        await deleteContactMessage(confirmDelete);
        setContactMessages(
          contactMessages.filter((msg) => msg._id !== confirmDelete),
        );
        toast.success("Message deleted successfully");
      } else {
        await deleteNewsletterSubscription(confirmDelete);
        setSubscriptions(
          subscriptions.filter((sub) => sub._id !== confirmDelete),
        );
        toast.success("Subscription deleted successfully");
      }
      setConfirmDelete(null);
    } catch (err) {
      toast.error(`Failed to delete: ${err.toString()}`);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (activeTab === "contact") {
        await updateContactStatus(id, newStatus);
        setContactMessages(
          contactMessages.map((msg) =>
            msg._id === id ? { ...msg, status: newStatus } : msg,
          ),
        );
        toast.success("Status updated successfully");
      } else {
        await updateNewsletterStatus(id, newStatus);
        setSubscriptions(
          subscriptions.map((sub) =>
            sub._id === id ? { ...sub, status: newStatus } : sub,
          ),
        );
        toast.success("Status updated successfully");
      }
    } catch (err) {
      toast.error(`Failed to update status: ${err.toString()}`);
    }
  };

  const handleViewMessage = (message) => {
    setSelectedMessage(message);

    // If the message is new, automatically mark it as read
    if (message.status === "new") {
      handleStatusChange(message._id, "read");
    }
  };

  const closeMessageModal = () => {
    setSelectedMessage(null);
  };

  // Filter data based on search term and status filter
  const filteredContactMessages = contactMessages.filter((msg) => {
    const matchesSearch =
      msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && msg.status === statusFilter;
  });

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.email
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && sub.status === statusFilter;
  });

  // Format date
  const formatDate = (dateString) => {
    const options = { year: "numeric" as const, month: "short" as const, day: "numeric" as const };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Messages</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "contact"
                ? "text-amber-600 border-b-2 border-amber-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("contact")}
          >
            <FaEnvelope className="inline mr-2" /> Contact Messages
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "newsletter"
                ? "text-amber-600 border-b-2 border-amber-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("newsletter")}
          >
            <FaNewspaper className="inline mr-2" /> Newsletter Subscriptions
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={`Search ${
              activeTab === "contact" ? "messages" : "subscriptions"
            }...`}
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="all">All Status</option>
          {activeTab === "contact" ? (
            <>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
            </>
          ) : (
            <>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </>
          )}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-amber-600 text-4xl" />
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      ) : activeTab === "contact" ? (
        // Contact Messages Table
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContactMessages.length > 0 ? (
                  filteredContactMessages.map((message) => (
                    <tr key={message._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {message.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {message.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {message.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(message.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            message.status === "new"
                              ? "bg-blue-100 text-blue-800"
                              : message.status === "read"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {message.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewMessage(message)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Message"
                          >
                            <FaEye />
                          </button>
                          <select
                            value={message.status}
                            onChange={(e) =>
                              handleStatusChange(message._id, e.target.value)
                            }
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="new">New</option>
                            <option value="read">Read</option>
                            <option value="responded">Responded</option>
                          </select>
                          <button
                            onClick={() => handleDeleteClick(message._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Message"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No messages found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Newsletter Subscriptions Table
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Subscribed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription) => (
                    <tr key={subscription._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subscription.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscription.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscription.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleStatusChange(
                                subscription._id,
                                subscription.status === "active"
                                  ? "unsubscribed"
                                  : "active",
                              )
                            }
                            className={`${
                              subscription.status === "active"
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            }`}
                          >
                            {subscription.status === "active" ? (
                              <FaCircleXmark />
                            ) : (
                              <FaCircleCheck />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(subscription._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No subscriptions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this{" "}
              {activeTab === "contact" ? "message" : "subscription"}? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Message Details</h3>
              <button
                onClick={closeMessageModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaXmark className="text-xl" />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">From</p>
                <p className="font-medium">{selectedMessage.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-medium">{selectedMessage.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-medium">
                  {formatDate(selectedMessage.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedMessage.status === "new"
                        ? "bg-blue-100 text-blue-800"
                        : selectedMessage.status === "read"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {selectedMessage.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Subject</p>
              <p className="font-medium text-lg">{selectedMessage.subject}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Message</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>

            <div className="flex justify-between">
              <div>
                <select
                  value={selectedMessage.status}
                  onChange={(e) => {
                    handleStatusChange(selectedMessage._id, e.target.value);
                    setSelectedMessage({
                      ...selectedMessage,
                      status: e.target.value,
                    });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="responded">Responded</option>
                </select>
              </div>
              <div className="space-x-3">
                <button
                  onClick={closeMessageModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDeleteClick(selectedMessage._id);
                    closeMessageModal();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessagesPage;
