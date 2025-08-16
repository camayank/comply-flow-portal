import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play,
  ArrowRight,
  Building2,
  Users,
  Settings,
  Star,
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
      color: 'bg-blue-500'
    },
    {
      id: 'admin',
      title: 'Admin Dashboard',
      duration: '1:45',
      description: 'No-code service configuration and analytics',
      icon: Settings,
      color: 'bg-purple-500'
    },
    {
      id: 'client',
      title: 'Client Portal',
      duration: '2:00',
      description: 'Self-service client management experience',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      id: 'operations',
      title: 'Team Operations',
      duration: '1:30',
      description: 'Workflow orchestration and team collaboration',
      icon: BarChart3,
      color: 'bg-orange-500'
    },
    {
      id: 'mobile',
      title: 'Mobile Experience',
      duration: '1:15',
      description: 'Native mobile app for all user roles',
      icon: Zap,
      color: 'bg-indigo-500'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ServicePro Demo</span>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-blue-900 to-indigo-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            See ServicePro in Action
          </h1>
          <p className="text-lg sm:text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Watch how the world's most intuitive service provider platform transforms your practice management
          </p>
          
          {/* Main Demo Video Card */}
          <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
                <Button 
                  size="lg" 
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white relative z-10"
                  onClick={() => {/* Play main demo video */}}
                >
                  <Play className="h-8 w-8 mr-3" />
                  Watch Full Platform Demo (2:30)
                </Button>
              </div>
              <p className="text-blue-100 text-sm">
                Complete overview of admin configuration, client portal, team operations, and mobile experience
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Demo Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Explore Each Module
            </h2>
            <p className="text-xl text-gray-600">
              Dive deep into specific platform capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {demoSections.map((section) => (
              <Card 
                key={section.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedDemo === section.id ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                }`}
                onClick={() => setSelectedDemo(section.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      <section.icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {section.duration}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Play Demo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Top Practices Choose ServicePro
            </h2>
            <p className="text-xl text-gray-600">
              Enterprise-grade features designed for service providers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Perfect for Any Service Business
            </h2>
            <p className="text-xl text-gray-600">
              See how different industries use ServicePro
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Legal Firms', subtitle: 'Case management & compliance', users: '2,400+ firms' },
              { title: 'Accounting Practices', subtitle: 'Tax prep & bookkeeping workflows', users: '1,800+ practices' },
              { title: 'Healthcare Clinics', subtitle: 'Patient management & scheduling', users: '950+ clinics' },
              { title: 'Consulting Agencies', subtitle: 'Project delivery & client relations', users: '1,200+ agencies' }
            ].map((useCase, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  <CardDescription>{useCase.subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-xs">
                    {useCase.users}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-900 to-indigo-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of service providers who've streamlined their operations with ServicePro
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding-flow">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4">
                Start Your Free Setup
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4"
            >
              Schedule Personal Demo
            </Button>
          </div>

          <div className="mt-8 text-sm text-blue-200">
            ✓ No credit card required  ✓ Setup in 3 minutes  ✓ Cancel anytime
          </div>
        </div>
      </section>
    </div>
  );
};

export default PlatformDemo;