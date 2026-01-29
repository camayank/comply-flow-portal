/**
 * Services Detail Page
 * 
 * Deep-dive into 96-service catalog with:
 * - Required vs Recommended services
 * - Service gaps analysis
 * - Subscription management
 * - Stage-based recommendations
 * - Next stage preview
 */

import React, { useEffect, useState } from 'react';
import { lifecycleService, type ServicesDetail } from '@/services/lifecycleService';
import { 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ArrowLeft,
  ShoppingCart,
  Star,
  AlertTriangle,
  Calendar,
  Package,
  ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';

const IMPORTANCE_COLORS = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  high: 'bg-orange-50 border-orange-200 text-orange-700',
  recommended: 'bg-blue-50 border-blue-200 text-blue-700',
  optional: 'bg-gray-50 border-gray-200 text-gray-700'
};

const PERIODICITY_BADGES = {
  MONTHLY: 'bg-blue-100 text-blue-700',
  QUARTERLY: 'bg-green-100 text-green-700',
  ANNUAL: 'bg-purple-100 text-purple-700',
  ONE_TIME: 'bg-gray-100 text-gray-700'
};

export default function ServicesDetailPage() {
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState<ServicesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'required' | 'recommended' | 'gaps'>('required');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleService.getServicesDetail();
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load services');
      console.error('Services detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service catalog...</p>
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
            Unable to Load Services
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

  const categories = ['all', 'monthly_compliance', 'quarterly_compliance', 'annual_compliance', 'one_time'];
  
  const filterByCategory = (services: any[]) => {
    if (selectedCategory === 'all') return services;
    return services.filter(s => s.category === selectedCategory);
  };

  const currentServices = filterByCategory(
    activeTab === 'required' ? detail.required :
    activeTab === 'recommended' ? detail.recommended :
    detail.gaps
  );

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
                <Briefcase className="h-8 w-8 text-indigo-600" />
                Service Catalog
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {detail.summary.stage.charAt(0).toUpperCase() + detail.summary.stage.slice(1)} Stage Services
              </p>
            </div>
            <div className="bg-indigo-50 px-6 py-3 rounded-lg">
              <div className="text-sm font-medium text-indigo-900">Service Coverage</div>
              <div className="text-2xl font-bold text-indigo-600">
                {detail.summary.subscribedRequired}/{detail.summary.totalRequired}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Required Services</span>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{detail.summary.totalRequired}</div>
            <div className="text-sm text-gray-600 mt-1">
              {detail.summary.subscribedRequired} subscribed
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Recommended</span>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{detail.summary.totalRecommended}</div>
            <div className="text-sm text-gray-600 mt-1">
              {detail.summary.subscribedRecommended} subscribed
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Service Gaps</span>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{detail.gaps?.length || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Need attention</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Compliance Score</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">
              {Math.round((detail.summary.subscribedRequired / detail.summary.totalRequired) * 100)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Coverage rate</div>
          </div>
        </div>

        {/* Next Stage Preview */}
        {detail.nextStagePreview && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Package className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Prepare for {detail.nextStagePreview.stage.charAt(0).toUpperCase() + detail.nextStagePreview.stage.slice(1)} Stage
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Additional services you'll need when transitioning:
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.nextStagePreview.additionalServices.map((service: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-full text-sm font-medium"
                    >
                      {service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter & Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['required', 'recommended', 'gaps'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                    {tab === 'required' ? detail.required?.length || 0 :
                     tab === 'recommended' ? detail.recommended?.length || 0 :
                     detail.gaps?.length || 0}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Category Filter */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="monthly_compliance">Monthly Compliance</option>
                <option value="quarterly_compliance">Quarterly Compliance</option>
                <option value="annual_compliance">Annual Compliance</option>
                <option value="one_time">One-Time Services</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {currentServices.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedCategory === 'all' ? 'All Set!' : 'No services in this category'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'gaps' 
                    ? 'You have all required services subscribed.' 
                    : 'Try changing the category filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentServices.map((service: any, idx: number) => {
                  const importanceColor = IMPORTANCE_COLORS[service.importance as keyof typeof IMPORTANCE_COLORS] || IMPORTANCE_COLORS.optional;
                  const periodicityColor = PERIODICITY_BADGES[service.periodicity as keyof typeof PERIODICITY_BADGES] || PERIODICITY_BADGES.ONE_TIME;

                  return (
                    <div
                      key={service.serviceKey || idx}
                      className={`border rounded-lg p-6 ${
                        service.subscribed 
                          ? 'bg-green-50 border-green-200' 
                          : activeTab === 'gaps'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {service.name || service.serviceName || 'Service'}
                            </h4>
                            {service.periodicity && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${periodicityColor}`}>
                                {service.periodicity}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${importanceColor}`}>
                              {service.importance?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {service.description || service.impact || 'No description available'}
                          </p>
                          
                          {service.category && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Package className="h-4 w-4" />
                              <span>{service.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {service.subscribed ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="text-sm font-medium">Subscribed</span>
                            </div>
                          ) : (
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Subscribe
                            </button>
                          )}
                          {activeTab === 'gaps' && service.priority && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              service.priority === 'high' ? 'bg-red-100 text-red-700' :
                              service.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {service.priority.toUpperCase()} PRIORITY
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action CTA */}
        {detail.gaps && detail.gaps.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  {detail.gaps.length} Service Gap{detail.gaps.length > 1 ? 's' : ''} Detected
                </h3>
                <p className="text-sm text-orange-700 mb-4">
                  Subscribe to these services to improve your compliance score and funding readiness.
                </p>
                <div className="flex gap-3">
                  <button className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition font-medium">
                    Subscribe to All Required Services
                  </button>
                  <button
                    onClick={() => setLocation('/lifecycle/funding')}
                    className="bg-white text-orange-600 border-2 border-orange-600 px-6 py-2 rounded-lg hover:bg-orange-50 transition font-medium"
                  >
                    View Impact on Funding Score
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Value Proposition Cards */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">Why Subscribe to These Services?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-indigo-100">Compliance Coverage</div>
              <p className="text-sm text-indigo-200 mt-2">
                Never miss a deadline or face penalties
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85+</div>
              <div className="text-indigo-100">Funding Readiness Score</div>
              <p className="text-sm text-indigo-200 mt-2">
                Impress investors with complete documentation
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-indigo-100">Expert Support</div>
              <p className="text-sm text-indigo-200 mt-2">
                Professional team managing your compliance
              </p>
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setLocation('/lifecycle/compliance')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Check Compliance</h4>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition" />
            </div>
            <p className="text-sm text-gray-600">
              See upcoming deadlines and requirements
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
              Upload required documents for services
            </p>
          </button>

          <button
            onClick={() => setLocation('/lifecycle/timeline')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">View Timeline</h4>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition" />
            </div>
            <p className="text-sm text-gray-600">
              Track your lifecycle journey and progress
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
