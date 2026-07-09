import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaSpinner,
  FaArrowLeft,
  FaCheck,
  FaTruck,
  FaBoxOpen,
  FaBan,
} from "react-icons/fa6";
import {
  getOrderDetails,
  updateOrderStatus,
  deliverOrder,
} from "../../../services/api";
import { toast } from "react-hot-toast";

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const data = await getOrderDetails(id);
        setOrder(data);
        setLoading(false);
      } catch (err) {
        setError(err.toString());
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleStatusUpdate = async (status) => {
    try {
      setProcessing(true);
      await updateOrderStatus(id, status);

      // Update local state
      setOrder((prev) => ({
        ...prev,
        status,
      }));

      toast.success(`Order status updated to ${status}`);
      setProcessing(false);
    } catch (err) {
      toast.error(`Failed to update order status: ${err.toString()}`);
      setProcessing(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    try {
      setProcessing(true);
      await deliverOrder(id);

      // Update local state
      setOrder((prev) => ({
        ...prev,
        isDelivered: true,
        deliveredAt: new Date().toISOString(),
        status: "Delivered",
      }));

      toast.success("Order marked as delivered");
      setProcessing(false);
    } catch (err) {
      toast.error(`Failed to mark order as delivered: ${err.toString()}`);
      setProcessing(false);
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-amber-600 text-4xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => navigate("/admin/orders")}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-yellow-50 text-yellow-600 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
        <p>The requested order could not be found.</p>
        <button
          onClick={() => navigate("/admin/orders")}
          className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/orders"
          className="inline-flex items-center text-amber-600 hover:text-amber-700"
        >
          <FaArrowLeft className="mr-2" /> Back to Orders
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          Order #{order._id.substring(order._id.length - 8).toUpperCase()}
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleStatusUpdate("Processing")}
            disabled={processing || order.status === "Processing"}
            className={`px-3 py-1 rounded-lg flex items-center text-sm ${
              order.status === "Processing"
                ? "bg-yellow-100 text-yellow-800 cursor-default"
                : "bg-yellow-500 text-white hover:bg-yellow-600"
            } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FaBoxOpen className="mr-1" /> Processing
          </button>
          <button
            onClick={() => handleStatusUpdate("Shipped")}
            disabled={
              processing ||
              order.status === "Shipped" ||
              order.status === "Delivered"
            }
            className={`px-3 py-1 rounded-lg flex items-center text-sm ${
              order.status === "Shipped"
                ? "bg-blue-100 text-blue-800 cursor-default"
                : "bg-blue-500 text-white hover:bg-blue-600"
            } ${processing || order.status === "Delivered" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FaTruck className="mr-1" /> Shipped
          </button>
          <button
            onClick={handleMarkAsDelivered}
            disabled={processing || order.status === "Delivered"}
            className={`px-3 py-1 rounded-lg flex items-center text-sm ${
              order.status === "Delivered"
                ? "bg-green-100 text-green-800 cursor-default"
                : "bg-green-500 text-white hover:bg-green-600"
            } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FaCheck className="mr-1" /> Delivered
          </button>
          <button
            onClick={() => handleStatusUpdate("Cancelled")}
            disabled={
              processing ||
              order.status === "Cancelled" ||
              order.status === "Delivered"
            }
            className={`px-3 py-1 rounded-lg flex items-center text-sm ${
              order.status === "Cancelled"
                ? "bg-red-100 text-red-800 cursor-default"
                : "bg-red-500 text-white hover:bg-red-600"
            } ${processing || order.status === "Delivered" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FaBan className="mr-1" /> Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium">{order._id}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-600">Date Placed:</span>
                <span className="font-medium">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">
                  {order.user ? order.user.name : "Unknown User"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">
                  {order.user ? order.user.email : "Unknown Email"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-600">Payment Status:</span>
                <span
                  className={`font-medium ${order.isPaid ? "text-green-600" : "text-red-600"}`}
                >
                  {order.isPaid
                    ? `Paid on ${formatDate(order.paidAt)}`
                    : "Not Paid"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Status:</span>
                <span
                  className={`font-medium ${order.isDelivered ? "text-green-600" : "text-yellow-600"}`}
                >
                  {order.isDelivered
                    ? `Delivered on ${formatDate(order.deliveredAt)}`
                    : "Not Delivered"}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="divide-y divide-gray-200">
              {order.orderItems.map((item) => (
                <div key={item._id} className="py-4 flex items-center">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x NPR {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      NPR {(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Address:</span>{" "}
                {order.shippingAddress.address}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">City:</span>{" "}
                {order.shippingAddress.city}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Postal Code:</span>{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Country:</span>{" "}
                {order.shippingAddress.country}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">
                  NPR{" "}
                  {(
                    order.totalPrice -
                    order.taxPrice -
                    order.shippingPrice
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">
                  NPR {order.shippingPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">
                  NPR {order.taxPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-800 font-semibold">Total:</span>
                <span className="font-bold text-xl">
                  NPR {order.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
