import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FaLock, FaSpinner } from 'react-icons/fa6';
import { FaCheckCircle, FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';
import { resetPassword, validateResetToken } from '../../services/api';
import zxcvbn from 'zxcvbn';

const passwordRequirements = [
  { label: 'At least 12 characters', test: (pw: string) => pw.length >= 12 },
  { label: 'At least 1 uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'At least 1 lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'At least 1 number', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'At least 1 special character', test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
];

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
    barColor: string;
  } | null>(null);

  // Validate token on mount
  useEffect(() => {
    const checkToken = async () => {
      if (!token || !email) {
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }
      try {
        const result = await validateResetToken(token, email);
        setTokenValid(result.valid);
      } catch {
        setTokenValid(false);
      } finally {
        setCheckingToken(false);
      }
    };
    checkToken();
  }, [token, email]);

  // Password strength
  useEffect(() => {
    if (password) {
      const result = zxcvbn(password);
      setPasswordStrength({
        score: result.score,
        label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][result.score],
        color: ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-green-500'][result.score],
        barColor: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'][result.score],
      });
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const requirements = passwordRequirements.map((req) => ({
    ...req,
    met: req.test(password),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const unmet = requirements.filter((r) => !r.met);
    if (unmet.length > 0) {
      setError('Password does not meet all requirements');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Checking token validity
  if (checkingToken) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto text-center">
          <FaSpinner className="animate-spin text-amber-600 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid / expired token
  if (!tokenValid) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <FaExclamationTriangle className="text-red-600 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Invalid or Expired Link</h1>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Password reset links are valid for 1 hour.
            </p>
            <Link
              to="/forgot-password"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 inline-block"
            >
              Request New Reset Link
            </Link>
            <div className="mt-4">
              <Link to="/login" className="text-gray-500 text-sm hover:text-gray-700">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <FaCheckCircle className="text-green-600 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Reset Successful</h1>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 inline-block"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
          <p className="text-gray-600">
            Enter your new password for <strong className="text-amber-600">{email}</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 mb-2">
                New Password
              </label>
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
                  placeholder="At least 12 characters"
                  required
                  minLength={12}
                  autoFocus
                />
              </div>

              {/* Password strength meter */}
              {password && passwordStrength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full ${
                          level <= passwordStrength.score ? passwordStrength.barColor : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength.color}`}>{passwordStrength.label}</p>
                </div>
              )}

              {/* Requirements checklist */}
              {password && (
                <div className="mt-2 space-y-0.5">
                  {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      {req.met ? (
                        <FaCheck className="text-green-500" />
                      ) : (
                        <FaTimes className="text-red-400" />
                      )}
                      <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Re-enter new password"
                  required
                />
              </div>
              {confirmPassword && (
                <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
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
                  <FaSpinner className="animate-spin mr-2" /> Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-amber-600 font-medium hover:text-amber-700">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
