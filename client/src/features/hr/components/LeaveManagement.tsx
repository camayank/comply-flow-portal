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
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Pause,
  Plus, Edit, Eye, Filter, Search, Download, Users, Award,
  Home, Plane, Heart, BookOpen, Coffee, MapPin
} from 'lucide-react';

// Form schemas
const leaveRequestSchema = z.object({
  employeeId: z.number(),
  leaveType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  isEmergency: z.boolean().default(false),
  contactDuringLeave: z.string().optional(),
  workHandoverNotes: z.string().optional(),
});

const leaveBalanceSchema = z.object({
  employeeId: z.number(),
  leaveType: z.string(),
  totalDays: z.number(),
  usedDays: z.number().default(0),
  carryForward: z.number().default(0),
  year: z.number(),
});

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leave requests
  const { data: leaveRequests } = useQuery({
    queryKey: ['/api/hr/leave/requests', {
      status: statusFilter === 'all' ? undefined : statusFilter,
      type: typeFilter === 'all' ? undefined : typeFilter
    }],
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['/api/hr/employees'],
  });

  return (
    <div className="space-y-6">
      {/* Leave Overview */}
      <LeaveOverview />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Calendar className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            <Clock className="h-4 w-4 mr-2" />
            Leave Requests
          </TabsTrigger>
          <TabsTrigger value="balances" data-testid="tab-balances">
            <Award className="h-4 w-4 mr-2" />
            Leave Balances
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Leave Calendar
          </TabsTrigger>
          <TabsTrigger value="policies" data-testid="tab-policies">
            <BookOpen className="h-4 w-4 mr-2" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <LeaveMetrics />
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <LeaveRequests
            requests={leaveRequests}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            onStatusFilterChange={setStatusFilter}
            onTypeFilterChange={setTypeFilter}
            onCreateRequest={() => setIsRequestDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <LeaveBalances
            employees={employees}
            onUpdateBalance={() => setIsBalanceDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <LeaveCalendar />
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <LeavePolicies />
        </TabsContent>
      </Tabs>

      {/* Create Leave Request Dialog */}
      <CreateLeaveRequestDialog
        isOpen={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        employees={employees}
      />

      {/* Update Leave Balance Dialog */}
      <UpdateLeaveBalanceDialog
        isOpen={isBalanceDialogOpen}
        onClose={() => setIsBalanceDialogOpen(false)}
        employees={employees}
      />
    </div>
  );
}

// Leave Overview Component
function LeaveOverview() {
  const stats = [
    {
      title: 'Pending Requests',
      value: '8',
      icon: Clock,
      color: 'bg-orange-500',
      description: 'Awaiting approval'
    },
    {
      title: 'On Leave Today',
      value: '5',
      icon: Plane,
      color: 'bg-blue-500',
      description: '3 casual, 2 sick'
    },
    {
      title: 'Approved This Month',
      value: '24',
      icon: CheckCircle,
      color: 'bg-green-500',
      description: '15% increase'
    },
    {
      title: 'Leave Utilization',
      value: '68%',
      icon: Award,
      color: 'bg-purple-500',
      description: 'Average across teams'
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
                <p className="text-xs text-gray-500">{stat.description}</p>
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

// Leave Metrics Component
function LeaveMetrics() {
  const leaveTypeData = [
    { type: 'Casual Leave', taken: 156, total: 240, percentage: 65 },
    { type: 'Sick Leave', taken: 89, total: 180, percentage: 49 },
    { type: 'Annual Leave', taken: 234, total: 300, percentage: 78 },
    { type: 'Maternity/Paternity', taken: 45, total: 90, percentage: 50 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Leave Type Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaveTypeData.map((leave) => (
              <div key={leave.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{leave.type}</span>
                  <span className="text-sm text-gray-600">
                    {leave.taken}/{leave.total} days
                  </span>
                </div>
                <Progress value={leave.percentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{leave.percentage}% utilized</span>
                  <span>{leave.total - leave.taken} remaining</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Leave Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { month: 'January', leaves: 45, trend: '+12%' },
              { month: 'February', leaves: 38, trend: '-8%' },
              { month: 'March', leaves: 52, trend: '+15%' },
              { month: 'April', leaves: 41, trend: '-5%' },
            ].map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="font-medium">{month.month}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{month.leaves} leaves</span>
                  <Badge variant={month.trend.startsWith('+') ? 'destructive' : 'default'}>
                    {month.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Leave Requests Component
function LeaveRequests({
  requests,
  statusFilter,
  typeFilter,
  onStatusFilterChange,
  onTypeFilterChange,
  onCreateRequest
}: {
  requests: any[],
  statusFilter: string,
  typeFilter: string,
  onStatusFilterChange: (status: string) => void,
  onTypeFilterChange: (type: string) => void,
  onCreateRequest: () => void
}) {
  const leaveTypes = ['casual', 'sick', 'annual', 'maternity', 'paternity', 'emergency'];
  const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leave Requests</CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {leaveTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={onCreateRequest} data-testid="button-create-request">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests?.map((request: any) => (
            <LeaveRequestCard key={request.id} request={request} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Leave Request Card Component
function LeaveRequestCard({ request }: { request: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'casual': return Home;
      case 'sick': return Heart;
      case 'annual': return Plane;
      case 'maternity':
      case 'paternity': return Award;
      default: return Calendar;
    }
  };

  const LeaveIcon = getLeaveTypeIcon(request.leaveType);

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg" data-testid={`leave-request-${request.id}`}>
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <LeaveIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-medium">{request.employeeName}</h4>
          <p className="text-sm text-gray-600">{request.department} • {request.role}</p>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="text-center">
          <p className="text-xs text-gray-600">Leave Type</p>
          <p className="font-medium capitalize">{request.leaveType}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Duration</p>
          <p className="font-medium">
            {calculateDays(request.startDate, request.endDate)} days
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Dates</p>
          <p className="font-medium text-sm">
            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Applied</p>
          <p className="font-medium text-sm">
            {new Date(request.appliedDate).toLocaleDateString()}
          </p>
        </div>
        <Badge className={getStatusColor(request.status)}>
          {request.status.toUpperCase()}
        </Badge>
        {request.isEmergency && (
          <Badge variant="destructive" className="text-xs">
            Emergency
          </Badge>
        )}
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" data-testid={`button-view-${request.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
          {request.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm" className="text-green-600" data-testid={`button-approve-${request.id}`}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600" data-testid={`button-reject-${request.id}`}>
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Leave Balances Component
function LeaveBalances({ employees, onUpdateBalance }: { employees: any[], onUpdateBalance: () => void }) {
  const { data: leaveBalances } = useQuery({
    queryKey: ['/api/hr/leave/balances'],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leave Balances</CardTitle>
          <Button onClick={onUpdateBalance} data-testid="button-update-balance">
            <Edit className="h-4 w-4 mr-2" />
            Update Balance
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees?.map((employee: any) => (
            <EmployeeLeaveBalance key={employee.id} employee={employee} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Employee Leave Balance Component
function EmployeeLeaveBalance({ employee }: { employee: any }) {
  const leaveTypes = [
    { type: 'casual', total: 12, used: 8, color: 'bg-blue-500' },
    { type: 'sick', total: 10, used: 3, color: 'bg-red-500' },
    { type: 'annual', total: 15, used: 12, color: 'bg-green-500' },
  ];

  return (
    <div className="p-4 border rounded-lg" data-testid={`balance-${employee.id}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {employee.name.split(' ').map((n: string) => n[0]).join('')}
            </span>
          </div>
          <div>
            <h4 className="font-medium">{employee.name}</h4>
            <p className="text-sm text-gray-600">{employee.department} • {employee.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {leaveTypes.map((leave) => (
          <div key={leave.type} className="text-center">
            <div className="space-y-2">
              <div className={`w-12 h-12 ${leave.color} rounded-full flex items-center justify-center mx-auto`}>
                <span className="text-white font-bold">{leave.total - leave.used}</span>
              </div>
              <div>
                <p className="text-xs font-medium capitalize">{leave.type}</p>
                <p className="text-xs text-gray-500">
                  {leave.used}/{leave.total} used
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Leave Calendar Component
function LeaveCalendar() {
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leave Calendar - {currentMonth}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-medium text-gray-600 p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 6 + 1; // Adjust for month start
            const isToday = day === new Date().getDate();
            const hasLeave = [5, 12, 18, 25].includes(day);

            return (
              <div
                key={i}
                className={`
                  h-12 border rounded flex items-center justify-center text-sm
                  ${day < 1 || day > 31 ? 'bg-gray-50 text-gray-300' : ''}
                  ${isToday ? 'bg-blue-100 text-blue-800 font-bold' : ''}
                  ${hasLeave ? 'bg-orange-100 text-orange-800' : ''}
                `}
              >
                {day > 0 && day <= 31 ? day : ''}
                {hasLeave && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full ml-1"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-100 rounded"></div>
            <span>Leave Days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Leave Policies Component
function LeavePolicies() {
  const policies = [
    {
      type: 'Casual Leave',
      allowance: '12 days per year',
      carryForward: 'Max 3 days',
      notice: 'Minimum 1 day advance notice',
      icon: Home
    },
    {
      type: 'Sick Leave',
      allowance: '10 days per year',
      carryForward: 'No carry forward',
      notice: 'Medical certificate required for 3+ days',
      icon: Heart
    },
    {
      type: 'Annual Leave',
      allowance: '15 days per year',
      carryForward: 'Max 5 days',
      notice: 'Minimum 7 days advance notice',
      icon: Plane
    },
    {
      type: 'Maternity/Paternity',
      allowance: '90/15 days',
      carryForward: 'Not applicable',
      notice: '30 days advance notice',
      icon: Award
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {policies.map((policy) => (
        <Card key={policy.type}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <policy.icon className="h-5 w-5" />
              <span>{policy.type}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Annual Allowance</span>
              <span className="font-medium">{policy.allowance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Carry Forward</span>
              <span className="font-medium">{policy.carryForward}</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600">{policy.notice}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Create Leave Request Dialog
function CreateLeaveRequestDialog({
  isOpen,
  onClose,
  employees
}: {
  isOpen: boolean,
  onClose: () => void,
  employees: any[]
}) {
  const form = useForm({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: 'casual',
      isEmergency: false,
    }
  });

  const onSubmit = (data: any) => {
    console.log(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Leave Request</DialogTitle>
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
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="maternity">Maternity Leave</SelectItem>
                      <SelectItem value="paternity">Paternity Leave</SelectItem>
                      <SelectItem value="emergency">Emergency Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Provide reason for leave..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactDuringLeave"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contact number during leave" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workHandoverNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Handover Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Instructions for work handover..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Update Leave Balance Dialog
function UpdateLeaveBalanceDialog({
  isOpen,
  onClose,
  employees
}: {
  isOpen: boolean,
  onClose: () => void,
  employees: any[]
}) {
  const form = useForm({
    resolver: zodResolver(leaveBalanceSchema),
    defaultValues: {
      leaveType: 'casual',
      year: new Date().getFullYear(),
      usedDays: 0,
      carryForward: 0,
    }
  });

  const onSubmit = (data: any) => {
    console.log(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Leave Balance</DialogTitle>
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
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="maternity">Maternity</SelectItem>
                        <SelectItem value="paternity">Paternity</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Days</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usedDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Used Days</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carryForward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carry Forward</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
              <Button type="submit">Update Balance</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
