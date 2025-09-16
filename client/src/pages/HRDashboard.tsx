import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, UserPlus, Search, Filter, BarChart3, TrendingUp,
  Clock, Calendar, Trophy, BookOpen, Target, AlertTriangle,
  CheckCircle, XCircle, Plus, Edit, Eye, Star, Award,
  Brain, Zap, PieChart, Activity, Coffee, Home
} from 'lucide-react';
import PerformanceManagement from '@/components/hr/PerformanceManagement';
import TrainingManagement from '@/components/hr/TrainingManagement';
import AttendanceManagement from '@/components/hr/AttendanceManagement';
import LeaveManagement from '@/components/hr/LeaveManagement';
import HRAnalytics from '@/components/hr/HRAnalytics';

// HR Dashboard Main Component
export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState('directory');
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR Management</h1>
              </div>
              <Badge variant="outline" className="text-sm">
                <Activity className="h-3 w-3 mr-1" />
                Live System
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="px-6 py-6">
        <HROverviewStats />
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="directory" data-testid="tab-directory">
              <Users className="h-4 w-4 mr-2" />
              Employee Directory
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">
              <Trophy className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="training" data-testid="tab-training">
              <BookOpen className="h-4 w-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <Clock className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" data-testid="tab-leave">
              <Calendar className="h-4 w-4 mr-2" />
              Leave
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <PieChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            <EmployeeDirectory />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceManagement />
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <TrainingManagement />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <AttendanceManagement />
          </TabsContent>

          <TabsContent value="leave" className="space-y-6">
            <LeaveManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <HRAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// HR Overview Stats Component
function HROverviewStats() {
  const { data: teamPerformance } = useQuery({
    queryKey: ['/api/hr/analytics/team-performance'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = [
    {
      title: 'Total Employees',
      value: teamPerformance?.overview?.totalEmployees || '0',
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Avg Performance',
      value: teamPerformance?.overview?.averagePerformance ? `${teamPerformance.overview.averagePerformance.toFixed(1)}/5` : '0/5',
      icon: Trophy,
      color: 'bg-green-500',
      change: '+0.3',
      changeType: 'positive'
    },
    {
      title: 'Team Utilization',
      value: teamPerformance?.overview?.averageWorkload ? `${((teamPerformance.overview.averageWorkload / teamPerformance.overview.averageCapacity) * 100).toFixed(0)}%` : '0%',
      icon: Activity,
      color: 'bg-orange-500',
      change: '-5%',
      changeType: 'negative'
    },
    {
      title: 'Active Training',
      value: '24',
      icon: BookOpen,
      color: 'bg-purple-500',
      change: '+8',
      changeType: 'positive'
    },
    {
      title: 'Pending Reviews',
      value: '7',
      icon: Target,
      color: 'bg-amber-500',
      change: '-2',
      changeType: 'positive'
    },
    {
      title: 'Leave Requests',
      value: '3',
      icon: Calendar,
      color: 'bg-red-500',
      change: '+1',
      changeType: 'neutral'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <div className="flex items-center space-x-1">
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
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

// Employee Directory Component
function EmployeeDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['/api/hr/employees', { 
      search: searchTerm,
      department: departmentFilter === 'all' ? undefined : departmentFilter,
      role: roleFilter === 'all' ? undefined : roleFilter,
      sortBy 
    }],
  });

  const departments = ['Operations', 'Sales', 'QC', 'Admin', 'HR', 'Finance'];
  const roles = ['ops_executive', 'ops_lead', 'qa_reviewer', 'admin', 'manager'];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Employee Directory</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search employees by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-employee-search"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-department-filter">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-role-filter">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]" data-testid="select-sort-by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="joiningDate">Joining Date</SelectItem>
                <SelectItem value="performanceRating">Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees?.map((employee: any) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}
    </div>
  );
}

// Employee Card Component
function EmployeeCard({ employee }: { employee: any }) {
  const workloadPercentage = employee.workloadCapacity > 0 
    ? (employee.currentWorkload / employee.workloadCapacity) * 100 
    : 0;

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid={`card-employee-${employee.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-500 text-white font-semibold">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600">
                {employee.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{employee.email}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {employee.employeeId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" data-testid={`button-view-${employee.id}`}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" data-testid={`button-edit-${employee.id}`}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Role and Department */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {employee.department}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {employee.role.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Performance Rating */}
          {employee.performanceRating && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Performance</span>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{employee.performanceRating}/5</span>
              </div>
            </div>
          )}

          {/* Workload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Workload</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getWorkloadColor(workloadPercentage)}`}>
                {workloadPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={workloadPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{employee.currentWorkload}h</span>
              <span>{employee.workloadCapacity}h capacity</span>
            </div>
          </div>

          {/* Skills Count */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">{employee.skillsCount || 0} Skills</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">
                {employee.specialization ? Object.keys(employee.specialization).length : 0} Specializations
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <Target className="h-3 w-3 mr-1" />
              Goals
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Training
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Time
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// All HR components now imported and ready