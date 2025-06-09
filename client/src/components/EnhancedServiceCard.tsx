import { Clock, AlertTriangle, Star, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    estimatedDays: number;
    deadline?: string;
    penaltyRisk?: number;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    isPopular?: boolean;
  };
  onSelect: (serviceId: string) => void;
}

const formatIndianRupees = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateDaysUntil = (deadline: string) => {
  const today = new Date();
  const targetDate = new Date(deadline);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getUrgencyStyles = (urgency: string) => {
  switch (urgency) {
    case 'critical':
      return 'border-red-500 bg-red-50';
    case 'high':
      return 'border-orange-500 bg-orange-50';
    case 'medium':
      return 'border-yellow-500 bg-yellow-50';
    default:
      return 'border-gray-200 bg-white';
  }
};

const EnhancedServiceCard = ({ service, onSelect }: ServiceCardProps) => {
  const daysUntilDeadline = service.deadline ? calculateDaysUntil(service.deadline) : null;
  const isUrgent = service.urgencyLevel === 'high' || service.urgencyLevel === 'critical';
  
  return (
    <Card className={`relative transition-all duration-200 hover:shadow-lg ${getUrgencyStyles(service.urgencyLevel || 'low')}`}>
      {service.isPopular && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-blue-600 text-white">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      
      {isUrgent && (
        <div className="absolute -top-2 -left-2 z-10">
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">
              {formatIndianRupees(service.basePrice)}
            </div>
            <div className="text-xs text-gray-500">+ 18% GST</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{service.description}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Timeline and Deadline */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{service.estimatedDays} days</span>
            </div>
            
            {daysUntilDeadline && (
              <div className={`flex items-center gap-1 ${
                daysUntilDeadline <= 7 ? 'text-red-600' : 
                daysUntilDeadline <= 30 ? 'text-orange-600' : 'text-green-600'
              }`}>
                <AlertTriangle className="w-4 h-4" />
                <span>Due in {daysUntilDeadline} days</span>
              </div>
            )}
          </div>

          {/* Penalty Risk Warning */}
          {service.penaltyRisk && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Penalty Risk</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Up to {formatIndianRupees(service.penaltyRisk)} if delayed
              </p>
            </div>
          )}

          {/* Category Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {service.category}
            </Badge>
            
            <Button 
              onClick={() => onSelect(service.id)}
              className={`${
                isUrgent 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isUrgent ? 'Select Now' : 'Select Service'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedServiceCard;