import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { login, register, logout, getUserProfile, logoutUserAPI, verifyMFALogin, completeWebAuthnLogin, beginWebAuthnLogin } from '../services/api';
import { startAuthentication } from '@simplewebauthn/browser';

const AuthContext = createContext<any>(null as any);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      setUser(parsed);
      // If MFA was required but not completed, show MFA screen
      if (parsed.requiresMFA && !parsed.mfaVerified) {
        setRequiresMFA(true);
        setPendingLoginData(parsed);
      }
    }
    setLoading(false);
  }, []);

  const loginUser = async (email, password, captchaToken = null) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await login(email, password, captchaToken);
      
      // If MFA is required, store data and show MFA verification
      if (userData.requiresMFA && !userData.mfaVerified) {
        setRequiresMFA(true);
        setPendingLoginData(userData);
        // Store partially - user is not fully logged in yet
        localStorage.setItem('userInfo', JSON.stringify(userData));
        setLoading(false);
        return { ...userData, mfaPending: true };
      }
      
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (err) {
      setError(err.toString());
      setLoading(false);
      throw err;
    }
  };

  const verifyMFAToken = async (mfaToken) => {
    try {
      const userData = await verifyMFALogin(mfaToken);
      setUser(userData);
      setRequiresMFA(false);
      setPendingLoginData(null);
      setLoading(false);
      return userData;
    } catch (err) {
      setError(err.toString());
      throw err;
    }
  };

  const cancelMFA = () => {
    setRequiresMFA(false);
    setPendingLoginData(null);
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  const registerUser = async (name, email, password, captchaToken = null) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await register(name, email, password, captchaToken);
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (err) {
      setError(err.toString());
      setLoading(false);
      throw err;
    }
  };

  const logoutUser = useCallback(async () => {
    try {
      await logoutUserAPI();
    } catch (err) {
      // Ignore errors from logout API
    }
    logout(); // client-side cleanup
    setUser(null);
    setRequiresMFA(false);
    setPendingLoginData(null);
  }, []);

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      const userData = await getUserProfile();
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  // WebAuthn / Passkey Login
  const webauthnLogin = async (email = '') => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get authentication options from server
      const options = await beginWebAuthnLogin(email);

      // 2. Use browser's WebAuthn API to authenticate
      const authResponse = await startAuthentication({ optionsJSON: options });

      // 3. Send the credential to server for verification
      const userData = await completeWebAuthnLogin(authResponse);

      setUser(userData);
      setLoading(false);
      return userData;
    } catch (err) {
      setError(err.toString());
      setLoading(false);
      throw err;
    }
  };

  // Check if the browser supports WebAuthn
  const supportsWebAuthn = () => {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined && 
           typeof window.PublicKeyCredential === 'function';
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user && !requiresMFA,
    isAdmin: user?.isAdmin || false,
    requiresMFA,
    pendingLoginData,
    login: loginUser,
    verifyMFA: verifyMFAToken,
    cancelMFA,
    register: registerUser,
    logout: logoutUser,
    refreshUserProfile,
    webauthnLogin,
    supportsWebAuthn,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

