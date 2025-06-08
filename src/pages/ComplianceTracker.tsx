
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, AlertTriangle, FileText, Calendar, Bell } from 'lucide-react';

const ComplianceTracker = () => {
  const navigate = useNavigate();

  const complianceItems = [
    {
      id: 'inc-20a',
      title: 'INC-20A Filing',
      status: 'in-progress',
      progress: 75,
      deadline: '2024-06-15',
      daysLeft: 12,
      priority: 'high'
    },
    {
      id: 'adt-1',
      title: 'ADT-1 Compliance',
      status: 'pending',
      progress: 25,
      deadline: '2024-06-30',
      daysLeft: 27,
      priority: 'medium'
    },
    {
      id: 'gst-filing',
      title: 'GST Return Filing',
      status: 'completed',
      progress: 100,
      deadline: '2024-05-31',
      daysLeft: 0,
      priority: 'low'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
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

  const handleComplete = () => {
    navigate('/confirmation');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Compliance Tracker
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

        <div className="max-w-6xl mx-auto">
          {/* Dashboard Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">1</p>
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
                    <p className="text-2xl font-bold text-blue-600">1</p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">1</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Items */}
          <div className="space-y-6 mb-8">
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
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} />
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
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
                    </div>
                    
                    {item.status !== 'completed' && (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <Card className="max-w-md mx-auto">
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
