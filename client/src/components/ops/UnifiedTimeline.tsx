import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MessageSquare,
  Upload,
  CreditCard,
  UserPlus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: number;
  activityType: string;
  title: string;
  description?: string;
  serviceRequestId?: number;
  performedByName?: string;
  isClientVisible?: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface UnifiedTimelineProps {
  activities: Activity[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const activityIcons: Record<string, any> = {
  status_change: Clock,
  note_added: MessageSquare,
  document_uploaded: Upload,
  document_requested: FileText,
  filing_update: Send,
  payment_received: CreditCard,
  payment_failed: AlertTriangle,
  assignment_change: UserPlus,
  sla_update: Clock,
  escalation: AlertTriangle,
  communication: Bell,
  case_created: FileText,
  case_completed: CheckCircle,
};

const activityColors: Record<string, string> = {
  status_change: 'bg-blue-100 text-blue-600',
  note_added: 'bg-purple-100 text-purple-600',
  document_uploaded: 'bg-green-100 text-green-600',
  document_requested: 'bg-yellow-100 text-yellow-600',
  filing_update: 'bg-indigo-100 text-indigo-600',
  payment_received: 'bg-green-100 text-green-600',
  payment_failed: 'bg-red-100 text-red-600',
  assignment_change: 'bg-cyan-100 text-cyan-600',
  sla_update: 'bg-orange-100 text-orange-600',
  escalation: 'bg-red-100 text-red-600',
  communication: 'bg-blue-100 text-blue-600',
  case_created: 'bg-blue-100 text-blue-600',
  case_completed: 'bg-green-100 text-green-600',
};

export function UnifiedTimeline({ activities, onLoadMore, hasMore }: UnifiedTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.activityType] || Clock;
        const colorClass = activityColors[activity.activityType] || 'bg-gray-100 text-gray-600';

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < activities.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{activity.title}</p>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                    {activity.performedByName && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{activity.performedByName}</span>
                      </>
                    )}
                    {activity.serviceRequestId && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <Badge variant="outline" className="text-xs">
                          Case #{activity.serviceRequestId}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {activity.isClientVisible && (
                  <Badge variant="secondary" className="text-xs">
                    Client Visible
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Load more activities
        </button>
      )}
    </div>
  );
}
