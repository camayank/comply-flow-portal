import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout, PageShell } from '@/layouts';
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
import { useAuth } from '@/hooks/useAuth';
import { CLIENT_NAVIGATION } from '@/config/client-navigation';

// Use shared navigation configuration
const clientNavigation = CLIENT_NAVIGATION;

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
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Use actual authenticated user data
  const clientUser = {
    name: user?.fullName || user?.username || 'Client User',
    email: user?.email || '',
  };

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
    <DashboardLayout
      navigation={clientNavigation}
      user={clientUser}
    >
      <PageShell
        title="Compliance Calendar"
        subtitle="Track all your compliance deadlines in one place"
        breadcrumbs={[
          { label: "Client Portal", href: "/client" },
          { label: "Compliance Calendar" },
        ]}
        actions={
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
        }
      >
        <div className="space-y-6">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-sm font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const today = new Date();

                    const cells = [];

                    // Empty cells before first day
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(<div key={`empty-${i}`} className="min-h-[80px] p-1" />);
                    }

                    // Days of month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const cellDate = new Date(year, month, day);
                      const isToday = cellDate.toDateString() === today.toDateString();
                      const dayItems = displayData.filter((item) => {
                        const itemDate = new Date(item.dueDate);
                        return itemDate.toDateString() === cellDate.toDateString();
                      });

                      cells.push(
                        <div
                          key={day}
                          className={`min-h-[80px] p-1 border rounded-lg ${
                            isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {dayItems.slice(0, 2).map((item) => (
                              <div
                                key={item.id}
                                className={`text-xs p-1 rounded truncate ${getPriorityColor(item.priority)} cursor-pointer`}
                                title={item.title}
                              >
                                {item.title.length > 15 ? `${item.title.substring(0, 15)}...` : item.title}
                              </div>
                            ))}
                            {dayItems.length > 2 && (
                              <div className="text-xs text-gray-500 pl-1">+{dayItems.length - 2} more</div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return cells;
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Week View */}
          <TabsContent value="week">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>
                    {(() => {
                      const startOfWeek = new Date(currentDate);
                      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(startOfWeek.getDate() + 6);
                      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    })()}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                    const today = new Date();

                    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => {
                      const dayDate = new Date(startOfWeek);
                      dayDate.setDate(startOfWeek.getDate() + index);
                      const isToday = dayDate.toDateString() === today.toDateString();
                      const dayItems = displayData.filter((item) => {
                        const itemDate = new Date(item.dueDate);
                        return itemDate.toDateString() === dayDate.toDateString();
                      });

                      return (
                        <div
                          key={dayName}
                          className={`min-h-[200px] p-2 border rounded-lg ${
                            isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                          }`}
                        >
                          <div className="text-center mb-2">
                            <div className="text-sm font-semibold text-gray-600">{dayName}</div>
                            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                              {dayDate.getDate()}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {dayItems.map((item) => {
                              const daysUntil = getDaysUntilDue(item.dueDate);
                              const urgency = getUrgencyBadge(daysUntil);
                              return (
                                <div
                                  key={item.id}
                                  className="p-2 bg-white border rounded shadow-sm hover:shadow transition-shadow cursor-pointer"
                                >
                                  <div className="flex items-start gap-2">
                                    {getStatusIcon(item.status)}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Badge className={`${urgency.color} text-white text-xs`}>{urgency.text}</Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {dayItems.length === 0 && (
                              <div className="text-center py-4 text-gray-400 text-xs">No items</div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default ClientComplianceCalendar;
