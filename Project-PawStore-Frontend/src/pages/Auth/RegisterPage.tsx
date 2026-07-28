import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import ReCAPTCHA from 'react-google-recaptcha';
import zxcvbn from 'zxcvbn';
import { useAuth } from '../../context/AuthContext';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

// Password strength labels and colors
const strengthConfig = [
  { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-500' },
  { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { label: 'Strong', color: 'bg-lime-500', textColor: 'text-lime-500' },
  { label: 'Very Strong', color: 'bg-green-500', textColor: 'text-green-500' },
];

const passwordRequirements = [
  { label: 'At least 12 characters', test: (pw) => pw.length >= 12 },
  { label: 'At least 1 uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'At least 1 lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'At least 1 number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'At least 1 special character', test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
];

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captchaRef = useRef<any>(null);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    const result = zxcvbn(password);
    return {
      score: result.score, // 0-4
      ...strengthConfig[result.score],
      feedback: result.feedback?.warning || '',
      suggestions: result.feedback?.suggestions || [],
    };
  }, [password]);

  // Check which requirements are met
  const requirements = useMemo(() => {
    return passwordRequirements.map((req) => ({
      ...req,
      met: req.test(password),
    }));
  }, [password]);

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validate form
    if (!name || !email || !password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    // Check all password requirements
    const unmet = requirements.filter((r) => !r.met);
    if (unmet.length > 0) {
      setFormError('Password does not meet all requirements');
      return;
    }

    // Execute reCAPTCHA for registration
    let captchaToken = null;
    if (captchaRef.current) {
      captchaToken = await captchaRef.current.executeAsync();
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password, captchaToken);
      // Successful registration will trigger the useEffect above to redirect
    } catch (err) {
      setFormError(err.toString());
    } finally {
      setIsSubmitting(false);
      if (captchaRef.current) captchaRef.current.reset();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
          <p className="text-gray-600">Join Pawstore and find your perfect pet companion</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {formError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="name" className="block text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 mb-2">
                Password
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
                  placeholder="••••••••"
                  required
                  minLength={12}
                />
              </div>
              
              {/* Password Strength Meter */}
              {password && passwordStrength && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-sm font-medium ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                    {passwordStrength.feedback && (
                      <span className="text-gray-500 font-normal ml-1">
                        - {passwordStrength.feedback}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Password Requirements Checklist */}
              {password && (
                <div className="mt-3 space-y-1">
                  {requirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <FaCheck className="text-green-500 shrink-0" />
                      ) : (
                        <FaTimes className="text-red-400 shrink-0" />
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
                Confirm Password
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
                  className={`w-full pl-10 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-500'
                      : confirmPassword && password === confirmPassword
                      ? 'border-green-500'
                      : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {password === confirmPassword ? (
                      <FaCheck className="text-green-500" />
                    ) : (
                      <FaTimes className="text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Invisible reCAPTCHA v2 - protects registration from automated attacks */}
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
                  <FaSpinner className="animate-spin mr-2" /> Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-600 font-medium hover:text-amber-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

