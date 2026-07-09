import React, { useState } from "react";
import { subscribeNewsletter } from "../../../services/api";
import { toast } from "react-hot-toast";
import { FaSpinner, FaCircleCheck } from "react-icons/fa6";

const NewsLetter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await subscribeNewsletter(email);
      setSuccess(true);
      toast.success(response.message || "Thank you for subscribing!");
      setEmail("");

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err.toString());
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="my-20 md:my-32 max-w-[1166px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="w-full bg-[#FFF0D9] rounded-2xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Dog Image */}
          <div className="w-full md:w-1/2 h-[250px] md:h-[350px]">
            <img
              src="/img/dog-contact.png"
              alt="Dog Contact"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content Side */}
          <div className="w-full md:w-1/2 p-8 md:p-12 text-center md:text-left">
            <h1 className="mb-4">Get Pawsome News!</h1>
            <p className="text-base md:text-lg mb-6">
              Exclusive training tips, tricks, product deals and more.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center md:items-start gap-3"
            >
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`px-4 py-3 w-full rounded-lg flex-grow focus:outline-none focus:ring-2 bg-white ${
                  error
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-amber-500"
                }`}
                disabled={loading || success}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

              <button
                type="submit"
                disabled={loading || success}
                className={`flex items-center justify-center bg-amber-600 text-white font-medium px-6 py-3 w-fit rounded-lg ${
                  loading || success
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-amber-700"
                } transition-colors`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" /> Subscribing...
                  </>
                ) : success ? (
                  <>
                    <FaCircleCheck className="mr-2" /> Subscribed!
                  </>
                ) : (
                  "Subscribe"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsLetter;
