import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, FileText, Calendar, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface KoshikaService {
  serviceId: string;
  name: string;
  type: string;
  category: string;
  price: number;
  deadline: string;
  formType?: string;
  description: string;
  requiredDocs: string[];
  isActive: boolean;
}

interface Props {
  service: KoshikaService;
  isSelected: boolean;
  onSelect: (service: KoshikaService) => void;
  onRemove?: (serviceId: string) => void;
}

const KoshikaServiceCard: React.FC<Props> = ({ service, isSelected, onSelect, onRemove }) => {
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'incorporation': return <Building2 className="h-5 w-5" />;
      case 'compliance': return <FileText className="h-5 w-5" />;
      case 'change': return <Users className="h-5 w-5" />;
      case 'tax': return <DollarSign className="h-5 w-5" />;
      case 'conversion': return <Building2 className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business-setup': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'annual-compliance': return 'bg-red-100 text-red-800 border-red-300';
      case 'director-services': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'llp-compliance': return 'bg-green-100 text-green-800 border-green-300';
      case 'tax-compliance': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'company-changes': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'llp-changes': return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'conversion-services': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-lg ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(service.type)}
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {service.name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {service.description}
              </CardDescription>
            </div>
          </div>
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Service Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className={getCategoryColor(service.category)}>
              {service.type}
            </Badge>
            {service.formType && (
              <div className="text-xs text-gray-600">
                Form: {service.formType}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatPrice(service.price)}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
              <Calendar className="h-3 w-3" />
              {service.deadline}
            </div>
          </div>
        </div>

        {/* Required Documents */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Required Documents:
          </div>
          <div className="flex flex-wrap gap-1">
            {service.requiredDocs.slice(0, 3).map((doc, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ))}
            {service.requiredDocs.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{service.requiredDocs.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!isSelected ? (
            <Button 
              onClick={() => onSelect(service)}
              className="flex-1"
              size="sm"
            >
              Select Service
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={() => onRemove?.(service.serviceId)}
                className="flex-1"
                size="sm"
              >
                Remove
              </Button>
              <Button 
                variant="default"
                className="flex-1"
                size="sm"
                disabled
              >
                Selected
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KoshikaServiceCard;