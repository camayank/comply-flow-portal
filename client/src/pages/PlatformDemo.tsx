import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Settings,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
  Shield,
  Zap,
  Globe
} from 'lucide-react';

const PlatformDemo = () => {
  const [selectedDemo, setSelectedDemo] = useState('overview');

  const demoSections = [
    {
      id: 'overview',
      title: 'Platform Overview',
      duration: '2:30',
      description: 'Complete walkthrough of all platform features',
      icon: Globe,
      color: 'bg-navy-800'
    },
    {
      id: 'admin',
      title: 'Admin Dashboard',
      duration: '1:45',
      description: 'No-code service configuration and analytics',
      icon: Settings,
      color: 'bg-navy-700'
    },
    {
      id: 'client',
      title: 'Client Portal',
      duration: '2:00',
      description: 'Self-service client management experience',
      icon: Users,
      color: 'bg-emerald-600'
    },
    {
      id: 'operations',
      title: 'Team Operations',
      duration: '1:30',
      description: 'Workflow orchestration and team collaboration',
      icon: BarChart3,
      color: 'bg-amber-600'
    },
    {
      id: 'mobile',
      title: 'Mobile Experience',
      duration: '1:15',
      description: 'Native mobile app for all user roles',
      icon: Zap,
      color: 'bg-navy-600'
    }
  ];

  const features = [
    { icon: CheckCircle, title: 'No-Code Setup', desc: 'Configure your entire platform without technical knowledge' },
    { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade security with 2FA and encrypted storage' },
    { icon: Clock, title: 'Real-time Monitoring', desc: 'Live dashboards and SLA tracking across all services' },
    { icon: FileText, title: 'Document Workflows', desc: 'Automated document collection and approval processes' },
    { icon: Users, title: 'Multi-Role Access', desc: 'Separate portals for clients, operations, admin, and partners' },
    { icon: BarChart3, title: 'Advanced Analytics', desc: 'Performance insights and business intelligence dashboards' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-navy-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-navy-800" />
              <span className="text-xl font-bold text-slate-900">DigiComply Platform Demo</span>
            </div>
            <Link to="/register">
              <Button size="sm" className="bg-navy-800 hover:bg-navy-900 text-white">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-navy-100 text-navy-800 border-navy-200">
            Interactive Demo
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            See DigiComply in Action
          </h1>
          <p className="text-lg sm:text-xl mb-8 text-slate-600 max-w-2xl mx-auto">
            Watch how the world's most intuitive compliance platform transforms your practice management
          </p>

          {/* Main Demo Video Card */}
          <Card className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden border border-slate-200">
                <div className="absolute inset-0 bg-gradient-to-br from-navy-800/5 to-navy-800/10"></div>
                <Button
                  size="lg"
                  className="bg-navy-800 hover:bg-navy-900 text-white shadow-lg relative z-10"
                  onClick={() => {/* Play main demo video */}}
                >
                  <Play className="h-8 w-8 mr-3" />
                  Watch Full Platform Demo (2:30)
                </Button>
              </div>
              <p className="text-slate-600 text-sm">
                Complete overview of admin configuration, client portal, team operations, and mobile experience
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Demo Sections */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Explore Each Module
            </h2>
            <p className="text-lg text-slate-600">
              Dive deep into specific platform capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {demoSections.map((section) => (
              <Card
                key={section.id}
                className={`cursor-pointer transition-all bg-white border hover:shadow-md ${
                  selectedDemo === section.id
                    ? 'border-navy-800 shadow-md ring-1 ring-navy-800/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedDemo(section.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      <section.icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                      {section.duration}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-slate-900">{section.title}</CardTitle>
                  <CardDescription className="text-slate-600">{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-3 border border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 hover:text-navy-800 hover:bg-navy-50"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Play Demo
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600">
                    {section.id === 'overview' && "Complete platform walkthrough covering all user roles and workflows"}
                    {section.id === 'admin' && "Configure services, workflows, and monitor platform performance"}
                    {section.id === 'client' && "Client self-service portal for service requests and document uploads"}
                    {section.id === 'operations' && "Team task management, SLA monitoring, and quality assurance"}
                    {section.id === 'mobile' && "Native mobile experience optimized for all screen sizes"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 sm:py-16 bg-white border-t border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Why Top Practices Choose DigiComply
            </h2>
            <p className="text-lg text-slate-600">
              Enterprise-grade features designed for compliance professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-navy-100 rounded-lg mb-4">
                  <feature.icon className="h-6 w-6 text-navy-800" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Perfect for Any Compliance Business
            </h2>
            <p className="text-lg text-slate-600">
              See how different industries use DigiComply
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'CA Firms', subtitle: 'Tax filing & compliance automation', users: '2,400+ firms' },
              { title: 'CS Practices', subtitle: 'ROC filings & corporate compliance', users: '1,800+ practices' },
              { title: 'Legal Firms', subtitle: 'Contract management & registrations', users: '950+ firms' },
              { title: 'Consulting', subtitle: 'Startup services & advisory', users: '1,200+ agencies' }
            ].map((useCase, index) => (
              <Card key={index} className="text-center bg-white border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">{useCase.title}</CardTitle>
                  <CardDescription className="text-slate-600">{useCase.subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                    {useCase.users}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-navy-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-lg mb-8 text-slate-300 max-w-2xl mx-auto">
            Join thousands of compliance professionals who've streamlined their operations with DigiComply
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white hover:bg-slate-100 text-navy-800 font-semibold px-8 py-4">
                Start Your Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/smart-start">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 px-8 py-4"
              >
                Schedule Personal Demo
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2 mx-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-2 mx-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Setup in 5 minutes
            </span>
            <span className="inline-flex items-center gap-2 mx-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm">
            © 2025 DigiComply. Part of LegalSuvidha.com Group. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PlatformDemo;
