import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Calendar, Zap } from 'lucide-react';

export interface UnifiedComplianceItem {
  id: string | number;
  name: string;
  status: 'completed' | 'pending' | 'overdue' | 'upcoming' | 'in_progress' | string;
  dueDate: string;
  penaltyRisk: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description?: string;
}

interface UnifiedComplianceDashboardProps {
  items: UnifiedComplianceItem[];
}

const priorityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const UnifiedComplianceDashboard = ({ items }: UnifiedComplianceDashboardProps) => {
  const [selectedView, setSelectedView] = useState<'priority' | 'timeline' | 'health'>('priority');

  const normalized = useMemo(() => {
    const now = new Date();
    return items.map((item) => {
      const due = new Date(item.dueDate);
      const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const statusEffective = item.status === 'completed'
        ? 'completed'
        : daysUntil < 0
          ? 'overdue'
          : item.status || 'pending';
      return {
        ...item,
        dueDateObj: due,
        daysUntil,
        statusEffective,
      };
    });
  }, [items]);

  const totals = useMemo(() => {
    const total = normalized.length;
    const completed = normalized.filter(i => i.statusEffective === 'completed').length;
    const overdue = normalized.filter(i => i.statusEffective === 'overdue').length;
    const pending = normalized.filter(i => i.statusEffective !== 'completed').length;
    const penaltyRisk = normalized
      .filter(i => i.statusEffective !== 'completed')
      .reduce((sum, i) => sum + (i.penaltyRisk || 0), 0);

    const baseScore = total > 0 ? (completed / total) * 100 : 100;
    const penaltyDeduction = overdue * 10;
    const complianceHealth = Math.max(0, Math.round(baseScore - penaltyDeduction));

    const nextDeadline = normalized
      .filter(i => i.statusEffective !== 'completed')
      .sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime())[0];

    const categoryStats = normalized.reduce((acc: Record<string, { total: number; completed: number }>, item) => {
      const key = item.category || 'Other';
      if (!acc[key]) acc[key] = { total: 0, completed: 0 };
      acc[key].total += 1;
      if (item.statusEffective === 'completed') acc[key].completed += 1;
      return acc;
    }, {});

    const categoryHealth = Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      health: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100,
    }));

    return {
      total,
      completed,
      pending,
      overdue,
      penaltyRisk,
      complianceHealth,
      nextDeadline,
      categoryHealth,
    };
  }, [normalized]);

  const priorityQueue = useMemo(() => {
    return [...normalized]
      .filter(item => item.statusEffective !== 'completed')
      .sort((a, b) => {
        const statusWeight = (s: string) => (s === 'overdue' ? 0 : 1);
        const sDiff = statusWeight(a.statusEffective) - statusWeight(b.statusEffective);
        if (sDiff !== 0) return sDiff;
        const pDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
        if (pDiff !== 0) return pDiff;
        return a.dueDateObj.getTime() - b.dueDateObj.getTime();
      })
      .slice(0, 6);
  }, [normalized]);

  const timeline = useMemo(() => {
    return [...normalized]
      .filter(item => item.statusEffective !== 'completed')
      .sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime())
      .slice(0, 8);
  }, [normalized]);

  const formatRupees = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (normalized.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-gray-500">
          No compliance items available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Compliance Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                <span className={`${totals.complianceHealth >= 80 ? 'text-green-600' : totals.complianceHealth >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {totals.complianceHealth}
                </span>
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <Progress value={totals.complianceHealth} className="mb-2" />
              <p className="text-sm text-gray-600">
                {totals.complianceHealth >= 80 ? 'Excellent' : totals.complianceHealth >= 60 ? 'Good' : 'Needs Attention'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Penalty Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatRupees(totals.penaltyRisk)}
              </div>
              <p className="text-sm text-gray-600">
                {totals.pending} items open
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Next Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {totals.nextDeadline ? (
                <>
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {totals.nextDeadline.daysUntil} days
                  </div>
                  <p className="text-sm text-gray-600">{totals.nextDeadline.name}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">No upcoming deadlines</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          size="sm"
          variant={selectedView === 'priority' ? 'default' : 'outline'}
          onClick={() => setSelectedView('priority')}
        >
          Priority Queue
        </Button>
        <Button
          size="sm"
          variant={selectedView === 'timeline' ? 'default' : 'outline'}
          onClick={() => setSelectedView('timeline')}
        >
          Timeline
        </Button>
        <Button
          size="sm"
          variant={selectedView === 'health' ? 'default' : 'outline'}
          onClick={() => setSelectedView('health')}
        >
          Category Health
        </Button>
      </div>

      {selectedView === 'priority' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Priority Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {priorityQueue.map(item => (
                <div key={item.id} className="p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{item.name}</h4>
                    <Badge className={statusBadge(item.statusEffective)}>
                      {item.statusEffective}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.description || item.category}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {item.dueDateObj.toLocaleDateString('en-IN')}
                    </span>
                    <span className="font-medium text-red-600">
                      {formatRupees(item.penaltyRisk || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {item.statusEffective === 'overdue' ? (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    ) : item.statusEffective === 'pending' ? (
                      <Clock className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {item.dueDateObj.toLocaleDateString('en-IN')}
                    </p>
                    <Badge className={statusBadge(item.statusEffective)}>
                      {item.statusEffective}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === 'health' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Category Health Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {totals.categoryHealth.map(category => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category.name}</span>
                    <span className={`font-bold ${category.health >= 80 ? 'text-green-600' : category.health >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {category.health}%
                    </span>
                  </div>
                  <Progress value={category.health} className="h-2" />
                  <p className="text-sm text-gray-600">
                    {category.total} items tracked
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UnifiedComplianceDashboard;
