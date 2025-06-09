import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  MessageSquare
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
      window.open(`https://wa.me/918826990111?text=Hi! I want a free compliance risk assessment for my startup. My number is ${phoneNumber}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900">DigiComply®</span>
                <span className="text-xs text-gray-500">Part of LegalSuvidha.com Group</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex gap-6">
                <Link href="/service-selection" className="text-gray-600 hover:text-blue-600">Services</Link>
                <Link href="/package-selection" className="text-gray-600 hover:text-blue-600">Pricing</Link>
                <Link href="/platform-showcase" className="text-gray-600 hover:text-blue-600">Demo</Link>
              </nav>
              <Link href="/onboarding">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-indigo-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Compliance Done Right. <br />
              <span className="text-yellow-400">Avoid ₹5L Penalties.</span>
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              MCA, GST, ROC filings automated for Indian startups. 100% penalty-free guarantee
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <Link href="/onboarding">
                <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4">
                  Start Free Compliance Check
                </Button>
              </Link>
              <Link href="/platform-showcase">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4">
                  <Play className="h-5 w-5 mr-2" />
                  Watch Demo (90s)
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-400" />
                <span className="text-sm">MCA Empaneled</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-yellow-400" />
                <span className="text-sm">GSTN Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-blue-400" />
                <span className="text-sm">ISO 27001 Certified</span>
              </div>
            </div>

            {/* Live Counter */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                ₹{penaltySaved.toLocaleString()} saved today
              </div>
              <div className="text-blue-200">
                {companiesServed.toLocaleString()} startups protected from MCA penalties
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Traditional Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-red-700">
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">❌</span>
                      Missed deadlines = ₹5L+ penalties
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">❌</span>
                      500+ hour/year paperwork
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">❌</span>
                      MCA portal complexity
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="text-center">
                <ArrowRight className="h-12 w-12 text-blue-600 mx-auto" />
              </div>

              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    DigiComply Advantage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-green-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      Auto-filing before deadlines
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      All-in-one ROC + GST dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      Expert CA support included
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Service Matrix */}
      <section id="services" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Complete Compliance Suite
              </h2>
              <p className="text-xl text-gray-600">
                Everything your startup needs to stay compliant and penalty-free
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-red-500 border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <Badge variant="destructive">Mandatory</Badge>
                  </div>
                  <CardTitle>🛡️ Incorporation Package</CardTitle>
                  <CardDescription>
                    Pvt Ltd + PAN/TAN + INC-20A
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-1">₹15,000</div>
                  <div className="text-sm text-gray-500 mb-2">+ 18% GST = ₹17,700</div>
                  <div className="text-sm text-red-600 mb-4">
                    <Clock className="h-4 w-4 inline mr-1" />
                    180-day deadline
                  </div>
                  <Button className="w-full">Get Started</Button>
                </CardContent>
              </Card>

              <Card className="border-red-500 border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <Badge variant="destructive">Mandatory</Badge>
                  </div>
                  <CardTitle>📅 Annual Compliance</CardTitle>
                  <CardDescription>
                    AOC-4 + MGT-7 + DIR-3 KYC
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-1">₹7,499/year</div>
                  <div className="text-sm text-gray-500 mb-2">+ 18% GST = ₹8,849</div>
                  <div className="text-sm text-red-600 mb-4">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    ₹200/day penalty
                  </div>
                  <Button className="w-full">Auto-Enable</Button>
                </CardContent>
              </Card>

              <Card className="border-blue-500 border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Star className="h-8 w-8 text-yellow-500" />
                    <Badge>Add-on</Badge>
                  </div>
                  <CardTitle>🚀 Startup India Pack</CardTitle>
                  <CardDescription>
                    DPIIT + 80-IAC Valuation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-1">₹12,999</div>
                  <div className="text-sm text-gray-500 mb-2">+ 18% GST = ₹15,339</div>
                  <div className="text-sm text-green-600 mb-4">
                    <TrendingUp className="h-4 w-4 inline mr-1" />
                    Tax savings: ₹10L+
                  </div>
                  <Button variant="outline" className="w-full">Learn More</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Demo */}
      <section id="demo" className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">
              How Compliance Automation Works
            </h2>
            
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">1</div>
                <h3 className="font-semibold mb-2">Upload Documents</h3>
                <p className="text-sm text-gray-600">Drag & drop or scan via mobile</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">2</div>
                <h3 className="font-semibold mb-2">E-Sign via Digio®</h3>
                <p className="text-sm text-gray-600">Legally valid digital signatures</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">3</div>
                <h3 className="font-semibold mb-2">Auto-File on MCA/GST</h3>
                <p className="text-sm text-gray-600">Direct submission to govt portals</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">4</div>
                <h3 className="font-semibold mb-2">Get Real-time Updates</h3>
                <p className="text-sm text-gray-600">WhatsApp + email notifications</p>
              </div>
            </div>

            <Card className="bg-gray-100">
              <CardContent className="p-8">
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700">
                    <Play className="h-6 w-6 mr-2" />
                    Watch MCA Filing Demo
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  See how we file INC-20A forms automatically via MCA portal
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">
              Trusted by 5,200+ Indian Businesses
            </h2>
            
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">₹18.7Cr+</div>
                <div className="text-blue-200">Penalties Prevented</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">99.3%</div>
                <div className="text-blue-200">On-time Filing Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">5,247</div>
                <div className="text-blue-200">Active Companies</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">24/7</div>
                <div className="text-blue-200">Expert Support</div>
              </div>
            </div>

            {/* Testimonial */}
            <Card className="bg-white/10 backdrop-blur-sm border-0 max-w-4xl mx-auto">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    RS
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Rahul Sharma</div>
                    <div className="text-blue-200">Founder, TechSprint Ventures</div>
                    <div className="text-sm text-blue-300">Raised ₹8Cr Series A</div>
                  </div>
                </div>
                <blockquote className="text-xl italic mb-4">
                  "DigiComply saved us from ₹5L MCA penalty when our CA missed INC-20A deadline.
                  Their auto-alert system is a lifesaver!"
                </blockquote>
                <div className="flex justify-center">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600">
                No hidden fees. Government charges shown separately.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Starter Compliance</CardTitle>
                  <CardDescription>Perfect for new startups</CardDescription>
                  <div className="text-4xl font-bold text-green-600">₹7,499/year</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      GST Returns (12 filings)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      ROC Basic Filings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Penalty Protection
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      WhatsApp Support
                    </li>
                  </ul>
                  <Button className="w-full mt-6">Choose Starter</Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-500 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500">Most Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle>Growth Suite</CardTitle>
                  <CardDescription>For scaling businesses</CardDescription>
                  <div className="text-4xl font-bold text-green-600">₹24,999/year</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      All Starter Features
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Startup India Registration
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Director KYC Management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Tax Consultation (2 sessions)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Dedicated CA Support
                    </li>
                  </ul>
                  <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">Choose Growth</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">
              Ready for Stress-Free Compliance?
            </h2>
            <p className="text-xl mb-8 text-green-100">
              Get <strong>free penalty risk assessment</strong> from our experts
            </p>
            
            <form onSubmit={handleFreeAudit} className="max-w-md mx-auto mb-8">
              <div className="flex gap-4">
                <Input
                  type="tel"
                  placeholder="📱 WhatsApp Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 text-black"
                  required
                />
                <Button type="submit" size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  Get Free Audit
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-2 mb-8">
              <Shield className="h-6 w-6 text-green-400" />
              <span className="text-lg">100% Penalty-Free Guarantee</span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-green-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Live Chat with CA</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Real-time Progress Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>24-hour Setup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold">DigiComply®</span>
              </div>
              <p className="text-gray-400 mb-4">
                India's most trusted compliance automation platform for startups and SMEs.
              </p>
              <div className="flex gap-4">
                <Phone className="h-5 w-5 text-blue-400" />
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Company Incorporation</li>
                <li>Annual Compliance</li>
                <li>GST Filing</li>
                <li>Startup India</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Compliance Calendar</li>
                <li>Penalty Calculator</li>
                <li>Expert Blogs</li>
                <li>Help Center</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>📞 +91 88269 90111</li>
                <li>✉️ support@digicomply.in</li>
                <li>📍 Bangalore, India</li>
              </ul>
            </div>
          </div>
          
          <Separator className="my-8 bg-gray-700" />
          
          <div className="text-center text-gray-400 space-y-2">
            <p className="text-sm">
              <strong>Billing Entity:</strong> DigiComply Solutions Private Limited | GSTIN: 29AAJCD2314K1Z7
            </p>
            <p className="text-sm">
              Part of <strong>LegalSuvidha.com Group</strong> | All prices inclusive of 18% GST
            </p>
            <p>© 2024 DigiComply®. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;