import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Building2,
  Users,
  Settings,
  Phone,
  Mail,
  Briefcase,
  Scale,
  Heart,
  Code,
  GraduationCap,
  Calculator,
  AlertTriangle,
  Calendar,
  Shield,
  TrendingUp,
  Clock,
  FileText,
  IndianRupee,
  Sparkles
} from 'lucide-react';

// Real compliance requirements by business type in India
const complianceDataByType: Record<string, {
  deadlinesPerYear: number;
  keyFilings: string[];
  avgPenaltyRisk: string;
  topCompliances: string[];
}> = {
  legal: {
    deadlinesPerYear: 48,
    keyFilings: ['Bar Council Renewals', 'Professional Tax', 'GST Returns', 'TDS Filings'],
    avgPenaltyRisk: '₹2.5L',
    topCompliances: ['Advocate License Renewal', 'ICAI Compliance', 'Client Trust Account Audit', 'GST Filing']
  },
  accounting: {
    deadlinesPerYear: 72,
    keyFilings: ['GST Returns (12)', 'TDS (12)', 'ITR Filing', 'Audit Reports', 'ICAI CPE Hours'],
    avgPenaltyRisk: '₹5L',
    topCompliances: ['GST Monthly/Quarterly', 'TDS Quarterly', 'Annual Audit', 'ICAI Membership']
  },
  consulting: {
    deadlinesPerYear: 36,
    keyFilings: ['GST Returns', 'Professional Tax', 'TDS Filings', 'Annual Returns'],
    avgPenaltyRisk: '₹1.8L',
    topCompliances: ['GST Filing', 'TDS Compliance', 'Service Tax Transition', 'ROC Returns']
  },
  healthcare: {
    deadlinesPerYear: 56,
    keyFilings: ['Clinical Establishment Renewal', 'PCPNDT Compliance', 'Bio-Medical Waste', 'Drug License'],
    avgPenaltyRisk: '₹8L',
    topCompliances: ['NABH/NABL Renewal', 'Drug License Renewal', 'BMW Compliance', 'Fire Safety Certificate']
  },
  technology: {
    deadlinesPerYear: 42,
    keyFilings: ['GST Returns', 'TDS Filings', 'Startup Compliance', 'ROC Filings', 'ESOP Compliance'],
    avgPenaltyRisk: '₹3L',
    topCompliances: ['GST Filing', 'Annual ROC Return', 'Director KYC', 'Startup India Compliance']
  },
  education: {
    deadlinesPerYear: 38,
    keyFilings: ['UGC/AICTE Compliance', 'Affiliation Renewal', 'NAAC Preparation', 'GST Returns'],
    avgPenaltyRisk: '₹4L',
    topCompliances: ['Affiliation Renewal', 'Accreditation Compliance', 'GST Filing', 'Trust/Society Compliance']
  }
};

const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessType, setBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('');

  const totalSteps = 4;

  const businessTypes = [
    { id: 'legal', icon: Scale, title: 'Legal Services', desc: 'Law firms & legal consultants', stat: '48 deadlines/year' },
    { id: 'accounting', icon: Calculator, title: 'Accounting & Tax', desc: 'CA firms & tax consultants', stat: '72 deadlines/year' },
    { id: 'consulting', icon: Briefcase, title: 'Business Consulting', desc: 'Management & strategy advisors', stat: '36 deadlines/year' },
    { id: 'healthcare', icon: Heart, title: 'Healthcare', desc: 'Clinics & diagnostic centers', stat: '56 deadlines/year' },
    { id: 'technology', icon: Code, title: 'Technology Services', desc: 'IT & software companies', stat: '42 deadlines/year' },
    { id: 'education', icon: GraduationCap, title: 'Education & Training', desc: 'Training institutes & coaching', stat: '38 deadlines/year' },
  ];

  const teamSizes = [
    { id: '1-5', title: '1-5 people', desc: 'Solo or small team', multiplier: 1 },
    { id: '6-20', title: '6-20 people', desc: 'Growing practice', multiplier: 1.5 },
    { id: '21-50', title: '21-50 people', desc: 'Established firm', multiplier: 2 },
    { id: '50+', title: '50+ people', desc: 'Large enterprise', multiplier: 3 },
  ];

  // Get personalized compliance data
  const selectedCompliance = useMemo(() => {
    if (!businessType) return null;
    return complianceDataByType[businessType];
  }, [businessType]);

  // Calculate potential savings based on team size
  const potentialSavings = useMemo(() => {
    if (!businessType || !teamSize) return null;
    const compliance = complianceDataByType[businessType];
    const sizeData = teamSizes.find(s => s.id === teamSize);
    if (!compliance || !sizeData) return null;

    // Parse penalty risk and multiply by team size factor
    const basePenalty = parseInt(compliance.avgPenaltyRisk.replace(/[₹L,]/g, '')) * 100000;
    return Math.round(basePenalty * sizeData.multiplier);
  }, [businessType, teamSize]);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            {/* Emotional Hook */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium mb-4">
                <AlertTriangle className="h-4 w-4" />
                Indian businesses pay ₹2,500+ Cr in compliance penalties yearly
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
                Never miss a compliance deadline again
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tell us your business type and we'll show you exactly what deadlines you're managing
              </p>
            </div>

            {/* Business Type Selection with Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {businessTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                    businessType === type.id
                      ? 'border-2 border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                  onClick={() => setBusinessType(type.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <type.icon className={`h-8 w-8 ${
                        businessType === type.id ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                      {businessType === type.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{type.title}</CardTitle>
                    <CardDescription className="text-sm">{type.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1 text-sm font-semibold text-orange-600">
                      <Clock className="h-4 w-4" />
                      {type.stat}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dynamic Preview when type is selected */}
            {selectedCompliance && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Your Compliance Snapshot
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{selectedCompliance.deadlinesPerYear}</p>
                          <p className="text-xs text-gray-600">Deadlines/Year</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{selectedCompliance.avgPenaltyRisk}</p>
                          <p className="text-xs text-gray-600">Avg. Penalty Risk</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-700">Key Filings:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedCompliance.keyFilings.slice(0, 3).map((filing, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{filing}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-4">
                <Shield className="h-4 w-4" />
                Your data is encrypted and secure
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
                Let's personalize your dashboard
              </h2>
              <p className="text-gray-600">
                {businessType && businessTypes.find(t => t.id === businessType)?.title} compliance — simplified
              </p>
            </div>

            <div className="space-y-5 max-w-lg mx-auto">
              <div>
                <Label htmlFor="businessName" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  Business/Practice Name
                </Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Sharma & Associates"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-2 h-12"
                />
              </div>

              <div>
                <Label htmlFor="ownerName" className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Your Name
                </Label>
                <Input
                  id="ownerName"
                  placeholder="e.g., Rajesh Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-2 h-12"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    Business Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., rajesh@sharma.co.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="e.g., +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2 h-12"
                  />
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex justify-center gap-6 pt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" /> SSL Encrypted
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> GDPR Compliant
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" /> ISO 27001
              </span>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
                How big is your team?
              </h2>
              <p className="text-gray-600">
                We'll configure the right number of user seats and workflows
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {teamSizes.map((size) => (
                <Card
                  key={size.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    teamSize === size.id
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                  onClick={() => setTeamSize(size.id)}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-2">
                      {teamSize === size.id ? (
                        <CheckCircle className="h-8 w-8 text-blue-600" />
                      ) : (
                        <Users className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{size.title}</CardTitle>
                    <CardDescription>{size.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Value Preview when team size is selected */}
            {teamSize && selectedCompliance && potentialSavings && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 max-w-2xl mx-auto">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-3">
                      <TrendingUp className="h-4 w-4" />
                      Your Potential Savings
                    </div>
                    <p className="text-4xl font-bold text-green-600 mb-2">
                      {formatCurrency(potentialSavings)}
                    </p>
                    <p className="text-sm text-gray-600">
                      in avoided penalties and late fees per year
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-green-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedCompliance.deadlinesPerYear}</p>
                      <p className="text-xs text-gray-600">Deadlines Tracked</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">48hrs</p>
                      <p className="text-xs text-gray-600">Early Reminders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">100%</p>
                      <p className="text-xs text-gray-600">Compliance Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        const selectedBusiness = businessTypes.find(t => t.id === businessType);
        const selectedSize = teamSizes.find(s => s.id === teamSize);

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur opacity-25 animate-pulse"></div>
                <div className="relative bg-green-100 rounded-full p-4">
                  <Sparkles className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
                {businessName || 'Your business'} is ready to go!
              </h2>
              <p className="text-lg text-gray-600">
                We've configured your compliance dashboard based on your needs
              </p>
            </div>

            {/* Visual Summary Card */}
            <Card className="max-w-2xl mx-auto overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Your Platform</p>
                    <h3 className="text-2xl font-bold">{businessName || 'Your Business'}</h3>
                    <p className="text-blue-100 text-sm mt-1">{ownerName}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-white/20 text-white border-0">
                      {selectedBusiness?.title}
                    </Badge>
                    <p className="text-blue-100 text-sm mt-2">{selectedSize?.title}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedCompliance?.deadlinesPerYear || 0}
                    </p>
                    <p className="text-sm text-gray-600">Compliance Deadlines</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <IndianRupee className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {potentialSavings ? formatCurrency(potentialSavings) : '₹0'}
                    </p>
                    <p className="text-sm text-gray-600">Potential Savings</p>
                  </div>
                </div>

                {/* Top Compliances Preview */}
                {selectedCompliance && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Key compliances we'll track for you:
                    </p>
                    <div className="space-y-2">
                      {selectedCompliance.topCompliances.map((compliance, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{compliance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Link to="/admin" className="flex-1">
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base">
                  <Settings className="h-5 w-5 mr-2" />
                  Launch Dashboard
                </Button>
              </Link>
              <Link to="/portal" className="flex-1">
                <Button variant="outline" className="w-full h-12 text-base">
                  <Users className="h-5 w-5 mr-2" />
                  Preview Portal
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-500">
                Join 500+ Indian businesses managing compliance with DigiComply
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return businessType !== '';
      case 2: return businessName && ownerName && email && phone;
      case 3: return teamSize !== '';
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">DigiComply</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">Step {currentStep} of {totalSteps}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-2 rounded-full transition-all ${
                      step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-4xl mx-auto">
          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2 h-11"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
            </div>

            <div>
              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-11 px-6"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/admin">
                  <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white h-11 px-6">
                    Start Managing Compliance
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Help Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Setup takes less than 2 minutes
            </p>
            <div className="flex gap-3">
              <Button size="sm" variant="ghost" className="text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-1" />
                1800-XXX-XXXX
              </Button>
              <Button size="sm" variant="ghost" className="text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-1" />
                support@digicomply.in
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingFlow;
