import { useState, useMemo } from 'react';
import { MinimalLayout } from '@/layouts';
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
  Calculator,
  AlertTriangle,
  Calendar,
  Shield,
  TrendingUp,
  Clock,
  FileText,
  IndianRupee,
  Sparkles,
  Quote,
  Star,
  Stethoscope,
  Landmark,
  BookOpen,
  Laptop,
  Award
} from 'lucide-react';

// A/B Test Configuration - change variant to test different headlines
// Variant A: Fear-based (default), Variant B: Aspiration-based
const getABVariant = (): 'A' | 'B' => {
  // Check URL param first for testing: ?variant=B
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlVariant = params.get('variant');
    if (urlVariant === 'A' || urlVariant === 'B') return urlVariant;

    // Otherwise use stored variant or randomly assign
    const stored = localStorage.getItem('onboarding_variant');
    if (stored === 'A' || stored === 'B') return stored;

    const newVariant = Math.random() > 0.5 ? 'A' : 'B';
    localStorage.setItem('onboarding_variant', newVariant);
    return newVariant;
  }
  return 'A';
};

const HEADLINES = {
  A: {
    hook: 'Indian businesses pay ₹2,500+ Cr in compliance penalties yearly',
    title: 'Never miss a compliance deadline again',
    subtitle: 'Tell us your business type and we\'ll show you exactly what deadlines you\'re managing'
  },
  B: {
    hook: 'Join 500+ businesses with 100% compliance rate',
    title: 'Your compliance, completely automated',
    subtitle: 'Select your industry and see how we simplify your regulatory requirements'
  }
};

// Real compliance requirements by business type in India
const complianceDataByType: Record<string, {
  deadlinesPerYear: number;
  keyFilings: string[];
  avgPenaltyRisk: string;
  topCompliances: string[];
  color: string;
  gradient: string;
  testimonial: {
    quote: string;
    author: string;
    role: string;
    company: string;
  };
}> = {
  legal: {
    deadlinesPerYear: 48,
    keyFilings: ['Bar Council Renewals', 'Professional Tax', 'GST Returns', 'TDS Filings'],
    avgPenaltyRisk: '₹2.5L',
    topCompliances: ['Advocate License Renewal', 'ICAI Compliance', 'Client Trust Account Audit', 'GST Filing'],
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-600',
    testimonial: {
      quote: 'DigiComply helped us track all Bar Council deadlines. We haven\'t missed a single renewal since.',
      author: 'Adv. Priya Mehta',
      role: 'Senior Partner',
      company: 'Mehta & Associates, Mumbai'
    }
  },
  accounting: {
    deadlinesPerYear: 72,
    keyFilings: ['GST Returns (12)', 'TDS (12)', 'ITR Filing', 'Audit Reports', 'ICAI CPE Hours'],
    avgPenaltyRisk: '₹5L',
    topCompliances: ['GST Monthly/Quarterly', 'TDS Quarterly', 'Annual Audit', 'ICAI Membership'],
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    testimonial: {
      quote: 'Managing 200+ client GST filings was a nightmare. Now it\'s automated with zero late fees.',
      author: 'CA Rajesh Kumar',
      role: 'Founding Partner',
      company: 'Kumar & Co., Delhi'
    }
  },
  consulting: {
    deadlinesPerYear: 36,
    keyFilings: ['GST Returns', 'Professional Tax', 'TDS Filings', 'Annual Returns'],
    avgPenaltyRisk: '₹1.8L',
    topCompliances: ['GST Filing', 'TDS Compliance', 'Service Tax Transition', 'ROC Returns'],
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    testimonial: {
      quote: 'We scaled from 5 to 50 clients without adding compliance staff. DigiComply handles it all.',
      author: 'Vikram Singh',
      role: 'CEO',
      company: 'StratEdge Consulting, Bangalore'
    }
  },
  healthcare: {
    deadlinesPerYear: 56,
    keyFilings: ['Clinical Establishment Renewal', 'PCPNDT Compliance', 'Bio-Medical Waste', 'Drug License'],
    avgPenaltyRisk: '₹8L',
    topCompliances: ['NABH/NABL Renewal', 'Drug License Renewal', 'BMW Compliance', 'Fire Safety Certificate'],
    color: 'rose',
    gradient: 'from-rose-500 to-pink-600',
    testimonial: {
      quote: 'Healthcare compliance is complex. DigiComply alerts us 30 days before any license expires.',
      author: 'Dr. Anita Sharma',
      role: 'Medical Director',
      company: 'LifeCare Hospital, Pune'
    }
  },
  technology: {
    deadlinesPerYear: 42,
    keyFilings: ['GST Returns', 'TDS Filings', 'Startup Compliance', 'ROC Filings', 'ESOP Compliance'],
    avgPenaltyRisk: '₹3L',
    topCompliances: ['GST Filing', 'Annual ROC Return', 'Director KYC', 'Startup India Compliance'],
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    testimonial: {
      quote: 'As a funded startup, investor compliance is critical. DigiComply keeps our governance perfect.',
      author: 'Arjun Patel',
      role: 'Co-founder & CTO',
      company: 'TechVenture Labs, Hyderabad'
    }
  },
  education: {
    deadlinesPerYear: 38,
    keyFilings: ['UGC/AICTE Compliance', 'Affiliation Renewal', 'NAAC Preparation', 'GST Returns'],
    avgPenaltyRisk: '₹4L',
    topCompliances: ['Affiliation Renewal', 'Accreditation Compliance', 'GST Filing', 'Trust/Society Compliance'],
    color: 'sky',
    gradient: 'from-sky-500 to-blue-600',
    testimonial: {
      quote: 'NAAC and affiliation renewals are now stress-free. We focus on education, not paperwork.',
      author: 'Prof. Sunita Rao',
      role: 'Director',
      company: 'Excellence Institute, Chennai'
    }
  }
};

// Industry-specific icons with colors
const industryIcons: Record<string, { icon: typeof Scale; bgColor: string; iconColor: string }> = {
  legal: { icon: Landmark, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  accounting: { icon: Calculator, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  consulting: { icon: Briefcase, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
  healthcare: { icon: Stethoscope, bgColor: 'bg-rose-100', iconColor: 'text-rose-600' },
  technology: { icon: Laptop, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  education: { icon: BookOpen, bgColor: 'bg-sky-100', iconColor: 'text-sky-600' }
};

const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessType, setBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);
  const [abVariant] = useState<'A' | 'B'>(getABVariant);

  const totalSteps = 4;
  const headlines = HEADLINES[abVariant];

  const businessTypes = [
    { id: 'legal', icon: Landmark, title: 'Legal Services', desc: 'Law firms & legal consultants', stat: '48 deadlines/year' },
    { id: 'accounting', icon: Calculator, title: 'Accounting & Tax', desc: 'CA firms & tax consultants', stat: '72 deadlines/year' },
    { id: 'consulting', icon: Briefcase, title: 'Business Consulting', desc: 'Management & strategy advisors', stat: '36 deadlines/year' },
    { id: 'healthcare', icon: Stethoscope, title: 'Healthcare', desc: 'Clinics & diagnostic centers', stat: '56 deadlines/year' },
    { id: 'technology', icon: Laptop, title: 'Technology Services', desc: 'IT & software companies', stat: '42 deadlines/year' },
    { id: 'education', icon: BookOpen, title: 'Education & Training', desc: 'Training institutes & coaching', stat: '38 deadlines/year' },
  ];

  const teamSizes = [
    { id: '1-5', title: '1-5 people', desc: 'Solo or small team', multiplier: 1, icon: '👤' },
    { id: '6-20', title: '6-20 people', desc: 'Growing practice', multiplier: 1.5, icon: '👥' },
    { id: '21-50', title: '21-50 people', desc: 'Established firm', multiplier: 2, icon: '🏢' },
    { id: '50+', title: '50+ people', desc: 'Large enterprise', multiplier: 3, icon: '🏛️' },
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

    const basePenalty = parseInt(compliance.avgPenaltyRisk.replace(/[₹L,]/g, '')) * 100000;
    return Math.round(basePenalty * sizeData.multiplier);
  }, [businessType, teamSize]);

  const nextStep = () => {
    if (currentStep < totalSteps && !isAnimating) {
      setSlideDirection('right');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const prevStep = () => {
    if (currentStep > 1 && !isAnimating) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Testimonial Component
  const TestimonialCard = ({ testimonial }: { testimonial: typeof complianceDataByType.legal.testimonial }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex gap-3">
        <Quote className="h-8 w-8 text-blue-400 flex-shrink-0 opacity-50" />
        <div>
          <p className="text-sm text-gray-700 italic mb-3">"{testimonial.quote}"</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {testimonial.author.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{testimonial.author}</p>
              <p className="text-xs text-gray-500">{testimonial.role}, {testimonial.company}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    const animationClass = isAnimating
      ? slideDirection === 'right'
        ? 'opacity-0 translate-x-4'
        : 'opacity-0 -translate-x-4'
      : 'opacity-100 translate-x-0';

    switch (currentStep) {
      case 1:
        return (
          <div className={`space-y-6 md:space-y-8 transition-all duration-300 ease-out ${animationClass}`}>
            {/* Emotional Hook - A/B Tested */}
            <div className="text-center mb-6 md:mb-8">
              <div className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 ${abVariant === 'A' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'} rounded-full text-xs md:text-sm font-medium mb-4`}>
                {abVariant === 'A' ? <AlertTriangle className="h-4 w-4" /> : <Award className="h-4 w-4" />}
                {headlines.hook}
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-900 px-2">
                {headlines.title}
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                {headlines.subtitle}
              </p>
            </div>

            {/* Business Type Selection with Industry Colors */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {businessTypes.map((type) => {
                const industryStyle = industryIcons[type.id];
                const isSelected = businessType === type.id;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${
                      isSelected
                        ? `border-2 border-${complianceDataByType[type.id].color}-500 bg-${complianceDataByType[type.id].color}-50 shadow-lg`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setBusinessType(type.id)}
                  >
                    <CardHeader className="p-3 md:p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg ${isSelected ? industryStyle.bgColor : 'bg-gray-100'}`}>
                          <type.icon className={`h-5 w-5 md:h-6 md:w-6 ${isSelected ? industryStyle.iconColor : 'text-gray-500'}`} />
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-green-500 animate-in zoom-in duration-200" />
                        )}
                      </div>
                      <CardTitle className="text-sm md:text-base mt-2">{type.title}</CardTitle>
                      <CardDescription className="text-xs hidden md:block">{type.desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 md:p-4 pt-0">
                      <div className="flex items-center gap-1 text-xs md:text-sm font-semibold text-orange-600">
                        <Clock className="h-3 w-3 md:h-4 md:w-4" />
                        {type.stat}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Dynamic Preview + Testimonial when type is selected */}
            {selectedCompliance && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className={`bg-gradient-to-r ${selectedCompliance.gradient} text-white overflow-hidden`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-3">
                          Your Compliance Snapshot
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-3xl md:text-4xl font-bold">{selectedCompliance.deadlinesPerYear}</p>
                            <p className="text-xs text-white/80">Deadlines/Year</p>
                          </div>
                          <div>
                            <p className="text-3xl md:text-4xl font-bold">{selectedCompliance.avgPenaltyRisk}</p>
                            <p className="text-xs text-white/80">Penalty Risk</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm font-medium mb-2">Key Filings:</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedCompliance.keyFilings.slice(0, 4).map((filing, i) => (
                                <Badge key={i} className="bg-white/20 text-white border-0 text-xs">{filing}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Testimonial */}
                <TestimonialCard testimonial={selectedCompliance.testimonial} />
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className={`space-y-6 transition-all duration-300 ease-out ${animationClass}`}>
            <div className="text-center mb-6 md:mb-8">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs md:text-sm font-medium mb-4">
                <Shield className="h-4 w-4" />
                Your data is encrypted and secure
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
                Let's personalize your dashboard
              </h2>
              <p className="text-gray-600">
                {businessType && businessTypes.find(t => t.id === businessType)?.title} compliance — simplified
              </p>
            </div>

            <div className="space-y-4 md:space-y-5 max-w-lg mx-auto px-2">
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
                  className="mt-2 h-12 text-base"
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
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
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
                    className="mt-2 h-12 text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2 h-12 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Trust Indicators - Mobile optimized */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-6 pt-4 text-xs md:text-sm text-gray-500">
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
          <div className={`space-y-6 transition-all duration-300 ease-out ${animationClass}`}>
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
                How big is your team?
              </h2>
              <p className="text-gray-600 px-4">
                We'll configure the right number of user seats and workflows
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
              {teamSizes.map((size) => (
                <Card
                  key={size.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${
                    teamSize === size.id
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                  onClick={() => setTeamSize(size.id)}
                >
                  <CardHeader className="text-center p-4 pb-2">
                    <div className="flex justify-center mb-2">
                      <span className="text-3xl">{size.icon}</span>
                    </div>
                    <CardTitle className="text-base md:text-lg">{size.title}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">{size.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Value Preview when team size is selected */}
            {teamSize && selectedCompliance && potentialSavings && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-3">
                      <TrendingUp className="h-4 w-4" />
                      Your Potential Savings
                    </div>
                    <p className="text-4xl md:text-5xl font-bold text-green-600 mb-2">
                      {formatCurrency(potentialSavings)}
                    </p>
                    <p className="text-sm text-gray-600">
                      in avoided penalties and late fees per year
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6 pt-4 border-t border-green-200">
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-bold text-gray-900">{selectedCompliance.deadlinesPerYear}</p>
                      <p className="text-[10px] md:text-xs text-gray-600">Deadlines Tracked</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-bold text-gray-900">48hrs</p>
                      <p className="text-[10px] md:text-xs text-gray-600">Early Reminders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-bold text-gray-900">100%</p>
                      <p className="text-[10px] md:text-xs text-gray-600">Compliance Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testimonial for selected business type */}
            {selectedCompliance && (
              <div className="max-w-2xl mx-auto">
                <TestimonialCard testimonial={selectedCompliance.testimonial} />
              </div>
            )}
          </div>
        );

      case 4:
        const selectedBusiness = businessTypes.find(t => t.id === businessType);
        const selectedSize = teamSizes.find(s => s.id === teamSize);

        return (
          <div className={`space-y-6 transition-all duration-300 ease-out ${animationClass}`}>
            <div className="text-center mb-6 md:mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur opacity-25 animate-pulse"></div>
                <div className="relative bg-green-100 rounded-full p-4">
                  <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-900 px-2">
                {businessName || 'Your business'} is ready!
              </h2>
              <p className="text-base md:text-lg text-gray-600 px-4">
                We've configured your compliance dashboard
              </p>
            </div>

            {/* Visual Summary Card */}
            <Card className="max-w-2xl mx-auto overflow-hidden shadow-xl">
              <div className={`bg-gradient-to-r ${selectedCompliance?.gradient || 'from-blue-600 to-indigo-600'} p-4 md:p-6 text-white`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-white/70 text-sm">Your Platform</p>
                    <h3 className="text-xl md:text-2xl font-bold">{businessName || 'Your Business'}</h3>
                    <p className="text-white/70 text-sm mt-1">{ownerName}</p>
                  </div>
                  <div className="sm:text-right">
                    <Badge className="bg-white/20 text-white border-0">
                      {selectedBusiness?.title}
                    </Badge>
                    <p className="text-white/70 text-sm mt-2">{selectedSize?.title}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6">
                  <div className="text-center p-3 md:p-4 bg-orange-50 rounded-xl">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                      {selectedCompliance?.deadlinesPerYear || 0}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">Deadlines</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-green-50 rounded-xl">
                    <IndianRupee className="h-5 w-5 md:h-6 md:w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                      {potentialSavings ? formatCurrency(potentialSavings) : '₹0'}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">Savings/Year</p>
                  </div>
                </div>

                {/* Top Compliances Preview */}
                {selectedCompliance && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Key compliances we'll track:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedCompliance.topCompliances.map((compliance, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="truncate">{compliance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA Buttons - Mobile optimized */}
            <div className="flex flex-col gap-3 max-w-md mx-auto px-2">
              <Link to="/admin" className="w-full">
                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-lg">
                  <Settings className="h-5 w-5 mr-2" />
                  Launch Dashboard
                </Button>
              </Link>
              <Link to="/portal" className="w-full">
                <Button variant="outline" className="w-full h-12 text-base">
                  <Users className="h-5 w-5 mr-2" />
                  Preview Client Portal
                </Button>
              </Link>
            </div>

            {/* Social Proof with Stars */}
            <div className="text-center pt-4 space-y-2">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Trusted by 500+ Indian businesses
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
    <MinimalLayout>
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header - Mobile optimized */}
        <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 md:p-2 bg-blue-600 rounded-lg">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold text-gray-900">DigiComply</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm text-gray-600 hidden sm:block">Step {currentStep} of {totalSteps}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-6 md:w-8 h-1.5 md:h-2 rounded-full transition-all duration-300 ${
                      step < currentStep
                        ? 'bg-green-500'
                        : step === currentStep
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-6 md:py-8 pb-28 md:pb-24">
        <div className="max-w-4xl mx-auto">
          {renderStep()}

          {/* Navigation - Mobile optimized */}
          <div className="flex justify-between items-center mt-6 md:mt-8 gap-4">
            <div className="flex-1">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isAnimating}
                  className="flex items-center gap-2 h-11 md:h-12 px-4 md:px-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              )}
            </div>

            <div className="flex-1 flex justify-end">
              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed() || isAnimating}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-11 md:h-12 px-6 md:px-8 font-medium"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/admin">
                  <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white h-11 md:h-12 px-4 md:px-6 font-medium">
                    <span className="hidden sm:inline">Start Managing</span>
                    <span className="sm:hidden">Start</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Help Footer - Mobile optimized */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t py-2.5 md:py-3 z-40">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              Setup takes less than 2 minutes
            </p>
            <div className="flex gap-2 md:gap-3">
              <Button size="sm" variant="ghost" className="text-xs md:text-sm text-gray-600 h-8 px-2 md:px-3">
                <Phone className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">1800-XXX-XXXX</span>
                <span className="sm:hidden">Call</span>
              </Button>
              <Button size="sm" variant="ghost" className="text-xs md:text-sm text-gray-600 h-8 px-2 md:px-3">
                <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">support@digicomply.in</span>
                <span className="sm:hidden">Email</span>
              </Button>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </MinimalLayout>
  );
};

export default OnboardingFlow;
