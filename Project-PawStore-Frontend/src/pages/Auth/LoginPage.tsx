import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaSpinner, FaShieldHalved, FaArrowLeft, FaKey } from 'react-icons/fa6';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../context/AuthContext';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const captchaRef = useRef<any>(null);

  const { login, verifyMFA, cancelMFA, isAuthenticated, requiresMFA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to home
  const redirect = location.state?.from || '/';

  useEffect(() => {
    // If user is already authenticated, redirect
    if (isAuthenticated) {
      navigate(redirect);
    }
  }, [isAuthenticated, navigate, redirect]);

  // Listen for MFA requirement
  useEffect(() => {
    if (requiresMFA) {
      setShowMFA(true);
    }
  }, [requiresMFA]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validate form
    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    // Execute reCAPTCHA
    let captchaToken = null;
    if (captchaRef.current) {
      captchaToken = await captchaRef.current.executeAsync();
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password, captchaToken);
      if (result?.mfaPending) {
        setShowMFA(true);
      }
    } catch (err) {
      setFormError(err.toString());
    } finally {
      setIsSubmitting(false);
      if (captchaRef.current) captchaRef.current.reset();
    }
  };

  const handleMFAVerify = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!mfaToken) {
      setFormError('Please enter your MFA code');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyMFA(mfaToken);
      // Will redirect via useEffect above
    } catch (err) {
      setFormError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMFA = () => {
    cancelMFA();
    setShowMFA(false);
    setMfaToken('');
  };

  // MFA Verification Screen
  if (showMFA) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <FaShieldHalved className="text-amber-600 text-3xl" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Two-Factor Authentication</h1>
            <p className="text-gray-600">
              Enter the verification code from your authenticator app
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            {formError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleMFAVerify}>
              <div className="mb-6">
                <label htmlFor="mfaToken" className="block text-gray-700 mb-2">
                  Authentication Code
                </label>
                <input
                  type="text"
                  id="mfaToken"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Open your authenticator app and enter the 6-digit code
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || mfaToken.length !== 6}
                className={`w-full bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center ${
                  isSubmitting || mfaToken.length !== 6 ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" /> Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={handleCancelMFA}
                className="text-gray-500 text-sm hover:text-gray-700 flex items-center justify-center mx-auto"
              >
                <FaArrowLeft className="mr-1" /> Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Login Screen
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Pawstore account</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {formError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {formError}
            </div>
          )}

          <form onSubmit={handleLogin}>
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

            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label htmlFor="password" className="block text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-amber-600 text-sm hover:text-amber-700">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Invisible reCAPTCHA v2 - protects against automated attacks */}
            <div className="mb-4 flex justify-center">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                size="invisible"
                theme="light"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Passkey Login Button */}
          <WebAuthnLoginButton email={email} />

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-amber-600 font-medium hover:text-amber-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Separate component for WebAuthn passkey login */
const WebAuthnLoginButton = ({ email }: { email: string }) => {
  const { webauthnLogin, supportsWebAuthn } = useAuth();
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setPasskeyError('');
    try {
      await webauthnLogin(email);
    } catch (err: any) {
      setPasskeyError(err.toString());
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (!supportsWebAuthn()) {
    return null; // Browser doesn't support WebAuthn — don't render the button
  }

  return (
    <div>
      {passkeyError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {passkeyError}
        </div>
      )}
      <button
        type="button"
        onClick={handlePasskeyLogin}
        disabled={passkeyLoading}
        className={`w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2 ${
          passkeyLoading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {passkeyLoading ? (
          <>
            <FaSpinner className="animate-spin" /> Verifying passkey...
          </>
        ) : (
          <>
            <FaKey className="text-lg" /> Sign in with Passkey
          </>
        )}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">
        Use fingerprint, face recognition, or security key
      </p>
    </div>
  );
};

export default LoginPage;
