import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import ModernHeader, { HeaderPresets } from '@/components/ModernHeader';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Building2,
  FileText,
  Clock,
  Users,
  Award,
  Star,
  Phone,
  Mail,
  ArrowRight,
  Play,
  TrendingUp,
  Zap,
  Eye,
  MessageSquare,
  Sparkles,
  Target,
  Globe
} from 'lucide-react';

const LandingPage = () => {
  const [penaltySaved, setPenaltySaved] = useState(2182910);
  const [companiesServed, setCompaniesServed] = useState(5247);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Animated counters
  useEffect(() => {
    const interval = setInterval(() => {
      setPenaltySaved(prev => prev + Math.floor(Math.random() * 1000));
      setCompaniesServed(prev => prev + Math.floor(Math.random() * 2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFreeAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber) {
      // Redirect to WhatsApp with pre-filled message
      window.open(`https://wa.me/918130645164?text=Hi! I want a free compliance risk assessment for my startup. My number is ${phoneNumber}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <ModernHeader
        {...HeaderPresets.digiComplyLanding}
        mobileNavigationItems={[
          { href: '/service-selection', label: 'Services', icon: FileText, description: 'Browse our compliance services' },
          { href: '/package-selection', label: 'Pricing', icon: Star, description: 'View pricing plans' },
          { href: '/platform-showcase', label: 'Demo', icon: Play, description: 'Watch platform demo' },
          { href: '/10k', label: 'Free Scorecard', icon: Shield, description: 'Get compliance assessment' }
        ]}
      />

      {/* Modern Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              Compliance Done Right.<br className="hidden sm:block" />
              <span className="text-yellow-400 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Avoid ₹5L Penalties.
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-blue-100 px-2 max-w-3xl mx-auto">
              MCA, GST, ROC filings automated for Indian startups. 100% penalty-free guarantee with AI-powered compliance tracking
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
              <Link to="/onboarding">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-8 py-4 text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  data-testid="button-start-compliance-check"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Free Compliance Check
                </Button>
              </Link>
              <Link to="/platform-showcase">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-base sm:text-lg backdrop-blur-sm bg-white/10 transition-all duration-300"
                  data-testid="button-watch-demo"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Watch Demo (90s)
                </Button>
              </Link>
            </div>

            {/* Access Dashboard Button */}
            <div className="flex justify-center px-4">
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

            {/* Trust Badges - Mobile Responsive */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-6 sm:mb-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                <span>MCA Empaneled</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                <span>GSTN Certified</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                <span>ISO 27001 Certified</span>
              </div>
            </div>

            {/* Live Counter - Mobile Optimized */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1">
                    ₹{penaltySaved.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    Penalties Saved Today
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1">
                    {companiesServed.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    Startups Protected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section - Mobile First */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Why 90% of Startups Get Penalties
              </h2>
              <p className="text-base sm:text-lg text-gray-600 px-4">
                Traditional compliance vs. Our AI-powered approach
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              <Card className="border-red-200 bg-red-50 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2 text-lg sm:text-xl">
                    <AlertTriangle className="h-5 w-5" />
                    Traditional Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-red-700">
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
                  <ArrowRight className="h-12 w-12 text-blue-600 mx-auto transform transition-transform hover:scale-110" />
                </div>
              </div>

              <Card className="border-green-200 bg-green-50 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2 text-lg sm:text-xl">
                    <CheckCircle className="h-5 w-5" />
                    DigiComply AI Advantage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-green-700">
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

      {/* DigiComply Product Suite */}
      <section id="products" className="py-12 sm:py-16 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                DigiComply AI Suite
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                Comprehensive GRC Tech Platform
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-blue-100 px-4 max-w-3xl mx-auto">
                AI-powered compliance automation products designed for Indian startups and professional firms
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Available Products */}
              <ProductCard
                title="AutoComply"
                description="AI-Powered Compliance Workflow Builder"
                features={["No-code automation", "Smart triggers & actions", "Template library", "6 pre-built workflows"]}
                status="available"
                potential="₹8-10 Cr ARR"
                href="/autocomply"
                icon={<Zap className="h-6 w-6 text-purple-400" />}
              />
              <ProductCard
                title="TaxTracker"
                description="AI-Driven Multi-Entity Filing Tracker"
                features={["GST/TDS/ITR tracking", "Auto-sync deadlines", "Tax calculators", "Filing history"]}
                status="available"
                potential="₹5-7 Cr ARR"
                href="/taxtracker"
                icon={<FileText className="h-6 w-6 text-green-400" />}
              />
              <ProductCard
                title="DigiScore"
                description="Automated Compliance Health Score Engine"
                features={["100-point scoring", "Risk assessment", "Improvement tips", "Score trends"]}
                status="available"
                potential="₹3-5 Cr ARR"
                href="/digiscore"
                icon={<Shield className="h-6 w-6 text-blue-400" />}
              />

              {/* Coming Soon Products */}
              <ProductCard
                title="RegGPT"
                description="Conversational Compliance Advisor"
                features={["Q&A chatbot", "Indian statute knowledge", "Real-time filing logic", "White-label API"]}
                status="coming_soon"
                potential="₹2M ARR"
                icon={<MessageSquare className="h-6 w-6 text-cyan-400" />}
              />
              <ProductCard
                title="NoticeAI"
                description="AI Notice Analyzer + Auto-Response"
                features={["Upload & analyze notices", "Extract key issues", "Generate reply drafts", "Compliance checklist"]}
                status="coming_soon"
                potential="$1M ARR"
                icon={<Eye className="h-6 w-6 text-orange-400" />}
              />
              <ProductCard
                title="FileTrace"
                description="Smart Document Intelligence Layer"
                features={["Auto-tagging & indexing", "Semantic search", "OCR scanning", "Document classification"]}
                status="coming_soon"
                potential="$500K ARR"
                icon={<FileText className="h-6 w-6 text-yellow-400" />}
              />
              <ProductCard
                title="SOPGen"
                description="AI SOP Generator for Regulatory Teams"
                features={["Auto-generate SOPs", "Process documentation", "Audit forms", "Marketplace licensing"]}
                status="coming_soon"
                potential="$2-3M ARR"
                icon={<FileText className="h-6 w-6 text-pink-400" />}
              />
              <ProductCard
                title="AuditFlow"
                description="AI-Powered Internal Audit Builder"
                features={["Risk-based templates", "Findings tracker", "Closure management", "NLP parser"]}
                status="coming_soon"
                potential="$1-2M ARR"
                icon={<CheckCircle className="h-6 w-6 text-teal-400" />}
              />
              <ProductCard
                title="ESGComply"
                description="AI-Driven ESG & CSR Tracker"
                features={["ESG data automation", "GRI/SEBI BRSR reports", "Impact scoring", "Corporate reporting"]}
                status="coming_soon"
                potential="$2-3M ARR"
                icon={<Globe className="h-6 w-6 text-green-400" />}
              />
              <ProductCard
                title="CaseDock"
                description="Legal & NCLT Case Tracker"
                features={["Court notice parser", "Hearing tracker", "NCLT/IBBI sync", "IP/RP workflow"]}
                status="coming_soon"
                potential="$1M ARR"
                icon={<Building2 className="h-6 w-6 text-red-400" />}
              />
            </div>

            <div className="mt-8 sm:mt-12 text-center">
              <p className="text-blue-200 mb-4">
                Building the future of compliance automation in India
              </p>
              <Link to="/contact">
                <Button 
                  size="lg" 
                  className="bg-white text-indigo-900 hover:bg-blue-50"
                  data-testid="button-early-access"
                >
                  Get Early Access
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Service Matrix - Mobile First */}
      <section id="services" className="py-12 sm:py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Shield className="h-4 w-4" />
                Complete Compliance Suite
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Everything Your Startup Needs
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4 max-w-3xl mx-auto">
                Stay compliant and penalty-free with our automated compliance platform designed for Indian businesses
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="border-red-500 border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                  </div>
                  <CardTitle className="text-lg sm:text-xl">🛡️ Incorporation Package</CardTitle>
                  <CardDescription className="text-sm">
                    Pvt Ltd + PAN/TAN + INC-20A
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-green-600 mb-1">₹15,000</div>
                  <div className="text-sm text-gray-500 mb-2">+ 18% GST = ₹17,700</div>
                  <div className="text-sm text-red-600 mb-4 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    180-day deadline
                  </div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors" 
                    data-testid="button-incorporation-package"
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-red-500 border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                  </div>
                  <CardTitle className="text-lg sm:text-xl">📅 Annual Compliance</CardTitle>
                  <CardDescription className="text-sm">
                    AOC-4 + MGT-7 + DIR-3 KYC
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-green-600 mb-1">₹7,499/year</div>
                  <div className="text-sm text-gray-500 mb-2">+ 18% GST = ₹8,849</div>
                  <div className="text-sm text-red-600 mb-4 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    ₹200/day penalty
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 transition-colors" 
                    data-testid="button-annual-compliance"
                  >
                    Auto-Enable
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-blue-500 border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="h-6 w-6 text-yellow-500" />
                    </div>
                    <Badge className="text-xs bg-blue-100 text-blue-800">Recommended</Badge>
                  </div>
                  <CardTitle className="text-lg sm:text-xl">🚀 Startup India Pack</CardTitle>
                  <CardDescription className="text-sm">
                    DPIIT + 80-IAC Valuation
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-green-600 mb-1">₹12,999</div>
                  <div className="text-sm text-gray-500 mb-2">+ 18% GST = ₹15,339</div>
                  <div className="text-sm text-green-600 mb-4 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Tax savings: ₹10L+
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" 
                    data-testid="button-startup-pack"
                  >
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Demo - Mobile Responsive */}
      <section id="demo" className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              How It Works
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
              Compliance Automation in 4 Steps
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
              <div className="text-center group">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Upload Documents</h3>
                <p className="text-xs sm:text-sm text-gray-600">Drag & drop or scan via mobile</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">E-Sign via Digio®</h3>
                <p className="text-xs sm:text-sm text-gray-600">Legally valid digital signatures</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-600 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Auto-File on MCA/GST</h3>
                <p className="text-xs sm:text-sm text-gray-600">Direct submission to govt portals</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  4
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Get Real-time Updates</h3>
                <p className="text-xs sm:text-sm text-gray-600">WhatsApp + email notifications</p>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-gray-100 to-blue-100 border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardContent className="p-4 sm:p-8">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 group-hover:opacity-70 transition-opacity"></div>
                  <Button 
                    size="lg" 
                    className="bg-red-600 hover:bg-red-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative z-10"
                    data-testid="button-watch-mca-demo"
                  >
                    <Play className="h-6 w-6 mr-2" />
                    Watch MCA Filing Demo
                  </Button>
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  See how we file INC-20A forms automatically via MCA portal
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators - Mobile Optimized */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Target className="h-4 w-4" />
              Trust & Performance
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">
              Trusted by 5,200+ Indian Businesses
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12">
              <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors duration-300">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">₹18.7Cr+</div>
                <div className="text-xs sm:text-sm text-blue-200">Penalties Prevented</div>
              </div>
              <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors duration-300">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">99.3%</div>
                <div className="text-xs sm:text-sm text-blue-200">On-time Filing Rate</div>
              </div>
              <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors duration-300">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">5,247</div>
                <div className="text-xs sm:text-sm text-blue-200">Active Companies</div>
              </div>
              <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors duration-300">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-1 sm:mb-2">24/7</div>
                <div className="text-xs sm:text-sm text-blue-200">Expert Support</div>
              </div>
            </div>

            {/* Testimonial - Mobile Optimized */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 border max-w-4xl mx-auto shadow-2xl hover:bg-white/15 transition-colors duration-300">
              <CardContent className="p-4 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                    RS
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="font-bold text-base sm:text-lg">Rahul Sharma</div>
                    <div className="text-blue-200 text-sm sm:text-base">Founder, TechSprint Ventures</div>
                    <div className="text-xs sm:text-sm text-blue-300">Raised ₹8Cr Series A</div>
                  </div>
                </div>
                <blockquote className="text-base sm:text-lg lg:text-xl italic mb-4 text-center sm:text-left">
                  "DigiComply saved us from ₹5L MCA penalty when our CA missed INC-20A deadline.
                  Their auto-alert system is a lifesaver!"
                </blockquote>
                <div className="flex justify-center sm:justify-start">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section - Mobile First */}
      <section id="pricing" className="py-12 sm:py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Star className="h-4 w-4" />
                Simple Pricing
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Transparent Pricing
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4">
                No hidden fees. Government charges shown separately.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-white">
                <CardHeader className="text-center sm:text-left">
                  <CardTitle className="text-xl sm:text-2xl">Starter Compliance</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Perfect for new startups</CardDescription>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 mt-4">₹7,499/year</div>
                  <div className="text-sm text-gray-500">Everything you need to get started</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">GST Returns (12 filings)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">ROC Basic Filings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Penalty Protection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">WhatsApp Support</span>
                    </li>
                  </ul>
                  <Button 
                    className="w-full mt-6 bg-green-600 hover:bg-green-700 transition-colors" 
                    data-testid="button-starter-plan"
                  >
                    Choose Starter
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-500 relative hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 transform hover:scale-105">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 hover:bg-blue-600 px-3 py-1 text-xs font-medium">Most Popular</Badge>
                </div>
                <CardHeader className="text-center sm:text-left pt-6">
                  <CardTitle className="text-xl sm:text-2xl text-blue-900">Growth Suite</CardTitle>
                  <CardDescription className="text-sm sm:text-base">For scaling businesses</CardDescription>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 mt-4">₹24,999/year</div>
                  <div className="text-sm text-gray-500">Complete compliance + growth tools</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">All Starter Features</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Startup India Registration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Director KYC Management</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Tax Consultation (2 sessions)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Dedicated CA Support</span>
                    </li>
                  </ul>
                  <Button 
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl" 
                    data-testid="button-growth-plan"
                  >
                    Choose Growth
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Mobile Responsive */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-purple-400/20"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Get Started Today
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Ready for Stress-Free Compliance?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-green-100 px-4">
              Get <strong>free penalty risk assessment</strong> from our experts
            </p>
            
            <form onSubmit={handleFreeAudit} className="max-w-md mx-auto mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Input
                  type="tel"
                  placeholder="📱 WhatsApp Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 text-black bg-white/90 border-white/20 focus:bg-white transition-colors"
                  required
                  data-testid="input-phone-number"
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  data-testid="button-get-free-audit"
                >
                  Get Free Audit
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                <span className="text-base sm:text-lg font-medium">100% Penalty-Free Guarantee</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-8 text-sm text-green-100 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-3">
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span>Live Chat with CA</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-3">
                <Eye className="h-4 w-4 flex-shrink-0" />
                <span>Real-time Tracking</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-3">
                <Zap className="h-4 w-4 flex-shrink-0" />
                <span>24-hour Setup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Building2 className="h-6 w-6 text-blue-400" />
                  <span className="text-lg sm:text-xl font-bold">DigiComply®</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                  India's most trusted compliance automation platform for startups and SMEs.
                </p>
                <div className="flex gap-3">
                  <Button size="sm" variant="outline" className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800">
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800">
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Services</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li><Link to="/service-selection" className="hover:text-white transition-colors">Company Incorporation</Link></li>
                  <li><Link to="/service-selection" className="hover:text-white transition-colors">Annual Compliance</Link></li>
                  <li><Link to="/service-selection" className="hover:text-white transition-colors">GST Registration</Link></li>
                  <li><Link to="/service-selection" className="hover:text-white transition-colors">Startup India</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Platform</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li><Link to="/portal" className="hover:text-white transition-colors">Client Portal</Link></li>
                  <li><Link to="/operations" className="hover:text-white transition-colors">Operations</Link></li>
                  <li><Link to="/admin" className="hover:text-white transition-colors">Admin</Link></li>
                  <li><Link to="/agent" className="hover:text-white transition-colors">Partners</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Resources</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li><Link to="/10k" className="hover:text-white transition-colors">Free Scorecard</Link></li>
                  <li><Link to="/platform-showcase" className="hover:text-white transition-colors">Platform Demo</Link></li>
                  <li><Link to="/compliance-scorecard" className="hover:text-white transition-colors">Compliance Guide</Link></li>
                  <li>24/7 Support</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-6 sm:pt-8 mt-6 sm:mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs sm:text-sm text-gray-400">
                  © 2025 DigiComply. Part of LegalSuvidha.com Group. All rights reserved.
                </p>
                <div className="flex gap-4 text-xs sm:text-sm text-gray-400">
                  <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                  <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                  <Link to="/security" className="hover:text-white transition-colors">Security</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Product Card Component
interface ProductCardProps {
  title: string;
  description: string;
  features: string[];
  status: "available" | "coming_soon";
  potential: string;
  href?: string;
  icon: React.ReactNode;
}

const ProductCard = ({ title, description, features, status, potential, href, icon }: ProductCardProps) => {
  const card = (
    <Card className={`border-2 ${status === 'available' ? 'border-green-400 bg-gradient-to-br from-white/10 to-white/5' : 'border-gray-400/30 bg-white/5'} hover:shadow-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <Badge 
            className={status === 'available' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}
          >
            {status === 'available' ? 'Available' : 'Coming Soon'}
          </Badge>
        </div>
        <CardTitle className="text-lg sm:text-xl text-white">{title}</CardTitle>
        <CardDescription className="text-sm text-blue-200">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2 mb-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-blue-100">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-white/20 pt-4 mb-4">
          <p className="text-sm text-gray-300">Potential ARR</p>
          <p className="text-lg font-bold text-green-400">{potential}</p>
        </div>
        {status === 'available' && href ? (
          <Link to={href}>
            <Button 
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              data-testid={`button-try-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              Try Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Button 
            variant="outline" 
            className="w-full border-white/30 text-white hover:bg-white/10"
            data-testid={`button-notify-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            Notify Me
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return href && status === 'available' ? card : card;
};

export default LandingPage;