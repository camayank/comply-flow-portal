
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  Bell,
  MessageSquare,
  Download,
  Eye,
  UserCheck,
  Calendar,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const clients = [
    {
      id: 'CL001',
      companyName: 'TechStart Solutions Pvt Ltd',
      cin: 'U72200DL2024PTC123456',
      assignedCA: 'Priya Sharma',
      services: ['INC-20A', 'ADT-1', 'GST Registration'],
      status: 'in-progress',
      priority: 'high',
      deadline: '2024-06-15',
      daysLeft: 12,
      revenue: '₹15,000',
      lastActivity: '2 hours ago'
    },
    {
      id: 'CL002',
      companyName: 'Green Energy Innovations Pvt Ltd',
      cin: 'U40200MH2024PTC789012',
      assignedCA: 'Rajesh Kumar',
      services: ['ADT-1', 'Trademark', 'ISO Certification'],
      status: 'pending-docs',
      priority: 'medium',
      deadline: '2024-06-30',
      daysLeft: 27,
      revenue: '₹45,000',
      lastActivity: '1 day ago'
    },
    {
      id: 'CL003',
      companyName: 'FinTech Hub Pvt Ltd',
      cin: 'U65100KA2024PTC345678',
      assignedCA: 'Meera Patel',
      services: ['GST Filing', 'Tax Consultation'],
      status: 'completed',
      priority: 'low',
      deadline: '2024-05-31',
      daysLeft: 0,
      revenue: '₹12,000',
      lastActivity: '3 days ago'
    }
  ];

  const caTeam = [
    {
      id: 'CA001',
      name: 'Priya Sharma',
      specialization: 'Corporate Law',
      activeClients: 8,
      completedThisMonth: 12,
      rating: 4.8,
      workload: 'High',
      status: 'Available'
    },
    {
      id: 'CA002',
      name: 'Rajesh Kumar',
      specialization: 'Tax & GST',
      activeClients: 6,
      completedThisMonth: 10,
      rating: 4.6,
      workload: 'Medium',
      status: 'Busy'
    },
    {
      id: 'CA003',
      name: 'Meera Patel',
      specialization: 'IPR & Trademark',
      activeClients: 4,
      completedThisMonth: 8,
      rating: 4.9,
      workload: 'Low',
      status: 'Available'
    }
  ];

  const pendingTasks = [
    {
      id: 'T001',
      client: 'TechStart Solutions',
      service: 'INC-20A Filing',
      task: 'Document Review',
      assignedTo: 'Priya Sharma',
      priority: 'high',
      dueDate: '2024-06-08',
      status: 'pending'
    },
    {
      id: 'T002',
      client: 'Green Energy Innovations',
      service: 'ADT-1',
      task: 'Director KYC Verification',
      assignedTo: 'Rajesh Kumar',
      priority: 'medium',
      dueDate: '2024-06-10',
      status: 'in-review'
    },
    {
      id: 'T003',
      client: 'FinTech Hub',
      service: 'GST Filing',
      task: 'Final Submission',
      assignedTo: 'Meera Patel',
      priority: 'low',
      dueDate: '2024-06-12',
      status: 'approved'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending-docs':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'in-review':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.cin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DigiComply Admin Panel
          </h1>
          <p className="text-gray-600">
            Manage clients, assign tasks, and monitor compliance progress
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">CA Team</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">24</p>
                      <p className="text-sm text-gray-600">Active Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">18</p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">12</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">₹2.4L</p>
                      <p className="text-sm text-gray-600">Monthly Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Urgent Tasks */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Urgent Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingTasks.filter(task => task.priority === 'high').map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{task.service}</p>
                          <p className="text-xs text-gray-600">{task.client}</p>
                        </div>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completion Rate</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Client Satisfaction</span>
                      <span className="font-medium">4.7/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg. Processing Time</span>
                      <span className="font-medium">12 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search clients by company name or CIN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="pending-docs">Pending Docs</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle>Client Management</CardTitle>
                <CardDescription>
                  Monitor all client compliance projects and assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Assigned CA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.companyName}</p>
                            <p className="text-sm text-gray-600">{client.cin}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {client.services.map((service, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{client.assignedCA}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(client.status)}>
                            {client.status.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={client.daysLeft < 15 ? 'text-red-600' : 'text-gray-600'}>
                            {client.deadline}
                            {client.daysLeft > 0 && (
                              <div className="text-xs">({client.daysLeft}d left)</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {client.revenue}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Management</CardTitle>
                <CardDescription>
                  Assign and monitor task progress across the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.client}</TableCell>
                        <TableCell>{task.service}</TableCell>
                        <TableCell>{task.task}</TableCell>
                        <TableCell>{task.assignedTo}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.dueDate}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Approve
                            </Button>
                            <Button variant="outline" size="sm">
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CA Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CA Team Management</CardTitle>
                <CardDescription>
                  Monitor team performance and workload distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CA Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Active Clients</TableHead>
                      <TableHead>Completed This Month</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Workload</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caTeam.map((ca) => (
                      <TableRow key={ca.id}>
                        <TableCell className="font-medium">{ca.name}</TableCell>
                        <TableCell>{ca.specialization}</TableCell>
                        <TableCell>{ca.activeClients}</TableCell>
                        <TableCell>{ca.completedThisMonth}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{ca.rating}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getWorkloadColor(ca.workload)}>
                            {ca.workload}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={ca.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {ca.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Clients Onboarded</span>
                      <span className="font-bold text-blue-600">24</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Services Completed</span>
                      <span className="font-bold text-green-600">42</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Revenue Generated</span>
                      <span className="font-bold text-purple-600">₹2,40,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Client Satisfaction</span>
                      <span className="font-bold text-yellow-600">4.7/5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>INC-20A Filing</span>
                      <span className="font-medium">35%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>GST Services</span>
                      <span className="font-medium">28%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>ADT-1 Compliance</span>
                      <span className="font-medium">22%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Others</span>
                      <span className="font-medium">15%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
