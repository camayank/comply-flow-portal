
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, CheckCircle, AlertTriangle, FileText, Calendar, Bell, Download, MessageSquare, User, AlertCircle, TrendingUp } from 'lucide-react';

const ComplianceTracker = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  const complianceItems = [
    {
      id: 'inc-20a',
      title: 'INC-20A Filing',
      status: 'in-progress',
      progress: 75,
      deadline: '2024-06-15',
      daysLeft: 12,
      priority: 'high',
      assignedCA: 'Priya Sharma',
      lastUpdated: '2024-06-03',
      documents: ['Board Resolution', 'Share Certificate'],
      comments: 3,
      stage: 'Document Review'
    },
    {
      id: 'adt-1',
      title: 'ADT-1 Compliance',
      status: 'pending-docs',
      progress: 25,
      deadline: '2024-06-30',
      daysLeft: 27,
      priority: 'medium',
      assignedCA: 'Rajesh Kumar',
      lastUpdated: '2024-06-01',
      documents: ['Director KYC', 'Address Proof'],
      comments: 1,
      stage: 'Document Collection'
    },
    {
      id: 'gst-filing',
      title: 'GST Return Filing',
      status: 'completed',
      progress: 100,
      deadline: '2024-05-31',
      daysLeft: 0,
      priority: 'low',
      assignedCA: 'Meera Patel',
      lastUpdated: '2024-05-30',
      documents: ['GST Certificate', 'Return Filed'],
      comments: 0,
      stage: 'Completed'
    }
  ];

  const recentActivity = [
    { id: 1, type: 'document', message: 'Board Resolution uploaded for INC-20A', time: '2 hours ago', user: 'You' },
    { id: 2, type: 'comment', message: 'CA Priya added comment on INC-20A filing', time: '4 hours ago', user: 'Priya Sharma' },
    { id: 3, type: 'status', message: 'GST Return Filing marked as completed', time: '1 day ago', user: 'Meera Patel' },
    { id: 4, type: 'alert', message: 'Deadline reminder: ADT-1 due in 27 days', time: '2 days ago', user: 'System' }
  ];

  const upcomingDeadlines = [
    { service: 'INC-20A Filing', deadline: '2024-06-15', daysLeft: 12, risk: 'high' },
    { service: 'ADT-1 Compliance', deadline: '2024-06-30', daysLeft: 27, risk: 'medium' },
    { service: 'Annual Return MGT-7', deadline: '2024-07-15', daysLeft: 42, risk: 'low' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending-docs':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending-docs':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'status':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleComplete = () => {
    setLocation('/confirmation');
  };

  const completedCount = complianceItems.filter(item => item.status === 'completed').length;
  const inProgressCount = complianceItems.filter(item => item.status === 'in-progress').length;
  const pendingCount = complianceItems.filter(item => item.status === 'pending-docs').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Compliance Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Monitor your compliance status and upcoming deadlines
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Stage 3: Compliance Tracking</h3>
            <span>4 of 5 stages</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-4/5 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-7xl mx-auto">
          {/* Dashboard Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                    <p className="text-sm text-gray-600">Pending Docs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">85%</p>
                    <p className="text-sm text-gray-600">Overall Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-1 gap-6">
                {complianceItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          {item.title}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Assigned to: {item.assignedCA} | Stage: {item.stage}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} />
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {item.deadline}</span>
                          </div>
                          {item.daysLeft > 0 && (
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <span>{item.daysLeft} days left</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>CA: {item.assignedCA}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>{item.comments} comments</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat with CA
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Detailed View Tab */}
            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Services - Detailed Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Assigned CA</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={item.progress} className="w-16" />
                              <span className="text-sm">{item.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.assignedCA}</TableCell>
                          <TableCell>
                            <div className={`${item.daysLeft < 15 ? 'text-red-600' : 'text-gray-600'}`}>
                              {item.deadline}
                              {item.daysLeft > 0 && ` (${item.daysLeft}d)`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
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

            {/* Deadlines Tab */}
            <TabsContent value="deadlines" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Upcoming Deadlines
                  </CardTitle>
                  <CardDescription>
                    Monitor critical compliance deadlines to avoid penalties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingDeadlines.map((deadline, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{deadline.service}</h4>
                          <p className="text-sm text-gray-600">Due: {deadline.deadline}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${getRiskColor(deadline.risk)}`}>
                            {deadline.daysLeft} days left
                          </p>
                          <Badge className={getPriorityColor(deadline.risk)}>
                            {deadline.risk} risk
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Track all updates and changes to your compliance services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border-l-2 border-gray-200">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{activity.time}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{activity.user}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Continue to complete your compliance journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleComplete} className="w-full">
                  Complete Process
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComplianceTracker;
