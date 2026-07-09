import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaSpinner, FaArrowLeft } from 'react-icons/fa6';
import { FaCheckCircle } from 'react-icons/fa';
import { forgotPassword } from '../../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [emailPreview, setEmailPreview] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }
      if (result.emailPreview) {
        setEmailPreview(result.emailPreview);
      }
      setSent(true);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reset Your Password</h1>
          <p className="text-gray-600">
            {sent
              ? 'Check your email for the reset link'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <FaCheckCircle className="text-green-600 text-3xl" />
              </div>
              <p className="text-gray-700 mb-2">
                {message || 'If an account with that email exists, a password reset link has been sent.'}
              </p>

              {/* Show direct reset link + email preview in development mode */}
              {resetUrl && (
                <div className="space-y-3 mb-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      🔧 Dev Mode — Click to reset your password
                    </p>
                    <a
                      href={resetUrl}
                      className="text-amber-600 underline text-sm break-all hover:text-amber-700 font-medium"
                    >
                      {resetUrl}
                    </a>
                  </div>

                  {emailPreview && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        📬 Email sent via Ethereal — Preview it
                      </p>
                      <a
                        href={emailPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm break-all hover:text-blue-700"
                      >
                        {emailPreview}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!resetUrl && (
                <p className="text-sm text-gray-500 mb-6">
                  Check your spam folder if you don't see it within a few minutes.
                </p>
              )}

              <Link
                to="/login"
                className="text-amber-600 font-medium hover:text-amber-700"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="email" className="block text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" /> Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-gray-500 text-sm hover:text-gray-700 flex items-center justify-center"
            >
              <FaArrowLeft className="mr-1" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
