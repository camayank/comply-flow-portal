import { CheckCircle, FileText, DollarSign, Upload, AlertCircle } from 'lucide-react';

interface Activity {
  id: string;
  type: 'document_uploaded' | 'filing_initiated' | 'payment_completed' | 'document_approved' | 'alert_created';
  description: string;
  timestamp: string;
  icon?: string;
}

interface RecentActivityListProps {
  activities: Activity[];
}

const iconMap = {
  CheckCircle,
  FileText,
  DollarSign,
  Upload,
  AlertCircle,
};

export default function RecentActivityList({ activities }: RecentActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const IconComponent = activity.icon && iconMap[activity.icon as keyof typeof iconMap]
          ? iconMap[activity.icon as keyof typeof iconMap]
          : FileText;

        const typeColors = {
          document_uploaded: 'text-blue-600 bg-blue-50',
          filing_initiated: 'text-purple-600 bg-purple-50',
          payment_completed: 'text-green-600 bg-green-50',
          document_approved: 'text-green-600 bg-green-50',
          alert_created: 'text-amber-600 bg-amber-50',
        };

        const colorClass = typeColors[activity.type] || 'text-gray-600 bg-gray-50';

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-full ${colorClass}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatTimestamp(activity.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
