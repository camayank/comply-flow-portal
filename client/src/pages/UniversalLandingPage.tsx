import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusStyle } from "@/lib/theme-utils";
import {
  ArrowRight,
  CheckCircle,
  Users,
  Settings,
  BarChart3,
  Workflow,
  Shield,
  Zap,
  Globe,
  Building,
  Heart,
  Calculator,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Code,
  DollarSign,
  Star,
  TrendingUp,
  Clock,
  FileText,
  MessageSquare,
  UserCheck,
  Target,
  Award,
  Rocket,
  ChevronRight,
  Play
} from "lucide-react";

const UniversalLandingPage = () => {
  const industries = [
    { icon: Shield, name: "Legal & Compliance", desc: "DigiComply's core: Indian startup compliance, legal services" },
    { icon: Calculator, name: "Accounting", desc: "CA firms, tax consultants, GST registration, ROC filing" },
    { icon: Briefcase, name: "Business Consulting", desc: "Management advisors, strategy consultants" },
    { icon: Heart, name: "Healthcare", desc: "Clinics, diagnostic centers, wellness services" },
    { icon: Code, name: "Technology Services", desc: "IT consulting, software development, tech support" },
    { icon: GraduationCap, name: "Education", desc: "Training institutes, online courses, coaching" },
    { icon: Building, name: "Real Estate", desc: "Property consultants, real estate agencies" },
    { icon: DollarSign, name: "Financial Services", desc: "Insurance, loans, investment advisory" }
  ];

  const features = [
    {
      title: "No-Code Workflow Builder",
      description: "Create any service workflow with drag-and-drop interface. No technical expertise required.",
      icon: Workflow,
      color: "bg-blue-500"
    },
    {
      title: "Multi-Stakeholder Management",
      description: "Complete ecosystem for clients, operations team, admins, and agents with role-based access.",
      icon: Users,
      color: "bg-green-500"
    },
    {
      title: "Document Vault & Approval",
      description: "Secure document storage with versioning, approval workflows, and expiry management.",
      icon: FileText,
      color: "bg-purple-500"
    },
    {
      title: "Real-time SLA Monitoring",
      description: "Advanced timer management with pause/resume, escalations, and breach handling.",
      icon: Clock,
      color: "bg-orange-500"
    },
    {
      title: "Intelligent Analytics",
      description: "Comprehensive dashboards with performance metrics, bottleneck detection, and insights.",
      icon: BarChart3,
      color: "bg-indigo-500"
    },
    {
      title: "Agent Network Management",
      description: "Complete partner/agent program with lead tracking, commission management, and territory control.",
      icon: Target,
      color: "bg-pink-500"
    }
  ];

  const benefits = [
    {
      stat: "90%+",
      label: "Task Tracking",
      desc: "All activities tracked in-platform"
    },
    {
      stat: "80%",
      label: "Query Deflection",
      desc: "Client status queries handled automatically"
    },
    {
      stat: "85%+",
      label: "SLA Compliance",
      desc: "Consistent service delivery"
    },
    {
      stat: "<8%",
      label: "Rework Rate",
      desc: "Quality-first approach"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
              Universal Service Provider Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Universal Service Provider Platform
              <span className="block text-blue-600 dark:text-blue-400 mt-2">
                Built on DigiComply Foundation
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Originally built for legal compliance management for Indian founders, now evolved into a 
              comprehensive white-label platform for ANY service provider business. Deploy enterprise-grade 
              client management, operations orchestration, and compliance workflows across industries.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/universal-admin">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                  <Play className="w-5 h-5 mr-2" />
                  Launch Demo Platform
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8">
                <Rocket className="w-5 h-5 mr-2" />
                Request Deployment
              </Button>
            </div>
            
            {/* Quick Access Links */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <Link href="/universal-admin">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Settings className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Admin Panel</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/universal-client">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Client Portal</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/universal-ops">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <UserCheck className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Operations</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/agent-portal">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Target className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Agent Network</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* DigiComply Heritage Section */}
      <div className="py-16 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
            Built on DigiComply Foundation
          </Badge>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            From Indian Startup Compliance to Universal Platform
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Originally developed as <strong>DigiComply</strong> - a comprehensive legal compliance management platform 
            specifically designed for Indian founders and startups. Now evolved into a universal white-label solution 
            that powers service provider businesses across industries while maintaining its compliance expertise foundation.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Compliance Heritage</h3>
                <p className="text-sm text-gray-600">Company incorporation, GST, ROC filing expertise</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Universal Evolution</h3>
                <p className="text-sm text-gray-600">Expanded to serve ANY service provider business</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Rocket className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">₹10 Cr+ Scale</h3>
                <p className="text-sm text-gray-600">Enterprise platform ready for national deployment</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Industries Section */}
      <div className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Built for Every Service Industry
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              One platform, infinite possibilities. Configure workflows, documents, and processes 
              for any service provider business model.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {industry.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {industry.desc}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to run a modern service provider business at scale
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-xl transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Benefits/ROI Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Proven Results Across Industries
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              Success metrics from our deployment across 50+ service provider businesses
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {benefit.stat}
                </div>
                <div className="text-xl font-semibold text-blue-100 mb-1">
                  {benefit.label}
                </div>
                <div className="text-blue-200">
                  {benefit.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Architecture */}
      <div className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Complete 4-Stakeholder Ecosystem
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Every stakeholder gets their own optimized interface and workflow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Admin Control Panel
                    </h3>
                    <Badge variant="outline" className="mt-1">42 Requirements</Badge>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    No-code workflow builder
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Real-time system monitoring
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Global workflow updates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Comprehensive analytics
                  </li>
                </ul>
                <Link href="/universal-admin">
                  <Button className="mt-4 w-full">
                    Explore Admin Panel
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Client Portal
                    </h3>
                    <Badge variant="outline" className="mt-1">31 Requirements</Badge>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Multi-business management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Real-time progress tracking
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Secure document workflows
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Integrated messaging
                  </li>
                </ul>
                <Link href="/universal-client">
                  <Button className="mt-4 w-full">
                    Explore Client Portal
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Operations Panel
                    </h3>
                    <Badge variant="outline" className="mt-1">36 Requirements</Badge>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Task orchestration & Kanban
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Team collaboration tools
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    QA review workflows
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Performance analytics
                  </li>
                </ul>
                <Link href="/universal-ops">
                  <Button className="mt-4 w-full">
                    Explore Operations
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 dark:border-orange-800">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Agent/Partner Portal
                    </h3>
                    <Badge variant="outline" className="mt-1">35 Requirements</Badge>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Lead management system
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Commission tracking
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Territory management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Sales enablement tools
                  </li>
                </ul>
                <Link href="/agent-portal">
                  <Button className="mt-4 w-full">
                    Explore Agent Network
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Enterprise-Grade Architecture
            </h2>
            <Badge variant="outline" className="mb-6 bg-green-50 text-green-700 border-green-200">
              Ready for ₹10 Cr+ Scale Deployment
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">47</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Database Tables
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Comprehensive data model supporting all business operations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">85+</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  API Endpoints
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Complete REST API with advanced SLA and workflow management
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">99.9%</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Uptime SLA
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Enterprise-grade reliability with automated monitoring
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-0">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    White-Label Deployment Ready
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                      <Shield className="w-5 h-5 text-green-500 mr-3" />
                      Multi-factor authentication & encryption
                    </li>
                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                      <Globe className="w-5 h-5 text-green-500 mr-3" />
                      Multi-tenant architecture
                    </li>
                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                      <Zap className="w-5 h-5 text-green-500 mr-3" />
                      Real-time WebSocket communication
                    </li>
                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                      <Award className="w-5 h-5 text-green-500 mr-3" />
                      Complete audit trails & compliance
                    </li>
                  </ul>
                </div>
                <div className="text-center">
                  <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
                    Enterprise Deployment
                  </Badge>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    ₹10 Cr+
                  </div>
                  <div className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                    National Scale Revenue Target
                  </div>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    <Rocket className="w-5 h-5 mr-2" />
                    Request Deployment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Service Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 50+ service providers who've scaled their operations with our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/universal-admin">
              <Button size="lg" variant="secondary" className="px-8">
                <Play className="w-5 h-5 mr-2" />
                Explore Live Demo
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8">
              <MessageSquare className="w-5 h-5 mr-2" />
              Schedule Consultation
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Universal Platform</h3>
              <p className="text-gray-400">
                White-label service provider platform for ANY industry
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/universal-admin">Admin Panel</Link></li>
                <li><Link href="/universal-client">Client Portal</Link></li>
                <li><Link href="/universal-ops">Operations</Link></li>
                <li><Link href="/agent-portal">Agent Network</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Industries</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Legal Services</li>
                <li>Accounting</li>
                <li>Consulting</li>
                <li>Healthcare</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Enterprise</h4>
              <ul className="space-y-2 text-gray-400">
                <li>White-label Deployment</li>
                <li>Custom Workflows</li>
                <li>Enterprise Support</li>
                <li>Training & Onboarding</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 Universal Service Provider Platform. Enterprise-grade solution for service businesses.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UniversalLandingPage;