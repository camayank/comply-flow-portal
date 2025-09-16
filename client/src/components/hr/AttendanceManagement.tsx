import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Clock, Calendar, Users, CheckCircle, XCircle, AlertTriangle,
  Plus, Edit, Eye, BarChart3, TrendingUp, MapPin, Timer,
  Download, Upload, Filter, Search, Target, Award
} from 'lucide-react';

// Form schemas
const attendanceSchema = z.object({
  employeeId: z.number(),
  date: z.string(),
  checkIn: z.string(),
  checkOut: z.string().optional(),
  breakTime: z.number().default(0),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const shiftSchema = z.object({
  employeeId: z.number(),
  shiftType: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  workingDays: z.array(z.string()),
  effectiveDate: z.string(),
});

export default function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch attendance data
  const { data: attendanceData } = useQuery({
    queryKey: ['/api/hr/attendance', { date: selectedDate }],
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['/api/hr/employees'],
  });

  return (
    <div className="space-y-6">
      {/* Attendance Overview */}
      <AttendanceOverview data={attendanceData} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">
            <Clock className="h-4 w-4 mr-2" />
            Daily Attendance
          </TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts">
            <Timer className="h-4 w-4 mr-2" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Target className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AttendanceMetrics />
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          <DailyAttendance 
            employees={employees}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onMarkAttendance={() => setIsAttendanceDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <ShiftManagement 
            employees={employees}
            onCreateShift={() => setIsShiftDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AttendanceReports />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AttendanceSettings />
        </TabsContent>
      </Tabs>

      {/* Mark Attendance Dialog */}
      <MarkAttendanceDialog 
        isOpen={isAttendanceDialogOpen}
        onClose={() => setIsAttendanceDialogOpen(false)}
        employees={employees}
        selectedDate={selectedDate}
      />

      {/* Create Shift Dialog */}
      <CreateShiftDialog 
        isOpen={isShiftDialogOpen}
        onClose={() => setIsShiftDialogOpen(false)}
        employees={employees}
      />
    </div>
  );
}

// Attendance Overview Component
function AttendanceOverview({ data }: { data: any }) {
  const today = new Date();
  const stats = [
    {
      title: 'Present Today',
      value: data?.todayStats?.present || '0',
      total: data?.todayStats?.total || '0',
      icon: CheckCircle,
      color: 'bg-green-500',
      percentage: data?.todayStats?.total > 0 ? ((data.todayStats.present / data.todayStats.total) * 100).toFixed(0) : '0'
    },
    {
      title: 'Late Arrivals',
      value: data?.todayStats?.late || '0',
      icon: AlertTriangle,
      color: 'bg-orange-500',
      percentage: data?.todayStats?.total > 0 ? ((data.todayStats.late / data.todayStats.total) * 100).toFixed(0) : '0'
    },
    {
      title: 'Absent',
      value: data?.todayStats?.absent || '0',
      icon: XCircle,
      color: 'bg-red-500',
      percentage: data?.todayStats?.total > 0 ? ((data.todayStats.absent / data.todayStats.total) * 100).toFixed(0) : '0'
    },
    {
      title: 'Avg Hours',
      value: data?.todayStats?.avgHours ? `${data.todayStats.avgHours.toFixed(1)}h` : '0h',
      icon: Clock,
      color: 'bg-blue-500',
      trend: '+0.5h'
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
                {stat.total && (
                  <p className="text-xs text-gray-500">of {stat.total} employees</p>
                )}
                {stat.percentage && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-medium">{stat.percentage}%</span>
                  </div>
                )}
                {stat.trend && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">{stat.trend}</span>
                  </div>
                )}
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

// Attendance Metrics Component
function AttendanceMetrics() {
  const weeklyData = [
    { day: 'Mon', present: 85, late: 5, absent: 10 },
    { day: 'Tue', present: 88, late: 3, absent: 9 },
    { day: 'Wed', present: 90, late: 4, absent: 6 },
    { day: 'Thu', present: 82, late: 8, absent: 10 },
    { day: 'Fri', present: 78, late: 12, absent: 10 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyData.map((day) => (
              <div key={day.day} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{day.day}</span>
                  <span className="text-sm text-gray-600">{day.present}% present</span>
                </div>
                <div className="flex space-x-1 h-2">
                  <div 
                    className="bg-green-500 rounded" 
                    style={{ width: `${day.present}%` }}
                  ></div>
                  <div 
                    className="bg-orange-500 rounded" 
                    style={{ width: `${day.late}%` }}
                  ></div>
                  <div 
                    className="bg-red-500 rounded" 
                    style={{ width: `${day.absent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { dept: 'Operations', attendance: 92, employees: 25 },
              { dept: 'Sales', attendance: 88, employees: 15 },
              { dept: 'QC', attendance: 95, employees: 12 },
              { dept: 'Admin', attendance: 90, employees: 8 }
            ].map((dept) => (
              <div key={dept.dept} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{dept.dept}</h4>
                  <p className="text-sm text-gray-600">{dept.employees} employees</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{dept.attendance}%</p>
                  <Progress value={dept.attendance} className="w-20 h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Daily Attendance Component
function DailyAttendance({ 
  employees, 
  selectedDate, 
  onDateChange, 
  onMarkAttendance 
}: { 
  employees: any[], 
  selectedDate: string, 
  onDateChange: (date: string) => void,
  onMarkAttendance: () => void
}) {
  const { data: dailyAttendance } = useQuery({
    queryKey: ['/api/hr/attendance/daily', { date: selectedDate }],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Daily Attendance</CardTitle>
          <div className="flex items-center space-x-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-auto"
              data-testid="input-date-picker"
            />
            <Button onClick={onMarkAttendance} data-testid="button-mark-attendance">
              <Plus className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dailyAttendance?.map((record: any) => (
            <AttendanceRecord key={record.employeeId} record={record} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Attendance Record Component
function AttendanceRecord({ record }: { record: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-orange-100 text-orange-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'half_day': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return '0';
    const start = new Date(`2000-01-01T${checkIn}`);
    const end = new Date(`2000-01-01T${checkOut}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg" data-testid={`attendance-record-${record.employeeId}`}>
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium">
            {record.employeeName?.split(' ').map((n: string) => n[0]).join('')}
          </span>
        </div>
        <div>
          <h4 className="font-medium">{record.employeeName}</h4>
          <p className="text-sm text-gray-600">{record.department} • {record.role}</p>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="text-center">
          <p className="text-xs text-gray-600">Check In</p>
          <p className="font-medium">{formatTime(record.checkIn)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Check Out</p>
          <p className="font-medium">{formatTime(record.checkOut)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Hours</p>
          <p className="font-medium">{calculateHours(record.checkIn, record.checkOut)}h</p>
        </div>
        <Badge className={getStatusColor(record.status)}>
          {record.status.replace('_', ' ').toUpperCase()}
        </Badge>
        {record.location && (
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="h-3 w-3 mr-1" />
            {record.location}
          </div>
        )}
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Shift Management Component
function ShiftManagement({ employees, onCreateShift }: { employees: any[], onCreateShift: () => void }) {
  const { data: shifts } = useQuery({
    queryKey: ['/api/hr/shifts'],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Shift Management</CardTitle>
          <Button onClick={onCreateShift} data-testid="button-create-shift">
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shifts?.map((shift: any) => (
            <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Timer className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">{shift.employeeName}</h4>
                  <p className="text-sm text-gray-600">{shift.shiftType} Shift</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Start Time</p>
                  <p className="font-medium">{shift.startTime}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">End Time</p>
                  <p className="font-medium">{shift.endTime}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Working Days</p>
                  <p className="font-medium">{shift.workingDays?.join(', ')}</p>
                </div>
                <Badge variant="outline">
                  {shift.shiftType}
                </Badge>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Attendance Reports Component
function AttendanceReports() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Working Days</span>
              <span className="font-medium">22</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average Attendance</span>
              <span className="font-medium">89%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Late Arrivals</span>
              <span className="font-medium">45</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Perfect Attendance</span>
              <span className="font-medium">12 employees</span>
            </div>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overtime Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Overtime</span>
              <span className="font-medium">240 hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg per Employee</span>
              <span className="font-medium">4.2 hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cost Impact</span>
              <span className="font-medium">₹48,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Top Overtime Dept</span>
              <span className="font-medium">Operations</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Attendance Settings Component
function AttendanceSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Work Hours Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Standard Work Hours</label>
            <Input defaultValue="8" type="number" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Late Arrival Grace (minutes)</label>
            <Input defaultValue="15" type="number" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Break Time (minutes)</label>
            <Input defaultValue="60" type="number" className="mt-1" />
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Late arrival alerts</span>
            <Badge variant="default">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Absent notifications</span>
            <Badge variant="default">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Overtime warnings</span>
            <Badge variant="secondary">Disabled</Badge>
          </div>
          <Button variant="outline">Configure Notifications</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Mark Attendance Dialog
function MarkAttendanceDialog({ 
  isOpen, 
  onClose, 
  employees, 
  selectedDate 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  employees: any[], 
  selectedDate: string 
}) {
  const form = useForm({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: selectedDate,
      breakTime: 60,
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
          <DialogTitle>Mark Attendance</DialogTitle>
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
                name="checkIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check In Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Out Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Office/Remote/Client site" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Mark Attendance</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Create Shift Dialog
function CreateShiftDialog({ 
  isOpen, 
  onClose, 
  employees 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  employees: any[] 
}) {
  const form = useForm({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shiftType: 'regular',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
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
          <DialogTitle>Create Shift</DialogTitle>
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

            <FormField
              control={form.control}
              name="shiftType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="weekend">Weekend</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date</FormLabel>
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
              <Button type="submit">Create Shift</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}