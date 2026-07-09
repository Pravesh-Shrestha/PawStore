import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa6";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { createOrder, createPaymentIntent, confirmStripePayment } from "../../services/api";
import { toast } from "react-hot-toast";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = loadStripe(stripePublishableKey);

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#374151",
      "::placeholder": { color: "#9CA3AF" },
      fontFamily: "'Poppins', sans-serif",
    },
    invalid: { color: "#EF4444" },
  },
};

const CheckoutForm = () => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { cartItems, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const itemsPrice = totalPrice;
  const taxPrice = Math.round(itemsPrice * 0.15 * 100) / 100;
  const shippingPrice = itemsPrice > 100 ? 0 : 10;
  const totalOrderPrice = (itemsPrice + taxPrice + shippingPrice).toFixed(2);

  const handleShippingAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!stripe || !elements) {
      toast.error("Stripe is loading. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create the order
      const orderItems = cartItems.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        image: item.image,
        price: item.price,
        product: item.product || item._id,
      }));

      const orderData = {
        orderItems,
        shippingAddress,
        paymentMethod: "Stripe",
        taxPrice,
        shippingPrice,
        totalPrice: parseFloat(totalOrderPrice),
      };

      const createdOrder = await createOrder(orderData);

      // Step 2: Create a PaymentIntent via backend
      const paymentIntentData = await createPaymentIntent(createdOrder._id);
      const clientSecret = paymentIntentData.clientSecret;

      // Step 3: Confirm the card payment with Stripe
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user?.name || "Customer",
            email: user?.email || "",
          },
        },
      });

      if (stripeError) {
        setPaymentError(stripeError.message || "Payment failed");
        toast.error(stripeError.message || "Payment failed");
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Payment confirmed by Stripe - try backend confirm, navigate either way
        try {
          await confirmStripePayment(paymentIntent.id, createdOrder._id);
        } catch (confirmErr) {
          console.error("Backend confirm warning (will retry):", confirmErr);
        }
        clearCart();
        toast.success("Payment successful! Order placed.");
        navigate(`/order-confirmation/${createdOrder._id}?payment_intent=${paymentIntent.id}`);
      } else if (paymentIntent?.status === "processing") {
        clearCart();
        toast.success("Payment is processing.");
        navigate(`/order-confirmation/${createdOrder._id}?payment_intent=${paymentIntent.id}`);
      } else {
        setPaymentError("Payment was not successful. Please try again.");
        toast.error("Payment was not successful.");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      setPaymentError(error.toString());
      toast.error(error.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" id="address" name="address" value={shippingAddress.address}
                    onChange={handleShippingAddressChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" id="city" name="city" value={shippingAddress.city}
                    onChange={handleShippingAddressChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input type="text" id="postalCode" name="postalCode" value={shippingAddress.postalCode}
                    onChange={handleShippingAddressChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" id="country" name="country" value={shippingAddress.country}
                    onChange={handleShippingAddressChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
            </div>

            {/* Stripe Card Payment */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <CardElement options={cardElementOptions} />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Test: Use card <strong>4242 4242 4242 4242</strong> with any future expiry date and CVC.
              </p>
              {paymentError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {paymentError}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => navigate("/cart")}
                className="flex items-center text-amber-600 hover:text-amber-700">
                <FaArrowLeft className="mr-2" /> Back to Cart
              </button>
              <button type="submit" disabled={isSubmitting || !stripe || cartItems.length === 0}
                className={`bg-amber-600 text-white px-6 py-3 rounded-lg font-medium flex items-center hover:bg-amber-700 transition-colors ${isSubmitting || !stripe ? "opacity-70 cursor-not-allowed" : ""}`}>
                {isSubmitting ? <><FaSpinner className="animate-spin mr-2" /> Processing Payment...</> : `Pay NPR ${parseFloat(totalOrderPrice).toFixed(2)}`}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            {cartItems.map((item: any) => (
              <div key={item.product || item._id} className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{item.name} x{item.quantity}</span>
                <span>NPR {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>NPR {itemsPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax (15%)</span><span>NPR {taxPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{shippingPrice === 0 ? "Free" : `NPR ${shippingPrice.toFixed(2)}`}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>NPR {totalOrderPrice}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage = () => {
  if (!stripePublishableKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Stripe is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default CheckoutPage;
