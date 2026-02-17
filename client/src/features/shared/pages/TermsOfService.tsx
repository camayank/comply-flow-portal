/**
 * Terms of Service Page
 *
 * Legal terms and conditions for DigiComply platform
 */

import { Link } from "wouter";
import { PublicLayout } from '@/layouts';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
            <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-slate-600 mt-2">Last updated: February 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8 space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using DigiComply services provided by LegalSuvidha Private Limited, you agree to be
                bound by these Terms of Service. If you do not agree to all the terms, you may not access the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
              <p className="text-slate-600 leading-relaxed">
                DigiComply is a compliance management platform that provides:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Business registration and compliance tracking services</li>
                <li>Document management and secure storage</li>
                <li>Compliance calendar and deadline reminders</li>
                <li>AI-powered compliance assistance (AutoComply, DigiScore, TaxTracker)</li>
                <li>Filing services for GST, ROC, and other regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. User Accounts</h2>
              <p className="text-slate-600 leading-relaxed">
                To use our services, you must:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Service Fees and Payment</h2>
              <p className="text-slate-600 leading-relaxed">
                Our services are provided on a subscription or per-service basis. By subscribing, you agree to:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Pay all applicable fees as described in your service agreement</li>
                <li>Provide valid payment information</li>
                <li>Authorize recurring charges for subscription services</li>
                <li>Pay applicable taxes as required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. User Responsibilities</h2>
              <p className="text-slate-600 leading-relaxed">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Accuracy of all information and documents submitted</li>
                <li>Timely response to requests for additional information</li>
                <li>Compliance with all applicable laws and regulations</li>
                <li>Not using the service for illegal or unauthorized purposes</li>
                <li>Not interfering with or disrupting the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
              <p className="text-slate-600 leading-relaxed">
                The DigiComply platform, including its original content, features, and functionality, is owned by
                LegalSuvidha Private Limited and is protected by international copyright, trademark, and other
                intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                DigiComply provides compliance management tools and services but does not guarantee specific outcomes.
                We are not liable for:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Penalties arising from inaccurate information provided by users</li>
                <li>Delays caused by government portal downtime</li>
                <li>Changes in regulatory requirements</li>
                <li>Indirect, incidental, or consequential damages</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Service Availability</h2>
              <p className="text-slate-600 leading-relaxed">
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance
                will be communicated in advance. We reserve the right to modify or discontinue services with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We may terminate or suspend your account for violation of these terms. Upon termination,
                your right to use the service will cease immediately. Data retention will follow our Privacy Policy
                and applicable legal requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Governing Law</h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms shall be governed by the laws of India. Any disputes shall be subject to the
                exclusive jurisdiction of courts in Mumbai, Maharashtra.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Contact Information</h2>
              <p className="text-slate-600 leading-relaxed">
                For questions about these Terms, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700 font-medium">LegalSuvidha Private Limited</p>
                <p className="text-slate-600">Email: legal@digicomply.in</p>
                <p className="text-slate-600">Phone: 1800-XXX-XXXX</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
