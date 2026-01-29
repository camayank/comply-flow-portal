import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ComplianceItem {
  id: number;
  title: string;
  dueDate: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  entityName?: string;
  description?: string;
}

const ClientComplianceCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Fetch compliance items from authenticated API
  const { data: complianceItems = [], isLoading, error } = useQuery<ComplianceItem[]>({
    queryKey: ['/api/client/compliance-calendar'],
  });

  // Use real data only - no mock fallback
  const displayData = complianceItems;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil < 0) return { text: 'Overdue', color: 'bg-red-600' };
    if (daysUntil === 0) return { text: 'Due Today', color: 'bg-red-500' };
    if (daysUntil <= 3) return { text: `${daysUntil}d left`, color: 'bg-orange-500' };
    if (daysUntil <= 7) return { text: `${daysUntil}d left`, color: 'bg-yellow-500' };
    return { text: `${daysUntil}d left`, color: 'bg-green-500' };
  };

  const upcomingItems = displayData
    .filter((item) => item.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const completedItems = displayData.filter((item) => item.status === 'completed');

  const categories = ['all', 'GST', 'Income Tax', 'Payroll', 'Corporate', 'Licenses'];

  const filteredItems = filterCategory === 'all'
    ? upcomingItems
    : upcomingItems.filter((item) => item.category === filterCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                Compliance Calendar
              </h1>
              <p className="text-sm text-gray-600 mt-1">Track all your compliance deadlines in one place</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-set-reminder">
                <Bell className="h-4 w-4 mr-2" />
                Set Reminders
              </Button>
              <Button variant="outline" size="sm" data-testid="button-download-calendar">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Due This Week</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {upcomingItems.filter((item) => getDaysUntilDue(item.dueDate) <= 7).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {upcomingItems.filter((item) => getDaysUntilDue(item.dueDate) < 0).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {upcomingItems.filter((item) => item.status === 'in_progress').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedItems.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600 mr-2">Filter by:</span>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={filterCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(category)}
                  data-testid={`filter-${category}`}
                >
                  {category === 'all' ? 'All Categories' : category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="list" data-testid="view-list">List View</TabsTrigger>
            <TabsTrigger value="month" data-testid="view-month">Month View</TabsTrigger>
            <TabsTrigger value="week" data-testid="view-week">Week View</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading compliance calendar...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const daysUntil = getDaysUntilDue(item.dueDate);
                const urgency = getUrgencyBadge(daysUntil);
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(item.status)}
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline">{item.entityName}</Badge>
                                <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                                <Badge className={`${urgency.color} text-white`}>{urgency.text}</Badge>
                                <span className="text-gray-600">
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2">
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                            View Details
                          </Button>
                          <Button size="sm" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Calendar</h3>
                  <p className="text-sm text-gray-600">Please try again or contact support if the issue persists.</p>
                </CardContent>
              </Card>
            ) : displayData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance Items Yet</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your compliance calendar will populate once you have active services.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = '/services'}>
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                  <p className="text-sm text-gray-600">No compliance items found for the selected filter.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Month View */}
          <TabsContent value="month">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-sm font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="text-center py-12 text-gray-600">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Calendar view coming soon</p>
                  <p className="text-sm">Use List View to see all compliance items</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Week View */}
          <TabsContent value="week">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>Week View</CardTitle>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-600">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Week view coming soon</p>
                  <p className="text-sm">Use List View to see all compliance items</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientComplianceCalendar;
