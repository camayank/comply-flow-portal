/**
 * Refund Policy Page
 *
 * Refund and cancellation policy for DigiComply platform
 */

import { Link } from "wouter";
import { PublicLayout } from '@/layouts';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RefundPolicy() {
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
            <h1 className="text-3xl font-bold text-slate-900">Refund & Cancellation Policy</h1>
            <p className="text-slate-600 mt-2">Last updated: February 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8 space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Subscription Services</h2>
              <p className="text-slate-600 leading-relaxed">
                DigiComply subscription plans are billed on a monthly or annual basis. Our refund policy varies
                based on the type of subscription:
              </p>
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-slate-800">Monthly Subscriptions</h3>
                  <p className="text-slate-600 mt-2">
                    Monthly subscriptions can be cancelled at any time. No refunds are provided for partial months.
                    Your subscription will remain active until the end of the current billing period.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-slate-800">Annual Subscriptions</h3>
                  <p className="text-slate-600 mt-2">
                    Annual subscriptions may be refunded within the first 30 days if no services have been consumed.
                    After 30 days, a pro-rated refund may be provided at our discretion.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. One-Time Services</h2>
              <p className="text-slate-600 leading-relaxed">
                For one-time compliance services (company registration, filing services, etc.):
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li><strong>Before work begins:</strong> Full refund available within 24 hours of payment</li>
                <li><strong>Work in progress:</strong> Partial refund based on work completed</li>
                <li><strong>After submission to government:</strong> No refund (government fees are non-refundable)</li>
                <li><strong>Service completed:</strong> No refund available</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Government Fees</h2>
              <p className="text-slate-600 leading-relaxed">
                Government fees paid on your behalf (MCA fees, stamp duty, GST filing fees, etc.) are
                <strong> non-refundable</strong> as these are paid directly to government authorities.
                In case of service cancellation, only our professional fees may be refunded as per this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Refund Eligibility</h2>
              <p className="text-slate-600 leading-relaxed">
                Refunds may be granted in the following circumstances:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Service not delivered as per agreed scope</li>
                <li>Technical issues preventing service access (verified by our team)</li>
                <li>Duplicate payment processed</li>
                <li>Service cancelled within the eligible timeframe</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Non-Refundable Items</h2>
              <p className="text-slate-600 leading-relaxed">
                The following are not eligible for refunds:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Government fees and statutory charges</li>
                <li>Services already rendered or documents filed</li>
                <li>Consultation fees after consultation is completed</li>
                <li>Cancelled services after work has begun (partial refund may apply)</li>
                <li>Services cancelled due to client inaction or delayed documentation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. How to Request a Refund</h2>
              <p className="text-slate-600 leading-relaxed">
                To request a refund:
              </p>
              <ol className="list-decimal list-inside mt-3 space-y-2 text-slate-600">
                <li>Log in to your DigiComply account</li>
                <li>Navigate to Support → Request Refund</li>
                <li>Provide your order/invoice number and reason for refund</li>
                <li>Our team will review and respond within 3-5 business days</li>
              </ol>
              <p className="text-slate-600 mt-4">
                Alternatively, email us at <strong>refunds@digicomply.in</strong> with your details.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Refund Processing</h2>
              <p className="text-slate-600 leading-relaxed">
                Approved refunds will be processed as follows:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
                <li>Credit/Debit Card: 5-7 business days</li>
                <li>Net Banking: 5-7 business days</li>
                <li>UPI: 3-5 business days</li>
                <li>Wallet: Instant to 24 hours</li>
              </ul>
              <p className="text-slate-600 mt-4">
                Refunds will be credited to the original payment method used during purchase.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Cancellation Process</h2>
              <p className="text-slate-600 leading-relaxed">
                To cancel your subscription:
              </p>
              <ol className="list-decimal list-inside mt-3 space-y-2 text-slate-600">
                <li>Go to Settings → Billing → Manage Subscription</li>
                <li>Click "Cancel Subscription"</li>
                <li>Confirm cancellation</li>
                <li>Your subscription will remain active until the end of the billing period</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                For refund or cancellation queries, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700 font-medium">LegalSuvidha Private Limited</p>
                <p className="text-slate-600">Email: refunds@digicomply.in</p>
                <p className="text-slate-600">Phone: 1800-XXX-XXXX</p>
                <p className="text-slate-600">Support Hours: Mon-Sat, 9 AM - 6 PM IST</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
