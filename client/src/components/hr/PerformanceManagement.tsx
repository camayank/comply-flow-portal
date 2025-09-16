import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, Target, TrendingUp, Star, Calendar, Clock, 
  Plus, Edit, Eye, CheckCircle, AlertTriangle, BarChart3,
  User, FileText, Award, Zap, Brain, Book
} from 'lucide-react';

// Form schemas
const reviewSchema = z.object({
  employeeId: z.number(),
  reviewPeriod: z.string(),
  reviewType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  technicalCompetency: z.number().min(1).max(5),
  qualityOfWork: z.number().min(1).max(5),
  productivity: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  teamwork: z.number().min(1).max(5),
  achievements: z.string(),
  areasForImprovement: z.string(),
  managerComments: z.string(),
});

const goalSchema = z.object({
  employeeId: z.number(),
  goalType: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.string(),
  targetValue: z.number(),
  unit: z.string(),
  startDate: z.string(),
  targetDate: z.string(),
});

export default function PerformanceManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['/api/hr/employees'],
  });

  // Fetch performance overview
  const { data: performanceOverview } = useQuery({
    queryKey: ['/api/hr/analytics/team-performance'],
  });

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <PerformanceOverview data={performanceOverview} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">
            <Trophy className="h-4 w-4 mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">
            <Target className="h-4 w-4 mr-2" />
            Goals & KPIs
          </TabsTrigger>
          <TabsTrigger value="employees" data-testid="tab-employees">
            <User className="h-4 w-4 mr-2" />
            Employee Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PerformanceMetrics />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <PerformanceReviews 
            employees={employees}
            onCreateReview={() => setIsReviewDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalsManagement 
            employees={employees}
            onCreateGoal={() => setIsGoalDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <EmployeePerformance employees={employees} />
        </TabsContent>
      </Tabs>

      {/* Create Review Dialog */}
      <CreateReviewDialog 
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        employees={employees}
      />

      {/* Create Goal Dialog */}
      <CreateGoalDialog 
        isOpen={isGoalDialogOpen}
        onClose={() => setIsGoalDialogOpen(false)}
        employees={employees}
      />
    </div>
  );
}

// Performance Overview Component
function PerformanceOverview({ data }: { data: any }) {
  const metrics = [
    {
      title: 'Team Performance',
      value: data?.overview?.averagePerformance ? `${data.overview.averagePerformance.toFixed(1)}/5` : '0/5',
      icon: Trophy,
      color: 'bg-yellow-500',
      trend: '+0.2'
    },
    {
      title: 'Reviews Completed',
      value: data?.recentReviews?.count || '0',
      icon: FileText,
      color: 'bg-blue-500',
      trend: '+12'
    },
    {
      title: 'Active Goals',
      value: '42',
      icon: Target,
      color: 'bg-green-500',
      trend: '+8'
    },
    {
      title: 'Goals Achieved',
      value: '38',
      icon: CheckCircle,
      color: 'bg-purple-500',
      trend: '+15'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">{metric.trend}</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${metric.color}`}>
                <metric.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Performance Metrics Component
function PerformanceMetrics() {
  const performanceData = [
    { department: 'Operations', performance: 4.2, trend: '+0.3' },
    { department: 'Sales', performance: 4.0, trend: '+0.1' },
    { department: 'QC', performance: 4.5, trend: '+0.2' },
    { department: 'Admin', performance: 3.8, trend: '-0.1' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {performanceData.map((dept) => (
            <div key={dept.department} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{dept.department}</span>
                  <span className="text-sm text-gray-600">{dept.performance}/5</span>
                </div>
                <Progress value={(dept.performance / 5) * 100} className="h-2" />
              </div>
              <Badge variant={dept.trend.startsWith('+') ? 'default' : 'destructive'} className="ml-4">
                {dept.trend}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-2" />
                Excellent (4.5+)
              </span>
              <span className="font-medium">25%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Star className="h-4 w-4 text-green-500 mr-2" />
                Good (3.5-4.4)
              </span>
              <span className="font-medium">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Star className="h-4 w-4 text-orange-500 mr-2" />
                Average (2.5-3.4)
              </span>
              <span className="font-medium">25%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                Needs Improvement (&lt;2.5)
              </span>
              <span className="font-medium">5%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Performance Reviews Component
function PerformanceReviews({ employees, onCreateReview }: { employees: any[], onCreateReview: () => void }) {
  const { data: reviews } = useQuery({
    queryKey: ['/api/hr/reviews'],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Reviews</CardTitle>
          <Button onClick={onCreateReview} data-testid="button-create-review">
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews?.map((review: any) => (
            <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Employee Review</h4>
                  <p className="text-sm text-gray-600">{review.reviewPeriod}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                  {review.status}
                </Badge>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Goals Management Component
function GoalsManagement({ employees, onCreateGoal }: { employees: any[], onCreateGoal: () => void }) {
  const { data: goals } = useQuery({
    queryKey: ['/api/hr/goals'],
  });

  const goalCategories = ['productivity', 'quality', 'skills', 'leadership', 'innovation'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Goals & KPIs</CardTitle>
          <Button onClick={onCreateGoal} data-testid="button-create-goal">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals?.map((goal: any) => (
            <Card key={goal.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{goal.category}</Badge>
                  <Badge variant={goal.priority === 'high' ? 'destructive' : 'secondary'}>
                    {goal.priority}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">{goal.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Due: {new Date(goal.targetDate).toLocaleDateString()}</span>
                  <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                    {goal.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Employee Performance Component
function EmployeePerformance({ employees }: { employees: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Performance Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees?.map((employee: any) => (
            <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {employee.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium">{employee.name}</h4>
                  <p className="text-sm text-gray-600">{employee.role} • {employee.department}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Performance</p>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{employee.performanceRating || 'N/A'}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Goals</p>
                  <span className="font-medium">3/5</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Training</p>
                  <span className="font-medium">2 Active</span>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Create Review Dialog
function CreateReviewDialog({ isOpen, onClose, employees }: { isOpen: boolean, onClose: () => void, employees: any[] }) {
  const form = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      reviewPeriod: '',
      reviewType: 'quarterly',
      technicalCompetency: 3,
      qualityOfWork: 3,
      productivity: 3,
      communication: 3,
      teamwork: 3,
      achievements: '',
      areasForImprovement: '',
      managerComments: '',
    }
  });

  const onSubmit = (data: any) => {
    // Handle form submission
    console.log(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Performance Review</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reviewType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rating Fields */}
            <div className="space-y-4">
              <h4 className="font-medium">Performance Ratings (1-5 scale)</h4>
              <div className="grid grid-cols-2 gap-4">
                {['technicalCompetency', 'qualityOfWork', 'productivity', 'communication', 'teamwork'].map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</FormLabel>
                        <Select onValueChange={(value) => formField.onChange(parseInt(value))} defaultValue={formField.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Text Fields */}
            <FormField
              control={form.control}
              name="achievements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Achievements</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="List key achievements during this period..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areasForImprovement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Areas for Improvement</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Identify areas where improvement is needed..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="managerComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager Comments</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional manager comments..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Review</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Create Goal Dialog
function CreateGoalDialog({ isOpen, onClose, employees }: { isOpen: boolean, onClose: () => void, employees: any[] }) {
  const form = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalType: 'performance',
      category: 'productivity',
      priority: 'medium',
      targetValue: 0,
      unit: 'percentage',
    }
  });

  const onSubmit = (data: any) => {
    console.log(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees?.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="behavior">Behavior</SelectItem>
                        <SelectItem value="career">Career</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter goal title..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe the goal..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Goal</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}