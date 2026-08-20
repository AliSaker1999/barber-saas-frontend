import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { registerCustomer } from "../../features/auth/authSlice";
import PrivacyPolicyModal from "../../components/PrivacyPolicyModal";
import TermsOfServiceModal from "../../components/TermsOfServiceModal";
import ErrorState from "../../components/ErrorState";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

export default function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    birthdate: "",
    password: "",
    confirmPassword: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!formData.gender) {
      setError("Please select a gender");
      return false;
    }
    if (!formData.birthdate) {
      setError("Please enter your birthdate");
      return false;
    }
    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await dispatch(registerCustomer({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        birthdate: formData.birthdate,
        password: formData.password
      })).unwrap();

      // Show success message and redirect to login
      setTimeout(() => {
        navigate("/login", { 
          state: { message: "Registration successful! Please log in." } 
        });
      }, 1500);
    } catch (err) {
      // unwrap() throws the payload from rejectWithValue, which is the message string
      setError(typeof err === 'string' ? err : getFriendlyErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    return labels[passwordStrength];
  };

  const getPasswordStrengthColor = () => {
    const colors = ["", "bg-app-accent-dark", "bg-app-accent", "bg-app-accent", "bg-app-accent-dark"];
    return colors[passwordStrength];
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
                  <path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11.5A2.75 2.75 0 005.75 18.5h8.5A2.75 2.75 0 0017 15.75V4.25A2.75 2.75 0 0014.25 1.5h-3.75v2h3.75a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75V4.25a.75.75 0 01.75-.75h3.75v-2z" />
                  <path d="M10 6a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-app-text mb-2">Join Ajmal</h1>
            <p className="text-app-muted text-sm">Create your account to book appointments</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pt-8 pb-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6">
                <ErrorState message={error} />
              </div>
            )}

            {/* Full Name Field */}
            <div className="mb-6">
              <label htmlFor="fullName" className="block text-sm font-semibold text-app-text mb-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  name="fullName"
                  className="w-full px-4 py-3 pl-12 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                  required
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            {/* Email Field */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-semibold text-app-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  name="email"
                  className="w-full px-4 py-3 pl-12 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                  required
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="mb-6">
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-app-text mb-2">
                Phone Number
              </label>
              <div className="relative">
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+961 3 123456"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  name="phoneNumber"
                  className="w-full px-4 py-3 pl-12 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                  required
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>

            {/* Gender & Birthdate Fields Row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="gender" className="block text-sm font-semibold text-app-text mb-2">
                  Gender
                </label>
                <div className="relative">
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    name="gender"
                    className="w-full px-4 py-3 pl-10 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 appearance-none text-app-text"
                    required
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unspecified">Prefer not to say</option>
                  </select>
                  <svg className="absolute left-3 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-app-muted">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="birthdate" className="block text-sm font-semibold text-app-text mb-2">
                  Birth Date
                </label>
                <div className="relative">
                  <input
                    id="birthdate"
                    type="date"
                    value={formData.birthdate}
                    onChange={handleChange}
                    name="birthdate"
                    className="w-full px-4 py-3 pl-10 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                    required
                  />
                   {/* Remove custom icon for date input as browsers have their own or positioning is tricky */}
                  <svg className="absolute left-3 top-3.5 w-5 h-5 text-app-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
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
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  name="password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-app-muted font-medium">Password Strength:</span>
                    <span className="text-xs font-bold text-app-text">{getPasswordStrengthLabel()}</span>
                  </div>
                  <div className="h-2 bg-app-surface-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}            </div>
            {/* Confirm Password Field */}
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-app-text mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  name="confirmPassword"
                  className="w-full px-4 py-3 pl-12 pr-12 border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-colors bg-app-surface hover:bg-app-surface-2 text-app-text"
                  required
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-3.5 text-app-muted hover:text-app-text transition-colors"
                >
                  {showConfirmPassword ? (
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

            {/* Terms and Conditions */}
            <div className="mb-8 flex items-start gap-3">
              <div className="flex h-6 items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  disabled={!hasReadPrivacy || !hasReadTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className={`h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent ${(!hasReadPrivacy || !hasReadTerms) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                />
              </div>
              <div className="text-xs sm:text-sm leading-6">
                <label htmlFor="terms" className={`text-app-muted select-none ${(!hasReadPrivacy || !hasReadTerms) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTermsOpen(true);
                      setHasReadTerms(true);
                    }}
                    className="font-bold text-app-accent hover:text-app-accent-dark hover:underline transition-colors"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrivacyOpen(true);
                      setHasReadPrivacy(true);
                    }}
                    className="font-bold text-app-accent hover:text-app-accent-dark hover:underline transition-colors"
                  >
                    Privacy Policy
                  </button>
                  {(!hasReadPrivacy || !hasReadTerms) && (
                    <span className="block text-[10px] text-app-accent font-bold mt-1 uppercase tracking-tighter">
                      (Please open and read both policies to enable the checkbox)
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading || !formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !agreedToTerms}
              className="w-full bg-app-accent hover:bg-app-accent-dark disabled:bg-app-surface-2 text-app-text font-bold py-3 px-4 rounded-[12px] transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-app-muted text-sm mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-app-accent hover:text-app-accent-dark font-semibold">
                Sign in here
              </a>
            </p>
               <a
                 href="https://wa.me/96170000000?text=I%20am%20interested%20in%20listing%20my%20barbershop%20on%20Ajmal"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="block w-full text-center py-2 px-4 rounded-[12px] bg-app-surface-2 text-app-accent font-semibold hover:bg-app-surface transition-colors border border-app-border"
               >
                 <span className="flex items-center justify-center gap-2">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                   Partner with Us
                 </span>
              </a>
            </form>

          {/* Footer */}
          <div className="bg-app-surface-2 px-8 py-4 border-t border-app-border text-center">
            <p className="text-xs text-app-muted">
              © 2025 Ajmal. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}
