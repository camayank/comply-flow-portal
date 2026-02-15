import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';

interface SlaCardProps {
  slaDeadline?: string | null;
  dueDate?: string | null;
  status: string;
  onExtendSla?: () => void;
}

export function SlaCard({ slaDeadline, dueDate, status, onExtendSla }: SlaCardProps) {
  const deadline = slaDeadline || dueDate;

  const getSlaStatus = () => {
    if (!deadline) return { status: 'no_sla', label: 'No SLA', color: 'gray' };
    if (status === 'completed') return { status: 'completed', label: 'Completed', color: 'green' };

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = differenceInHours(deadlineDate, now);

    if (hoursRemaining < 0) {
      return { status: 'breached', label: 'SLA Breached', color: 'red' };
    } else if (hoursRemaining <= 4) {
      return { status: 'critical', label: 'Critical', color: 'red' };
    } else if (hoursRemaining <= 24) {
      return { status: 'at_risk', label: 'At Risk', color: 'orange' };
    } else {
      return { status: 'on_track', label: 'On Track', color: 'green' };
    }
  };

  const getTimeRemaining = () => {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalMinutes = differenceInMinutes(deadlineDate, now);

    if (totalMinutes < 0) {
      const overdueMins = Math.abs(totalMinutes);
      const hours = Math.floor(overdueMins / 60);
      const mins = overdueMins % 60;
      return { text: `${hours}h ${mins}m overdue`, isOverdue: true };
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return { text: `${days}d ${remainingHours}h`, isOverdue: false };
    }

    return { text: `${hours}h ${mins}m`, isOverdue: false };
  };

  const slaStatus = getSlaStatus();
  const timeRemaining = getTimeRemaining();

  const StatusIcon = {
    no_sla: Clock,
    completed: CheckCircle,
    on_track: CheckCircle,
    at_risk: AlertTriangle,
    critical: AlertCircle,
    breached: AlertCircle,
  }[slaStatus.status] || Clock;

  const statusColors = {
    no_sla: 'bg-gray-100 text-gray-600',
    completed: 'bg-green-100 text-green-700',
    on_track: 'bg-green-100 text-green-700',
    at_risk: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
    breached: 'bg-red-100 text-red-700',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          SLA Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          {timeRemaining ? (
            <>
              <p className={`text-2xl font-bold ${timeRemaining.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {timeRemaining.text}
              </p>
              <p className="text-xs text-gray-500">
                {timeRemaining.isOverdue ? 'Overdue' : 'Remaining'}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No SLA set</p>
          )}
        </div>

        <div className="flex justify-center">
          <Badge className={statusColors[slaStatus.status as keyof typeof statusColors]}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {slaStatus.label}
          </Badge>
        </div>

        {deadline && (
          <div className="text-center text-xs text-gray-500">
            Deadline: {format(new Date(deadline), 'dd MMM yyyy, h:mm a')}
          </div>
        )}

        {onExtendSla && slaStatus.status !== 'completed' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onExtendSla}
          >
            Extend SLA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
