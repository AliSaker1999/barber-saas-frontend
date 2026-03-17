import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-app-surface-2 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto bg-app-surface rounded-[25px] shadow-sm p-8 sm:p-12 border border-app-border dark:bg-slate-800 dark:border-slate-700">
        <div className="mb-12">
          <Link to="/" className="text-app-accent font-bold hover:text-app-accent-dark hover:underline mb-8 inline-block">← Back to Platform</Link>
          <h1 className="text-4xl font-black text-app-text mb-4 dark:text-slate-100">Terms of Service</h1>
          <p className="text-app-muted font-medium dark:text-slate-400">Last Updated: January 23, 2026</p>
        </div>

        <div className="space-y-8 text-app-muted leading-relaxed dark:text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-app-text mb-4 dark:text-slate-100">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Ajmal platform, you agree to be bound by these Terms of Service. 
              Our platform facilitates management for barber shops (Tenants) and booking capabilities for end-users (Customers).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-app-text mb-4 dark:text-slate-100">2. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Verification:</strong> Customers must verify their phone numbers to access booking and queueing features.</li>
              <li><strong>Attendance:</strong> Repeated "No-Shows" may result in account restrictions or banning from specific shops.</li>
              <li><strong>Accuracy:</strong> Business owners are responsible for the accuracy of their services, pricing, and availability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-app-text mb-4 dark:text-slate-100">3. Platform Usage</h2>
            <p>
              Ajmal provides a real-time queueing and appointment engine. While we strive for 100% uptime, 
              we are not liable for business interruptions caused by connectivity issues or scheduling conflicts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-app-text mb-4 dark:text-slate-100">4. Cancellation & No-Show Policy</h2>
            <p>
              Each tenant (shop) may define their own cancellation window. Users who fail to arrive for 
              scheduled appointments without prior cancellation affect shop efficiency and may be subject to 
              permanent flags on their platform-wide profile.
            </p>
          </section>

          <section className="bg-app-surface-2 p-6 rounded-[12px] border border-app-border dark:bg-slate-700/40 dark:border-slate-600">
            <h2 className="text-xl font-bold text-app-text mb-2 dark:text-slate-100">5. Support & Contact</h2>
            <p>
              For technical support or issues regarding these terms, please reach out via:
            </p>
            <div className="mt-4 font-bold text-app-text dark:text-slate-200">
              Email: alisaker1999@hotmail.com<br />
              Phone: +961 71 368 470
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
