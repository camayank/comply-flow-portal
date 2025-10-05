import { Building2, Mail, Phone, MapPin, Shield, Zap, FileText, Users, Calendar, TrendingUp, Globe, Linkedin, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';
import { Link } from 'wouter';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xl font-bold">DigiComply</span>
                <p className="text-xs text-blue-300">by LegalSuvidha</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              India's most comprehensive compliance automation platform. Empowering 100,000+ professionals with AI-powered tools, government API integrations, and enterprise-grade infrastructure.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <a href="mailto:info@digicomply.in" className="hover:text-blue-400 transition-colors">
                  info@digicomply.in
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <a href="tel:+918130645164" className="hover:text-blue-400 transition-colors">
                  +91 81306 45164
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>Bangalore, Karnataka, India</span>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 hover:bg-blue-600 rounded-lg transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 hover:bg-blue-600 rounded-lg transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 hover:bg-blue-600 rounded-lg transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 hover:bg-blue-600 rounded-lg transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 hover:bg-blue-600 rounded-lg transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* AI Products */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              AI Products
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/autocomply">
                  <a className="hover:text-blue-400 transition-colors flex items-center gap-2">
                    <span className="text-purple-400">→</span> AutoComply
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/taxtracker">
                  <a className="hover:text-blue-400 transition-colors flex items-center gap-2">
                    <span className="text-green-400">→</span> TaxTracker
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/digiscore">
                  <a className="hover:text-blue-400 transition-colors flex items-center gap-2">
                    <span className="text-blue-400">→</span> DigiScore
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/documents">
                  <a className="hover:text-blue-400 transition-colors flex items-center gap-2">
                    <span className="text-orange-400">→</span> AI Document Generator
                  </a>
                </Link>
              </li>
              <li className="pt-2">
                <span className="text-xs text-gray-500">+ 7 more products coming soon</span>
              </li>
            </ul>
          </div>

          {/* Portals & Features */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/admin">
                  <a className="hover:text-blue-400 transition-colors">Admin Dashboard</a>
                </Link>
              </li>
              <li>
                <Link href="/client-portal">
                  <a className="hover:text-blue-400 transition-colors">Client Portal</a>
                </Link>
              </li>
              <li>
                <Link href="/operations">
                  <a className="hover:text-blue-400 transition-colors">Operations Panel</a>
                </Link>
              </li>
              <li>
                <Link href="/agent">
                  <a className="hover:text-blue-400 transition-colors">Agent Network</a>
                </Link>
              </li>
              <li>
                <Link href="/tasks">
                  <a className="hover:text-blue-400 transition-colors">Task Management</a>
                </Link>
              </li>
              <li>
                <Link href="/compliance-dashboard">
                  <a className="hover:text-blue-400 transition-colors">Compliance Calendar</a>
                </Link>
              </li>
              <li>
                <Link href="/financials">
                  <a className="hover:text-blue-400 transition-colors">Financial Management</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Services & Resources */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-400" />
              Services
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/services">
                  <a className="hover:text-blue-400 transition-colors">Service Catalog (131+)</a>
                </Link>
              </li>
              <li>
                <a href="#services" className="hover:text-blue-400 transition-colors">Company Registration</a>
              </li>
              <li>
                <a href="#services" className="hover:text-blue-400 transition-colors">GST & Tax Services</a>
              </li>
              <li>
                <a href="#services" className="hover:text-blue-400 transition-colors">Annual Compliance</a>
              </li>
              <li>
                <a href="#services" className="hover:text-blue-400 transition-colors">Trademark & IP</a>
              </li>
              <li>
                <a href="#services" className="hover:text-blue-400 transition-colors">Licenses & Permits</a>
              </li>
              <li className="pt-2 border-t border-gray-700 mt-2">
                <a href="#pricing" className="hover:text-blue-400 transition-colors font-medium">View Pricing →</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Enterprise Features Banner */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-blue-400" />
                <span className="text-2xl font-bold text-blue-400">3</span>
              </div>
              <p className="text-xs text-gray-400">Government APIs</p>
              <p className="text-xs text-gray-500">(GSP, ERI, MCA21)</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-2xl font-bold text-green-400">134</span>
              </div>
              <p className="text-xs text-gray-400">Database Tables</p>
              <p className="text-xs text-gray-500">Enterprise Scale</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <span className="text-2xl font-bold text-purple-400">375+</span>
              </div>
              <p className="text-xs text-gray-400">API Endpoints</p>
              <p className="text-xs text-gray-500">Full RBAC</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-5 w-5 text-orange-400" />
                <span className="text-2xl font-bold text-orange-400">100K+</span>
              </div>
              <p className="text-xs text-gray-400">User Capacity</p>
              <p className="text-xs text-gray-500">Multi-tenant</p>
            </div>
          </div>
        </div>

        {/* Trust & Compliance */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>ISO 27001 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>SOC 2 Type II Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>99.9% Uptime SLA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <div className="text-center md:text-left">
              <p>© 2025 DigiComply (LegalSuvidha). All rights reserved.</p>
              <p className="text-xs text-gray-500 mt-1">Built for ₹100 Cr+ Revenue Scale | Powered by AI</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-blue-400 transition-colors">Terms of Service</a>
              <a href="/refund-policy" className="hover:text-blue-400 transition-colors">Refund Policy</a>
              <Link href="/login">
                <a className="hover:text-blue-400 transition-colors">Login</a>
              </Link>
              <Link href="/register">
                <a className="hover:text-blue-400 transition-colors font-medium">Start Free Trial →</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
