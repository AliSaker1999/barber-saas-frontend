import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto bg-app-surface rounded-3xl shadow-sm p-8 sm:p-12 border border-app-border dark:bg-slate-800 dark:border-slate-700">
        <div className="mb-12">
          <Link to="/" className="text-blue-600 font-bold hover:underline mb-8 inline-block">← Back to Platform</Link>
          <h1 className="text-4xl font-black text-app-text mb-4 dark:text-slate-100">Privacy Policy</h1>
          <p className="text-gray-500 font-medium dark:text-slate-400">Effective Date: January 23, 2026</p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed dark:text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 dark:text-slate-100">1. Introduction</h2>
            <p>
              BarberSaaS ("we," "our," or "us") is a multi-tenant management platform designed for barber shops and their customers. 
              We are committed to protecting your personal information and your right to privacy. This policy covers the data we 
              collect via our platform, real-time queueing systems, and booking services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 dark:text-slate-100">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Name, email address, and encrypted passwords.</li>
              <li><strong>Contact Info:</strong> Phone numbers (for WhatsApp verification and SMS notifications).</li>
              <li><strong>Business Data:</strong> For shop owners, we collect shop details, service prices, and barber schedules.</li>
              <li><strong>Usage Data:</strong> Appointment history, queue positions, and performance analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 dark:text-slate-100">3. How We Use Your Information</h2>
            <p>We use your information to provide a seamless grooming experience, including:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Managing real-time barber queues and appointments.</li>
              <li>Verifying accounts via phone number for platform security.</li>
              <li>Providing shop owners with business intelligence and performance reports.</li>
              <li>Facilitating communication between barbers and customers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 dark:text-slate-100">4. Data Sharing</h2>
            <p>
              We do not sell your personal data. Your information is only shared with the specific barber shops you interact with 
              within our ecosystem. Administrative access is restricted to authorized platform personnel for support and maintenance.
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h2 className="text-xl font-bold text-blue-900 mb-2">5. Contact Us</h2>
            <p className="text-blue-800">
              If you have any questions about this Privacy Policy, please contact our data protection team:
            </p>
            <div className="mt-4 font-bold text-blue-700">
              Email: alisaker1999@hotmail.com<br />
              Phone: +961 71 368 470
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
