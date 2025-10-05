import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Search,
  ShoppingCart,
  Filter,
  TrendingUp,
  Shield,
  FileText,
  Building,
  Briefcase,
  Star,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useCurrentUser } from '@/components/ProtectedRoute';

interface Service {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  timeline: string;
  isPopular: boolean;
  documents: string[];
  features: string[];
}

export default function ClientServiceCatalog() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Fetch services from API
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'all' || service.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))];

  // Popular services
  const popularServices = services.filter((s) => s.isPopular).slice(0, 6);

  // Add service to cart
  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Proceed to request selected services
  const handleProceedToRequest = () => {
    if (selectedServices.length === 0) {
      toast({
        title: 'No services selected',
        description: 'Please select at least one service to proceed',
        variant: 'destructive',
      });
      return;
    }

    // Store selected services and navigate to service request form
    localStorage.setItem('selectedServices', JSON.stringify(selectedServices));
    setLocation('/service-request/create');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Service Catalog</h1>
              <p className="text-sm text-muted-foreground">
                Browse and select services for your business
              </p>
            </div>
            {selectedServices.length > 0 && (
              <Button
                onClick={handleProceedToRequest}
                className="gap-2"
                data-testid="button-proceed-to-request"
              >
                <ShoppingCart className="h-4 w-4" />
                Proceed ({selectedServices.length})
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-services"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Services */}
        {popularServices.length > 0 && searchQuery === '' && selectedCategory === 'all' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-bold">Popular Services</h2>
              <Badge variant="secondary">Most Requested</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedServices.includes(service.id)}
                  onToggle={() => toggleService(service.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="capitalize"
                data-testid={`tab-category-${category}`}
              >
                {category === 'all' ? 'All Services' : category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredServices.length} service(s) found
                </p>
              </div>

              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedServices.includes(service.id)}
                      onToggle={() => toggleService(service.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No services found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <Card className="sticky bottom-4 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedServices.length} service(s) selected</p>
                  <p className="text-sm text-muted-foreground">
                    Total: ₹
                    {services
                      .filter((s) => selectedServices.includes(s.id))
                      .reduce((sum, s) => sum + s.price, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <Button
                  onClick={handleProceedToRequest}
                  size="lg"
                  className="gap-2"
                  data-testid="button-proceed-bottom"
                >
                  Proceed to Request
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Service Card Component
function ServiceCard({
  service,
  isSelected,
  onToggle,
}: {
  service: Service;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={`relative hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onToggle}
      data-testid={`service-card-${service.id}`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
      {service.isPopular && (
        <Badge className="absolute top-3 left-3 bg-orange-600">
          <Star className="h-3 w-3 mr-1" />
          Popular
        </Badge>
      )}
      <CardHeader>
        <CardTitle className="text-lg">{service.name}</CardTitle>
        <CardDescription className="line-clamp-2">{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">₹{service.price.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{service.timeline}</p>
          </div>
          <Badge variant="outline">{service.category}</Badge>
        </div>

        {service.features && service.features.length > 0 && (
          <div className="space-y-1">
            {service.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        )}

        {service.documents && service.documents.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Required documents:</p>
            <div className="flex flex-wrap gap-1">
              {service.documents.slice(0, 2).map((doc, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {doc}
                </Badge>
              ))}
              {service.documents.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{service.documents.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
