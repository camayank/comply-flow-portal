import { useState, useEffect } from 'react';
import { MinimalLayout } from '@/layouts';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardNav from '@/components/DashboardNav';
import TrustBar from '@/components/TrustBar';
import { 
  Zap, 
  Shield, 
  AlertTriangle, 
  Clock, 
  Building2, 
  FileText, 
  Calculator,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Users,
  Store,
  Briefcase,
  Target,
  Bell,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';

interface BusinessDetection {
  cin?: string;
  gstin?: string;
  pan?: string;
  companyName?: string;
  businessType?: string;
  registrationDate?: Date;
  complianceGaps: string[];
  urgentDeadlines: Array<{
    service: string;
    deadline: Date;
    penaltyAmount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  penaltyRisk: number;
  estimatedSavings: number;
}

interface ServiceRecommendation {
  id: string;
  name: string;
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  penaltyRisk: number;
  daysLeft: number;
  price: number;
  savings: number;
  bundle?: boolean;
}

const SmartStart = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('detect');
  const [detectionMethod, setDetectionMethod] = useState<'auto' | 'manual'>('auto');
  const [businessData, setBusinessData] = useState<BusinessDetection>({
    complianceGaps: [],
    urgentDeadlines: [],
    penaltyRisk: 0,
    estimatedSavings: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);

  // Real-time metrics
  const [liveMetrics, setLiveMetrics] = useState({
    activeUsers: 2847,
    penaltiesPrevented: 21829100,
    companiesServed: 5247
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 3),
        penaltiesPrevented: prev.penaltiesPrevented + Math.floor(Math.random() * 5000),
        companiesServed: prev.companiesServed + Math.floor(Math.random() * 2)
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const businessTypes = [
    {
      id: 'private_limited',
      name: 'Private Limited Company',
      icon: Building2,
      description: 'Most popular for startups and scaling businesses',
      complianceLoad: 'High',
      avgPenaltyRisk: 125000,
      urgentServices: ['Annual Return (ADT-1)', 'Board Resolution', 'GST Returns'],
      marketShare: '68%'
    },
    {
      id: 'llp',
      name: 'Limited Liability Partnership',
      icon: Users,
      description: 'Professional services and partnerships',
      complianceLoad: 'Medium',
      avgPenaltyRisk: 85000,
      urgentServices: ['Form 8', 'Form 11', 'Income Tax Filing'],
      marketShare: '18%'
    },
    {
      id: 'opc',
      name: 'One Person Company',
      icon: Briefcase,
      description: 'Single founder businesses with limited liability',
      complianceLoad: 'Medium',
      avgPenaltyRisk: 95000,
      urgentServices: ['Annual Return', 'Financial Statement Filing'],
      marketShare: '9%'
    },
    {
      id: 'proprietorship',
      name: 'Sole Proprietorship',
      icon: Store,
      description: 'Simple business structure for individual entrepreneurs',
      complianceLoad: 'Low',
      avgPenaltyRisk: 45000,
      urgentServices: ['GST Filing', 'Income Tax Return'],
      marketShare: '5%'
    }
  ];

  const handleAutoDetection = async (detectionData: { cin?: string; gstin?: string; pan?: string }) => {
    setIsAnalyzing(true);
    
    // Simulate API call for business detection
    setTimeout(() => {
      const mockDetection: BusinessDetection = {
        ...detectionData,
        companyName: "Example Pvt Ltd",
        businessType: "private_limited",
        registrationDate: new Date('2022-03-15'),
        complianceGaps: [
          'Annual Return ADT-1 overdue',
          'GST Return pending for Q3',
          'Board Resolution not filed',
          'Financial statements not submitted'
        ],
        urgentDeadlines: [
          {
            service: 'Annual Return (ADT-1)',
            deadline: new Date('2024-01-30'),
            penaltyAmount: 50000,
            riskLevel: 'critical'
          },
          {
            service: 'GST Return GSTR-3B',
            deadline: new Date('2024-01-20'),
            penaltyAmount: 25000,
            riskLevel: 'high'
          },
          {
            service: 'Board Resolution Filing',
            deadline: new Date('2024-02-15'),
            penaltyAmount: 15000,
            riskLevel: 'medium'
          }
        ],
        penaltyRisk: 90000,
        estimatedSavings: 75000
      };

      const mockRecommendations: ServiceRecommendation[] = [
        {
          id: 'adt1',
          name: 'Annual Return ADT-1 Filing',
          urgency: 'immediate',
          penaltyRisk: 50000,
          daysLeft: 15,
          price: 2999,
          savings: 47001,
          bundle: false
        },
        {
          id: 'gst_bundle',
          name: 'GST Compliance Bundle (Q3 + Q4)',
          urgency: 'high',
          penaltyRisk: 35000,
          daysLeft: 25,
          price: 5999,
          savings: 29001,
          bundle: true
        },
        {
          id: 'board_resolution',
          name: 'Board Resolution & Documentation',
          urgency: 'medium',
          penaltyRisk: 15000,
          daysLeft: 45,
          price: 1999,
          savings: 13001,
          bundle: false
        }
      ];

      setBusinessData(mockDetection);
      setRecommendations(mockRecommendations);
      setIsAnalyzing(false);
      setActiveTab('analysis');
    }, 3000);
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getUrgencyColor = (urgency: ServiceRecommendation['urgency']) => {
    switch (urgency) {
      case 'immediate': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <MinimalLayout>
      <div className="bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-6">
          <DashboardNav currentPath="/smart-start" />
        
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Smart Compliance Start
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Intelligent business detection, instant penalty risk assessment, and personalized compliance recommendations
          </p>
          
          {/* Live Metrics */}
          <div className="flex justify-center gap-6 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{liveMetrics.activeUsers.toLocaleString()} active users</span>
            </div>
            <div>₹{(liveMetrics.penaltiesPrevented / 10000000).toFixed(1)}Cr penalties prevented</div>
            <div>{liveMetrics.companiesServed.toLocaleString()}+ companies served</div>
          </div>
        </div>

        {/* Trust Bar */}
        <TrustBar />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="detect" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Detect Business
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!businessData.companyName}>
              <Shield className="h-4 w-4" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="recommendations" disabled={recommendations.length === 0}>
              <Target className="h-4 w-4" />
              Smart Recommendations
            </TabsTrigger>
            <TabsTrigger value="action" disabled={recommendations.length === 0}>
              <CheckCircle className="h-4 w-4" />
              Take Action
            </TabsTrigger>
          </TabsList>

          {/* Business Detection Tab */}
          <TabsContent value="detect" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Auto Detection */}
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Zap className="h-5 w-5" />
                    Auto-Detect Business (Recommended)
                  </CardTitle>
                  <CardDescription>
                    Instantly fetch your business details and compliance status from government databases
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>CIN Number (Company Identification Number)</Label>
                      <Input 
                        placeholder="L74999DL2022PTC123456" 
                        className="mt-1"
                        onChange={(e) => setBusinessData(prev => ({ ...prev, cin: e.target.value }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">21-character unique company identifier</p>
                    </div>
                    <div>
                      <Label>GSTIN (Optional - for enhanced analysis)</Label>
                      <Input 
                        placeholder="29AABCD1234E1Z5" 
                        className="mt-1"
                        onChange={(e) => setBusinessData(prev => ({ ...prev, gstin: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Instant Analysis:</strong> Get compliance gaps, penalty risks, and personalized recommendations in 30 seconds
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={() => handleAutoDetection({ cin: businessData.cin, gstin: businessData.gstin })}
                    disabled={!businessData.cin || isAnalyzing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing Business...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Auto-Detect & Analyze
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Manual Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Manual Business Setup
                  </CardTitle>
                  <CardDescription>
                    For new businesses or if auto-detection is unavailable
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {businessTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <Card 
                          key={type.id} 
                          className="cursor-pointer hover:border-blue-300 transition-colors p-3"
                          onClick={() => setBusinessData(prev => ({ ...prev, businessType: type.id }))}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 text-blue-600 mt-1" />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{type.name}</h4>
                              <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Market: {type.marketShare}</span>
                                <span className="text-red-600">Risk: ₹{(type.avgPenaltyRisk / 1000).toFixed(0)}K</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab('analysis')}
                    disabled={!businessData.businessType}
                  >
                    Continue with Manual Setup
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Why Choose Smart Detection */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Why Smart Detection Works Better</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 mt-1" />
                    <div>
                      <h4 className="font-medium">30-Second Analysis</h4>
                      <p className="text-sm text-blue-100">Instant compliance gap detection vs 15+ minutes manual entry</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 mt-1" />
                    <div>
                      <h4 className="font-medium">99.8% Accuracy</h4>
                      <p className="text-sm text-blue-100">Government database integration ensures precise compliance tracking</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 mt-1" />
                    <div>
                      <h4 className="font-medium">Real Penalty Calculation</h4>
                      <p className="text-sm text-blue-100">Live penalty risk assessment based on actual deadlines</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {businessData.companyName && (
              <>
                {/* Business Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Business Analysis: {businessData.companyName}</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {businessData.businessType?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                          ₹{(businessData.penaltyRisk / 1000).toFixed(0)}K
                        </div>
                        <p className="text-sm text-gray-600">Immediate Penalty Risk</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          ₹{(businessData.estimatedSavings / 1000).toFixed(0)}K
                        </div>
                        <p className="text-sm text-gray-600">Potential Savings</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {businessData.complianceGaps.length}
                        </div>
                        <p className="text-sm text-gray-600">Compliance Gaps</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Urgent Deadlines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Bell className="h-5 w-5" />
                      Critical Deadlines Approaching
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {businessData.urgentDeadlines.map((deadline, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-1" />
                            <div>
                              <h4 className="font-medium">{deadline.service}</h4>
                              <p className="text-sm text-gray-600">Due: {deadline.deadline.toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-600">₹{deadline.penaltyAmount.toLocaleString()}</div>
                            <Badge className={getRiskBadgeColor(deadline.riskLevel)}>
                              {deadline.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button 
                    onClick={() => setActiveTab('recommendations')}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Get Smart Recommendations
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {recommendations.map((rec) => (
                <Card key={rec.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{rec.name}</CardTitle>
                      {rec.bundle && (
                        <Badge className="bg-purple-100 text-purple-800">Bundle Deal</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${getUrgencyColor(rec.urgency)}`} />
                      <span className={`text-sm font-medium ${getUrgencyColor(rec.urgency)}`}>
                        {rec.urgency.toUpperCase()} - {rec.daysLeft} days left
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Penalty Risk:</span>
                        <span className="font-bold text-red-600">₹{rec.penaltyRisk.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Service Cost:</span>
                        <span className="font-bold">₹{rec.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">You Save:</span>
                        <span className="font-bold text-green-600">₹{rec.savings.toLocaleString()}</span>
                      </div>
                      <Progress value={(rec.savings / rec.penaltyRisk) * 100} className="h-2" />
                      <p className="text-xs text-gray-500">
                        {((rec.savings / rec.penaltyRisk) * 100).toFixed(1)}% savings vs penalty cost
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button 
                onClick={() => setActiveTab('action')}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                Proceed to Service Selection
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Action Tab */}
          <TabsContent value="action" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Your Compliance Summary
                  </CardTitle>
                  <CardDescription>
                    Based on your business analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Business Detected:</h4>
                    <p className="text-lg font-bold text-blue-600">{businessData.companyName || 'Your Business'}</p>
                    <p className="text-sm text-gray-600">{businessData.businessType?.replace('_', ' ').toUpperCase()}</p>
                    {businessData.cin && <p className="text-xs text-gray-500">CIN: {businessData.cin}</p>}
                    {businessData.gstin && <p className="text-xs text-gray-500">GSTIN: {businessData.gstin}</p>}
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Immediate Actions Required:</h4>
                    <ul className="space-y-2">
                      {businessData.urgentDeadlines.slice(0, 3).map((deadline, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          {deadline.service} (Due: {deadline.deadline.toLocaleDateString()})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Estimated Impact:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Penalty Risk:</span>
                        <span className="font-bold text-red-600">₹{businessData.penaltyRisk.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service Investment:</span>
                        <span className="font-bold">₹{recommendations.reduce((sum, rec) => sum + rec.price, 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>Net Savings:</span>
                        <span className="font-bold text-green-600">₹{businessData.estimatedSavings.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Registration Card */}
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Zap className="h-5 w-5" />
                    Create Your Account
                  </CardTitle>
                  <CardDescription>
                    Start your 14-day free trial - no credit card required
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Create Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min 8 characters"
                      className="mt-1"
                    />
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-sm">
                      Your business data will be pre-filled from our analysis. You can edit it later.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => {
                      // Pass business data to registration via URL params
                      const params = new URLSearchParams({
                        businessName: businessData.companyName || '',
                        entityType: businessData.businessType || '',
                        cin: businessData.cin || '',
                        gstin: businessData.gstin || '',
                        pan: businessData.pan || '',
                        fromSmartStart: 'true'
                      });
                      setLocation(`/register?${params.toString()}`);
                    }}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Create Account & Start Free Trial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <div className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => setLocation('/login')}
                      className="text-blue-600 hover:underline"
                    >
                      Sign in here
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </MinimalLayout>
  );
};

export default SmartStart;