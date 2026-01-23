import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "./Modal";
import api from "../services/api";
import { updateUserVerification } from "../features/auth/authSlice";

export default function PhoneVerificationModal({ isOpen, onClose, onVerified }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const [step, setStep] = useState(1); // 1: Phone, 2: Code
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user]);

  const handleSendCode = async () => {
    if (!phoneNumber) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-phone/request", { phoneNumber });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-phone/confirm", { phoneNumber, code });
      dispatch(updateUserVerification());
      if (onVerified) onVerified();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Phone Verification Required">
      <div className="p-6">
        <p className="text-gray-600 mb-6">
          To ensure security and prevent abuse, we need to verify your phone number via WhatsApp before you proceed.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">📞</span>
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Must include country code (e.g. +1...)</p>
             </div>

             <button
                onClick={handleSendCode}
                disabled={loading || !phoneNumber}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
             >
                {loading ? "Sending..." : "Send Code via WhatsApp"}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
             </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="text-center mb-4">
                <p className="text-sm text-gray-500">We sent a verification code to</p>
                <p className="font-bold text-gray-900">{phoneNumber}</p>
                <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline mt-1">Change number</button>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full text-center tracking-widest text-2xl py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
             </div>

             <button
                onClick={handleVerify}
                disabled={loading || code.length < 6}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
             >
                {loading ? "Verifying..." : "Verify & Continue"}
             </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
