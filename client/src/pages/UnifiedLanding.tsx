import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, CheckCircle, Shield, Award, Users, TrendingUp, Zap, Globe,
  Menu, X, ArrowRight, Star, Clock, FileText, Target, AlertTriangle,
  Sparkles, Play, Settings, BarChart3, Calendar, Phone, Mail
} from 'lucide-react';

const UnifiedLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [penaltySaved, setPenaltySaved] = useState(1870000);
  const [companiesServed, setCompaniesServed] = useState(5200);

  useEffect(() => {
    const interval = setInterval(() => {
      setPenaltySaved(prev => prev + Math.floor(Math.random() * 1000));
      setCompaniesServed(prev => prev + Math.floor(Math.random() * 2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile-First Header */}
      <header className="border-b bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">DigiComply</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">AI-Powered Compliance & Tax Automation</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <nav className="flex gap-6">
                <a href="#products" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">Products</a>
                <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">Pricing</a>
                <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">Features</a>
                <Link to="/select-role" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Login</Link>
              </nav>
              <Link to="/smart-start">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Start Free Trial</Button>
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
            <div className="lg:hidden py-4 border-t bg-white dark:bg-gray-800">
              <nav className="flex flex-col gap-3">
                <a 
                  href="#products" 
                  className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Our Products
                </a>
                <a 
                  href="#pricing" 
                  className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <a 
                  href="#features" 
                  className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <Link to="/select-role" className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                  Login
                </Link>
                <div className="px-3 pt-2">
                  <Link to="/smart-start">
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Start Free Trial</Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-blue-900 to-indigo-800 dark:from-blue-950 dark:to-indigo-950 text-white">
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
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4 sm:mb-6 px-4">
              <Link to="/smart-start">
                <Button size="lg" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-base sm:text-lg" data-testid="button-start-trial">
                  Try Free for 14 Days →
                </Button>
              </Link>
              <a href="#products">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-base sm:text-lg font-semibold">
                  <Zap className="h-5 w-5 mr-2" />
                  See AI Products
                </Button>
              </a>
            </div>

            {/* Access Dashboard Button */}
            <div className="flex justify-center px-4 mb-6 sm:mb-8">
              <Link to="/select-role">
                <Button 
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/30"
                  data-testid="button-access-dashboard"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Access Dashboard / Login
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-6 sm:mb-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                <span>ISO Certified</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                <span>Cloud Native</span>
              </div>
            </div>

            {/* Live Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1">
                    ₹{(penaltySaved / 100000).toFixed(1)}L+
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    Penalties Saved Today
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1">
                    {companiesServed.toLocaleString()}+
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

      {/* Problem → Solution Section */}
      <section className="py-12 sm:py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Why 90% of Startups Get Penalties
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 px-4">
                Traditional compliance vs. Our AI-powered approach
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-red-800 dark:text-red-400 flex items-center gap-2 text-lg sm:text-xl">
                    <AlertTriangle className="h-5 w-5" />
                    Traditional Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-red-700 dark:text-red-300">
                    <li className="flex items-center gap-2">
                      <span className="text-red-500 text-lg">❌</span>
                      <span className="text-sm sm:text-base">Missed deadlines = ₹5L+ penalties</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500 text-lg">❌</span>
                      <span className="text-sm sm:text-base">500+ hour/year paperwork</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500 text-lg">❌</span>
                      <span className="text-sm sm:text-base">MCA portal complexity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500 text-lg">❌</span>
                      <span className="text-sm sm:text-base">No deadline tracking</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="text-center py-4 lg:py-0">
                <div className="lg:hidden mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    VS
                  </div>
                </div>
                <div className="hidden lg:block">
                  <ArrowRight className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto transform transition-transform hover:scale-110" />
                </div>
              </div>

              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-400 flex items-center gap-2 text-lg sm:text-xl">
                    <CheckCircle className="h-5 w-5" />
                    DigiComply AI Advantage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-green-700 dark:text-green-300">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✅</span>
                      <span className="text-sm sm:text-base">Auto-filing before deadlines</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✅</span>
                      <span className="text-sm sm:text-base">All-in-one ROC + GST dashboard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✅</span>
                      <span className="text-sm sm:text-base">Expert CA support included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✅</span>
                      <span className="text-sm sm:text-base">AI-powered risk alerts</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* AI Products Showcase */}
      <section id="products" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <Badge className="mb-4 bg-white/10 backdrop-blur-sm text-white border-white/20">⚡ Powered by AI</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                3 AI Products That Do The Work For You
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-blue-100 px-4 max-w-3xl mx-auto">
                No more late nights filling forms or chasing deadlines. Our AI handles compliance, taxes, and scoring automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* AutoComply */}
              <Link to="/autocomply">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-gray-900 h-full" data-testid="card-autocomply">
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-4">
                      <Zap className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-3 w-fit">Available Now</Badge>
                    <CardTitle className="text-xl sm:text-2xl dark:text-white mb-2">AutoComply</CardTitle>
                    <CardDescription className="text-base dark:text-gray-400">
                      AI creates compliance workflows automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Describe your process in plain English. AI builds the workflow, assigns tasks, and sends reminders - no coding needed.
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Builds workflows in seconds</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Auto-assigns to team members</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Smart deadline reminders</span>
                      </li>
                    </ul>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      ₹8-10 Cr ARR Potential
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* TaxTracker */}
              <Link to="/taxtracker">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-gray-900 h-full" data-testid="card-taxtracker">
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-4">
                      <FileText className="h-7 w-7 text-green-600 dark:text-green-400" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-3 w-fit">Available Now</Badge>
                    <CardTitle className="text-xl sm:text-2xl dark:text-white mb-2">TaxTracker</CardTitle>
                    <CardDescription className="text-base dark:text-gray-400">
                      AI-driven multi-entity filing tracker
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Track GST, TDS, and ITR for multiple entities in one dashboard. AI auto-syncs deadlines and sends alerts.
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Multi-entity tax tracking</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Auto deadline sync</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Tax calculators included</span>
                      </li>
                    </ul>
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      ₹5-7 Cr ARR Potential
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* DigiScore */}
              <Link to="/digiscore">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 h-full" data-testid="card-digiscore">
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-4">
                      <Shield className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-3 w-fit">Available Now</Badge>
                    <CardTitle className="text-xl sm:text-2xl dark:text-white mb-2">DigiScore</CardTitle>
                    <CardDescription className="text-base dark:text-gray-400">
                      Automated compliance health score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Get a 100-point compliance score with AI-powered risk assessment and improvement recommendations.
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>100-point scoring system</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Real-time risk assessment</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Actionable improvement tips</span>
                      </li>
                    </ul>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      ₹3-5 Cr ARR Potential
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Platform Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <Badge className="mb-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">🏢 Enterprise-Grade Platform</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Built For ₹100 Cr+ Revenue Scale
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 px-4 max-w-3xl mx-auto">
                Complete enterprise platform with government integrations, white-label capability, and national-scale architecture
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Globe className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl dark:text-white">Government API Integration</CardTitle>
                  <CardDescription className="text-sm dark:text-gray-400">
                    Direct integration with official portals
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>GSP:</strong> Direct GST filing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>ERI:</strong> Income Tax returns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>MCA21:</strong> Corporate filings</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <BarChart3 className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl dark:text-white">Real-time Analytics</CardTitle>
                  <CardDescription className="text-sm dark:text-gray-400">
                    Comprehensive business intelligence
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Revenue & profit tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Team performance metrics
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Client health scores
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-3">
                  <Users className="h-10 w-10 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <CardTitle className="text-lg sm:text-xl dark:text-white">Agent Network</CardTitle>
                  <CardDescription className="text-sm dark:text-gray-400">
                    Complete partner program
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Lead tracking system
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Commission management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Territory control
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <Badge className="mb-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <Star className="h-4 w-4 mr-1 inline" />
                Simple Pricing
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Transparent Pricing
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 px-4">
                No hidden fees. Government charges shown separately.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <Card className="border-2 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center sm:text-left">
                  <CardTitle className="text-xl sm:text-2xl dark:text-white">Starter Compliance</CardTitle>
                  <CardDescription className="text-sm sm:text-base dark:text-gray-400">Perfect for new startups</CardDescription>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400 mt-4">₹7,499/year</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Everything you need to get started</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">GST Returns (12 filings)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">ROC Basic Filings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">Penalty Protection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">WhatsApp Support</span>
                    </li>
                  </ul>
                  <Link to="/smart-start">
                    <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" data-testid="button-starter-plan">
                      Start Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-500 hover:shadow-xl transition-all duration-300 relative">
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                  Most Popular
                </Badge>
                <CardHeader className="text-center sm:text-left pt-6">
                  <CardTitle className="text-xl sm:text-2xl dark:text-white">Growth Suite</CardTitle>
                  <CardDescription className="text-sm sm:text-base dark:text-gray-400">For growing businesses</CardDescription>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400 mt-4">₹15,999/year</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Everything in Starter + more</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">All Starter features</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">TDS Quarterly Returns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">Annual ROC Compliance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base dark:text-gray-300">Priority Support</span>
                    </li>
                  </ul>
                  <Link to="/smart-start">
                    <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" data-testid="button-growth-plan">
                      Start Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4 bg-white/10 backdrop-blur-sm text-white border-white/20">
              <Sparkles className="h-4 w-4 mr-1 inline" />
              Get Started Today
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Ready for Stress-Free Compliance?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-green-100 px-4">
              Join 5,200+ businesses automating their compliance with AI
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/smart-start">
                <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-base sm:text-lg">
                  Try Free for 14 Days →
                </Button>
              </Link>
              <Link to="/select-role">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-base sm:text-lg">
                  <Users className="h-5 w-5 mr-2" />
                  Access Dashboard
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span>100% Penalty-Free Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>14-Day Free Trial</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UnifiedLanding;
