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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, GraduationCap, Award, Calendar, Clock, Users,
  Plus, Edit, Eye, CheckCircle, AlertTriangle, BarChart3,
  Star, Target, TrendingUp, Brain, Zap, FileText
} from 'lucide-react';

// Form schemas
const programSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  category: z.string(),
  level: z.string(),
  duration: z.number().min(1, 'Duration must be positive'),
  format: z.string(),
  provider: z.string(),
  cost: z.number().min(0),
  maxParticipants: z.number().optional(),
});

const enrollmentSchema = z.object({
  employeeId: z.number(),
  programId: z.number(),
  startDate: z.string(),
  isPriority: z.boolean().default(false),
});

export default function TrainingManagement() {
  const [activeTab, setActiveTab] = useState('programs');
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch training programs
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['/api/hr/training/programs'],
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['/api/hr/employees'],
  });

  // Fetch training effectiveness
  const { data: trainingStats } = useQuery({
    queryKey: ['/api/hr/analytics/training-effectiveness'],
  });

  return (
    <div className="space-y-6">
      {/* Training Overview */}
      <TrainingOverview data={trainingStats} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="programs" data-testid="tab-programs">
            <BookOpen className="h-4 w-4 mr-2" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="enrollments" data-testid="tab-enrollments">
            <Users className="h-4 w-4 mr-2" />
            Enrollments
          </TabsTrigger>
          <TabsTrigger value="certifications" data-testid="tab-certifications">
            <Award className="h-4 w-4 mr-2" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="skills" data-testid="tab-skills">
            <Brain className="h-4 w-4 mr-2" />
            Skills Development
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-6">
          <TrainingPrograms 
            programs={programs}
            loading={programsLoading}
            onCreateProgram={() => setIsProgramDialogOpen(true)}
            onEnrollEmployee={(program) => {
              setSelectedProgram(program);
              setIsEnrollDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <TrainingEnrollments employees={employees} />
        </TabsContent>

        <TabsContent value="certifications" className="space-y-6">
          <CertificationTracking />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <SkillsDevelopment />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <TrainingAnalytics data={trainingStats} />
        </TabsContent>
      </Tabs>

      {/* Create Program Dialog */}
      <CreateProgramDialog 
        isOpen={isProgramDialogOpen}
        onClose={() => setIsProgramDialogOpen(false)}
      />

      {/* Enroll Employee Dialog */}
      <EnrollEmployeeDialog 
        isOpen={isEnrollDialogOpen}
        onClose={() => setIsEnrollDialogOpen(false)}
        program={selectedProgram}
        employees={employees}
      />
    </div>
  );
}

// Training Overview Component
function TrainingOverview({ data }: { data: any }) {
  const stats = [
    {
      title: 'Active Programs',
      value: data?.overview?.totalPrograms || '0',
      icon: BookOpen,
      color: 'bg-blue-500',
      trend: '+3'
    },
    {
      title: 'Total Enrollments',
      value: data?.overview?.totalEnrollments || '0',
      icon: Users,
      color: 'bg-green-500',
      trend: '+24'
    },
    {
      title: 'Completion Rate',
      value: data?.overview?.completedTraining && data?.overview?.totalEnrollments 
        ? `${((data.overview.completedTraining / data.overview.totalEnrollments) * 100).toFixed(0)}%`
        : '0%',
      icon: CheckCircle,
      color: 'bg-purple-500',
      trend: '+12%'
    },
    {
      title: 'Avg Score',
      value: data?.overview?.avgScore ? `${data.overview.avgScore.toFixed(1)}/100` : '0/100',
      icon: Star,
      color: 'bg-yellow-500',
      trend: '+5.2'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">{stat.trend}</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Training Programs Component
function TrainingPrograms({ 
  programs, 
  loading, 
  onCreateProgram, 
  onEnrollEmployee 
}: { 
  programs: any[], 
  loading: boolean, 
  onCreateProgram: () => void,
  onEnrollEmployee: (program: any) => void
}) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const categories = ['technical', 'compliance', 'leadership', 'soft_skills'];
  const levels = ['beginner', 'intermediate', 'advanced'];

  const filteredPrograms = programs?.filter(program => {
    if (categoryFilter !== 'all' && program.category !== categoryFilter) return false;
    if (levelFilter !== 'all' && program.level !== levelFilter) return false;
    return true;
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Training Programs</CardTitle>
          <Button onClick={onCreateProgram} data-testid="button-create-program">
            <Plus className="h-4 w-4 mr-2" />
            Create Program
          </Button>
        </div>
        {/* Filters */}
        <div className="flex space-x-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-level-filter">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map(level => (
                <SelectItem key={level} value={level}>
                  {level.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-20 bg-gray-300 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program: any) => (
              <ProgramCard 
                key={program.id} 
                program={program} 
                onEnroll={() => onEnrollEmployee(program)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Program Card Component
function ProgramCard({ program, onEnroll }: { program: any, onEnroll: () => void }) {
  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 8);
    return `${days}d`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`card-program-${program.id}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900 line-clamp-2">{program.title}</h3>
              <p className="text-sm text-gray-600">{program.provider || 'Internal'}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {program.programCode}
            </Badge>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {program.category?.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant={program.level === 'advanced' ? 'destructive' : 'default'} className="text-xs">
              {program.level?.toUpperCase()}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-3">{program.description}</p>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(program.duration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{program.maxParticipants || 'Unlimited'}</span>
            </div>
          </div>

          {/* Format and Cost */}
          <div className="flex items-center justify-between text-sm">
            <Badge variant="outline" className="text-xs">
              {program.format?.toUpperCase()}
            </Badge>
            {program.cost > 0 ? (
              <span className="font-medium">₹{program.cost}</span>
            ) : (
              <span className="text-green-600 font-medium">Free</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button onClick={onEnroll} size="sm" className="flex-1 text-xs" data-testid={`button-enroll-${program.id}`}>
              <Users className="h-3 w-3 mr-1" />
              Enroll
            </Button>
          </div>

          {/* Certification Badge */}
          {program.certificationOffered && (
            <div className="flex items-center justify-center pt-2">
              <Badge variant="default" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                Certification Available
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Training Enrollments Component
function TrainingEnrollments({ employees }: { employees: any[] }) {
  const { data: enrollments } = useQuery({
    queryKey: ['/api/hr/training/enrollments'],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Enrollments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {enrollments?.map((enrollment: any) => (
            <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">{enrollment.programTitle}</h4>
                  <p className="text-sm text-gray-600">
                    {enrollment.employeeName} • {enrollment.programCategory}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Progress</p>
                  <div className="w-16">
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>
                  <p className="text-xs font-medium mt-1">{enrollment.progress}%</p>
                </div>
                <Badge variant={enrollment.status === 'completed' ? 'default' : 'secondary'}>
                  {enrollment.status}
                </Badge>
                {enrollment.isPriority && (
                  <Badge variant="destructive" className="text-xs">
                    Priority
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Certification Tracking Component
function CertificationTracking() {
  const certifications = [
    {
      employee: 'John Doe',
      certification: 'Advanced Tax Planning',
      issueDate: '2024-01-15',
      expiryDate: '2026-01-15',
      status: 'active'
    },
    {
      employee: 'Jane Smith', 
      certification: 'Quality Management Systems',
      issueDate: '2023-11-20',
      expiryDate: '2025-11-20',
      status: 'expiring_soon'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certification Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {certifications.map((cert, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium">{cert.certification}</h4>
                  <p className="text-sm text-gray-600">{cert.employee}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <p>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</p>
                </div>
                <Badge variant={cert.status === 'active' ? 'default' : 'destructive'}>
                  {cert.status === 'expiring_soon' ? 'Expiring Soon' : 'Active'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Skills Development Component
function SkillsDevelopment() {
  const { data: skillsGap } = useQuery({
    queryKey: ['/api/hr/analytics/skills-gap'],
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Skills Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillsGap?.skillsNeedingImprovement?.map((skill: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{skill.skillName}</h4>
                  <p className="text-sm text-gray-600">{skill.skillCategory}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{skill.employeeCount} employees</span>
                  <Badge variant="destructive">
                    Avg: {skill.avgProficiency}/5
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Training</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-medium text-blue-900">Leadership Development</h4>
              <p className="text-sm text-blue-700">Recommended for 5 employees</p>
              <Button size="sm" className="mt-2">
                Create Program
              </Button>
            </div>
            <div className="p-4 border rounded-lg bg-green-50">
              <h4 className="font-medium text-green-900">Technical Skills Upgrade</h4>
              <p className="text-sm text-green-700">Based on performance reviews</p>
              <Button size="sm" className="mt-2">
                Create Program
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Training Analytics Component
function TrainingAnalytics({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Program Effectiveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.programEffectiveness?.map((program: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{program.programTitle}</span>
                  <span className="text-sm text-gray-600">
                    {program.completed}/{program.enrollments} completed
                  </span>
                </div>
                <Progress 
                  value={(program.completed / program.enrollments) * 100} 
                  className="h-2" 
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{program.category}</span>
                  <span>Avg Score: {program.avgScore?.toFixed(1) || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training ROI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">250%</p>
              <p className="text-sm text-gray-600">Average ROI</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Training Investment</span>
                <span className="font-medium">₹5,00,000</span>
              </div>
              <div className="flex justify-between">
                <span>Productivity Gains</span>
                <span className="font-medium text-green-600">₹12,50,000</span>
              </div>
              <div className="flex justify-between">
                <span>Time Savings</span>
                <span className="font-medium">320 hours</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Create Program Dialog
function CreateProgramDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(programSchema),
    defaultValues: {
      category: 'technical',
      level: 'beginner',
      format: 'online',
      cost: 0,
    }
  });

  const onSubmit = (data: any) => {
    toast({
      title: 'Training Program Created',
      description: `${data.title} has been created successfully.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Training Program</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter program title..." />
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
                    <Textarea {...field} placeholder="Describe the program..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="leadership">Leadership</SelectItem>
                        <SelectItem value="soft_skills">Soft Skills</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="self_paced">Self Paced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
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
              <Button type="submit">Create Program</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Enroll Employee Dialog
function EnrollEmployeeDialog({ 
  isOpen, 
  onClose, 
  program, 
  employees 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  program: any, 
  employees: any[] 
}) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      isPriority: false,
    }
  });

  const onSubmit = (data: any) => {
    toast({
      title: 'Employee Enrolled',
      description: 'Employee has been enrolled in the training program.',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll Employee</DialogTitle>
          {program && (
            <p className="text-sm text-gray-600">Program: {program.title}</p>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Employee</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees?.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name} - {emp.department}
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
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Enroll Employee</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}