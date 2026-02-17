/**
 * Privacy Policy Page
 *
 * Legal privacy policy for DigiComply platform
 */

import { Link } from "wouter";
import { PublicLayout } from '@/layouts';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-slate-600 mt-2">Last updated: February 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8 space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>
              <p className="text-slate-600 leading-relaxed">
                DigiComply (operated by LegalSuvidha Private Limited) collects information you provide directly to us,
                including when you create an account, use our services, or contact us for support. This may include:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Name, email address, and phone number</li>
                <li>Business information (company name, GST number, PAN, etc.)</li>
                <li>Documents uploaded for compliance purposes</li>
                <li>Payment and billing information</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-600 leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Provide, maintain, and improve our compliance management services</li>
                <li>Process transactions and send related information</li>
                <li>Send compliance alerts, reminders, and notifications</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent transactions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Information Sharing</h2>
              <p className="text-slate-600 leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to outside parties except:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>With your consent or at your direction</li>
                <li>To government authorities as required for compliance filings (MCA, GST, etc.)</li>
                <li>To trusted third-party service providers who assist in operating our platform</li>
                <li>To comply with legal obligations or protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
              <p className="text-slate-600 leading-relaxed">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>256-bit SSL encryption for all data transmission</li>
                <li>Secure data centers with ISO 27001 certification</li>
                <li>Regular security audits and penetration testing</li>
                <li>Role-based access controls and audit logging</li>
                <li>Encrypted storage for sensitive documents</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data Retention</h2>
              <p className="text-slate-600 leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide services.
                We also retain and use information as necessary to comply with legal obligations, resolve disputes,
                and enforce our agreements. Compliance documents are retained as per statutory requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Your Rights</h2>
              <p className="text-slate-600 leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate personal data</li>
                <li>Request deletion of your personal data (subject to legal retention requirements)</li>
                <li>Object to processing of your personal data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Cookies</h2>
              <p className="text-slate-600 leading-relaxed">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns,
                and deliver personalized content. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700 font-medium">LegalSuvidha Private Limited</p>
                <p className="text-slate-600">Email: privacy@digicomply.in</p>
                <p className="text-slate-600">Phone: 1800-XXX-XXXX</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
