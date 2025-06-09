import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lightbulb, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Shield, 
  Target,
  Sparkles,
  CheckCircle,
  X,
  ArrowRight,
  BarChart3,
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  Gift,
  Zap,
  Brain,
  Star
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { SmartSuggestion } from '@shared/schema';

interface SuggestionWithMetrics extends SmartSuggestion {
  serviceName?: string;
  estimatedTimeToComplete?: number;
  implementationComplexity?: 'low' | 'medium' | 'high';
  relevanceScore?: number;
  successRate?: number;
}

interface SuggestionCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  suggestions: SuggestionWithMetrics[];
}

const SmartSuggestionsEngine = () => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'savings' | 'priority'>('relevance');

  // Fetch smart suggestions
  const { data: suggestions = [], isLoading } = useQuery<SuggestionWithMetrics[]>({
    queryKey: ['/api/smart-suggestions'],
  });

  // Accept suggestion mutation
  const acceptSuggestionMutation = useMutation({
    mutationFn: (suggestionId: number) => 
      apiRequest('POST', `/api/smart-suggestions/${suggestionId}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-suggestions'] });
      toast({
        title: "Suggestion Accepted",
        description: "We'll help you implement this recommendation.",
      });
    },
  });

  // Dismiss suggestion mutation
  const dismissSuggestionMutation = useMutation({
    mutationFn: (suggestionId: number) =>
      apiRequest('POST', `/api/smart-suggestions/${suggestionId}/dismiss`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-suggestions'] });
      toast({
        title: "Suggestion Dismissed",
        description: "This suggestion has been removed from your list.",
      });
    },
  });

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'service_combo': return <Gift className="h-5 w-5" />;
      case 'compliance_alert': return <Shield className="h-5 w-5" />;
      case 'cost_optimization': return <DollarSign className="h-5 w-5" />;
      case 'timeline_optimization': return <Clock className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categorizedSuggestions: SuggestionCategory[] = [
    {
      id: 'service_combo',
      name: 'Service Combinations',
      icon: Gift,
      color: 'text-purple-600',
      description: 'Save money with bundled services',
      suggestions: suggestions.filter(s => s.suggestionType === 'service_combo')
    },
    {
      id: 'compliance_alert',
      name: 'Compliance Alerts',
      icon: Shield,
      color: 'text-red-600',
      description: 'Stay ahead of regulatory requirements',
      suggestions: suggestions.filter(s => s.suggestionType === 'compliance_alert')
    },
    {
      id: 'cost_optimization',
      name: 'Cost Optimization',
      icon: DollarSign,
      color: 'text-green-600',
      description: 'Reduce costs and improve efficiency',
      suggestions: suggestions.filter(s => s.suggestionType === 'cost_optimization')
    },
    {
      id: 'timeline_optimization',
      name: 'Timeline Optimization',
      icon: Clock,
      color: 'text-blue-600',
      description: 'Complete tasks faster and more efficiently',
      suggestions: suggestions.filter(s => s.suggestionType === 'timeline_optimization')
    }
  ];

  const filteredSuggestions = selectedCategory === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.suggestionType === selectedCategory);

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case 'savings':
        return (b.potentialSavings || 0) - (a.potentialSavings || 0);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      case 'relevance':
      default:
        return (b.confidenceScore || 0) - (a.confidenceScore || 0);
    }
  });

  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + (s.potentialSavings || 0), 0);
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high').length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Smart Suggestions Engine</h1>
        </div>
        <p className="text-gray-600">
          AI-powered recommendations to optimize your compliance processes, reduce costs, and improve efficiency.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Suggestions</p>
                <p className="text-3xl font-bold">{suggestions.length}</p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Potential Savings</p>
                <p className="text-3xl font-bold text-green-600">₹{totalPotentialSavings.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-red-600">{highPrioritySuggestions}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-blue-600">94%</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Alert */}
      {highPrioritySuggestions > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You have <strong>{highPrioritySuggestions} high-priority suggestions</strong> that require immediate attention 
            to avoid compliance issues or significant cost implications.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <TabsList className="grid w-full lg:w-auto grid-cols-5">
            <TabsTrigger value="all" onClick={() => setSelectedCategory('all')}>
              All Suggestions
            </TabsTrigger>
            {categorizedSuggestions.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                onClick={() => setSelectedCategory(category.id)}
              >
                <category.icon className="h-4 w-4 mr-2" />
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex gap-2">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded"
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="savings">Sort by Savings</option>
              <option value="priority">Sort by Priority</option>
            </select>
          </div>
        </div>

        {/* All Suggestions */}
        <TabsContent value="all">
          <div className="space-y-4">
            {sortedSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className={`transition-all duration-200 hover:shadow-md ${getPriorityColor(suggestion.priority)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {getSuggestionIcon(suggestion.suggestionType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                          <Badge className={getPriorityBadge(suggestion.priority)}>
                            {suggestion.priority}
                          </Badge>
                          <Badge variant="outline">
                            {suggestion.confidenceScore}% confidence
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-4">{suggestion.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {suggestion.potentialSavings && suggestion.potentialSavings > 0 && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="text-sm">
                                Save ₹{suggestion.potentialSavings.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {suggestion.estimatedTimeToComplete && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">
                                {suggestion.estimatedTimeToComplete} days to implement
                              </span>
                            </div>
                          )}
                          {suggestion.successRate && (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">
                                {suggestion.successRate}% success rate
                              </span>
                            </div>
                          )}
                        </div>

                        {suggestion.suggestedServices && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Recommended Services:</p>
                            <div className="flex flex-wrap gap-2">
                              {(suggestion.suggestedServices as string[]).map((service, index) => (
                                <Badge key={index} variant="secondary">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dismissSuggestionMutation.mutate(suggestion.id)}
                        disabled={dismissSuggestionMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                        disabled={acceptSuggestionMutation.isPending}
                      >
                        Accept
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sortedSuggestions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Suggestions Available</h3>
                  <p className="text-gray-600">
                    {selectedCategory === 'all' 
                      ? "You're all caught up! Our AI will generate new suggestions as opportunities arise."
                      : "No suggestions available in this category right now."
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Category-specific tabs */}
        {categorizedSuggestions.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className={`h-6 w-6 ${category.color}`} />
                  {category.name}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold">{category.suggestions.length}</p>
                    <p className="text-sm text-gray-600">Active Suggestions</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">
                      ₹{category.suggestions.reduce((sum, s) => sum + (s.potentialSavings || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Potential Savings</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">
                      {Math.round(category.suggestions.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / (category.suggestions.length || 1))}%
                    </p>
                    <p className="text-sm text-gray-600">Avg. Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {category.suggestions.map((suggestion) => (
                <Card key={suggestion.id} className={`transition-all duration-200 hover:shadow-md ${getPriorityColor(suggestion.priority)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getSuggestionIcon(suggestion.suggestionType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                            <Badge className={getPriorityBadge(suggestion.priority)}>
                              {suggestion.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-4">{suggestion.description}</p>
                          
                          {suggestion.potentialSavings && suggestion.potentialSavings > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium text-green-600">
                                Potential Savings: ₹{suggestion.potentialSavings.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissSuggestionMutation.mutate(suggestion.id)}
                          disabled={dismissSuggestionMutation.isPending}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                          disabled={acceptSuggestionMutation.isPending}
                        >
                          Accept Suggestion
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {category.suggestions.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <category.icon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No {category.name} Available</h3>
                    <p className="text-gray-600">
                      No suggestions in this category right now. Check back later for new recommendations.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* AI Insights Footer */}
      <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">AI Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium mb-2">Optimization Score</h4>
              <p className="text-2xl font-bold text-blue-600">87%</p>
              <p className="text-sm text-gray-600">Your compliance efficiency</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium mb-2">Cost Efficiency</h4>
              <p className="text-2xl font-bold text-green-600">92%</p>
              <p className="text-sm text-gray-600">Compared to industry average</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium mb-2">Prediction Accuracy</h4>
              <p className="text-2xl font-bold text-purple-600">96%</p>
              <p className="text-sm text-gray-600">Historical suggestion success</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartSuggestionsEngine;