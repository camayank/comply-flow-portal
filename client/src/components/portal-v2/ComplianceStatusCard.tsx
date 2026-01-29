import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ComplianceStatusCardProps {
  state: 'GREEN' | 'AMBER' | 'RED';
  daysSafe: number;
  nextDeadline?: string;
  penaltyExposure?: number;
}

export default function ComplianceStatusCard({
  state,
  daysSafe,
  nextDeadline,
  penaltyExposure,
}: ComplianceStatusCardProps) {
  const config = {
    GREEN: {
      icon: CheckCircle,
      color: 'bg-green-50 text-green-700 border-green-200',
      badgeVariant: 'default' as const,
      label: 'All good',
      message: `You are safe for ${daysSafe} days`,
    },
    AMBER: {
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeVariant: 'secondary' as const,
      label: 'Action required',
      message: `You are safe for ${daysSafe} days`,
    },
    RED: {
      icon: AlertCircle,
      color: 'bg-red-50 text-red-700 border-red-200',
      badgeVariant: 'destructive' as const,
      label: 'Urgent action needed',
      message: penaltyExposure
        ? `Late fee risk: ₹${penaltyExposure.toLocaleString('en-IN')}`
        : 'Deadline passed',
    },
  }[state];

  const Icon = config.icon;

  return (
    <Card className={`p-6 ${config.color} border-2`}>
      <div className="flex items-start gap-4">
        <Icon className="w-8 h-8 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h2 className="text-xl font-semibold">Your Business Status</h2>
            <Badge variant={config.badgeVariant}>
              {config.label}
            </Badge>
          </div>
          <p className="text-lg font-medium">{config.message}</p>
          {nextDeadline && (
            <p className="text-sm mt-2 opacity-75">
              Next: {nextDeadline}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
