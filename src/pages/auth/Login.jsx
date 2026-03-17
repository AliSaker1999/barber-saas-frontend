import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearAuthError, login } from "../../features/auth/authSlice";
import PrivacyPolicyModal from "../../components/PrivacyPolicyModal";
import TermsOfServiceModal from "../../components/TermsOfServiceModal";
import Modal from "../../components/Modal";
import ErrorState from "../../components/ErrorState";
import {
  initiateForgotPassword,
  verifyForgotPasswordPhone,
  resetForgotPassword
} from "../../services/authService";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

export default function Login() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(state => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Forgot Password State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: identity, 2: phone verification (if email), 3: code, 4: new pass
  const [forgotIdentity, setForgotIdentity] = useState("");
  const [forgotPhoneHint, setForgotPhoneHint] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleInitiateForgot = async () => {
    if (!forgotIdentity) return setForgotError("Identity is required");
    setForgotLoading(true);
    setForgotError("");
    try {
      const result = await initiateForgotPassword(forgotIdentity);
      if (result.status === "CODE_SENT") {
        setForgotStep(3);
      } else if (result.status === "NEED_PHONE") {
        setForgotPhoneHint(result.hint);
        setForgotStep(2);
      }
    } catch (err) {
      setForgotError(getFriendlyErrorMessage(err, "Failed to initiate reset"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setForgotLoading(true);
    setForgotError("");
    try {
      await verifyForgotPasswordPhone({ identity: forgotIdentity, phoneNumber: fullPhone });
      setForgotStep(3);
    } catch (err) {
      setForgotError(getFriendlyErrorMessage(err, "Phone number mismatch or error"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 8) return setForgotError("Password must be at least 8 characters");
    setForgotLoading(true);
    setForgotError("");
    try {
      await resetForgotPassword({ identity: forgotIdentity, code: resetCode, newPassword: newPass });
      setIsForgotOpen(false);
      alert("Password reset successfully! Please log in.");
    } catch (err) {
      setForgotError(getFriendlyErrorMessage(err, "Reset failed"));
    } finally {
      setForgotLoading(false);
    }
  };

  const submit = e => {
    e.preventDefault();
    if (email && password) {
      dispatch(login({ email, password }));
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col justify-center px-4 py-6 sm:py-12 relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-app-accent rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-app-accent-dark rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-md mx-auto">
        <div className="bg-app-surface rounded-[25px] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-app-accent px-8 py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-app-surface rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-app-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11.5A2.75 2.75 0 005.75 18.5h8.5A2.75 2.75 0 0017 15.75V4.25A2.75 2.75 0 0014.25 1.5h-3.75v2h3.75a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75V4.25a.75.75 0 01.75-.75h3.75v-2z" clipRule="evenodd" />
                  <path d="M10 6a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-app-text mb-2">Ajmal</h1>
            <p className="text-app-muted text-sm">Professional Salon Management</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-8 py-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6">
                <ErrorState
                  message={getFriendlyErrorMessage(error, "Unable to sign in right now.")}
                  onRetry={() => dispatch(clearAuthError())}
                  retryLabel="Dismiss"
                />
              </div>
            )}

            {/* Email Field */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-semibold text-app-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                  required
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-semibold text-app-text mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-12 pr-12 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                  required
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-app-muted hover:text-app-text transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mb-8">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-app-accent rounded border-app-border focus:ring-2 focus:ring-app-accent" />
                <span className="ml-2 text-sm text-app-muted">Remember me</span>
              </label>
               <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    setForgotStep(1);
                    setForgotError("");
                  }}
                  className="text-xs font-bold text-app-accent hover:text-app-accent-dark transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-app-accent hover:bg-app-accent-dark disabled:bg-app-surface-2 text-app-text font-bold py-3 px-4 rounded-[12px] transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {/* Signup Link */}
            <p className="text-center text-app-muted text-sm mt-6">
              Don't have an account?{' '}
              <a href="/signup" className="text-app-accent hover:text-app-accent-dark font-semibold">
                Sign up here
              </a>
            </p>

            <div className="mt-8 pt-6 border-t border-app-border">
              <p className="text-center text-app-muted text-xs uppercase font-bold tracking-wider mb-3">
                 Are you a Barber?
               </p>
               <a 
                 href="https://wa.me/96171368470?text=I%20am%20interested%20in%20listing%20my%20barbershop%20on%20Ajmal" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="block w-full text-center py-2 px-4 rounded-[12px] bg-app-surface-2 text-app-accent font-semibold hover:bg-app-surface transition-colors border border-app-border"
               >
                 <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    Partner with Us
                 </span>
               </a>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-app-surface-2 px-8 py-4 border-t border-app-border text-center">
            <div className="flex justify-center gap-4 mb-2 text-xs font-semibold">
              <button onClick={() => setIsPrivacyOpen(true)} className="text-app-muted hover:text-app-accent transition-colors">Privacy Policy</button>
              <span className="text-app-surface">•</span>
              <button onClick={() => setIsTermsOpen(true)} className="text-app-muted hover:text-app-accent transition-colors">Terms of Service</button>
            </div>
            <p className="text-xs text-app-muted">
              © 2025 Ajmal. All rights reserved.
            </p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 p-4 bg-app-surface-2 backdrop-blur-md rounded-[12px] border border-app-border">
          <p className="text-app-muted text-xs text-center">
            <span className="font-semibold">Demo:</span> alisaker1999@hotmail.com
          </p>
        </div>
      </div>
      
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Forgot Password Modal */}
      <Modal 
        isOpen={isForgotOpen} 
        onClose={() => setIsForgotOpen(false)}
        title="Reset Password"
      >
        <div className="p-4">
          {forgotError && (
            <div className="mb-4">
              <ErrorState message={forgotError} onRetry={() => setForgotError("")} retryLabel="Dismiss" />
            </div>
          )}

          {forgotStep === 1 && (
            <div className="space-y-4">
              <p className="text-app-muted text-sm">Enter your email or phone number to start the reset process.</p>
              <input
                type="text"
                placeholder="Email or Phone Number"
                className="w-full px-4 py-3 border-2 border-app-border rounded-[12px] focus:border-app-accent outline-none font-medium text-app-text"
                value={forgotIdentity}
                onChange={(e) => setForgotIdentity(e.target.value)}
              />
              <button
                onClick={handleInitiateForgot}
                disabled={forgotLoading}
                className="w-full bg-app-accent text-app-text font-bold py-3 rounded-[12px] hover:bg-app-accent-dark transition-all disabled:opacity-50"
              >
                {forgotLoading ? "Processing..." : "Continue"}
              </button>
            </div>
          )}

          {forgotStep === 2 && (
            <div className="space-y-4">
              <p className="text-app-muted font-medium">Verify your phone number</p>
              <p className="text-app-muted text-xs">Enter your phone number that ends with: <span className="font-bold text-app-text">{forgotPhoneHint}</span></p>
              <input
                type="tel"
                placeholder="Full Phone Number (e.g. 961...)"
                className="w-full px-4 py-3 border-2 border-app-border rounded-[12px] focus:border-app-accent outline-none font-medium text-app-text"
                value={fullPhone}
                onChange={(e) => setFullPhone(e.target.value)}
              />
              <button
                onClick={handleVerifyPhone}
                disabled={forgotLoading}
                className="w-full bg-app-accent text-app-text font-bold py-3 rounded-[12px] hover:bg-app-accent-dark transition-all disabled:opacity-50"
              >
                {forgotLoading ? "Verifying..." : "Send Verification Code"}
              </button>
            </div>
          )}

          {forgotStep === 3 && (
            <div className="space-y-4">
              <p className="text-app-muted font-medium">Enter Verification Code</p>
              <p className="text-app-muted text-xs">We sent a 6-digit code to your WhatsApp.</p>
              <input
                type="text"
                placeholder="6-digit code"
                className="w-full px-4 py-3 border-2 border-app-border rounded-[12px] focus:border-app-accent outline-none font-bold text-center text-2xl tracking-[0.5em] text-app-text"
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
              <button
                onClick={() => setForgotStep(4)}
                className="w-full bg-app-accent text-app-text font-bold py-3 rounded-[12px] hover:bg-app-accent-dark transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {forgotStep === 4 && (
            <div className="space-y-4">
              <p className="text-app-muted font-medium">Create New Password</p>
              <input
                type="password"
                placeholder="New Password"
                className="w-full px-4 py-3 border-2 border-app-border rounded-[12px] focus:border-app-accent outline-none font-medium text-app-text"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <button
                onClick={handleResetPassword}
                disabled={forgotLoading}
                className="w-full bg-app-accent text-app-text font-bold py-3 rounded-[12px] hover:bg-app-accent-dark transition-all disabled:opacity-50"
              >
                {forgotLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
