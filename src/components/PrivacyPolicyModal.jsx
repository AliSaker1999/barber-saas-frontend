import { useEffect, useRef } from 'react';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
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
            <h2 className="text-2xl font-black text-gray-900">Privacy Policy</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Effective Date: January 23, 2026</p>
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
            <h3 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h3>
            <p>
              BarberSaaS ("we," "our," or "us") is a multi-tenant management platform designed for barber shops and their customers. 
              We are committed to protecting your personal information and your right to privacy. This policy covers the data we 
              collect via our platform, real-time queueing systems, and booking services.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h3>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li><strong>Account Data:</strong> Name, email address, and encrypted passwords.</li>
              <li><strong>Contact Info:</strong> Phone numbers (for WhatsApp verification and SMS notifications).</li>
              <li><strong>Business Data:</strong> For shop owners, we collect shop details, service prices, and barber schedules.</li>
              <li><strong>Usage Data:</strong> Appointment history, queue positions, and performance analytics.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h3>
            <p className="mb-3">We use your information to provide a seamless grooming experience, including:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li>Managing real-time barber queues and appointments.</li>
              <li>Verifying accounts via phone number for platform security.</li>
              <li>Providing shop owners with business intelligence and performance reports.</li>
              <li>Facilitating communication between barbers and customers.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3">4. Data Sharing</h3>
            <p>
              We do not sell your personal data. Your information is only shared with the specific barber shops you interact with 
              within our ecosystem. Administrative access is restricted to authorized platform personnel for support and maintenance.
            </p>
          </section>
          
           <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">5. Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy, please contact our data protection team.
              </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
