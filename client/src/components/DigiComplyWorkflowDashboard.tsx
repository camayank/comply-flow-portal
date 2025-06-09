import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  FileText, 
  Users, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Award,
  TrendingUp,
  Scale,
  Globe
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  type: string;
  isStandard: boolean;
  metadata: {
    estimatedDuration: string;
    totalCost: number;
    requiredPersonnel: string[];
    complianceDeadlines: string[];
    eligibilityCriteria?: string[];
  };
  steps: any[];
}

const DigiComplyWorkflowDashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  // Fetch all workflow templates
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['/api/workflow-templates'],
    enabled: true
  });

  // Create workflow instance mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest('/api/workflow-instances', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          userId: 1,
          serviceRequestId: Date.now(),
          customizations: []
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-instances'] });
    }
  });

  const getWorkflowsByCategory = (category: string) => {
    if (!workflows || !Array.isArray(workflows)) return [];
    if (category === 'all') return workflows;
    return workflows.filter((w: WorkflowTemplate) => w.category === category);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'incorporation': return <Building2 className="h-5 w-5" />;
      case 'post_incorporation': return <CheckCircle className="h-5 w-5" />;
      case 'annual_compliance': return <Calendar className="h-5 w-5" />;
      case 'event_based': return <AlertTriangle className="h-5 w-5" />;
      case 'turnover_based': return <TrendingUp className="h-5 w-5" />;
      case 'condition_based': return <Shield className="h-5 w-5" />;
      case 'licenses': return <Award className="h-5 w-5" />;
      case 'voluntary': return <Globe className="h-5 w-5" />;
      case 'audit_services': return <Scale className="h-5 w-5" />;
      case 'industry_specific': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'incorporation': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'post_incorporation': return 'bg-green-100 text-green-800 border-green-300';
      case 'annual_compliance': return 'bg-red-100 text-red-800 border-red-300';
      case 'event_based': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'turnover_based': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'condition_based': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'licenses': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'voluntary': return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'audit_services': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'industry_specific': return 'bg-pink-100 text-pink-800 border-pink-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const categories = [
    { id: 'all', name: 'All Services', icon: FileText },
    { id: 'incorporation', name: 'Incorporation', icon: Building2 },
    { id: 'post_incorporation', name: 'Post-Incorporation', icon: CheckCircle },
    { id: 'annual_compliance', name: 'Annual Compliance', icon: Calendar },
    { id: 'event_based', name: 'Event-Based', icon: AlertTriangle },
    { id: 'turnover_based', name: 'Turnover-Based', icon: TrendingUp },
    { id: 'condition_based', name: 'Condition-Based', icon: Shield },
    { id: 'licenses', name: 'Licenses', icon: Award },
    { id: 'voluntary', name: 'Voluntary', icon: Globe },
    { id: 'audit_services', name: 'Audit Services', icon: Scale },
    { id: 'industry_specific', name: 'Industry-Specific', icon: FileText }
  ];

  const filteredWorkflows = getWorkflowsByCategory(selectedCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-gray-600">Loading DigiComply workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DigiComply Workflow Hub
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive Indian compliance workflows covering incorporation, post-incorporation, 
            event-based, turnover-based, audit services, and all applicable licenses and registrations
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">{Array.isArray(workflows) ? workflows.length : 0}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Categories</p>
                  <p className="text-2xl font-bold text-gray-900">10</p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Duration</p>
                  <p className="text-2xl font-bold text-gray-900">45 days</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Instances</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11 mb-6">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex flex-col gap-1 p-2 text-xs"
              >
                <category.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows.map((workflow: WorkflowTemplate) => (
                <Card key={workflow.id} className="h-full hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(workflow.category)}
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {workflow.name}
                          </CardTitle>
                          <Badge variant="outline" className={getCategoryColor(workflow.category)}>
                            {workflow.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{workflow.metadata.estimatedDuration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span>₹{workflow.metadata.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{workflow.steps.length} steps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{workflow.isStandard ? 'Standard' : 'Custom'}</span>
                      </div>
                    </div>

                    {/* Required Personnel */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Required Personnel:</p>
                      <div className="flex flex-wrap gap-1">
                        {workflow.metadata.requiredPersonnel.slice(0, 2).map((person, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {person}
                          </Badge>
                        ))}
                        {workflow.metadata.requiredPersonnel.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{workflow.metadata.requiredPersonnel.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Eligibility Criteria */}
                    {workflow.metadata.eligibilityCriteria && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Eligibility:</p>
                        <div className="text-xs text-gray-600">
                          {workflow.metadata.eligibilityCriteria[0]}
                          {workflow.metadata.eligibilityCriteria.length > 1 && (
                            <span className="text-blue-600"> +{workflow.metadata.eligibilityCriteria.length - 1} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Critical Deadlines */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Key Deadlines:</p>
                      <div className="text-xs text-red-600">
                        {workflow.metadata.complianceDeadlines[0]}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        className="flex-1" 
                        size="sm"
                        onClick={() => createWorkflowMutation.mutate(workflow.id)}
                        disabled={createWorkflowMutation.isPending}
                      >
                        {createWorkflowMutation.isPending ? 'Starting...' : 'Start Workflow'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedWorkflow(workflow.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredWorkflows.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600 mb-2">No workflows found</p>
                <p className="text-sm text-gray-500">
                  Try selecting a different category or check back later
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Important Notice */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Customizable Workflows:</strong> All workflows can be modified for specific use cases. 
            Standard templates provide baseline compliance requirements, but additional steps, documents, 
            or processes can be added based on your company's unique requirements, industry regulations, 
            or specific circumstances.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default DigiComplyWorkflowDashboard;