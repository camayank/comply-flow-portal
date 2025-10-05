import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Building2,
  Users,
  Settings,
  Star,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Scale,
  Heart,
  Code,
  GraduationCap,
  Calculator
} from 'lucide-react';

const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessType, setBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('');

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const businessTypes = [
    { id: 'legal', icon: Scale, title: 'Legal Services', desc: 'Law firms, legal consultants, compliance services' },
    { id: 'accounting', icon: Calculator, title: 'Accounting & Tax', desc: 'CA firms, tax consultants, bookkeeping services' },
    { id: 'consulting', icon: Briefcase, title: 'Business Consulting', desc: 'Management consulting, strategy advisors' },
    { id: 'healthcare', icon: Heart, title: 'Healthcare', desc: 'Clinics, diagnostic centers, wellness services' },
    { id: 'technology', icon: Code, title: 'Technology Services', desc: 'IT consulting, software development' },
    { id: 'education', icon: GraduationCap, title: 'Education & Training', desc: 'Training institutes, coaching centers' },
  ];

  const teamSizes = [
    { id: '1-5', title: '1-5 people', desc: 'Solo practitioner or small team' },
    { id: '6-20', title: '6-20 people', desc: 'Growing practice with multiple experts' },
    { id: '21-50', title: '21-50 people', desc: 'Established firm with departments' },
    { id: '50+', title: '50+ people', desc: 'Large enterprise practice' },
  ];

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">What type of service business do you run?</h2>
              <p className="text-gray-600">This helps us customize your platform setup</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {businessTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    businessType === type.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setBusinessType(type.id)}
                >
                  <CardHeader className="text-center pb-3">
                    <type.icon className={`h-8 w-8 mx-auto mb-2 ${
                      businessType === type.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <CardDescription className="text-xs">{type.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">Tell us about your practice</h2>
              <p className="text-gray-600">We'll set up your platform with the right configuration</p>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="businessName" className="text-sm font-medium">Business/Practice Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Smith & Associates Legal Services"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="ownerName" className="text-sm font-medium">Your Name *</Label>
                <Input
                  id="ownerName"
                  placeholder="e.g., John Smith"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., john@smithlegal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g., +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">How big is your team?</h2>
              <p className="text-gray-600">This helps us configure user roles and permissions</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {teamSizes.map((size) => (
                <Card 
                  key={size.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    teamSize === size.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setTeamSize(size.id)}
                >
                  <CardHeader className="text-center pb-3">
                    <Users className={`h-8 w-8 mx-auto mb-2 ${
                      teamSize === size.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                    <CardTitle className="text-lg">{size.title}</CardTitle>
                    <CardDescription className="text-sm">{size.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">Your platform is ready!</h2>
              <p className="text-gray-600">We've configured everything based on your requirements</p>
            </div>
            
            <Card className="max-w-lg mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Your Setup Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Business Type:</span>
                  <Badge variant="outline">
                    {businessTypes.find(t => t.id === businessType)?.title || 'Not selected'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Practice Name:</span>
                  <span className="text-sm font-medium">{businessName || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Team Size:</span>
                  <Badge variant="outline">
                    {teamSizes.find(s => s.id === teamSize)?.title || 'Not selected'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Admin Email:</span>
                  <span className="text-sm font-medium">{email || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">Your platform includes:</p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Admin Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Client Portal</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Team Operations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Agent Network</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Link to="/admin" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Platform
                </Button>
              </Link>
              <Link to="/portal" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Preview Client View
                </Button>
              </Link>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ServicePro Setup</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderStep()}
          
          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <div>
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="flex items-center gap-2"
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
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/admin">
                  <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                    Launch Platform
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Help Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-600">
              Need help? Our setup takes less than 3 minutes
            </p>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" className="text-xs">
                <Phone className="h-3 w-3 mr-1" />
                Call Support
              </Button>
              <Button size="sm" variant="outline" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                Live Chat
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingFlow;