import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  CheckCircle, 
  Clock,
  Users,
  FileText,
  Shield,
  Star,
  ArrowRight,
  Play,
  Settings,
  TrendingUp,
  Zap,
  Globe,
  Menu,
  X,
  Phone,
  Mail,
  Award
} from 'lucide-react';

const MobileResponsiveLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile-First Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Responsive */}
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">ServicePro</span>
                <span className="text-xs text-gray-500 hidden sm:block">Universal Service Provider Platform</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <nav className="flex gap-6">
                <Link href="/portal" className="text-gray-600 hover:text-blue-600 transition-colors">Client Portal</Link>
                <Link href="/operations" className="text-gray-600 hover:text-blue-600 transition-colors">Operations</Link>
                <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition-colors">Admin</Link>
                <Link href="/agent" className="text-gray-600 hover:text-blue-600 transition-colors">Partners</Link>
              </nav>
              <Link href="/portal">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t bg-white">
              <nav className="flex flex-col gap-3">
                <Link href="/portal" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded">
                  Client Portal
                </Link>
                <Link href="/operations" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded">
                  Operations Panel
                </Link>
                <Link href="/admin" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded">
                  Admin Control
                </Link>
                <Link href="/agent" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded">
                  Partner Network
                </Link>
                <div className="px-3 pt-2">
                  <Link href="/portal">
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">Get Started</Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Mobile-Optimized Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-blue-900 to-indigo-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              Universal Service Provider <br className="hidden sm:block" />
              <span className="text-yellow-400">Platform</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-blue-100 px-2">
              Complete client management, operations orchestration, and workflow automation for ANY service business
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
              <Link href="/portal">
                <Button size="lg" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 text-sm sm:text-base">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-900 px-6 py-3 text-sm sm:text-base">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Trust Badges - Mobile Responsive */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-6 sm:mb-8 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                <span>ISO Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                <span>Cloud Native</span>
              </div>
            </div>

            {/* Live Stats - Mobile Optimized */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1">
                    ₹100 Cr+
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    Revenue Scale Ready
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1">
                    5,200+
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    Businesses Supported
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Mobile First */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Complete Service Provider Suite
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4">
                Everything your service business needs to scale operations and delight clients
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-2 border-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Admin Control</CardTitle>
                  <CardDescription className="text-sm">
                    No-code platform configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Service catalog management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Workflow builder
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Analytics dashboard
                    </li>
                  </ul>
                  <Link href="/admin">
                    <Button className="w-full mt-4 text-sm">Explore Admin</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Client Portal</CardTitle>
                  <CardDescription className="text-sm">
                    Self-service client management
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Multi-entity management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Service tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Document upload
                    </li>
                  </ul>
                  <Link href="/portal">
                    <Button className="w-full mt-4 text-sm">Try Client Portal</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Settings className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Operations</CardTitle>
                  <CardDescription className="text-sm">
                    Team workflow orchestration
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Kanban workflows
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      SLA monitoring
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Performance analytics
                    </li>
                  </ul>
                  <Link href="/operations">
                    <Button className="w-full mt-4 text-sm">View Operations</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Star className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Agent Network</CardTitle>
                  <CardDescription className="text-sm">
                    Partner program management
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Lead management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Commission tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Territory mapping
                    </li>
                  </ul>
                  <Link href="/agent">
                    <Button className="w-full mt-4 text-sm">Join Network</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Mobile Responsive */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                How It Works
              </h2>
              <p className="text-base sm:text-lg text-gray-600 px-4">
                Get your service business operational in minutes, not months
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">1</div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Configure Services</h3>
                <p className="text-xs sm:text-sm text-gray-600">Set up your service catalog with no-code builder</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">2</div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Onboard Clients</h3>
                <p className="text-xs sm:text-sm text-gray-600">Automated client onboarding and entity management</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">3</div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Orchestrate Teams</h3>
                <p className="text-xs sm:text-sm text-gray-600">Real-time workflow management and collaboration</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">4</div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Scale Operations</h3>
                <p className="text-xs sm:text-sm text-gray-600">Analytics-driven growth and partner network expansion</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Mobile Optimized */}
      <section className="py-12 sm:py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">
              Trusted by Service Providers Across Industries
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">₹100Cr+</div>
                <div className="text-xs sm:text-sm text-blue-200">Revenue Scale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">99.7%</div>
                <div className="text-xs sm:text-sm text-blue-200">Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">5,200+</div>
                <div className="text-xs sm:text-sm text-blue-200">Active Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">24/7</div>
                <div className="text-xs sm:text-sm text-blue-200">Support</div>
              </div>
            </div>

            {/* Industries Served */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">Legal Firms</div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">Accounting</div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">Consulting</div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">Healthcare</div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">Financial Services</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Responsive */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-purple-900 to-blue-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Ready to Transform Your Service Business?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-purple-100 px-4">
              Join thousands of service providers scaling their operations with our platform
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link href="/portal">
                <Button size="lg" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3">
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-purple-900 px-6 py-3">
                  Schedule Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Mobile Friendly */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Building2 className="h-6 w-6 text-blue-400" />
                  <span className="text-lg sm:text-xl font-bold">ServicePro</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                  Universal Service Provider Platform for scaling modern businesses
                </p>
                <div className="flex gap-3">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Platform</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li><Link href="/admin" className="hover:text-white transition-colors">Admin Control</Link></li>
                  <li><Link href="/portal" className="hover:text-white transition-colors">Client Portal</Link></li>
                  <li><Link href="/operations" className="hover:text-white transition-colors">Operations</Link></li>
                  <li><Link href="/agent" className="hover:text-white transition-colors">Partner Network</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Industries</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li>Legal Services</li>
                  <li>Accounting Firms</li>
                  <li>Consulting</li>
                  <li>Healthcare</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li>Documentation</li>
                  <li>API Reference</li>
                  <li>24/7 Support</li>
                  <li>Training</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-6 sm:pt-8 mt-6 sm:mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs sm:text-sm text-gray-400">
                  © 2025 ServicePro. All rights reserved.
                </p>
                <div className="flex gap-4 text-xs sm:text-sm text-gray-400">
                  <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                  <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                  <Link href="/security" className="hover:text-white transition-colors">Security</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MobileResponsiveLanding;