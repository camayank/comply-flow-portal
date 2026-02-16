/**
 * Funding Readiness Detail Page
 * 
 * Investor-ready assessment with:
 * - Detailed score breakdown (Compliance, Documentation, Governance)
 * - Due diligence checklist with completion tracking
 * - Critical gaps with prioritization
 * - Actionable recommendations
 * - Timeline to funding-ready status
 * - Milestone tracking
 */

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { lifecycleService, type FundingDetail } from '@/services/lifecycleService';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  ArrowLeft,
  Target,
  Calendar,
  Award,
  FileText,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import { useLocation } from 'wouter';

const SCORE_COLORS = {
  excellent: { color: 'green', bg: 'bg-green-50', text: 'text-green-700', label: 'Excellent' },
  good: { color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Good' },
  needs_improvement: { color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Needs Work' },
  critical: { color: 'red', bg: 'bg-red-50', text: 'text-red-700', label: 'Critical' }
};

const CHECKLIST_STATUS = {
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  in_progress: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  pending: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' }
};

export default function FundingDetailPage() {
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState<FundingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'legal' | 'financial' | 'compliance'>('legal');

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleService.getFundingDetail();
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load funding details');
      console.error('Funding detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading funding readiness...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[50vh]">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Unable to Load Funding Details
          </h3>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadDetail}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const scoreColor = 
    detail.overallScore >= 80 ? SCORE_COLORS.excellent :
    detail.overallScore >= 60 ? SCORE_COLORS.good :
    detail.overallScore >= 40 ? SCORE_COLORS.needs_improvement :
    SCORE_COLORS.critical;

  const currentSection = detail.dueDiligenceChecklist[activeSection];

  return (
    <DashboardLayout>
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setLocation('/lifecycle')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-indigo-600" />
                Funding Readiness
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Your investor due diligence score and improvement roadmap
              </p>
            </div>
            <div className={`px-8 py-4 rounded-lg ${scoreColor.bg}`}>
              <div className="text-sm font-medium text-gray-600 mb-1">Readiness Score</div>
              <div className="text-4xl font-bold ${scoreColor.text}">{detail.overallScore}/100</div>
              <div className="text-xs font-medium ${scoreColor.text} mt-1">{scoreColor.label}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Score Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(detail.scoreBreakdown).map(([key, breakdown]) => {
            const statusColor = SCORE_COLORS[breakdown.status as keyof typeof SCORE_COLORS] || SCORE_COLORS.needs_improvement;
            const icon = key === 'compliance' ? Shield : key === 'documentation' ? FileText : Users;
            const Icon = icon;

            return (
              <div key={key} className={`rounded-lg border-2 p-6 ${statusColor.bg} border-${statusColor.color}-200`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white rounded-lg`}>
                      <Icon className={`h-6 w-6 ${statusColor.text}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{key}</h3>
                  </div>
                  <span className={`text-3xl font-bold ${statusColor.text}`}>{breakdown.score}</span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-600">Weight: {breakdown.weight}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-${statusColor.color}-500 h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${breakdown.score}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">{breakdown.description}</p>
                <div className={`mt-3 px-3 py-2 bg-white rounded text-xs font-medium ${statusColor.text}`}>
                  {statusColor.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline to Ready */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6">
          <div className="flex items-start gap-4">
            <Calendar className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Timeline to Funding-Ready</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Current Readiness</div>
                  <div className="text-2xl font-bold text-indigo-600">{detail.timeline.currentReadiness}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Target Readiness</div>
                  <div className="text-2xl font-bold text-purple-600">{detail.timeline.targetReadiness}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Estimated Time</div>
                  <div className="text-2xl font-bold text-gray-900">{detail.timeline.estimatedTimeToReady}</div>
                </div>
              </div>

              <div className="space-y-3">
                {detail.timeline.milestones.map((milestone: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Target: {milestone.target}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {milestone.timeframe}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                          Milestone {idx + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Due Diligence Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Due Diligence Checklist</h3>
            <div className="flex gap-3">
              {(['legal', 'financial', 'compliance'] as const).map((section) => {
                const sectionData = detail.dueDiligenceChecklist[section];
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                      activeSection === section
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 capitalize mb-1">{section}</div>
                    <div className="text-sm text-gray-600">{sectionData.completionRate}% complete</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${sectionData.completionRate}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {currentSection.items.map((item: any, idx: number) => {
                const statusConfig = CHECKLIST_STATUS[item.status as keyof typeof CHECKLIST_STATUS] || CHECKLIST_STATUS.pending;
                const Icon = statusConfig.icon;

                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${statusConfig.bg} border-${item.status === 'completed' ? 'green' : item.status === 'in_progress' ? 'yellow' : 'red'}-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className={`h-5 w-5 ${statusConfig.color}`} />
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Critical Gaps */}
        {detail.criticalGaps && detail.criticalGaps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Critical Gaps ({detail.criticalGaps.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detail.criticalGaps.map((gap: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 mt-2"></div>
                  <span className="text-sm text-gray-700">{gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-gray-900">Expert Recommendations</h3>
          </div>
          <div className="space-y-3">
            {detail.recommendations.map((rec: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <Award className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to Improve Your Score?</h3>
          <p className="mb-6 text-indigo-100">
            Let our experts help you become funding-ready faster
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg hover:bg-indigo-50 transition font-semibold">
              Schedule Consultation
            </button>
            <button className="bg-indigo-500 text-white px-8 py-3 rounded-lg hover:bg-indigo-400 transition font-semibold">
              Download Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
