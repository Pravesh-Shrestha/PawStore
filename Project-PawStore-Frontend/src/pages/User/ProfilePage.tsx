import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  updateUserProfile,
  getUserProfile,
  setupMFA,
  enableMFA,
  disableMFA,
  exportUserData,
  importUserData,
  deleteOwnAccount,
  getPasswordExpiry,
} from "../../services/api";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaLock,
  FaEdit,
  FaShoppingBag,
  FaDownload,
  FaUpload,
  FaTrash,
  FaCheck,
  FaTimes,
  FaKey,
  FaExclamationTriangle,
  FaShieldAlt,
  FaPlus,
  FaPencilAlt,
} from "react-icons/fa";
import { startRegistration } from "@simplewebauthn/browser";
import {
  beginWebAuthnRegistration,
  completeWebAuthnRegistration,
  getPasskeys,
  removePasskey,
  renamePasskey,
} from "../../services/api";
import zxcvbn from "zxcvbn";

const passwordRequirements = [
  { label: "At least 12 characters", test: (pw) => pw.length >= 12 },
  { label: "At least 1 uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "At least 1 lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "At least 1 number", test: (pw) => /[0-9]/.test(pw) },
  { label: "At least 1 special character", test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
];

const ProfilePage = () => {
  const { user, refreshUserProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // MFA State
  const [mfaSection, setMfaSection] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState(null);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState("idle"); // idle, setup, verify, disable

  // Password expiry state
  const [passwordExpiry, setPasswordExpiry] = useState(null);

  // Data export state
  const [exporting, setExporting] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // MFA disable password state
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");

  // WebAuthn / Passkey state
  const [passkeys, setPasskeys] = useState([]);
  const [passkeysLoaded, setPasskeysLoaded] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [renamingPasskey, setRenamingPasskey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [passwordStrength, setPasswordStrength] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userData = await getUserProfile();
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          password: "",
          confirmPassword: "",
        });
        setMfaSection(userData.mfaEnabled || false);

        // Check password expiry
        try {
          const expiry = await getPasswordExpiry();
          setPasswordExpiry(expiry);
        } catch (e) {
          // Ignore
        }
      } catch (error) {
        toast.error("Failed to load profile data");
        console.error(error);
      }
    };

    fetchUserProfile();
  }, []);

  // Password strength calculation
  const requirements = useMemo(() => {
    return passwordRequirements.map((req) => ({
      ...req,
      met: req.test(formData.password),
    }));
  }, [formData.password]);

  useEffect(() => {
    if (formData.password) {
      const result = zxcvbn(formData.password);
      setPasswordStrength({
        score: result.score,
        label: ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"][result.score],
        color: ["text-red-500", "text-orange-500", "text-yellow-500", "text-lime-500", "text-green-500"][result.score],
        barColor: ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"][result.score],
      });
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password requirements if changing password
    if (formData.password) {
      const unmet = requirements.filter((r) => !r.met);
      if (unmet.length > 0) {
        toast.error("Password does not meet all requirements");
        return;
      }
    }

    setLoading(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        ...(formData.password ? { password: formData.password } : {}),
      };

      await updateUserProfile(updateData);
      await refreshUserProfile();
      
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setLoading(false);
    }
  };

  // MFA Setup
  const handleSetupMFA = async () => {
    setMfaLoading(true);
    try {
      const result = await setupMFA();
      setMfaQrCode(result.qrCode);
      setMfaSecret(result.secret);
      setMfaStep("verify");
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnableMFA = async () => {
    if (!mfaToken || mfaToken.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    setMfaLoading(true);
    try {
      await enableMFA(mfaToken);
      setMfaSection(true);
      setMfaStep("idle");
      setMfaQrCode(null);
      setMfaSecret("");
      setMfaToken("");
      toast.success("MFA has been enabled successfully");
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!mfaToken || mfaToken.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    if (!mfaDisablePassword) {
      toast.error("Please enter your current password");
      return;
    }
    setMfaLoading(true);
    try {
      await disableMFA(mfaToken, mfaDisablePassword);
      setMfaSection(false);
      setMfaStep("idle");
      setMfaToken("");
      setMfaDisablePassword("");
      toast.success("MFA has been disabled");
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setMfaLoading(false);
    }
  };

  // Load passkeys on mount
  useEffect(() => {
    const loadPasskeys = async () => {
      try {
        const keys = await getPasskeys();
        setPasskeys(keys);
      } catch (e) {
        // Passkey fetch failed silently — user may not be authenticated yet
      }
      setPasskeysLoaded(true);
    };
    loadPasskeys();
  }, []);

  // Register a new passkey
  const handleRegisterPasskey = async () => {
    setRegisteringPasskey(true);
    try {
      // 1. Get registration options from server
      const options = await beginWebAuthnRegistration();

      // 2. Use browser's WebAuthn API to create credential
      const regResponse = await startRegistration({ optionsJSON: options });

      // 3. Send credential to server for verification
      const deviceName = `${
        navigator.platform || "Device"
      } - ${new Date().toLocaleDateString()}`;
      await completeWebAuthnRegistration(regResponse, deviceName);

      toast.success("Passkey registered successfully!");

      // Refresh passkey list
      const keys = await getPasskeys();
      setPasskeys(keys);
    } catch (err: any) {
      toast.error(err.toString?.() || "Failed to register passkey");
    } finally {
      setRegisteringPasskey(false);
    }
  };

  // Remove a passkey
  const handleRemovePasskey = async (id: string) => {
    try {
      await removePasskey(id);
      setPasskeys((prev) => prev.filter((k: any) => k.id !== id));
      toast.success("Passkey removed");
    } catch (err: any) {
      toast.error(err.toString?.() || "Failed to remove passkey");
    }
  };

  // Rename a passkey
  const handleRenamePasskey = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await renamePasskey(id, renameValue.trim());
      setPasskeys((prev) =>
        prev.map((k: any) =>
          k.id === id ? { ...k, deviceName: renameValue.trim() } : k
        )
      );
      setRenamingPasskey(null);
      setRenameValue("");
      toast.success("Passkey renamed");
    } catch (err: any) {
      toast.error(err.toString?.() || "Failed to rename passkey");
    }
  };

  // Data Export
  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pawstore-account-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Account data exported successfully");
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setExporting(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password");
      return;
    }
    setLoading(true);
    try {
      await deleteOwnAccount(deletePassword);
      toast.success("Your account has been permanently deleted");
      logout();
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="bg-amber-600 p-6 text-white">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-amber-100">Manage your account information</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center p-4 bg-amber-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-amber-700">
                    <FaUser className="text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Password Expiry Warning */}
                {passwordExpiry && passwordExpiry.daysUntilExpiry < 15 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <FaExclamationTriangle />
                      <span className="text-sm font-medium">
                        Password expires in {passwordExpiry.daysUntilExpiry} days
                      </span>
                    </div>
                  </div>
                )}

                <Link
                  to="/my-orders"
                  className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FaShoppingBag className="text-gray-500 mr-3" />
                  <span>My Orders</span>
                </Link>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Account Information Section */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Account Information</h2>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-amber-600 hover:text-amber-700 flex items-center"
                  >
                    <FaEdit className="mr-1" /> {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border ${
                          isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400`}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border ${
                          isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400`}
                      />
                    </div>

                    {isEditing && (
                      <>
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password (optional)
                          </label>
                          <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={12}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Leave blank to keep current"
                          />
                          {formData.password && passwordStrength && (
                            <div className="mt-2">
                              <div className="flex gap-1 mb-1">
                                {[0, 1, 2, 3, 4].map((level) => (
                                  <div
                                    key={level}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      level <= passwordStrength.score ? passwordStrength.barColor : "bg-gray-200"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className={`text-xs ${passwordStrength.color}`}>
                                {passwordStrength.label}
                              </p>
                              <div className="mt-1 space-y-0.5">
                                {requirements.map((req, i) => (
                                  <div key={i} className="flex items-center gap-1 text-xs">
                                    {req.met ? (
                                      <FaCheck className="text-green-500" />
                                    ) : (
                                      <FaTimes className="text-red-400" />
                                    )}
                                    <span className={req.met ? "text-green-700" : "text-gray-500"}>
                                      {req.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-70"
                      >
                        {loading ? <><FaSpinner className="inline animate-spin mr-2" /> Saving...</> : "Save Changes"}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* MFA Section */}
              <div className="border-t pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FaShieldAlt className="text-amber-600" />
                    <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    mfaSection ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {mfaSection ? "Enabled" : "Disabled"}
                  </span>
                </div>

                {mfaStep === "verify" ? (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-700 mb-4">
                      Scan the QR code below with your authenticator app (e.g., Google Authenticator, Authy)
                    </p>
                    {mfaQrCode && (
                      <div className="flex justify-center mb-4">
                        <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
                      </div>
                    )}
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Or enter this key manually:</p>
                      <code className="bg-white px-3 py-1 rounded border text-sm font-mono select-all">
                        {mfaSecret}
                      </code>
                    </div>
                    <div className="flex gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={mfaToken}
                          onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-32 px-3 py-2 text-center text-lg tracking-widest border border-gray-300 rounded-lg"
                          placeholder="000000"
                          maxLength={6}
                          inputMode="numeric"
                        />
                      </div>
                      <button
                        onClick={handleEnableMFA}
                        disabled={mfaLoading || mfaToken.length !== 6}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-70"
                      >
                        {mfaLoading ? <FaSpinner className="animate-spin" /> : "Verify & Enable"}
                      </button>
                    </div>
                  </div>
                ) : mfaSection ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Two-factor authentication is currently active. You can disable it below.
                    </p>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={mfaToken}
                        onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-32 px-3 py-2 text-center text-lg tracking-widest border border-gray-300 rounded-lg"
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => setMfaStep("disable")}
                        disabled={mfaLoading}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-70"
                      >
                        Disable MFA
                      </button>
                    </div>
                    {mfaStep === "disable" && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm text-gray-500 mb-2">
                          Enter your current password and MFA code, then click Confirm Disable
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={mfaDisablePassword}
                            onChange={(e) => setMfaDisablePassword(e.target.value)}
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Enter your current password"
                          />
                        </div>
                        <button
                          onClick={handleDisableMFA}
                          disabled={mfaLoading || mfaToken.length !== 6 || !mfaDisablePassword}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-70"
                        >
                          {mfaLoading ? <FaSpinner className="animate-spin" /> : "Confirm Disable"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Add an extra layer of security to your account by enabling two-factor authentication.
                    </p>
                    <button
                      onClick={handleSetupMFA}
                      disabled={mfaLoading}
                      className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-70"
                    >
                      {mfaLoading ? <><FaSpinner className="animate-spin mr-2" /> Setting up...</> : "Set Up MFA"}
                    </button>
                  </div>
                )}
              </div>

              {/* Passkeys / Password-less Authentication Section */}
              <div className="border-t pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FaKey className="text-amber-600" />
                    <h2 className="text-xl font-semibold">Passkeys & Password-less Login</h2>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    WebAuthn
                  </span>
                </div>
                <p className="text-gray-600 mb-4">
                  Add a passkey to sign in using your fingerprint, face recognition, or device PIN —
                  no password needed. Passkeys are more secure than passwords and resistant to phishing.
                </p>

                {/* Registered passkeys list */}
                {passkeys.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {passkeys.map((key: any) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FaKey className="text-gray-400" />
                          <div>
                            {renamingPasskey === key.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenamePasskey(key.id);
                                    if (e.key === "Escape") setRenamingPasskey(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleRenamePasskey(key.id)}
                                  className="text-amber-600 text-sm hover:text-amber-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setRenamingPasskey(null)}
                                  className="text-gray-500 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="font-medium text-sm">{key.deviceName}</span>
                            )}
                            <p className="text-xs text-gray-400">
                              Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRenamingPasskey(key.id);
                              setRenameValue(key.deviceName);
                            }}
                            className="text-gray-400 hover:text-amber-600 p-1"
                            title="Rename"
                          >
                            <FaPencilAlt size={12} />
                          </button>
                          <button
                            onClick={() => handleRemovePasskey(key.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Remove"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleRegisterPasskey}
                  disabled={registeringPasskey}
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-70 flex items-center gap-2"
                >
                  {registeringPasskey ? (
                    <><FaSpinner className="animate-spin" /> Registering...</>
                  ) : (
                    <><FaPlus /> Add Passkey</>
                  )}
                </button>
              </div>

              {/* Data Management Section */}
              <div className="border-t pt-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FaDownload className="text-amber-600" />
                  Data Management
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Export Data */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Export Your Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Download all your account data in JSON format (GDPR compliant)
                    </p>
                    <button
                      onClick={handleExportData}
                      disabled={exporting}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-70 text-sm"
                    >
                      {exporting ? <><FaSpinner className="animate-spin mr-2" /> Exporting...</> : "Export Data"}
                    </button>
                  </div>

                  {/* Import Data */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Import Profile Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Import your profile data (name, email) from a JSON file
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const json = JSON.parse(text);
                          const importPayload: any = {};
                          if (json.accountInfo?.name) importPayload.name = json.accountInfo.name;
                          if (json.accountInfo?.email) importPayload.email = json.accountInfo.email;
                          
                          if (Object.keys(importPayload).length === 0) {
                            toast.error("No importable fields found in file");
                            return;
                          }
                          
                          const result = await importUserData(importPayload);
                          toast.success("Profile data imported successfully");
                          await refreshUserProfile();
                        } catch (err: any) {
                          toast.error(err.toString?.() || "Failed to import data");
                        }
                        e.target.value = "";
                      }}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer"
                    />
                  </div>

                  {/* Delete Account */}
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="font-medium mb-2 text-red-700 flex items-center gap-2">
                      <FaTrash /> Delete Account
                    </h3>
                    <p className="text-sm text-red-600 mb-4">
                      Permanently delete your account and all associated data
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                      >
                        Delete My Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={loading}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-70 text-sm"
                          >
                            {loading ? <FaSpinner className="animate-spin" /> : "Confirm Delete"}
                          </button>
                          <button
                            onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

