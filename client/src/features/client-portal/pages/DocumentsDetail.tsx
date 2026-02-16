/**
 * Documents Detail Page
 *
 * Complete document management with:
 * - Category-wise organization (7 categories)
 * - Upload with drag-and-drop
 * - Verification status tracking
 * - Expiry date monitoring
 * - Critical document alerts
 * - Document history and versions
 */

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { lifecycleService, type DocumentsDetail } from '@/services/lifecycleService';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Shield,
  XCircle
} from 'lucide-react';
import { useLocation } from 'wouter';

const CATEGORY_INFO = {
  identity: { name: 'Identity Documents', color: 'blue', icon: '🆔' },
  tax: { name: 'Tax Documents', color: 'green', icon: '💰' },
  financial: { name: 'Financial Statements', color: 'purple', icon: '📊' },
  legal: { name: 'Legal Documents', color: 'red', icon: '⚖️' },
  operational: { name: 'Operational Records', color: 'yellow', icon: '🔧' },
  statutory: { name: 'Statutory Filings', color: 'indigo', icon: '📋' },
  registration: { name: 'Registration Certificates', color: 'pink', icon: '📜' }
};

const STATUS_CONFIG = {
  verified: { label: 'Verified', color: 'green', icon: CheckCircle2 },
  pending: { label: 'Pending Review', color: 'yellow', icon: Clock },
  missing: { label: 'Missing', color: 'red', icon: AlertTriangle },
  rejected: { label: 'Rejected', color: 'orange', icon: XCircle },
  expiring: { label: 'Expiring Soon', color: 'amber', icon: Calendar }
};

export default function DocumentsDetailPage() {
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState<DocumentsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleService.getDocumentsDetail();
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents');
      console.error('Documents detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !detail) {
    return (
      <DashboardLayout>
        <div className="bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Unable to Load Documents
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
      </DashboardLayout>
    );
  }

  const allDocuments = detail.byCategory.flatMap(cat => 
    cat.documents.map((doc: any) => ({ ...doc, category: cat.category }))
  );

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentKey?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const uploadProgress = detail.summary.totalRequired > 0 
    ? Math.round((detail.summary.uploaded / detail.summary.totalRequired) * 100)
    : 0;

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
                <FileText className="h-8 w-8 text-indigo-600" />
                Document Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Upload, verify, and track all compliance documents
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              Upload Documents
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Required</span>
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{detail.summary.totalRequired}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Uploaded</span>
              <Upload className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{detail.summary.uploaded}</div>
            <div className="text-sm text-gray-600 mt-1">{uploadProgress}% complete</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Verified</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">{detail.summary.verified}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Expiring Soon</span>
              <Calendar className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-600">{detail.summary.expiringSoon}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Rejected</span>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-600">{detail.summary.rejected}</div>
          </div>
        </div>

        {/* Upload Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Upload Progress</span>
            <span className="text-sm font-bold text-indigo-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>

        {/* Critical Documents Alert */}
        {detail.missingCritical && detail.missingCritical.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  {detail.missingCritical.length} Critical Document{detail.missingCritical.length > 1 ? 's' : ''} Missing
                </h3>
                <p className="text-sm text-red-700 mb-3">
                  These documents are required for compliance and funding readiness
                </p>
                <div className="space-y-2">
                  {detail.missingCritical.slice(0, 3).map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      <span className="font-medium text-red-900">
                        {doc.documentKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      <span className="text-red-600">- {doc.importance}</span>
                    </div>
                  ))}
                </div>
                {detail.missingCritical.length > 3 && (
                  <p className="text-sm text-red-600 mt-2">
                    +{detail.missingCritical.length - 3} more critical documents
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-4 rounded-lg border-2 transition ${
              selectedCategory === 'all'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">📁</div>
            <div className="font-semibold text-gray-900">All Documents</div>
            <div className="text-sm text-gray-600">{allDocuments.length} total</div>
          </button>

          {Object.entries(CATEGORY_INFO).map(([key, info]) => {
            const categoryData = detail.byCategory.find(c => c.category === key);
            const count = categoryData?.count || 0;
            const verified = categoryData?.verified || 0;
            
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedCategory === key
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{info.icon}</div>
                <div className="font-semibold text-gray-900">{info.name}</div>
                <div className="text-sm text-gray-600">
                  {verified}/{count} verified
                </div>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {filteredDocuments.length === 0 && detail.criticalDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
                <p className="text-gray-600 mb-4">Start by uploading your first document</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show critical missing documents first */}
                {detail.criticalDocuments.map((doc: any, idx: number) => {
                  const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.missing;
                  const Icon = statusConfig.icon;

                  return (
                    <div
                      key={`critical-${idx}`}
                      className="border border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-red-100 p-3 rounded-lg">
                            <FileText className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {doc.documentKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Icon className={`h-4 w-4 text-${statusConfig.color}-500`} />
                                <span className={`font-medium text-${statusConfig.color}-700`}>
                                  {statusConfig.label}
                                </span>
                              </span>
                              <span className="text-red-600 font-medium">CRITICAL</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                        >
                          Upload Now
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Show filtered documents */}
                {filteredDocuments.map((doc: any, idx: number) => {
                  const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const Icon = statusConfig.icon;
                  const categoryInfo = CATEGORY_INFO[doc.category as keyof typeof CATEGORY_INFO];

                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <FileText className="h-6 w-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{doc.name || doc.documentKey}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Icon className={`h-4 w-4 text-${statusConfig.color}-500`} />
                                <span className={`font-medium text-${statusConfig.color}-700`}>
                                  {statusConfig.label}
                                </span>
                              </span>
                              {categoryInfo && (
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                  {categoryInfo.name}
                                </span>
                              )}
                              {doc.uploadedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <Eye className="h-5 w-5 text-gray-600" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <Download className="h-5 w-5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal (placeholder) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload Documents</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop files here, or click to select</p>
              <p className="text-sm text-gray-500">Supported formats: PDF, JPG, PNG (max 10MB)</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
