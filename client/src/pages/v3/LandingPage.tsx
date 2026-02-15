import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield,
  FileText,
  Bell,
  CheckCircle,
  ArrowRight,
  Building2,
  Users,
  TrendingUp,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold text-navy-800">DigiComply</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              Pricing
            </a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-navy-800 text-navy-800 hover:bg-navy-50">
                Login
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button className="bg-navy-800 hover:bg-navy-700 text-white">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                Stop Drowning in{" "}
                <span className="text-navy-800">Compliance Chaos</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Running a business in India means managing 50+ filings, 100+ deadlines,
                and constant penalty risk. DigiComply automates it all.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/onboarding">
                  <Button size="lg" className="bg-navy-800 hover:bg-navy-700 text-white px-8">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/platform-demo">
                  <Button size="lg" variant="outline" className="border-slate-300">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">10,000+ businesses</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">₹50Cr+ penalties prevented</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-100 rounded-xl p-4 shadow-xl">
                <div className="bg-white rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-navy-800 rounded-lg flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Compliance Status</p>
                      <p className="text-xs text-emerald-600">All filings on track</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-navy-800">12</p>
                      <p className="text-xs text-slate-500">Upcoming</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">98%</p>
                      <p className="text-xs text-slate-500">On Time</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-navy-800">₹0</p>
                      <p className="text-xs text-slate-500">Penalties</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-slate-500 mb-6">
            Trusted by 10,000+ Indian businesses
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-24 bg-slate-300 rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            The DigiComply Difference
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-red-800 mb-6">Without DigiComply</h3>
              <ul className="space-y-4">
                {[
                  "Missed deadlines and penalties",
                  "Manual tracking in spreadsheets",
                  "Constant anxiety about filings",
                  "Scattered documents everywhere",
                  "No visibility into compliance status",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-red-700">
                    <span className="text-red-500 mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-emerald-800 mb-6">With DigiComply</h3>
              <ul className="space-y-4">
                {[
                  "Automated reminders before deadlines",
                  "Single dashboard for everything",
                  "Peace of mind guaranteed",
                  "Secure document vault",
                  "Real-time compliance health score",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-emerald-700">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything You Need for Compliance
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From GST to ROC filings, we handle all your compliance needs in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: "GST Compliance", desc: "Returns, reconciliation, and e-invoicing" },
              { icon: Building2, title: "ROC Filings", desc: "Annual returns and director compliance" },
              { icon: TrendingUp, title: "Income Tax", desc: "ITR filing and advance tax reminders" },
              { icon: Users, title: "Payroll Compliance", desc: "PF, ESI, and professional tax" },
              { icon: Shield, title: "License Management", desc: "Track and renew all business licenses" },
              { icon: Bell, title: "Smart Alerts", desc: "Never miss a deadline with smart reminders" },
            ].map((feature, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-navy-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-navy-800" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Loved by Business Owners
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: "DigiComply saved us from a ₹2L penalty. The automated reminders are a lifesaver.",
                name: "Rajesh Kumar",
                title: "Founder, TechStart India",
              },
              {
                quote: "Finally, all our compliance in one place. No more spreadsheet nightmares.",
                name: "Priya Sharma",
                title: "CFO, RetailCorp",
              },
              {
                quote: "The peace of mind is worth every rupee. Highly recommend to all founders.",
                name: "Amit Patel",
                title: "CEO, ManufactureHub",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-navy-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Simplify Compliance?
          </h2>
          <p className="text-lg text-navy-100 mb-8 max-w-2xl mx-auto">
            Join 10,000+ businesses that trust DigiComply for their compliance needs.
          </p>
          <Link href="/onboarding">
            <Button size="lg" className="bg-white text-navy-800 hover:bg-slate-100 px-8">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">DigiComply</h3>
              <p className="text-slate-400 text-sm">
                India's most trusted compliance management platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} DigiComply. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
