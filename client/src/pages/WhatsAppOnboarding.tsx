import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DashboardNav from '@/components/DashboardNav';
import TrustBar from '@/components/TrustBar';
import { 
  MessageCircle, 
  Shield, 
  Clock, 
  CheckCircle, 
  Building2, 
  Users, 
  Store, 
  Briefcase,
  ArrowRight,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Star,
  Zap,
  Target,
  Award
} from 'lucide-react';

interface WhatsAppFlow {
  step: 'welcome' | 'assessment' | 'package' | 'payment' | 'confirmation';
  businessData: {
    companyName: string;
    businessType: string;
    contactNumber: string;
    email: string;
    cin?: string;
    gstin?: string;
    urgentNeeds: string[];
  };
  selectedPackage: 'basic' | 'growth' | 'premium' | null;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  assessmentScore: number;
}

interface ServicePackage {
  id: 'basic' | 'growth' | 'premium';
  name: string;
  price: number;
  originalPrice: number;
  features: string[];
  idealFor: string;
  commission: number;
  urgentServices: string[];
  support: string;
  turnaround: string;
  guarantee: string;
}

const WhatsAppOnboarding = () => {
  const [, setLocation] = useLocation();
  const [flowData, setFlowData] = useState<WhatsAppFlow>({
    step: 'welcome',
    businessData: {
      companyName: '',
      businessType: '',
      contactNumber: '',
      email: '',
      urgentNeeds: []
    },
    selectedPackage: null,
    paymentStatus: 'pending',
    assessmentScore: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes

  // Timer for urgency
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const businessTypes = [
    {
      id: 'private_limited',
      name: 'Private Limited Company',
      icon: Building2,
      riskLevel: 'High',
      avgPenalty: '₹125K',
      marketShare: '68%'
    },
    {
      id: 'llp',
      name: 'Limited Liability Partnership',
      icon: Users,
      riskLevel: 'Medium',
      avgPenalty: '₹85K',
      marketShare: '18%'
    },
    {
      id: 'opc',
      name: 'One Person Company',
      icon: Briefcase,
      riskLevel: 'Medium',
      avgPenalty: '₹95K',
      marketShare: '9%'
    },
    {
      id: 'proprietorship',
      name: 'Sole Proprietorship',
      icon: Store,
      riskLevel: 'Low',
      avgPenalty: '₹45K',
      marketShare: '5%'
    }
  ];

  const servicePackages: ServicePackage[] = [
    {
      id: 'basic',
      name: 'Startup Shield',
      price: 15999,
      originalPrice: 25999,
      features: [
        'Company Registration/LLP Formation',
        'GST Registration & Setup',
        'Basic Tax Filing (ITR, GST Returns)',
        'Essential ROC Compliances',
        'WhatsApp Support (9 AM - 6 PM)',
        'Compliance Calendar Access',
        'Document Repository',
        'Penalty Protection up to ₹50K'
      ],
      idealFor: 'New startups & small businesses',
      commission: 2999,
      urgentServices: ['Company Registration', 'GST Registration', 'Basic Compliance'],
      support: 'WhatsApp Business Hours',
      turnaround: '7-14 days',
      guarantee: '₹50K Penalty Protection'
    },
    {
      id: 'growth',
      name: 'Scale Pro',
      price: 35999,
      originalPrice: 55999,
      features: [
        'Everything in Startup Shield',
        'Monthly Compliance Calendar',
        'Financial Statement Preparation',
        'ESI/PF Registration & Management',
        'Dedicated CA Assignment',
        'Priority WhatsApp Support',
        'Quarterly Business Review',
        'Advanced Tax Planning',
        'Penalty Protection up to ₹150K'
      ],
      idealFor: 'Growing businesses with employees',
      commission: 6999,
      urgentServices: ['Advanced Compliance', 'Employee Benefits', 'Tax Optimization'],
      support: 'Dedicated CA + Priority Support',
      turnaround: '3-7 days',
      guarantee: '₹150K Penalty Protection'
    },
    {
      id: 'premium',
      name: 'Enterprise Elite',
      price: 75999,
      originalPrice: 125999,
      features: [
        'Everything in Scale Pro',
        'Advanced Tax Planning & Optimization',
        'Annual Audit Support',
        'Legal Documentation Review',
        'Compliance Risk Assessment',
        '24/7 Expert Consultation',
        'Monthly Strategy Calls',
        'Custom Compliance Solutions',
        'Unlimited Penalty Protection'
      ],
      idealFor: 'Established businesses & high-growth companies',
      commission: 12999,
      urgentServices: ['Strategic Planning', 'Risk Management', 'Audit Support'],
      support: '24/7 Expert Consultation',
      turnaround: '1-3 days',
      guarantee: 'Unlimited Penalty Protection'
    }
  ];

  const urgentNeeds = [
    'Company Registration Overdue',
    'GST Filing Pending',
    'Tax Return Deadline Approaching',
    'ROC Compliance Missing',
    'Employee Benefits Setup',
    'Audit Preparation Required',
    'Legal Documentation Review',
    'Penalty Notice Received'
  ];

  const calculateRiskScore = () => {
    let score = 0;
    if (flowData.businessData.businessType === 'private_limited') score += 30;
    if (flowData.businessData.businessType === 'llp' || flowData.businessData.businessType === 'opc') score += 20;
    if (flowData.businessData.businessType === 'proprietorship') score += 10;
    
    score += flowData.businessData.urgentNeeds.length * 15;
    if (!flowData.businessData.cin && !flowData.businessData.gstin) score += 25;
    
    return Math.min(score, 100);
  };

  const getRecommendedPackage = (): 'basic' | 'growth' | 'premium' => {
    const score = calculateRiskScore();
    const urgentCount = flowData.businessData.urgentNeeds.length;
    
    if (score >= 70 || urgentCount >= 4) return 'premium';
    if (score >= 40 || urgentCount >= 2) return 'growth';
    return 'basic';
  };

  const handleBusinessTypeSelect = (type: string) => {
    setFlowData(prev => ({
      ...prev,
      businessData: { ...prev.businessData, businessType: type }
    }));
  };

  const handleUrgentNeedsToggle = (need: string) => {
    setFlowData(prev => ({
      ...prev,
      businessData: {
        ...prev.businessData,
        urgentNeeds: prev.businessData.urgentNeeds.includes(need)
          ? prev.businessData.urgentNeeds.filter(n => n !== need)
          : [...prev.businessData.urgentNeeds, need]
      }
    }));
  };

  const handleStepComplete = () => {
    if (flowData.step === 'assessment') {
      const score = calculateRiskScore();
      setFlowData(prev => ({ ...prev, assessmentScore: score, step: 'package' }));
    } else if (flowData.step === 'package') {
      setFlowData(prev => ({ ...prev, step: 'payment' }));
    } else {
      const nextStep = flowData.step === 'welcome' ? 'assessment' : 'package';
      setFlowData(prev => ({ ...prev, step: nextStep }));
    }
  };

  const handlePackageSelect = (packageId: 'basic' | 'growth' | 'premium') => {
    setFlowData(prev => ({ ...prev, selectedPackage: packageId }));
  };

  const handlePayment = async () => {
    setIsLoading(true);
    // Payment integration will be implemented here
    setTimeout(() => {
      setFlowData(prev => ({ ...prev, paymentStatus: 'completed', step: 'confirmation' }));
      setIsLoading(false);
    }, 3000);
  };

  const selectedPackageData = servicePackages.find(pkg => pkg.id === flowData.selectedPackage);
  const recommendedPackage = getRecommendedPackage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <DashboardNav currentPath="/whatsapp-onboarding" />
        
        {/* Header with Timer */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              WhatsApp Quick Start
            </h1>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {formatTime(timeRemaining)} left for special pricing
            </div>
          </div>
          <p className="text-lg text-gray-600">
            Complete your compliance setup in under 10 minutes via WhatsApp
          </p>
        </div>

        <TrustBar />

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Progress</h3>
              <span className="text-sm text-gray-600">
                Step {
                  flowData.step === 'welcome' ? 1 :
                  flowData.step === 'assessment' ? 2 :
                  flowData.step === 'package' ? 3 :
                  flowData.step === 'payment' ? 4 : 5
                } of 5
              </span>
            </div>
            <Progress 
              value={
                flowData.step === 'welcome' ? 20 :
                flowData.step === 'assessment' ? 40 :
                flowData.step === 'package' ? 60 :
                flowData.step === 'payment' ? 80 : 100
              } 
              className="h-3" 
            />
          </CardContent>
        </Card>

        {/* Welcome Step */}
        {flowData.step === 'welcome' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Welcome to DigiComply WhatsApp Onboarding
              </CardTitle>
              <CardDescription>
                Get your business compliance sorted in minutes, not months
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Special Launch Offer:</strong> Up to 40% off all packages + Free WhatsApp support for 1 year
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Company/Business Name</Label>
                  <Input 
                    placeholder="Enter your business name"
                    value={flowData.businessData.companyName}
                    onChange={(e) => setFlowData(prev => ({
                      ...prev,
                      businessData: { ...prev.businessData, companyName: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>WhatsApp Number</Label>
                  <Input 
                    placeholder="+91 98765 43210"
                    value={flowData.businessData.contactNumber}
                    onChange={(e) => setFlowData(prev => ({
                      ...prev,
                      businessData: { ...prev.businessData, contactNumber: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input 
                    type="email"
                    placeholder="founder@company.com"
                    value={flowData.businessData.email}
                    onChange={(e) => setFlowData(prev => ({
                      ...prev,
                      businessData: { ...prev.businessData, email: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>CIN/GSTIN (Optional)</Label>
                  <Input 
                    placeholder="L74999DL2022PTC123456"
                    value={flowData.businessData.cin || ''}
                    onChange={(e) => setFlowData(prev => ({
                      ...prev,
                      businessData: { ...prev.businessData, cin: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">5,247+</div>
                  <p className="text-sm text-gray-600">Companies Served</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₹2.18Cr</div>
                  <p className="text-sm text-gray-600">Penalties Prevented</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">99.8%</div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
              </div>

              <Button 
                onClick={handleStepComplete}
                disabled={!flowData.businessData.companyName || !flowData.businessData.contactNumber}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Start 2-Minute Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Assessment Step */}
        {flowData.step === 'assessment' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Business Assessment</CardTitle>
                <CardDescription>
                  Help us understand your business to recommend the perfect compliance package
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">What type of business do you have?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    {businessTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <Card 
                          key={type.id}
                          className={`cursor-pointer transition-colors ${
                            flowData.businessData.businessType === type.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:border-blue-300'
                          }`}
                          onClick={() => handleBusinessTypeSelect(type.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 text-blue-600 mt-1" />
                              <div className="flex-1">
                                <h4 className="font-medium">{type.name}</h4>
                                <div className="flex justify-between text-sm text-gray-600 mt-1">
                                  <span>Risk: {type.riskLevel}</span>
                                  <span>Avg Penalty: {type.avgPenalty}</span>
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  Market Share: {type.marketShare}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">What are your urgent compliance needs? (Select all that apply)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {urgentNeeds.map((need) => (
                      <div 
                        key={need}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          flowData.businessData.urgentNeeds.includes(need)
                            ? 'border-orange-500 bg-orange-50'
                            : 'hover:border-orange-300'
                        }`}
                        onClick={() => handleUrgentNeedsToggle(need)}
                      >
                        <div className={`w-4 h-4 border-2 rounded ${
                          flowData.businessData.urgentNeeds.includes(need)
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {flowData.businessData.urgentNeeds.includes(need) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm">{need}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleStepComplete}
                  disabled={!flowData.businessData.businessType}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  Get My Compliance Score
                  <Target className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Package Selection Step */}
        {flowData.step === 'package' && (
          <div className="space-y-6">
            {/* Risk Score Display */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-orange-800">
                      Your Compliance Risk Score: {flowData.assessmentScore}/100
                    </h3>
                    <p className="text-orange-700">
                      {flowData.assessmentScore >= 70 ? 'High Risk - Immediate action required' :
                       flowData.assessmentScore >= 40 ? 'Medium Risk - Action needed soon' :
                       'Low Risk - Preventive measures recommended'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      ₹{flowData.assessmentScore >= 70 ? '125K' : flowData.assessmentScore >= 40 ? '85K' : '45K'}
                    </div>
                    <p className="text-sm text-gray-600">Potential Penalty Risk</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {servicePackages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    pkg.id === recommendedPackage ? 'ring-2 ring-blue-500 transform scale-105' : ''
                  } ${
                    flowData.selectedPackage === pkg.id ? 'border-green-500 bg-green-50' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handlePackageSelect(pkg.id)}
                >
                  {pkg.id === recommendedPackage && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white px-4 py-1">
                        <Star className="h-3 w-3 mr-1" />
                        RECOMMENDED
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        <CardDescription>{pkg.idealFor}</CardDescription>
                      </div>
                      {flowData.selectedPackage === pkg.id && (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">₹{pkg.price.toLocaleString()}</span>
                        <span className="text-lg text-gray-500 line-through">₹{pkg.originalPrice.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        Save ₹{(pkg.originalPrice - pkg.price).toLocaleString()} 
                        ({Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% off)
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Clock className="h-4 w-4 inline mr-1" />
                          {pkg.turnaround}
                        </div>
                        <div>
                          <Shield className="h-4 w-4 inline mr-1" />
                          {pkg.guarantee}
                        </div>
                      </div>
                      
                      <ul className="space-y-2">
                        {pkg.features.slice(0, 5).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {pkg.features.length > 5 && (
                          <li className="text-sm text-blue-600">
                            +{pkg.features.length - 5} more features
                          </li>
                        )}
                      </ul>
                      
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600">
                          <Award className="h-3 w-3 inline mr-1" />
                          Agent Commission: ₹{pkg.commission.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              onClick={handleStepComplete}
              disabled={!flowData.selectedPackage}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Proceed to Payment
              <CreditCard className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Payment Step */}
        {flowData.step === 'payment' && selectedPackageData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Your Payment
              </CardTitle>
              <CardDescription>
                Secure payment processing with instant activation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedPackageData.name}</h3>
                    <p className="text-gray-600">{selectedPackageData.idealFor}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {Math.round((1 - selectedPackageData.price / selectedPackageData.originalPrice) * 100)}% OFF
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>Package Price: ₹{selectedPackageData.originalPrice.toLocaleString()}</div>
                  <div>Discount: -₹{(selectedPackageData.originalPrice - selectedPackageData.price).toLocaleString()}</div>
                  <div>Subtotal: ₹{selectedPackageData.price.toLocaleString()}</div>
                  <div>GST (18%): ₹{Math.round(selectedPackageData.price * 0.18).toLocaleString()}</div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total Amount:</span>
                    <span>₹{Math.round(selectedPackageData.price * 1.18).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>100% Secure Payment:</strong> SSL encrypted, PCI DSS compliant. Your data is completely safe.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay with Razorpay
                      <CreditCard className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handlePayment}
                  variant="outline"
                  disabled={isLoading}
                  size="lg"
                >
                  Pay with Stripe
                  <CreditCard className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>🔒 Payments processed by DigiComply Solutions Pvt Ltd</p>
                <p>GSTIN: 29AAJCD2314K1Z7 | CIN: U72900DL2021PTC123456</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Step */}
        {flowData.step === 'confirmation' && selectedPackageData && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Welcome to DigiComply!</CardTitle>
              <CardDescription>
                Your {selectedPackageData.name} package is now active
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Payment Successful!</strong> You'll receive a WhatsApp message with your welcome kit and next steps within 5 minutes.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">What happens next?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                        Dedicated CA assignment within 2 hours
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                        WhatsApp welcome kit with document checklist
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                        Compliance calendar setup and onboarding call
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                        Your compliance journey begins!
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Immediate Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => window.open('https://wa.me/918826990111?text=Hi! I just completed my DigiComply payment. Please start my onboarding.', '_blank')}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message on WhatsApp
                      </Button>
                      
                      <Button 
                        onClick={() => setLocation('/compliance-dashboard')}
                        variant="outline"
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>
                      
                      <Button 
                        onClick={() => setLocation('/vault')}
                        variant="outline"
                        className="w-full"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Upload Documents
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h4 className="font-medium text-blue-800 mb-2">Need Immediate Help?</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Our experts are available 24/7 for Premium customers, business hours for others
                </p>
                <div className="flex justify-center gap-4">
                  <Button size="sm" variant="outline" onClick={() => window.open('tel:+918826990111')}>
                    <Phone className="h-4 w-4 mr-1" />
                    Call Now
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open('mailto:support@digicomply.in')}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WhatsAppOnboarding;