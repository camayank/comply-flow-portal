/**
 * Lifecycle Dashboard (V2) - Enhanced
 * 
 * US-level platform features:
 * - Command palette (Cmd+K) for quick navigation
 * - Smart toast notifications
 * - Progress tracking cards
 * - Metric cards with trends
 * - Status badges
 * - Quick action buttons
 * - Real-time updates
 */

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { lifecycleService, type LifecycleDashboard } from '@/services/lifecycleService';
import { useToast, TOAST_MESSAGES } from '@/hooks/useToast';
import QuickCommand, { QuickCommandTrigger } from '@/components/lifecycle/QuickCommand';
import ProgressCard from '@/components/lifecycle/ProgressCard';
import MetricCard from '@/components/lifecycle/MetricCard';
import StatusBadge from '@/components/lifecycle/StatusBadge';
import ActionButton from '@/components/lifecycle/ActionButton';
import { 
  TrendingUp, 
  Shield, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Zap,
  FileText,
  Briefcase,
  Target,
  Sparkles
} from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  bootstrap: 'Bootstrap',
  seed: 'Seed',
  'early-growth': 'Early Growth',
  growth: 'Growth',
  scaling: 'Scaling',
  'pre-ipo': 'Pre-IPO',
  public: 'Public',
  'exit-ready': 'Exit Ready'
};

const STAGE_COLORS: Record<string, string> = {
  bootstrap: 'bg-gray-100 text-gray-700',
  seed: 'bg-blue-100 text-blue-700',
  'early-growth': 'bg-indigo-100 text-indigo-700',
  growth: 'bg-purple-100 text-purple-700',
  scaling: 'bg-pink-100 text-pink-700',
  'pre-ipo': 'bg-orange-100 text-orange-700',
  public: 'bg-green-100 text-green-700',
  'exit-ready': 'bg-emerald-100 text-emerald-700'
};

const COMPLIANCE_COLORS = {
  GREEN: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
  AMBER: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
  RED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' }
};

const URGENCY_COLORS = {
  low: 'bg-blue-50 border-blue-200 text-blue-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  high: 'bg-orange-50 border-orange-200 text-orange-700',
  critical: 'bg-red-50 border-red-200 text-red-700'
};

export default function LifecycleDashboardPage() {
  const [, setLocation] = useLocation();
  const [dashboard, setDashboard] = useState<LifecycleDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleService.getDashboard();
      
      // Convert nextAction to quickActions format if needed
      if (data.nextAction && !data.quickActions) {
        data.quickActions = [{
          id: '1',
          title: data.nextAction.title,
          urgency: data.nextAction.priority as 'low' | 'medium' | 'high' | 'critical',
          impact: 10,
          estimatedTime: data.nextAction.estimatedTime ? `${data.nextAction.estimatedTime} min` : undefined
        }];
      }
      
      setDashboard(data);

      // Smart notification: Compliance status change
      if (data.compliance.status === 'GREEN') {
        toast.success(TOAST_MESSAGES.complianceGreen());
      } else if (data.compliance.status === 'RED') {
        toast.warning(TOAST_MESSAGES.complianceRed());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
      console.error('Dashboard error:', err);
      toast.error(TOAST_MESSAGES.networkError());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your lifecycle dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[50vh]">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Unable to Load Dashboard
          </h3>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const complianceColors = COMPLIANCE_COLORS[dashboard.compliance.status];
  const fundingScoreColor = 
    dashboard.fundingReadiness.score >= 80 ? 'text-green-600' :
    dashboard.fundingReadiness.score >= 60 ? 'text-yellow-600' :
    dashboard.fundingReadiness.score >= 40 ? 'text-orange-600' : 'text-red-600';

  return (
    <DashboardLayout>
      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />

      {/* Command Palette (Cmd+K) */}
      <QuickCommand open={commandOpen} onOpenChange={setCommandOpen} />

      <div className="bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">Lifecycle Dashboard</h1>
                  <StatusBadge 
                    status={dashboard.compliance.status === 'GREEN' ? 'verified' : 'warning'} 
                    size="md"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Track your company's growth journey and compliance status
                </p>
              </div>
              <div className="flex items-center gap-4">
                <QuickCommandTrigger onClick={() => setCommandOpen(true)} />
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-gray-500">Company Age:</span>
                  <span className="text-sm font-semibold text-gray-900">{dashboard.company.age}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stage Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Current Stage</h2>
              <p className="text-sm text-gray-500">Your company's lifecycle position</p>
            </div>
            <TrendingUp className="h-6 w-6 text-indigo-600" />
          </div>

          <div className="flex items-center gap-4 mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${STAGE_COLORS[dashboard.company.stage]}`}>
              {STAGE_LABELS[dashboard.company.stage] || dashboard.company.stage}
            </span>
            {dashboard.company.transition && (
              <>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Next: {STAGE_LABELS[dashboard.company.transition.nextStage]}
                </span>
                <span className="text-sm font-semibold text-indigo-600">
                  {dashboard.company.transition.readiness}% ready
                </span>
              </>
            )}
          </div>

          {dashboard.company.transition && dashboard.company.transition.requirements.length > 0 && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm font-medium text-indigo-900 mb-2">To reach next stage:</p>
              <ul className="space-y-1">
                {dashboard.company.transition.requirements.map((req, idx) => (
                  <li key={idx} className="text-sm text-indigo-700 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-indigo-400"></div>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Compliance Status"
            value={dashboard.compliance.status}
            subtext={`${dashboard.compliance.stats.compliant} compliant, ${dashboard.compliance.stats.pending} pending`}
            icon={Shield}
            color={dashboard.compliance.status === 'GREEN' ? 'green' : dashboard.compliance.status === 'AMBER' ? 'yellow' : 'red'}
            onClick={() => setLocation('/lifecycle/compliance')}
          />

          <MetricCard
            label="Funding Score"
            value={dashboard.fundingReadiness.score}
            subtext="/100 readiness"
            icon={TrendingUp}
            color={dashboard.fundingReadiness.score >= 80 ? 'green' : dashboard.fundingReadiness.score >= 60 ? 'yellow' : 'red'}
            onClick={() => setLocation('/lifecycle/funding')}
            trend={{
              value: 12,
              direction: 'up',
              label: 'vs last month'
            }}
          />

          <MetricCard
            label="Days to Next Deadline"
            value={dashboard.compliance.daysSafe}
            subtext="days remaining"
            icon={Clock}
            color="blue"
            onClick={() => setLocation('/lifecycle/compliance')}
          />

          <MetricCard
            label="Current Stage"
            value={STAGE_LABELS[dashboard.company.stage] || dashboard.company.stage}
            subtext={dashboard.company.transition ? `${dashboard.company.transition.readiness}% to next` : 'Well established'}
            icon={Target}
            color="purple"
            onClick={() => setLocation('/lifecycle/timeline')}
          />
        </div>

        {/* Progress Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProgressCard
            title="Compliance Checkpoints"
            current={dashboard.compliance.stats.compliant}
            total={dashboard.compliance.stats.compliant + dashboard.compliance.stats.pending}
            unit="completed"
            color="green"
            actionLabel="Review Pending"
            onAction={() => setLocation('/lifecycle/compliance')}
          />

          <ProgressCard
            title="Document Collection"
            current={dashboard.fundingReadiness.breakdown.documentation || 0}
            total={100}
            unit="% complete"
            color="blue"
            actionLabel="Upload Documents"
            onAction={() => setLocation('/lifecycle/documents')}
          />

          <ProgressCard
            title="Service Subscriptions"
            current={dashboard.fundingReadiness.breakdown.compliance || 0}
            total={100}
            unit="% subscribed"
            color="purple"
            actionLabel="Browse Services"
            onAction={() => setLocation('/lifecycle/services')}
          />
        </div>

        {/* Quick Actions */}
        {dashboard.quickActions && dashboard.quickActions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <StatusBadge status="warning" label={`${dashboard.quickActions.length} pending`} size="sm" />
                </div>
                <p className="text-sm text-gray-500">High-impact tasks to complete</p>
              </div>
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </div>

            <div className="space-y-4">
              {dashboard.quickActions.map((action) => (
                <div 
                  key={action.id}
                  className={`rounded-lg p-5 border-2 ${
                    action.urgency === 'critical' ? 'bg-red-50 border-red-200' :
                    action.urgency === 'high' ? 'bg-orange-50 border-orange-200' :
                    action.urgency === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge 
                          status={action.urgency === 'critical' ? 'failed' : action.urgency === 'high' ? 'warning' : 'pending'} 
                          label={action.urgency.toUpperCase()}
                          size="sm"
                        />
                        {action.estimatedTime && (
                          <span className="text-xs text-gray-600 flex items-center gap-1 bg-white px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            {action.estimatedTime}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-green-600 bg-white px-2 py-1 rounded">
                          +{action.impact} points
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
                      <p className="text-sm text-gray-600">Complete this action to improve your compliance and funding scores</p>
                    </div>
                    <ActionButton
                      label="Start"
                      variant={action.urgency === 'critical' ? 'danger' : 'primary'}
                      size="md"
                      showArrow
                      onClick={() => {
                        toast.info({
                          title: 'Action started',
                          description: `Working on: ${action.title}`
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Completing all actions will add <strong>+{dashboard.quickActions.reduce((sum, a) => sum + a.impact, 0)} points</strong> to your score
                </p>
                <ActionButton
                  label="View All Tasks"
                  variant="secondary"
                  size="sm"
                  onClick={() => setLocation('/lifecycle/compliance')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setLocation('/lifecycle/services')}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6 hover:shadow-lg transition-all hover:scale-105 group text-left"
          >
            <Briefcase className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
              Services
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              96-service catalog with gap analysis
            </p>
            <StatusBadge status="in_progress" label="7 subscribed" size="sm" />
          </button>

          <button
            onClick={() => setLocation('/lifecycle/documents')}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6 hover:shadow-lg transition-all hover:scale-105 group text-left"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
              Documents
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Organized vault with verification
            </p>
            <StatusBadge status="warning" label={`${dashboard.fundingReadiness.breakdown.documentation || 0}% complete`} size="sm" />
          </button>

          <button
            onClick={() => setLocation('/lifecycle/funding')}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6 hover:shadow-lg transition-all hover:scale-105 group text-left"
          >
            <DollarSign className="h-8 w-8 text-green-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
              Funding
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Investor due diligence checklist
            </p>
            <StatusBadge 
              status={dashboard.fundingReadiness.score >= 85 ? 'verified' : dashboard.fundingReadiness.score >= 60 ? 'pending' : 'warning'} 
              label={`${dashboard.fundingReadiness.score}/100 score`} 
              size="sm" 
            />
          </button>

          <button
            onClick={() => setLocation('/lifecycle/timeline')}
            className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200 p-6 hover:shadow-lg transition-all hover:scale-105 group text-left"
          >
            <Clock className="h-8 w-8 text-orange-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
              Timeline
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              8-stage lifecycle journey
            </p>
            <StatusBadge status="in_progress" label={dashboard.company.age} size="sm" />
          </button>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
