import { useState } from 'react';
import {
  Building2, Mail, Phone, MapPin, Shield, Zap, FileText, Users,
  Calendar, TrendingUp, Globe, Linkedin, Twitter, Facebook, Instagram,
  Youtube, ChevronDown, ChevronUp, ArrowRight, Star, Award, CheckCircle,
  Briefcase, BarChart3, Bell, Clock, Database, Lock, Server, Cpu,
  Layers, GitBranch, Activity, Target, PieChart, DollarSign
} from 'lucide-react';
import { Link } from 'wouter';

const Footer = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const userPortals = [
    { name: 'Client Portal', href: '/portal-v2', desc: 'Full lifecycle management', icon: Users, color: 'text-blue-400' },
    { name: 'Agent Portal', href: '/agent', desc: 'Lead & commission tracking', icon: Briefcase, color: 'text-green-400' },
    { name: 'Operations Panel', href: '/operations', desc: 'Service delivery & QC', icon: Activity, color: 'text-orange-400' },
    { name: 'Admin Dashboard', href: '/admin', desc: 'Full platform control', icon: Shield, color: 'text-purple-400' },
    { name: 'Executive View', href: '/executive-dashboard', desc: 'BI & analytics', icon: BarChart3, color: 'text-cyan-400' },
  ];

  const coreFeatures = [
    { name: 'Lead Pipeline (CRM)', href: '/lead-pipeline', desc: 'AI-scored lead management' },
    { name: 'Compliance Calendar', href: '/compliance-management', desc: 'Deadline tracking & alerts' },
    { name: 'Service Catalog', href: '/services', desc: '96+ compliance services' },
    { name: 'Task Management', href: '/tasks', desc: 'SLA-driven workflows' },
    { name: 'Document Vault', href: '/vault', desc: 'Secure storage & e-sign' },
    { name: 'Financial Management', href: '/financials', desc: 'Invoicing & payments' },
  ];

  const aiProducts = [
    { name: 'AutoComply', href: '/autocomply', desc: 'Automated compliance filing', badge: 'AI' },
    { name: 'TaxTracker', href: '/taxtracker', desc: 'GST, TDS, ITR management', badge: 'Popular' },
    { name: 'DigiScore', href: '/digiscore', desc: 'Compliance health scoring', badge: 'New' },
    { name: 'AI Documents', href: '/ai-documents', desc: 'Smart document generation', badge: 'AI' },
    { name: 'Smart Suggestions', href: '/suggestions', desc: 'Proactive recommendations', badge: 'AI' },
  ];

  const serviceCategories = [
    'Company Registration', 'GST Services', 'Income Tax', 'MCA/ROC Compliance',
    'Trademark & IP', 'FSSAI & Licenses', 'Import/Export', 'Startup India'
  ];

  const platformStats = [
    { value: '96+', label: 'Services', sublabel: 'Full catalog', icon: Layers, color: 'text-blue-400' },
    { value: '143', label: 'DB Tables', sublabel: 'Enterprise scale', icon: Database, color: 'text-green-400' },
    { value: '400+', label: 'API Routes', sublabel: 'Full RBAC', icon: GitBranch, color: 'text-purple-400' },
    { value: '5', label: 'User Roles', sublabel: 'Multi-tenant', icon: Users, color: 'text-orange-400' },
  ];

  const integrations = [
    { name: 'GST Portal (GSP)', status: 'Live' },
    { name: 'MCA V3 API', status: 'Live' },
    { name: 'Income Tax (ERI)', status: 'Ready' },
    { name: 'Stripe Payments', status: 'Live' },
    { name: 'WhatsApp Business', status: 'Beta' },
    { name: 'Google Workspace', status: 'Live' },
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" tabIndex={-1}>
      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold">Ready to automate your compliance?</h3>
              <p className="text-blue-100 text-sm">Join 5,200+ businesses saving 40+ hours every month</p>
            </div>
            <div className="flex gap-3">
              <Link href="/smart-start" className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/platform-demo" className="border border-white/30 px-6 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6">

          {/* Company Info - 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">DigiComply</span>
                <p className="text-xs text-slate-400">by LegalSuvidha</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              India's most comprehensive compliance automation platform. Enterprise-grade infrastructure powering 96+ services with AI-driven workflows, real-time government integrations, and complete business lifecycle management.
            </p>

            <div className="space-y-2.5 text-sm text-slate-400 mb-6">
              <a href="mailto:info@digicomply.in" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <Mail className="h-4 w-4 text-blue-400" />
                info@digicomply.in
              </a>
              <a href="tel:+918130645164" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <Phone className="h-4 w-4 text-green-400" />
                +91 81306 45164
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-orange-400" />
                <span>Bangalore, Karnataka, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
              {[
                { icon: Linkedin, href: 'https://linkedin.com/company/digicomply', label: 'LinkedIn' },
                { icon: Twitter, href: 'https://twitter.com/digicomply', label: 'Twitter' },
                { icon: Youtube, href: 'https://youtube.com/@digicomply', label: 'YouTube' },
                { icon: Instagram, href: 'https://instagram.com/digicomply', label: 'Instagram' },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg transition-all hover:scale-105"
                  aria-label={social.label}
                  tabIndex={0}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* User Portals */}
          <div>
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              User Portals
            </h3>
            <ul className="space-y-2.5 text-sm">
              {userPortals.map((portal) => (
                <li key={portal.name}>
                  <Link href={portal.href} className="group flex items-start gap-2 text-slate-300 hover:text-white transition-colors">
                    <portal.icon className={`h-4 w-4 mt-0.5 ${portal.color}`} />
                    <div>
                      <span className="group-hover:text-blue-400">{portal.name}</span>
                      <p className="text-xs text-slate-500">{portal.desc}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Core Features */}
          <div>
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-400" />
              Core Features
            </h3>
            <ul className="space-y-2.5 text-sm">
              {coreFeatures.map((feature) => (
                <li key={feature.name}>
                  <Link href={feature.href} className="group text-slate-300 hover:text-white transition-colors">
                    <span className="group-hover:text-blue-400">{feature.name}</span>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Products */}
          <div>
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-400" />
              AI Products
            </h3>
            <ul className="space-y-2.5 text-sm">
              {aiProducts.map((product) => (
                <li key={product.name}>
                  <Link href={product.href} className="group flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                    <span className="group-hover:text-blue-400">{product.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      product.badge === 'AI' ? 'bg-purple-500/20 text-purple-400' :
                      product.badge === 'New' ? 'bg-green-500/20 text-green-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {product.badge}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link href="/hub" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                  View all products <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-400" />
              Services
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {serviceCategories.slice(0, 6).map((service) => (
                <li key={service}>
                  <Link href="/services" className="hover:text-blue-400 transition-colors">
                    {service}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link href="/services" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                  View all 96+ services <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {platformStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
                <p className="text-sm text-slate-300">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations & Trust */}
        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Government Integrations */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />
                Government & API Integrations
              </h4>
              <div className="flex flex-wrap gap-2">
                {integrations.map((integration) => (
                  <span
                    key={integration.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full text-xs"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      integration.status === 'Live' ? 'bg-green-500' :
                      integration.status === 'Ready' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`} />
                    {integration.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                Security & Compliance
              </h4>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'ISO 27001', icon: Shield },
                  { label: 'SOC 2', icon: Lock },
                  { label: 'GDPR', icon: CheckCircle },
                  { label: '99.9% SLA', icon: Server },
                  { label: 'GSTN Certified', icon: Award },
                ].map((badge) => (
                  <span
                    key={badge.label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400"
                  >
                    <badge.icon className="h-3 w-3" />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 bg-slate-900/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div className="text-center md:text-left">
              <p>© 2025 DigiComply (LegalSuvidha Private Limited). All rights reserved.</p>
              <p className="text-xs text-slate-500 mt-1">
                Enterprise Platform | Built for Scale | Powered by AI
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link href="/hub" className="hover:text-blue-400 transition-colors">Dev Hub</Link>
              <Link href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy</Link>
              <Link href="/terms-of-service" className="hover:text-blue-400 transition-colors">Terms</Link>
              <Link href="/refund-policy" className="hover:text-blue-400 transition-colors">Refunds</Link>
              <span className="text-slate-600">|</span>
              <Link href="/login" className="hover:text-blue-400 transition-colors">Login</Link>
              <Link href="/smart-start" className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                Get Started <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
