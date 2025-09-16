import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  Send,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Smile,
  Meh,
  Frown,
  Filter,
  Search,
  Award,
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Calendar,
  User
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface FeedbackSurvey {
  id: number;
  serviceRequestId: number;
  clientName: string;
  serviceName: string;
  overallRating: number;
  serviceQuality: number;
  timeliness: number;
  communication: number;
  documentation: number;
  positiveAspects: string;
  improvementSuggestions: string;
  additionalComments: string;
  npsScore: number;
  wouldRecommend: boolean;
  hasIssues: boolean;
  issuesDescription?: string;
  submittedDate: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

interface FeedbackForm {
  overallRating: number;
  serviceQuality: number;
  timeliness: number;
  communication: number;
  documentation: number;
  positiveAspects: string;
  improvementSuggestions: string;
  additionalComments: string;
  npsScore: number;
  wouldRecommend: boolean;
  hasIssues: boolean;
  issuesDescription: string;
}

const ClientFeedbackSystem = () => {
  const [activeTab, setActiveTab] = useState('submit');
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    overallRating: 0,
    serviceQuality: 0,
    timeliness: 0,
    communication: 0,
    documentation: 0,
    positiveAspects: '',
    improvementSuggestions: '',
    additionalComments: '',
    npsScore: 0,
    wouldRecommend: true,
    hasIssues: false,
    issuesDescription: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const feedbackAnalytics = {
    totalFeedback: 342,
    averageRating: 4.6,
    npsScore: 8.2,
    responseRate: 78.5,
    satisfactionTrend: [
      { month: 'Oct', avgRating: 4.2, nps: 7.5, responses: 45 },
      { month: 'Nov', avgRating: 4.4, nps: 7.8, responses: 52 },
      { month: 'Dec', avgRating: 4.6, nps: 8.1, responses: 58 },
      { month: 'Jan', avgRating: 4.7, nps: 8.2, responses: 62 }
    ],
    ratingDistribution: [
      { rating: '5 Stars', count: 198, percentage: 58 },
      { rating: '4 Stars', count: 89, percentage: 26 },
      { rating: '3 Stars', count: 34, percentage: 10 },
      { rating: '2 Stars', count: 15, percentage: 4 },
      { rating: '1 Star', count: 6, percentage: 2 }
    ],
    serviceRatings: [
      { service: 'Company Incorporation', avgRating: 4.8, count: 85 },
      { service: 'GST Registration', avgRating: 4.6, count: 67 },
      { service: 'Annual Compliance', avgRating: 4.4, count: 52 },
      { service: 'Trademark Registration', avgRating: 4.7, count: 38 }
    ]
  };

  const feedbackList: FeedbackSurvey[] = [
    {
      id: 1,
      serviceRequestId: 1,
      clientName: "Tech Innovations Pvt Ltd",
      serviceName: "Company Incorporation",
      overallRating: 5,
      serviceQuality: 5,
      timeliness: 4,
      communication: 5,
      documentation: 5,
      positiveAspects: "Excellent service quality and very professional team. The incorporation process was smooth and well-coordinated.",
      improvementSuggestions: "Could be slightly faster in document processing",
      additionalComments: "Very satisfied with the overall experience. Will recommend to others.",
      npsScore: 9,
      wouldRecommend: true,
      hasIssues: false,
      submittedDate: "2024-01-16",
      status: 'acknowledged'
    },
    {
      id: 2,
      serviceRequestId: 2,
      clientName: "Digital Solutions LLP",
      serviceName: "Annual Compliance",
      overallRating: 3,
      serviceQuality: 4,
      timeliness: 2,
      communication: 3,
      documentation: 4,
      positiveAspects: "Good knowledge and expertise in compliance matters",
      improvementSuggestions: "Need better communication during the process and faster response times",
      additionalComments: "Service quality is good but there were delays and communication issues",
      npsScore: 6,
      wouldRecommend: true,
      hasIssues: true,
      issuesDescription: "Delayed responses to queries and missed initial deadline",
      submittedDate: "2024-01-15",
      status: 'pending'
    },
    {
      id: 3,
      serviceRequestId: 3,
      clientName: "Green Energy Co",
      serviceName: "GST Registration",
      overallRating: 4,
      serviceQuality: 4,
      timeliness: 4,
      communication: 4,
      documentation: 4,
      positiveAspects: "Professional approach and good documentation",
      improvementSuggestions: "More proactive updates on progress would be helpful",
      additionalComments: "Overall good experience",
      npsScore: 8,
      wouldRecommend: true,
      hasIssues: false,
      submittedDate: "2024-01-14",
      status: 'resolved'
    }
  ];

  const handleRatingChange = (field: keyof FeedbackForm, value: number) => {
    setFeedbackForm(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof FeedbackForm, value: string | boolean) => {
    setFeedbackForm(prev => ({ ...prev, [field]: value }));
  };

  const StarRating = ({ rating, onRatingChange, size = 'h-6 w-6' }: { 
    rating: number; 
    onRatingChange: (rating: number) => void;
    size?: string;
  }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          className="focus:outline-none"
          data-testid={`star-${star}`}
        >
          <Star
            className={`${size} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
          />
        </button>
      ))}
    </div>
  );

  const NPSSelector = ({ score, onScoreChange }: { 
    score: number; 
    onScoreChange: (score: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="text-sm font-medium">How likely are you to recommend us to others? (0-10)</div>
      <div className="flex space-x-1">
        {[...Array(11)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onScoreChange(i)}
            className={`w-8 h-8 text-xs font-medium rounded ${
              i === score 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } transition-colors`}
            data-testid={`nps-${i}`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );

  const submitFeedback = useMutation({
    mutationFn: async (feedback: FeedbackForm) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return feedback;
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your valuable feedback!",
      });
      setFeedbackForm({
        overallRating: 0,
        serviceQuality: 0,
        timeliness: 0,
        communication: 0,
        documentation: 0,
        positiveAspects: '',
        improvementSuggestions: '',
        additionalComments: '',
        npsScore: 0,
        wouldRecommend: true,
        hasIssues: false,
        issuesDescription: ''
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (feedbackForm.overallRating === 0) {
      toast({
        title: "Please provide a rating",
        description: "Overall rating is required to submit feedback.",
        variant: "destructive",
      });
      return;
    }
    submitFeedback.mutate(feedbackForm);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'acknowledged': return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentIcon = (rating: number) => {
    if (rating >= 4) return <Smile className="h-5 w-5 text-green-500" />;
    if (rating >= 3) return <Meh className="h-5 w-5 text-yellow-500" />;
    return <Frown className="h-5 w-5 text-red-500" />;
  };

  const FeedbackSubmissionTab = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card data-testid="feedback-submission-form">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-6 w-6 mr-2 text-yellow-400" />
            Service Feedback
          </CardTitle>
          <CardDescription>
            Help us improve our services by sharing your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Overall Rating</Label>
            <div className="flex items-center space-x-4">
              <StarRating 
                rating={feedbackForm.overallRating}
                onRatingChange={(rating) => handleRatingChange('overallRating', rating)}
                size="h-8 w-8"
              />
              <span className="text-sm text-gray-600">
                {feedbackForm.overallRating > 0 && `${feedbackForm.overallRating}/5`}
              </span>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Service Quality</Label>
              <StarRating 
                rating={feedbackForm.serviceQuality}
                onRatingChange={(rating) => handleRatingChange('serviceQuality', rating)}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Timeliness</Label>
              <StarRating 
                rating={feedbackForm.timeliness}
                onRatingChange={(rating) => handleRatingChange('timeliness', rating)}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Communication</Label>
              <StarRating 
                rating={feedbackForm.communication}
                onRatingChange={(rating) => handleRatingChange('communication', rating)}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Documentation</Label>
              <StarRating 
                rating={feedbackForm.documentation}
                onRatingChange={(rating) => handleRatingChange('documentation', rating)}
              />
            </div>
          </div>

          {/* Text Feedback */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="positive-aspects" className="text-sm font-medium">
                What did we do well?
              </Label>
              <Textarea
                id="positive-aspects"
                placeholder="Tell us what you liked about our service..."
                value={feedbackForm.positiveAspects}
                onChange={(e) => handleInputChange('positiveAspects', e.target.value)}
                className="resize-none"
                data-testid="input-positive-aspects"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="improvement-suggestions" className="text-sm font-medium">
                How can we improve?
              </Label>
              <Textarea
                id="improvement-suggestions"
                placeholder="Share your suggestions for improvement..."
                value={feedbackForm.improvementSuggestions}
                onChange={(e) => handleInputChange('improvementSuggestions', e.target.value)}
                className="resize-none"
                data-testid="input-improvement-suggestions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-comments" className="text-sm font-medium">
                Additional Comments
              </Label>
              <Textarea
                id="additional-comments"
                placeholder="Any other feedback you'd like to share..."
                value={feedbackForm.additionalComments}
                onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                className="resize-none"
                data-testid="input-additional-comments"
              />
            </div>
          </div>

          {/* NPS Score */}
          <div className="space-y-4">
            <NPSSelector 
              score={feedbackForm.npsScore}
              onScoreChange={(score) => handleRatingChange('npsScore', score)}
            />
          </div>

          {/* Issues Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="has-issues"
                checked={feedbackForm.hasIssues}
                onCheckedChange={(checked) => handleInputChange('hasIssues', checked as boolean)}
                data-testid="checkbox-has-issues"
              />
              <Label htmlFor="has-issues" className="text-sm font-medium">
                I experienced issues with this service
              </Label>
            </div>
            
            {feedbackForm.hasIssues && (
              <div className="space-y-2">
                <Label htmlFor="issues-description" className="text-sm font-medium text-red-700">
                  Please describe the issues
                </Label>
                <Textarea
                  id="issues-description"
                  placeholder="Please provide details about any issues you encountered..."
                  value={feedbackForm.issuesDescription}
                  onChange={(e) => handleInputChange('issuesDescription', e.target.value)}
                  className="resize-none border-red-200 focus:border-red-300"
                  data-testid="input-issues-description"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={submitFeedback.isPending}
              className="min-w-32"
              data-testid="button-submit-feedback"
            >
              {submitFeedback.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const FeedbackListTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-feedback-search"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-48" data-testid="select-service-filter">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Services</SelectItem>
            <SelectItem value="company-incorporation">Company Incorporation</SelectItem>
            <SelectItem value="gst-registration">GST Registration</SelectItem>
            <SelectItem value="annual-compliance">Annual Compliance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbackList.map((feedback) => (
          <Card key={feedback.id} className="hover:shadow-md transition-shadow" data-testid={`feedback-item-${feedback.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <div className="flex items-center">
                    {getSentimentIcon(feedback.overallRating)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feedback.clientName}</h3>
                    <p className="text-sm text-gray-600">{feedback.serviceName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${
                              i < feedback.overallRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {feedback.overallRating}/5
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        NPS: {feedback.npsScore}/10
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(feedback.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(feedback.status)}
                      <span>{feedback.status.toUpperCase()}</span>
                    </div>
                  </Badge>
                  {feedback.hasIssues && (
                    <Badge variant="destructive" className="text-xs">
                      Issues Reported
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {feedback.positiveAspects && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-green-700">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      What went well
                    </div>
                    <p className="text-sm text-gray-700 bg-green-50 p-3 rounded">
                      {feedback.positiveAspects}
                    </p>
                  </div>
                )}

                {feedback.improvementSuggestions && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-blue-700">
                      <Target className="h-4 w-4 mr-1" />
                      Improvement suggestions
                    </div>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                      {feedback.improvementSuggestions}
                    </p>
                  </div>
                )}
              </div>

              {feedback.hasIssues && feedback.issuesDescription && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center text-sm font-medium text-red-700 mb-2">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Issues Reported
                  </div>
                  <p className="text-sm text-red-700">{feedback.issuesDescription}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Submitted on {new Date(feedback.submittedDate).toLocaleDateString()}</span>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" data-testid={`button-respond-${feedback.id}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Respond
                  </Button>
                  {feedback.status === 'pending' && (
                    <Button size="sm" data-testid={`button-acknowledge-${feedback.id}`}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="metric-total-feedback">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackAnalytics.totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12% from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-rating">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{feedbackAnalytics.averageRating}</div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${
                      i < Math.floor(feedbackAnalytics.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
            </div>
            <Progress value={(feedbackAnalytics.averageRating / 5) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="metric-nps-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{feedbackAnalytics.npsScore}</div>
            <Progress value={(feedbackAnalytics.npsScore / 10) * 100} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Excellent customer loyalty
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-response-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackAnalytics.responseRate}%</div>
            <Progress value={feedbackAnalytics.responseRate} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Above industry average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-satisfaction-trends">
          <CardHeader>
            <CardTitle>Satisfaction Trends</CardTitle>
            <CardDescription>Rating and NPS trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedbackAnalytics.satisfactionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgRating" 
                  stroke="#8884d8" 
                  strokeWidth={2} 
                  name="Avg Rating" 
                />
                <Line 
                  type="monotone" 
                  dataKey="nps" 
                  stroke="#82ca9d" 
                  strokeWidth={2} 
                  name="NPS Score" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-rating-distribution">
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>Breakdown of all ratings received</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feedbackAnalytics.ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Ratings */}
      <Card data-testid="service-ratings-table">
        <CardHeader>
          <CardTitle>Service-wise Ratings</CardTitle>
          <CardDescription>Average ratings for different services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackAnalytics.serviceRatings.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-medium">{service.service}</div>
                    <div className="text-sm text-gray-500">{service.count} reviews</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          i < Math.floor(service.avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{service.avgRating}/5</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="client-feedback-system">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Client Feedback System</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive feedback collection and analysis platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-feedback-navigation">
            <TabsTrigger value="submit" data-testid="tab-submit-feedback">Submit Feedback</TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-feedback-list">Feedback List</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-feedback-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-6">
            <FeedbackSubmissionTab />
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <FeedbackListTab />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientFeedbackSystem;