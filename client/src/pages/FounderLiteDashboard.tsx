/**
 * Founder Lite Dashboard
 * 
 * Minimal, compliance-state-focused view for founders
 * Shows: State badge, next action, domain grid, top alerts
 * 
 * Design Philosophy:
 * - ONE question answered: "Is my company compliant?"
 * - NO service tracking, task lists, or admin complexity
 * - 3-second understanding: GREEN/AMBER/RED
 * - Next action always visible
 */

import { useState, useEffect } from 'react';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { useStandardMutation } from '@/hooks/useStandardMutation';
import { get, post } from '@/lib/api';
import { PageLayout } from '@/components/layouts/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  Calendar,
  IndianRupee,
  FileText,
  Shield,
  RefreshCw,
  Info,
  Building2,
  Users,
  DollarSign
} from 'lucide-react';

// Types
interface ComplianceState {
  overallState: 'GREEN' | 'AMBER' | 'RED';
  calculatedAt: string;
  nextActionRequired: string;
  nextActionDueDate: string | null;
  domainStates: {
    [domain: string]: {
      state: 'GREEN' | 'AMBER' | 'RED';
      reason: string;
    };
  };
}

interface ComplianceAlert {
  id: number;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string | null;
  acknowledged: boolean;
}

const FounderLiteDashboard = () => {
  const [entityId, setEntityId] = useState<number | null>(null);

  // Get current user's client ID
  const profileQuery = useStandardQuery({
    queryKey: ['client', 'profile'],
    queryFn: () => get<{ data: { id: number } }>('/api/v1/client/profile').then(res => res.data),
  });

  // Set entityId when profile loads
  useEffect(() => {
    if (profileQuery.data?.id) {
      setEntityId(profileQuery.data.id);
    }
  }, [profileQuery.data]);

  // Fetch compliance state with auto-refresh
  const stateQuery = useStandardQuery<ComplianceState>({
    queryKey: ['compliance-state', entityId],
    queryFn: () => get<{ data: ComplianceState }>(`/api/compliance-state/${entityId}/summary`).then(res => res.data),
    enabled: !!entityId,
    refetchInterval: 60000, // Auto-refresh every 60s
    loadingComponent: <LoadingSpinner size="lg" label="Loading compliance status..." />,
  });

  // Fetch top alerts
  const alertsQuery = useStandardQuery<ComplianceAlert[]>({
    queryKey: ['compliance-alerts', entityId],
    queryFn: () => get<{ data: ComplianceAlert[] }>(`/api/compliance-state/${entityId}/alerts?limit=3`).then(res => res.data),
    enabled: !!entityId,
  });

  // Manual recalculation mutation
  const recalculateMutation = useStandardMutation({
    mutationFn: () => post(`/api/compliance-state/${entityId}/recalculate`),
    successMessage: 'Compliance state refreshed successfully',
    invalidateQueries: [['compliance-state', entityId], ['compliance-alerts', entityId]],
  });

  // State badge styling
  const getStateBadge = (state: 'GREEN' | 'AMBER' | 'RED') => {
    const config = {
      GREEN: {
        icon: CheckCircle2,
        className: 'bg-green-100 text-green-800 border-green-300',
        label: 'Compliant',
      },
      AMBER: {
        icon: AlertTriangle,
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        label: 'Action Needed',
      },
      RED: {
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-300',
        label: 'Non-Compliant',
      },
    };

    const { icon: Icon, className, label } = config[state];

    return (
      <Badge className={`${className} border-2 px-6 py-3 text-2xl font-bold flex items-center gap-3`}>
        <Icon className="h-8 w-8" />
        {label}
      </Badge>
    );
  };

  // Domain icon mapping
  const getDomainIcon = (domain: string) => {
    const icons: { [key: string]: any } = {
      CORPORATE: Building2,
      TAX_GST: IndianRupee,
      TAX_INCOME: FileText,
      LABOUR: Users,
      FEMA: DollarSign,
      LICENSES: Shield,
    };
    return icons[domain] || Shield;
  };

  // Domain display name
  const getDomainName = (domain: string) => {
    const names: { [key: string]: string } = {
      CORPORATE: 'Corporate',
      TAX_GST: 'GST',
      TAX_INCOME: 'Income Tax',
      LABOUR: 'Labour',
      FEMA: 'FEMA',
      LICENSES: 'Licenses',
    };
    return names[domain] || domain;
  };

  // Render the dashboard - use stateQuery.render for automatic loading/error handling
  return stateQuery.render((state) => {
    const overallState = state.overallState;
    const domainStates = state.domainStates || {};
    const alerts: ComplianceAlert[] = alertsQuery.data || [];

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section: Overall State */}
        <div className={`
          ${overallState === 'GREEN' ? 'bg-gradient-to-br from-green-50 to-green-100' : ''}
          ${overallState === 'AMBER' ? 'bg-gradient-to-br from-amber-50 to-amber-100' : ''}
          ${overallState === 'RED' ? 'bg-gradient-to-br from-red-50 to-red-100' : ''}
          border-b-4 
          ${overallState === 'GREEN' ? 'border-green-500' : ''}
          ${overallState === 'AMBER' ? 'border-amber-500' : ''}
          ${overallState === 'RED' ? 'border-red-500' : ''}
        `}>
          <div className="max-w-5xl mx-auto px-8 py-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Compliance Status
                </h1>
                <p className="text-gray-600 text-lg">
                  Last updated: {new Date(state.calculatedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculateMutation.mutate(undefined)}
                disabled={recalculateMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

          {/* Big State Badge */}
          <div className="mb-8">
            {getStateBadge(overallState)}
          </div>

          {/* Next Action Card */}
          {state.nextActionRequired && (
            <Card className="bg-white/80 backdrop-blur border-2 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  What You Need to Do Next
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-gray-800 font-medium mb-2">
                  {state.nextActionRequired}
                </p>
                {state.nextActionDueDate && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Due: {new Date(state.nextActionDueDate).toLocaleDateString('en-IN', {
                      dateStyle: 'long',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        {/* Domain Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Compliance Areas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(domainStates).map(([domain, domainData]) => {
              const DomainIcon = getDomainIcon(domain);
              const domainState = domainData.state;
              
              return (
                <Card 
                  key={domain}
                  className={`
                    border-2 transition-all hover:shadow-lg cursor-pointer
                    ${domainState === 'GREEN' ? 'border-green-300 bg-green-50/50' : ''}
                    ${domainState === 'AMBER' ? 'border-amber-300 bg-amber-50/50' : ''}
                    ${domainState === 'RED' ? 'border-red-300 bg-red-50/50' : ''}
                  `}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DomainIcon className="h-5 w-5 text-gray-700" />
                        <CardTitle className="text-base">
                          {getDomainName(domain)}
                        </CardTitle>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`
                          ${domainState === 'GREEN' ? 'border-green-600 text-green-700' : ''}
                          ${domainState === 'AMBER' ? 'border-amber-600 text-amber-700' : ''}
                          ${domainState === 'RED' ? 'border-red-600 text-red-700' : ''}
                        `}
                      >
                        {domainState}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      {domainData.reason}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Top Alerts
            </h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert 
                  key={alert.id}
                  className={`
                    border-l-4
                    ${alert.severity === 'critical' ? 'border-red-600 bg-red-50' : ''}
                    ${alert.severity === 'high' ? 'border-orange-600 bg-orange-50' : ''}
                    ${alert.severity === 'medium' ? 'border-amber-600 bg-amber-50' : ''}
                    ${alert.severity === 'low' ? 'border-blue-600 bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <AlertDescription className="text-base font-medium text-gray-900">
                        {alert.title}
                      </AlertDescription>
                      {alert.dueDate && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(alert.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant="outline"
                      className={`
                        ml-4
                        ${alert.severity === 'critical' ? 'border-red-600 text-red-700' : ''}
                        ${alert.severity === 'high' ? 'border-orange-600 text-orange-700' : ''}
                        ${alert.severity === 'medium' ? 'border-amber-600 text-amber-700' : ''}
                        ${alert.severity === 'low' ? 'border-blue-600 text-blue-700' : ''}
                      `}
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <strong>How this works:</strong> Your compliance status is automatically 
                  calculated based on your company's filings, payments, and deadlines. States 
                  update in real-time when you upload documents or complete tasks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    );
  });
};

export default FounderLiteDashboard;
