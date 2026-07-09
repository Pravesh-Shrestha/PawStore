import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaMinus,
  FaPlus,
  FaArrowLeft,
  FaCartShopping,
  FaSpinner,
} from "react-icons/fa6";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

const CartPage = () => {
  const {
    cartItems,
    totalPrice,
    removeFromCart,
    updateQuantity,
    clearCart,
    loading,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/checkout" } });
    } else {
      navigate("/checkout");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <FaSpinner className="animate-spin text-amber-600 text-4xl" />
        </div>
      ) : cartItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <FaCartShopping className="text-gray-400 text-6xl" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link
            to="/accessories"
            className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors inline-flex items-center"
          >
            <FaArrowLeft className="mr-2" /> Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Cart Items ({cartItems.length})
                  </h2>
                  <button
                    onClick={clearCart}
                    className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors flex items-center gap-1"
                  >
                    <FaTrash className="text-xs" /> Clear Cart
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <li
                    key={item._id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center"
                  >
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden mb-4 sm:mb-0 sm:mr-6">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">{item.name}</h3>
                      <p className="text-amber-600 font-semibold mt-1">
                        NPR {item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <div className="flex items-center border border-gray-300 rounded-lg mr-4">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product || item._id,
                              item.quantity - 1,
                            )
                          }
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="px-3 py-1 font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product || item._id,
                              item.quantity + 1,
                            )
                          }
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                          disabled={item.quantity >= item.countInStock}
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product || item._id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <Link
                to="/accessories"
                className="text-amber-600 font-medium hover:text-amber-700 transition-colors inline-flex items-center"
              >
                <FaArrowLeft className="mr-2" /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    NPR {totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">Free</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-xl">
                    NPR {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Proceed to Checkout
              </button>

              {!isAuthenticated && (
                <p className="mt-4 text-sm text-gray-600 text-center">
                  You'll need to sign in before checkout
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
