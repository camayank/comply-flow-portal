/**
 * Compliance Detail Page
 * 
 * Deep-dive into compliance status with:
 * - Monthly/Quarterly/Annual checkpoint breakdown
 * - Document requirements for each checkpoint
 * - Risk analysis and prioritization
 * - Action items with deadlines
 * - Penalty exposure tracking
 */

import React, { useEffect, useState } from 'react';
import { lifecycleService, type ComplianceDetail } from '@/services/lifecycleService';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowLeft,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';

const STATUS_COLORS = {
  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
  pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
  overdue: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' }
};

const RISK_COLORS = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-blue-600 bg-blue-50 border-blue-200'
};

export default function ComplianceDetailPage() {
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState<ComplianceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'monthly' | 'quarterly' | 'annual'>('annual');

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleService.getComplianceDetail();
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load compliance details');
      console.error('Compliance detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compliance details...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Unable to Load Compliance Details
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

  const statusColor = 
    detail.summary.overallStatus === 'GREEN' ? 'text-green-600 bg-green-50' :
    detail.summary.overallStatus === 'AMBER' ? 'text-yellow-600 bg-yellow-50' :
    'text-red-600 bg-red-50';

  const currentCheckpoints = detail[activeTab] || [];
  const totalPenaltyExposure = currentCheckpoints.reduce((sum, cp) => {
    const penalty = cp.penaltyForMiss || '';
    const match = penalty.match(/₹[\d,]+/);
    if (match) {
      return sum + parseInt(match[0].replace(/[₹,]/g, ''));
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
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
                <Shield className="h-8 w-8 text-indigo-600" />
                Compliance Deep Dive
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Complete breakdown of all compliance checkpoints and requirements
              </p>
            </div>
            <div className={`px-6 py-3 rounded-lg ${statusColor}`}>
              <div className="text-sm font-medium">Overall Status</div>
              <div className="text-2xl font-bold">{detail.summary.overallStatus}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Checkpoints</span>
              <CheckCircle2 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{detail.summary.totalCheckpoints}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">{detail.summary.completedCheckpoints}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Upcoming</span>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-600">{detail.summary.upcomingCheckpoints}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">High Risk Items</span>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-600">{detail.riskAnalysis?.highRisk || 0}</div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Risk Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
              <div className="text-sm font-medium text-red-900">High Risk</div>
              <div className="text-2xl font-bold text-red-600">{detail.riskAnalysis?.highRisk || 0} items</div>
              <div className="text-xs text-red-600 mt-1">Immediate attention required</div>
            </div>
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
              <div className="text-sm font-medium text-yellow-900">Medium Risk</div>
              <div className="text-2xl font-bold text-yellow-600">{detail.riskAnalysis?.mediumRisk || 0} items</div>
              <div className="text-xs text-yellow-600 mt-1">Monitor closely</div>
            </div>
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
              <div className="text-sm font-medium text-blue-900">Low Risk</div>
              <div className="text-2xl font-bold text-blue-600">{detail.riskAnalysis?.lowRisk || 0} items</div>
              <div className="text-xs text-blue-600 mt-1">Under control</div>
            </div>
          </div>
        </div>

        {/* Frequency Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['monthly', 'quarterly', 'annual'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} Compliance
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                    {detail[tab]?.length || 0}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {currentCheckpoints.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-600">No {activeTab} compliance items at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentCheckpoints.map((checkpoint: any, idx: number) => {
                  const status = checkpoint.status || 'pending';
                  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                  const daysUntilDue = checkpoint.nextDue 
                    ? Math.ceil((new Date(checkpoint.nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`border-l-4 rounded-lg p-6 ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {checkpoint.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">{checkpoint.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            {checkpoint.nextDue && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Due:</span>
                                <span className={daysUntilDue && daysUntilDue < 30 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                                  {new Date(checkpoint.nextDue).toLocaleDateString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                  {daysUntilDue && daysUntilDue > 0 && (
                                    <span className="ml-1">({daysUntilDue} days)</span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            {checkpoint.penaltyForMiss && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-red-500" />
                                <span className="font-medium">Penalty:</span>
                                <span className="text-red-600 font-semibold">{checkpoint.penaltyForMiss}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                          <span className={`text-sm font-semibold uppercase ${colors.text}`}>
                            {status}
                          </span>
                        </div>
                      </div>

                      {checkpoint.documentsRequired && checkpoint.documentsRequired.length > 0 && (
                        <div className="bg-white rounded-lg p-4 mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Required Documents ({checkpoint.documentsRequired.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {checkpoint.documentsRequired.map((doc: string, docIdx: number) => (
                              <span
                                key={docIdx}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                              >
                                {doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            ))}
                          </div>
                          
                          <button className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            Upload Documents →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Penalty Exposure Summary */}
        {totalPenaltyExposure > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Total Penalty Exposure: ₹{totalPenaltyExposure.toLocaleString('en-IN')}
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  This is the potential financial impact if all {activeTab} compliance items are missed.
                  Take action now to avoid penalties.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setLocation('/lifecycle/services')}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Subscribe to Required Services
                  </button>
                  <button
                    onClick={() => setLocation('/lifecycle/documents')}
                    className="bg-white text-red-600 border-2 border-red-600 px-6 py-2 rounded-lg hover:bg-red-50 transition font-medium"
                  >
                    Upload Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation to Related Pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setLocation('/lifecycle/services')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Subscribe Services</h4>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition" />
            </div>
            <p className="text-sm text-gray-600">
              Get the services you need to stay compliant
            </p>
          </button>

          <button
            onClick={() => setLocation('/lifecycle/documents')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Upload Documents</h4>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition" />
            </div>
            <p className="text-sm text-gray-600">
              Upload required documents for checkpoints
            </p>
          </button>

          <button
            onClick={() => setLocation('/lifecycle/funding')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Funding Readiness</h4>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition" />
            </div>
            <p className="text-sm text-gray-600">
              See how compliance affects your funding score
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
