import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Factory, Code, Stethoscope, GraduationCap, Utensils, ShoppingBag, Truck, Home, Briefcase } from 'lucide-react';

const IndustryClassification = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  const industries = [
    {
      id: 'manufacturing',
      title: 'Manufacturing',
      icon: Factory,
      description: 'Production and manufacturing activities',
      subCategories: [
        { id: 'textile', name: 'Textile & Garments', code: '13000' },
        { id: 'food', name: 'Food Processing', code: '10000' },
        { id: 'automotive', name: 'Automotive Parts', code: '29000' },
        { id: 'electronics', name: 'Electronics Manufacturing', code: '26000' },
        { id: 'chemicals', name: 'Chemicals & Pharmaceuticals', code: '20000' }
      ]
    },
    {
      id: 'technology',
      title: 'Information Technology',
      icon: Code,
      description: 'Software development and IT services',
      subCategories: [
        { id: 'software', name: 'Software Development', code: '62010' },
        { id: 'web-dev', name: 'Web Development', code: '62020' },
        { id: 'mobile-apps', name: 'Mobile App Development', code: '62030' },
        { id: 'it-consulting', name: 'IT Consulting', code: '62090' },
        { id: 'data-processing', name: 'Data Processing Services', code: '63110' }
      ]
    },
    {
      id: 'healthcare',
      title: 'Healthcare & Medical',
      icon: Stethoscope,
      description: 'Medical and healthcare services',
      subCategories: [
        { id: 'hospitals', name: 'Hospital Services', code: '86100' },
        { id: 'medical-practice', name: 'Medical Practice', code: '86200' },
        { id: 'diagnostic', name: 'Diagnostic Services', code: '86900' },
        { id: 'pharma-retail', name: 'Pharmaceutical Retail', code: '47730' },
        { id: 'telemedicine', name: 'Telemedicine Services', code: '86909' }
      ]
    },
    {
      id: 'education',
      title: 'Education & Training',
      icon: GraduationCap,
      description: 'Educational institutions and training',
      subCategories: [
        { id: 'schools', name: 'School Education', code: '85100' },
        { id: 'higher-education', name: 'Higher Education', code: '85300' },
        { id: 'skill-training', name: 'Skill Development Training', code: '85590' },
        { id: 'online-education', name: 'Online Education Platform', code: '85599' },
        { id: 'coaching', name: 'Coaching & Tutoring', code: '85510' }
      ]
    },
    {
      id: 'food-beverage',
      title: 'Food & Beverage',
      icon: Utensils,
      description: 'Food service and beverage industry',
      subCategories: [
        { id: 'restaurants', name: 'Restaurant Services', code: '56101' },
        { id: 'catering', name: 'Catering Services', code: '56210' },
        { id: 'food-delivery', name: 'Food Delivery Services', code: '56102' },
        { id: 'cloud-kitchen', name: 'Cloud Kitchen', code: '56103' },
        { id: 'beverage-mfg', name: 'Beverage Manufacturing', code: '11050' }
      ]
    },
    {
      id: 'retail',
      title: 'Retail & E-commerce',
      icon: ShoppingBag,
      description: 'Retail trade and online commerce',
      subCategories: [
        { id: 'ecommerce', name: 'E-commerce Platform', code: '47910' },
        { id: 'fashion-retail', name: 'Fashion Retail', code: '47710' },
        { id: 'electronics-retail', name: 'Electronics Retail', code: '47430' },
        { id: 'grocery-retail', name: 'Grocery Retail', code: '47110' },
        { id: 'marketplace', name: 'Online Marketplace', code: '47919' }
      ]
    },
    {
      id: 'logistics',
      title: 'Logistics & Transportation',
      icon: Truck,
      description: 'Transportation and logistics services',
      subCategories: [
        { id: 'freight', name: 'Freight Transportation', code: '49410' },
        { id: 'courier', name: 'Courier Services', code: '53200' },
        { id: 'warehousing', name: 'Warehousing Services', code: '52109' },
        { id: 'logistics-tech', name: 'Logistics Technology', code: '52101' },
        { id: 'last-mile', name: 'Last Mile Delivery', code: '53201' }
      ]
    },
    {
      id: 'real-estate',
      title: 'Real Estate',
      icon: Home,
      description: 'Real estate and property services',
      subCategories: [
        { id: 'property-dev', name: 'Property Development', code: '68100' },
        { id: 'real-estate-agency', name: 'Real Estate Agency', code: '68310' },
        { id: 'property-mgmt', name: 'Property Management', code: '68320' },
        { id: 'construction', name: 'Construction Services', code: '41000' },
        { id: 'interior-design', name: 'Interior Design', code: '74100' }
      ]
    },
    {
      id: 'professional',
      title: 'Professional Services',
      icon: Briefcase,
      description: 'Consulting and professional services',
      subCategories: [
        { id: 'legal', name: 'Legal Services', code: '69100' },
        { id: 'accounting', name: 'Accounting Services', code: '69200' },
        { id: 'management-consulting', name: 'Management Consulting', code: '70220' },
        { id: 'hr-consulting', name: 'HR Consulting', code: '78200' },
        { id: 'marketing-agency', name: 'Marketing Agency', code: '73110' }
      ]
    }
  ];

  const filteredIndustries = industries.filter(industry =>
    industry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.subCategories.some(sub => 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedIndustryData = industries.find(ind => ind.id === selectedIndustry);

  const handleContinue = () => {
    if (selectedIndustry && selectedSubCategory) {
      const industryData = industries.find(ind => ind.id === selectedIndustry);
      const subCategoryData = industryData?.subCategories.find(sub => sub.id === selectedSubCategory);
      
      localStorage.setItem('industryClassification', JSON.stringify({
        industry: selectedIndustry,
        subCategory: selectedSubCategory,
        industryName: industryData?.title,
        subCategoryName: subCategoryData?.name,
        nicCode: subCategoryData?.code
      }));
      setLocation('/document-upload');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Industry Classification
          </h1>
          <p className="text-lg text-gray-600">
            Select your business industry and activity for NIC code classification
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Step 4: Industry Classification</h3>
            <span>4 of 8 steps</span>
          </div>
          <div className="w-full bg-indigo-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-1/2 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-6xl mx-auto">
          {/* Search Bar */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for your industry or business activity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Industry Selection */}
          {!selectedIndustry && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredIndustries.map((industry) => {
                const Icon = industry.icon;
                
                return (
                  <Card 
                    key={industry.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                    onClick={() => setSelectedIndustry(industry.id)}
                  >
                    <CardHeader className="text-center pb-4">
                      <Icon className="h-12 w-12 mx-auto mb-4 text-indigo-600" />
                      <CardTitle className="text-lg">{industry.title}</CardTitle>
                      <CardDescription>{industry.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {industry.subCategories.slice(0, 3).map((sub) => (
                          <Badge key={sub.id} variant="secondary" className="text-xs">
                            {sub.name}
                          </Badge>
                        ))}
                        {industry.subCategories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{industry.subCategories.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Sub-category Selection */}
          {selectedIndustry && selectedIndustryData && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <selectedIndustryData.icon className="h-6 w-6" />
                      {selectedIndustryData.title}
                    </CardTitle>
                    <CardDescription>
                      Select the specific business activity that best describes your company
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedIndustry('');
                      setSelectedSubCategory('');
                    }}
                  >
                    Change Industry
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedIndustryData.subCategories.map((subCat) => (
                    <div
                      key={subCat.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSubCategory === subCat.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedSubCategory(subCat.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{subCat.name}</h4>
                          <p className="text-sm text-gray-600">NIC Code: {subCat.code}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          selectedSubCategory === subCat.id
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedSubCategory === subCat.id && (
                            <div className="w-2 h-2 bg-white rounded-full m-1"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continue Button */}
          {selectedIndustry && selectedSubCategory && (
            <div className="text-center">
              <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                <h3 className="text-lg font-semibold mb-2">Selected Classification</h3>
                <p className="text-gray-600">
                  <span className="font-medium">{selectedIndustryData?.title}</span> → {' '}
                  <span className="font-medium">
                    {selectedIndustryData?.subCategories.find(sub => sub.id === selectedSubCategory)?.name}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  NIC Code: {selectedIndustryData?.subCategories.find(sub => sub.id === selectedSubCategory)?.code}
                </p>
              </div>
              
              <Button 
                onClick={handleContinue}
                size="lg"
                className="px-8 py-3"
              >
                Continue to Document Upload
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndustryClassification;