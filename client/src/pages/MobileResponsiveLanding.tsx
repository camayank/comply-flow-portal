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
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">DigiComply</span>
                <span className="text-xs text-gray-500 hidden sm:block">AI-Powered Compliance & Tax Automation</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <nav className="flex gap-6">
                <Link href="#products" className="text-gray-600 hover:text-blue-600 transition-colors">Products</Link>
                <Link href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</Link>
                <Link href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">How It Works</Link>
                <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">Login</Link>
              </nav>
              <Link href="/register">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Start Free Trial</Button>
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
                <a href="#products" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded" onClick={() => setMobileMenuOpen(false)}>
                  Our Products
                </a>
                <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </a>
                <a href="#how-it-works" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded" onClick={() => setMobileMenuOpen(false)}>
                  How It Works
                </a>
                <Link href="/login" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded">
                  Login
                </Link>
                <div className="px-3 pt-2">
                  <Link href="/register">
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">Start Free Trial</Button>
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
            <Badge className="mb-4 bg-yellow-500 text-black hover:bg-yellow-600">🚀 Used by 5,200+ Businesses</Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              Stop Drowning in Paperwork.<br className="hidden sm:block" />
              <span className="text-yellow-400">Let AI Handle It.</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-blue-100 px-2">
              Automate compliance, taxes, and client work so you can focus on growing your business - not managing spreadsheets.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-base sm:text-lg">
                  Try Free for 14 Days →
                </Button>
              </Link>
              <Link href="#products">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-base sm:text-lg">
                  <Zap className="h-5 w-5 mr-2" />
                  See AI Products
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

      {/* DigiComply AI Products Showcase */}
      <section id="products" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-300">⚡ Powered by AI</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                3 AI Products That Do The Work For You
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4 max-w-3xl mx-auto">
                No more late nights filling forms or chasing deadlines. Our AI handles compliance, taxes, and scoring automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* AutoComply */}
              <Link href="/autocomply">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white h-full">
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                      <Zap className="h-7 w-7 text-purple-600" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-3 w-fit">Available Now</Badge>
                    <CardTitle className="text-xl sm:text-2xl mb-2">AutoComply</CardTitle>
                    <CardDescription className="text-base">
                      AI creates compliance workflows automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Describe your process in plain English. AI builds the workflow, assigns tasks, and sends reminders - no coding needed.
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Builds workflows in seconds</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Auto-assigns to team members</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Sends deadline reminders</span>
                      </li>
                    </ul>
                    <div className="flex items-center gap-2 text-purple-600 font-semibold">
                      <span>Try AutoComply</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* TaxTracker */}
              <Link href="/taxtracker">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white h-full">
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                      <FileText className="h-7 w-7 text-green-600" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-3 w-fit">Available Now</Badge>
                    <CardTitle className="text-xl sm:text-2xl mb-2">TaxTracker</CardTitle>
                    <CardDescription className="text-base">
                      Never miss a tax deadline again
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Manages GST, TDS, Income Tax for all your clients automatically. Tracks deadlines, calculates dues, and alerts you before it's late.
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Tracks all tax types in one place</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Calculates tax amounts automatically</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Alerts before deadlines</span>
                      </li>
                    </ul>
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <span>Try TaxTracker</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* DigiScore */}
              <Link href="/digiscore">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white h-full">
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                      <Shield className="h-7 w-7 text-blue-600" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-3 w-fit">Available Now</Badge>
                    <CardTitle className="text-xl sm:text-2xl mb-2">DigiScore</CardTitle>
                    <CardDescription className="text-base">
                      Know your compliance health instantly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Get a credit-score style report showing how compliant your business is. AI checks everything and tells you what needs fixing.
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Simple 0-100 health score</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Identifies risks before fines</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Shows exactly what to fix</span>
                      </li>
                    </ul>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold">
                      <span>Try DigiScore</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Coming Soon Products Teaser */}
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">
                <strong>7 more AI products coming soon:</strong> RegGPT, NoticeAI, FileTrace, SOPGen, AuditFlow, ESGComply, CaseDock
              </p>
              <Link href="/register">
                <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                  Get Notified When They Launch
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Mobile First */}
      <section id="features" className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Built For Service Professionals Like You
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4">
                Everything you need to run your business smoothly - from getting clients to delivering work
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-2 border-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Owner Dashboard</CardTitle>
                  <CardDescription className="text-sm">
                    See everything at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      All clients in one place
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Revenue & expenses tracker
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Team performance reports
                    </li>
                  </ul>
                  <Link href="/admin">
                    <Button className="w-full mt-4 text-sm">View Dashboard</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Client Portal</CardTitle>
                  <CardDescription className="text-sm">
                    Keep clients happy & informed
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Clients see their progress
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Upload documents easily
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Instant status updates
                    </li>
                  </ul>
                  <Link href="/portal">
                    <Button className="w-full mt-4 text-sm">Try Client View</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Settings className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Team Work Manager</CardTitle>
                  <CardDescription className="text-sm">
                    Organize work for your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Assign tasks to team members
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Track deadlines automatically
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      See who's working on what
                    </li>
                  </ul>
                  <Link href="/operations">
                    <Button className="w-full mt-4 text-sm">Manage Team</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-500 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Star className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl">Referral Partners</CardTitle>
                  <CardDescription className="text-sm">
                    Grow with referral partners
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Track leads from partners
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Pay commissions automatically
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Manage partner network
                    </li>
                  </ul>
                  <Link href="/referrals">
                    <Button className="w-full mt-4 text-sm">Grow Network</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Who Is This For? */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Perfect For These Businesses
              </h2>
              <p className="text-base sm:text-lg text-gray-600 px-4">
                If you handle compliance, taxes, or paperwork for clients - this is for you
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Chartered Accountants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage GST, ITR, TDS filings for 50+ clients without losing your mind to Excel sheets
                  </p>
                  <p className="text-sm font-medium text-blue-600">Handles: Tax filing, compliance, audit</p>
                </CardContent>
              </Card>

              <Card className="bg-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Company Secretaries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Track ROC filings, board meetings, AGMs for multiple companies - all deadlines in one place
                  </p>
                  <p className="text-sm font-medium text-green-600">Handles: ROC compliance, corporate filings</p>
                </CardContent>
              </Card>

              <Card className="bg-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Legal & Compliance Firms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage contracts, registrations, legal compliances for clients with automated reminders
                  </p>
                  <p className="text-sm font-medium text-purple-600">Handles: Legal docs, registrations</p>
                </CardContent>
              </Card>

              <Card className="bg-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg">Business Consultants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Help startups with incorporation, compliance, funding docs - track all client work centrally
                  </p>
                  <p className="text-sm font-medium text-orange-600">Handles: Startup services, advisory</p>
                </CardContent>
              </Card>

              <Card className="bg-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-3">
                    <Star className="h-6 w-6 text-pink-600" />
                  </div>
                  <CardTitle className="text-lg">HR & Payroll Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage PF/ESI compliance, payroll processing for multiple companies with auto-calculations
                  </p>
                  <p className="text-sm font-medium text-pink-600">Handles: Payroll, PF/ESI, labor law</p>
                </CardContent>
              </Card>

              <Card className="bg-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                    <Globe className="h-6 w-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-lg">Import/Export Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Track customs, DGFT licenses, IEC renewals for clients - never miss a compliance deadline
                  </p>
                  <p className="text-sm font-medium text-indigo-600">Handles: Import/export compliance</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Mobile Responsive */}
      <section id="how-it-works" className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Get Started in 3 Simple Steps
              </h2>
              <p className="text-base sm:text-lg text-gray-600 px-4">
                No tech skills needed. Set up in minutes, not weeks.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">1</div>
                <h3 className="font-semibold mb-2 text-base sm:text-lg">Sign Up Free</h3>
                <p className="text-sm sm:text-base text-gray-600">Enter your email, create password. No credit card needed for 14-day trial.</p>
              </div>
              <div className="text-center bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">2</div>
                <h3 className="font-semibold mb-2 text-base sm:text-lg">Add Your Clients</h3>
                <p className="text-sm sm:text-base text-gray-600">Upload existing client list or add them one by one. Takes 5 minutes.</p>
              </div>
              <div className="text-center bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">3</div>
                <h3 className="font-semibold mb-2 text-base sm:text-lg">Let AI Work</h3>
                <p className="text-sm sm:text-base text-gray-600">AI tracks deadlines, sends reminders, creates reports. You just review and approve.</p>
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