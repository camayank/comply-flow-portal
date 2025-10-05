import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import TrustBar from '@/components/TrustBar';
import { 
  Target, 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  Clock,
  Phone,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  DollarSign,
  FileText,
  Award,
  Users,
  Building2,
  Briefcase,
  Store
} from 'lucide-react';

interface AssessmentQuestion {
  id: string;
  section: string;
  question: string;
  options: Array<{
    text: string;
    score: number;
  }>;
}

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  businessName: string;
}

interface AssessmentResult {
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  penaltyRisk: number;
  criticalIssues: string[];
  recommendations: string[];
  suggestedPackage: 'basic' | 'growth' | 'premium';
}

const ComplianceScorecard = () => {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'landing' | 'info' | 'assessment' | 'results'>('landing');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    email: '',
    phone: '',
    businessName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assessmentQuestions: AssessmentQuestion[] = [
    {
      id: 'business_type',
      section: 'Business Profile',
      question: 'What type of business entity do you operate?',
      options: [
        { text: 'Private Limited Company', score: 25 },
        { text: 'Limited Liability Partnership (LLP)', score: 20 },
        { text: 'One Person Company (OPC)', score: 22 },
        { text: 'Sole Proprietorship', score: 15 },
        { text: 'Partnership Firm', score: 18 },
        { text: 'Not yet registered', score: 35 }
      ]
    },
    {
      id: 'registration_date',
      section: 'Business Profile',
      question: 'When was your business registered?',
      options: [
        { text: 'Less than 1 year ago', score: 30 },
        { text: '1-2 years ago', score: 25 },
        { text: '2-5 years ago', score: 20 },
        { text: 'More than 5 years ago', score: 15 },
        { text: 'Not registered yet', score: 40 }
      ]
    },
    {
      id: 'turnover',
      section: 'Business Profile',
      question: 'What is your annual turnover?',
      options: [
        { text: 'Less than ₹20 lakh', score: 10 },
        { text: '₹20 lakh - ₹2 crore', score: 15 },
        { text: '₹2 crore - ₹20 crore', score: 25 },
        { text: 'Above ₹20 crore', score: 35 }
      ]
    },
    {
      id: 'employees',
      section: 'Business Profile',
      question: 'How many employees do you have?',
      options: [
        { text: 'Just me (0 employees)', score: 5 },
        { text: '1-10 employees', score: 15 },
        { text: '11-50 employees', score: 25 },
        { text: 'More than 50 employees', score: 35 }
      ]
    },
    {
      id: 'itr_filing',
      section: 'Compliance Status',
      question: 'When did you last file your income tax return?',
      options: [
        { text: 'Filed for current financial year', score: 0 },
        { text: 'Filed for last financial year only', score: 10 },
        { text: 'Not filed for 2+ years', score: 25 },
        { text: 'Never filed ITR', score: 40 }
      ]
    },
    {
      id: 'gst_returns',
      section: 'Compliance Status',
      question: 'Are your GST returns up to date?',
      options: [
        { text: 'All returns filed on time', score: 0 },
        { text: '1-2 returns pending', score: 15 },
        { text: '3 or more returns pending', score: 30 },
        { text: 'Not registered for GST despite eligibility', score: 20 }
      ]
    },
    {
      id: 'roc_filings',
      section: 'Compliance Status',
      question: 'Have you completed mandatory ROC filings?',
      options: [
        { text: 'All filings are current', score: 0 },
        { text: 'Some filings are delayed', score: 20 },
        { text: 'Major filings are missing', score: 35 },
        { text: 'Not applicable or unsure', score: 25 }
      ]
    },
    {
      id: 'employee_compliance',
      section: 'Compliance Status',
      question: 'Do you have required employee registrations (ESI/PF/Professional Tax)?',
      options: [
        { text: 'All required registrations completed', score: 0 },
        { text: 'Some registrations missing', score: 15 },
        { text: 'No registrations despite having employees', score: 30 },
        { text: 'Unsure what registrations are required', score: 25 }
      ]
    },
    {
      id: 'penalty_history',
      section: 'Risk Factors',
      question: 'Have you received any penalty notices in the past 2 years?',
      options: [
        { text: 'No penalties received', score: 0 },
        { text: '1-2 minor penalty notices', score: 15 },
        { text: '3 or more penalties or major penalties', score: 30 },
        { text: 'Currently facing penalty proceedings', score: 40 }
      ]
    },
    {
      id: 'deadline_tracking',
      section: 'Risk Factors',
      question: 'How do you track compliance deadlines?',
      options: [
        { text: 'Professional CA with automated system', score: 0 },
        { text: 'Manual calendar tracking', score: 10 },
        { text: 'Irregular or ad-hoc tracking', score: 20 },
        { text: 'No systematic deadline tracking', score: 35 }
      ]
    },
    {
      id: 'compliance_review',
      section: 'Risk Factors',
      question: 'When did you last review your compliance requirements?',
      options: [
        { text: 'Within the last 3 months', score: 0 },
        { text: '3-6 months ago', score: 10 },
        { text: '6-12 months ago', score: 20 },
        { text: 'More than 1 year ago or never', score: 35 }
      ]
    },
    {
      id: 'professional_support',
      section: 'Risk Factors',
      question: 'Do you have professional compliance support?',
      options: [
        { text: 'Dedicated CA/CS with regular reviews', score: 0 },
        { text: 'Occasional professional consultation', score: 15 },
        { text: 'DIY compliance management', score: 25 },
        { text: 'No professional support', score: 35 }
      ]
    }
  ];

  const calculateResults = (): AssessmentResult => {
    const totalScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
    
    let riskLevel: AssessmentResult['riskLevel'];
    let penaltyRisk: number;
    let suggestedPackage: AssessmentResult['suggestedPackage'];
    
    if (totalScore <= 50) {
      riskLevel = 'low';
      penaltyRisk = 25000;
      suggestedPackage = 'basic';
    } else if (totalScore <= 120) {
      riskLevel = 'medium';
      penaltyRisk = 75000;
      suggestedPackage = 'growth';
    } else if (totalScore <= 200) {
      riskLevel = 'high';
      penaltyRisk = 150000;
      suggestedPackage = 'premium';
    } else {
      riskLevel = 'critical';
      penaltyRisk = 300000;
      suggestedPackage = 'premium';
    }

    const criticalIssues = [];
    const recommendations = [];

    // Analyze specific risk factors
    if (answers.gst_returns >= 15) {
      criticalIssues.push('GST returns pending - Penalty: ₹25,000 per return');
      recommendations.push('File pending GST returns immediately');
    }
    
    if (answers.roc_filings >= 20) {
      criticalIssues.push('ROC filings delayed - Penalty: Up to ₹5,00,000');
      recommendations.push('Complete mandatory ROC filings urgently');
    }
    
    if (answers.itr_filing >= 25) {
      criticalIssues.push('Income Tax returns overdue - Penalty: ₹10,000 + Interest');
      recommendations.push('File pending ITR with professional help');
    }
    
    if (answers.employee_compliance >= 15) {
      criticalIssues.push('Employee compliance gaps - Penalty: ₹15,000 + Legal action');
      recommendations.push('Complete ESI/PF registrations immediately');
    }

    return {
      totalScore,
      riskLevel,
      penaltyRisk,
      criticalIssues,
      recommendations,
      suggestedPackage
    };
  };

  const handleAnswerSelect = (questionId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < assessmentQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setCurrentStep('results');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleStartAssessment = () => {
    setCurrentStep('info');
  };

  const handleUserInfoSubmit = () => {
    if (userInfo.name && userInfo.email && userInfo.phone) {
      setCurrentStep('assessment');
    }
  };

  const handleWhatsAppContact = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/918130645164?text=${encodedMessage}`, '_blank');
  };

  const results = currentStep === 'results' ? calculateResults() : null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const progressPercentage = currentStep === 'assessment' 
    ? ((currentQuestion + 1) / assessmentQuestions.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-6">
        
        {/* Landing Step */}
        {currentStep === 'landing' && (
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                ₹10,000 Penalty Avoided in <span className="text-red-600">10 Minutes</span>
              </h1>
              <h2 className="text-2xl md:text-3xl text-gray-700 mb-8">
                Get Your FREE Compliance Risk Score
              </h2>
              
              <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  5,247+ businesses protected
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  ₹2.18 Cr penalties prevented
                </span>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                  99.8% success rate
                </span>
              </div>
              
              <Button 
                onClick={handleStartAssessment}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-xl"
              >
                Get My Risk Score (FREE)
              </Button>
              <p className="mt-3 text-gray-600">Takes only 90 seconds</p>
            </div>

            <TrustBar />

            {/* Problem Section */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-8">
                Are You Making These Costly Compliance Mistakes?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">Missing GST Filing Deadlines</h3>
                    <p className="text-red-700">Penalty: ₹25,000 per return</p>
                  </CardContent>
                </Card>
                
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-6 text-center">
                    <FileText className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">Delayed ROC Filings</h3>
                    <p className="text-orange-700">Penalty: Up to ₹5,00,000</p>
                  </CardContent>
                </Card>
                
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-6 text-center">
                    <Users className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">Incomplete Employee Compliances</h3>
                    <p className="text-yellow-700">Penalty: ₹15,000 + Legal Action</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center bg-gray-100 p-6 rounded-lg">
                <p className="text-lg mb-2">
                  <strong>73% of Indian startups</strong> face compliance penalties in Year 1
                </p>
                <p className="text-lg">
                  <strong>Average penalty cost:</strong> ₹1,25,000 per business
                </p>
              </div>
            </div>

            {/* Solution Section */}
            <div className="bg-blue-600 text-white rounded-lg p-8 mb-16">
              <h2 className="text-3xl font-bold text-center mb-6">
                Know Your Risk. Protect Your Business.
              </h2>
              
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
                  <Target className="h-6 w-6" />
                  Free Compliance Health Scorecard
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>Instant risk assessment (90 seconds)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>Personalized penalty calculation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>Priority action recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>Expert consultation included</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartAssessment}
                  size="lg"
                  className="w-full bg-white text-blue-600 hover:bg-gray-100"
                >
                  Start My Assessment
                </Button>
              </div>
            </div>

            {/* Testimonials */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-8">
                Join 5,247+ Protected Businesses
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-lg mb-4">
                      "DigiComply saved us ₹2.5 lakh in penalties. The scorecard identified issues we didn't even know existed."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Rohit Sharma</p>
                        <p className="text-sm text-gray-600">Tech Startup Founder</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <p className="text-lg mb-4">
                      "Within 10 minutes, I knew exactly what compliance gaps to fix. Their system is incredibly accurate."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Store className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Priya Patel</p>
                        <p className="text-sm text-gray-600">E-commerce Business</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Urgency Section */}
            <div className="bg-red-600 text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                <Clock className="h-8 w-8 inline mr-2" />
                Don't Wait for Penalty Notices
              </h2>
              <p className="text-xl mb-6">Every day you delay increases your penalty risk</p>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-3xl font-bold">₹25,000</div>
                  <div className="text-red-200">Average daily penalty</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">15 days</div>
                  <div className="text-red-200">Average grace period</div>
                </div>
              </div>
              
              <Button 
                onClick={handleStartAssessment}
                size="lg"
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-xl"
              >
                Check My Risk Now (FREE)
              </Button>
            </div>
          </div>
        )}

        {/* User Info Step */}
        {currentStep === 'info' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Get Your Free Compliance Scorecard
                </CardTitle>
                <CardDescription>
                  Enter your details to receive your personalized compliance risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Name *</Label>
                    <Input 
                      value={userInfo.name}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Business Name *</Label>
                    <Input 
                      value={userInfo.businessName}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter your business name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input 
                      type="email"
                      value={userInfo.email}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>WhatsApp Number *</Label>
                    <Input 
                      value={userInfo.phone}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Your information is secure and will only be used to provide your compliance scorecard and follow-up support.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleUserInfoSubmit}
                  disabled={!userInfo.name || !userInfo.email || !userInfo.phone || !userInfo.businessName}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  Start Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assessment Step */}
        {currentStep === 'assessment' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold">Compliance Health Assessment</h2>
                <span className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {assessmentQuestions.length}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <Card>
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  {assessmentQuestions[currentQuestion].section}
                </Badge>
                <CardTitle className="text-xl">
                  {assessmentQuestions[currentQuestion].question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[assessmentQuestions[currentQuestion].id]?.toString()}
                  onValueChange={(value) => 
                    handleAnswerSelect(assessmentQuestions[currentQuestion].id, parseInt(value))
                  }
                  className="space-y-3"
                >
                  {assessmentQuestions[currentQuestion].options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={option.score.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-between mt-6">
                  <Button 
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 0}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  
                  <Button 
                    onClick={handleNextQuestion}
                    disabled={!answers[assessmentQuestions[currentQuestion].id]}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {currentQuestion === assessmentQuestions.length - 1 ? 'Get Results' : 'Next'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Step */}
        {currentStep === 'results' && results && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Risk Score Display */}
            <Card className={`border-2 ${getRiskColor(results.riskLevel)}`}>
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">Your Compliance Health Score</h2>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                      <div className="text-3xl font-bold">
                        {Math.max(0, 100 - Math.round((results.totalScore / 420) * 100))}/100
                      </div>
                    </div>
                  </div>
                </div>
                <Badge className={`text-lg px-4 py-2 ${getRiskColor(results.riskLevel)}`}>
                  {results.riskLevel.toUpperCase()} RISK
                </Badge>
                <p className="mt-4 text-lg">
                  {results.riskLevel === 'critical' && 'URGENT: Immediate action required to avoid severe penalties'}
                  {results.riskLevel === 'high' && 'HIGH RISK: Significant compliance gaps need immediate attention'}
                  {results.riskLevel === 'medium' && 'MEDIUM RISK: Some compliance issues need to be addressed'}
                  {results.riskLevel === 'low' && 'LOW RISK: Good compliance health with minor improvements needed'}
                </p>
              </CardContent>
            </Card>

            {/* Penalty Risk */}
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-red-800 mb-2">
                      Immediate Penalty Risk
                    </h3>
                    <p className="text-red-700">
                      Based on current compliance gaps and penalty rates
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-red-600">
                      ₹{results.penaltyRisk.toLocaleString()}
                    </div>
                    <p className="text-sm text-red-600">Potential exposure</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues */}
            {results.criticalIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Issues Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.criticalIssues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* CTA Section */}
            <Card className="bg-blue-600 text-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Get Expert Help Now</h3>
                <p className="text-lg mb-6">
                  Don't let compliance issues turn into expensive penalties. 
                  Our experts are ready to help you fix these issues immediately.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => handleWhatsAppContact(`Hi! I just completed my compliance scorecard and got a ${results.riskLevel} risk score. I need help fixing my compliance issues to avoid ₹${results.penaltyRisk.toLocaleString()} in penalties.`)}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Get Help on WhatsApp
                  </Button>
                  
                  <Button 
                    onClick={() => window.open('tel:+918130645164')}
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-blue-600"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Expert Now
                  </Button>
                </div>
                
                <p className="mt-4 text-blue-200 text-sm">
                  Free consultation • No obligation • Immediate response
                </p>
              </CardContent>
            </Card>

            {/* Package Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recommended Protection Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                  <h4 className="text-xl font-bold mb-2">
                    {results.suggestedPackage === 'basic' && 'Startup Shield Package'}
                    {results.suggestedPackage === 'growth' && 'Scale Pro Package'}
                    {results.suggestedPackage === 'premium' && 'Enterprise Elite Package'}
                  </h4>
                  <p className="text-gray-700 mb-4">
                    Based on your risk profile, this package provides optimal protection for your business.
                  </p>
                  
                  <Button 
                    onClick={() => setLocation('/whatsapp-onboarding')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    View Package Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceScorecard;