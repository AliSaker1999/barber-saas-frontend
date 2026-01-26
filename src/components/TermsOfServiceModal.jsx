import { useEffect, useRef } from 'react';

export default function TermsOfServiceModal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Terms of Service</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Last Updated: January 23, 2026</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h3>
            <p>
              By accessing or using the BarberSaaS platform, you agree to be bound by these Terms of Service. 
              Our platform facilitates management for barber shops (Tenants) and booking capabilities for end-users (Customers).
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">2. User Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li><strong>Verification:</strong> Customers must verify their phone numbers to access booking and queueing features.</li>
              <li><strong>Attendance:</strong> Repeated "No-Shows" may result in account restrictions or banning from specific shops.</li>
              <li><strong>Accuracy:</strong> Business owners are responsible for the accuracy of their services, pricing, and availability.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">3. Platform Usage</h3>
            <p>
              BarberSaaS provides a real-time queueing and appointment engine. While we strive for 100% uptime, 
              we are not liable for business interruptions caused by connectivity issues or scheduling conflicts.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">4. Cancellation & No-Show Policy</h3>
            <p>
              Each tenant (shop) may define their own cancellation window. Users who fail to arrive for 
              scheduled appointments without prior cancellation affect shop efficiency and may be subject to 
              permanent flags on their platform-wide profile.
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 mb-2">5. Support & Contact</h3>
            <p className="text-blue-800">
              For any issues regarding these terms, please contact our support team.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}
