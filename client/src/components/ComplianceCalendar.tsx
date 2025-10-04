import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, differenceInDays } from "date-fns";

interface ComplianceItem {
  id: number;
  serviceType: string;
  dueDate: string;
  status: string;
  priority: string;
  complianceType: string;
  entityName?: string;
  healthScore?: number;
  penaltyRisk?: boolean;
}

interface ComplianceCalendarProps {
  complianceItems: ComplianceItem[];
  onItemClick?: (item: ComplianceItem) => void;
}

export function ComplianceCalendar({ complianceItems = [], onItemClick }: ComplianceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDayItems, setSelectedDayItems] = useState<ComplianceItem[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getRiskLevel = (item: ComplianceItem): 'safe' | 'warning' | 'danger' | 'overdue' => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);

    if (item.status === 'overdue' || (isBefore(dueDate, today) && item.status !== 'completed')) {
      return 'overdue';
    }
    if (daysUntilDue <= 3) return 'danger';
    if (daysUntilDue <= 7) return 'warning';
    return 'safe';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'overdue':
        return 'bg-red-500 dark:bg-red-600 text-white border-red-600';
      case 'danger':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
      case 'safe':
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700';
    }
  };

  const getItemsForDay = (day: Date) => {
    return complianceItems.filter(item => {
      const dueDate = new Date(item.dueDate);
      return isSameDay(dueDate, day);
    });
  };

  const upcomingItems = complianceItems
    .filter(item => {
      const dueDate = new Date(item.dueDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return isAfter(dueDate, today) && isBefore(dueDate, thirtyDaysFromNow) && item.status !== 'completed';
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  const overdueItems = complianceItems.filter(item => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(dueDate, today) && item.status !== 'completed';
  });

  const onTrackItems = complianceItems.filter(item => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return isAfter(dueDate, sevenDaysFromNow) && item.status !== 'completed';
  });

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Overdue</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{overdueItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Due This Week</p>
                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                  {complianceItems.filter(item => {
                    const dueDate = new Date(item.dueDate);
                    const today = new Date();
                    const sevenDaysFromNow = new Date();
                    sevenDaysFromNow.setDate(today.getDate() + 7);
                    return isAfter(dueDate, today) && isBefore(dueDate, sevenDaysFromNow) && item.status !== 'completed';
                  }).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">On Track</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {onTrackItems.length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compliance Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              >
                {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'calendar' ? (
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}
                
                {/* Calendar days */}
                {daysInMonth.map(day => {
                  const itemsForDay = getItemsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const highestRisk = itemsForDay.length > 0
                    ? itemsForDay.reduce((highest, item) => {
                        const itemRisk = getRiskLevel(item);
                        const riskOrder = ['safe', 'warning', 'danger', 'overdue'];
                        return riskOrder.indexOf(itemRisk) > riskOrder.indexOf(highest) ? itemRisk : highest;
                      }, 'safe')
                    : null;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square border rounded-lg p-1 ${
                        isToday ? 'border-blue-500 dark:border-blue-400 border-2' : 'border-gray-200 dark:border-gray-700'
                      } ${
                        itemsForDay.length > 0 ? 'cursor-pointer hover:shadow-md hover:scale-105 transition-all' : ''
                      } ${
                        highestRisk ? getRiskColor(highestRisk) : 'bg-white dark:bg-gray-900'
                      }`}
                      onClick={() => {
                        if (itemsForDay.length > 0) {
                          if (itemsForDay.length === 1) {
                            onItemClick?.(itemsForDay[0]);
                          } else {
                            setSelectedDayItems(itemsForDay);
                            setShowDayModal(true);
                          }
                        }
                      }}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <div className="text-xs font-medium text-center mb-1">
                        {format(day, 'd')}
                      </div>
                      {itemsForDay.length > 0 && (
                        <div className="text-xs text-center font-bold">
                          {itemsForDay.length} {itemsForDay.length === 1 ? 'item' : 'items'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 pt-4 border-t dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-sm">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700" />
                  <span className="text-sm">Due in 3 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700" />
                  <span className="text-sm">Due in 7 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" />
                  <span className="text-sm">Upcoming (&gt;7 days)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Upcoming Deadlines (Next 30 Days)</h3>
              {upcomingItems.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No upcoming deadlines</p>
              ) : (
                upcomingItems.map(item => {
                  const riskLevel = getRiskLevel(item);
                  const daysUntil = differenceInDays(new Date(item.dueDate), new Date());
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getRiskColor(riskLevel)}`}
                      onClick={() => onItemClick?.(item)}
                      data-testid={`compliance-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{item.serviceType}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.complianceType}
                            </Badge>
                          </div>
                          {item.entityName && (
                            <p className="text-sm opacity-90">{item.entityName}</p>
                          )}
                          <p className="text-sm font-medium mt-2">
                            Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getRiskColor(riskLevel)}>
                            {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Item Day Modal */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDayItems.length > 0 && (
                <>
                  Compliance Items - {format(new Date(selectedDayItems[0].dueDate), 'MMM dd, yyyy')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedDayItems.map((item) => {
              const riskLevel = getRiskLevel(item);
              const daysUntil = differenceInDays(new Date(item.dueDate), new Date());
              
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getRiskColor(riskLevel)}`}
                  onClick={() => {
                    setShowDayModal(false);
                    onItemClick?.(item);
                  }}
                  data-testid={`modal-item-${item.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{item.serviceType}</h4>
                        <Badge variant="outline" className="text-xs">
                          {item.complianceType}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase">
                          {item.priority}
                        </Badge>
                      </div>
                      {item.entityName && (
                        <p className="text-sm opacity-90 mb-2">{item.entityName}</p>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysUntil === 0 ? 'Due today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days remaining`}
                        </span>
                        {item.healthScore !== undefined && (
                          <span className="flex items-center gap-1">
                            Health: {item.healthScore}%
                          </span>
                        )}
                        {item.penaltyRisk && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Penalty Risk
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
