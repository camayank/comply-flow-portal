import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Search, Filter, MoreVertical, Target, Calendar, 
  DollarSign, User, Building, TrendingUp, List, LayoutGrid 
} from 'lucide-react';

const OpportunityManagement = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [pipelineData, setPipelineData] = useState({ pipeline: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'list'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    stage: '',
    accountId: '',
    owner: '',
    forecastCategory: ''
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 20
  });

  const [newOpportunity, setNewOpportunity] = useState({
    name: '',
    accountId: '',
    amount: '',
    probability: 10,
    closeDate: '',
    stage: 'prospecting',
    opportunityType: 'new_business',
    description: '',
    nextStep: '',
    forecastCategory: 'pipeline'
  });

  useEffect(() => {
    if (viewMode === 'pipeline') {
      fetchPipelineData();
    } else {
      fetchOpportunities();
    }
    fetchAccounts();
  }, [viewMode, filters, pagination.currentPage]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const config = {
        params: {
          ...filters,
          page: pagination.currentPage,
          limit: pagination.limit
        }
      };

      const response = await axios.get('/api/v1/opportunities', config);
      setOpportunities(response.data.data.opportunities);
      setPagination(prev => ({
        ...prev,
        ...response.data.data.pagination
      }));
      setError(null);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setError('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/opportunities/pipeline');
      setPipelineData(response.data.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      setError('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/v1/accounts', { 
        params: { limit: 100 } 
      });
      setAccounts(response.data.data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleCreateOpportunity = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/opportunities', newOpportunity);
      setShowCreateModal(false);
      setNewOpportunity({
        name: '',
        accountId: '',
        amount: '',
        probability: 10,
        closeDate: '',
        stage: 'prospecting',
        opportunityType: 'new_business',
        description: '',
        nextStep: '',
        forecastCategory: 'pipeline'
      });
      
      if (viewMode === 'pipeline') {
        fetchPipelineData();
      } else {
        fetchOpportunities();
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      prospecting: 'bg-gray-100 text-gray-800 border-gray-200',
      qualification: 'bg-blue-100 text-blue-800 border-blue-200',
      proposal: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      negotiation: 'bg-orange-100 text-orange-800 border-orange-200',
      closed_won: 'bg-green-100 text-green-800 border-green-200',
      closed_lost: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const PipelineView = () => (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {pipelineData.summary.total_opportunities || 0}
            </div>
            <div className="text-blue-100">Total Opportunities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatCurrency(pipelineData.summary.total_pipeline_value)}
            </div>
            <div className="text-blue-100">Pipeline Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatCurrency(pipelineData.summary.weighted_pipeline_value)}
            </div>
            <div className="text-blue-100">Weighted Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {parseFloat(pipelineData.summary.average_probability || 0).toFixed(1)}%
            </div>
            <div className="text-blue-100">Avg Probability</div>
          </div>
        </div>
      </div>

      {/* Kanban Pipeline */}
      <div className="overflow-x-auto">
        <div className="flex space-x-6 min-w-max pb-6">
          {['prospecting', 'qualification', 'proposal', 'negotiation'].map((stage) => {
            const stageData = pipelineData.pipeline.find(s => s.stage === stage) || {
              opportunities: [],
              opportunity_count: 0,
              total_amount: 0
            };
            
            return (
              <div key={stage} className="bg-white rounded-xl border border-gray-200 w-80 flex-shrink-0">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {stage.replace('_', ' ')}
                    </h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                      {stageData.opportunity_count}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(stageData.total_amount)}
                  </p>
                </div>
                
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {(stageData.opportunities || []).map((opp) => (
                    <div key={opp.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {opp.name}
                        </h4>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-600">
                          <Building size={12} className="mr-1" />
                          <span className="truncate">{opp.account_name}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-green-600 text-sm">
                            {formatCurrency(opp.amount)}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {opp.probability}%
                          </span>
                        </div>
                        
                        {opp.close_date && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar size={12} className="mr-1" />
                            <span>{new Date(opp.close_date).toLocaleDateString('en-IN')}</span>
                          </div>
                        )}
                        
                        {opp.owner_name && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User size={12} className="mr-1" />
                            <span className="truncate">{opp.owner_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {stageData.opportunities?.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Target size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No opportunities in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const ListView = () => (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              <option value="prospecting">Prospecting</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
            <select
              value={filters.accountId}
              onChange={(e) => setFilters(prev => ({ ...prev, accountId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                search: '',
                stage: '',
                accountId: '',
                owner: '',
                forecastCategory: ''
              })}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Opportunity</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Account</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Stage</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Amount</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Probability</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Close Date</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Owner</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center p-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : opportunities.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-8">
                  <Target size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No opportunities found</p>
                </td>
              </tr>
            ) : (
              opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900">{opportunity.name}</div>
                      {opportunity.description && (
                        <div className="text-sm text-gray-500 truncate">{opportunity.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{opportunity.account_name}</div>
                    {opportunity.account_industry && (
                      <div className="text-sm text-gray-500">{opportunity.account_industry}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStageColor(opportunity.stage)}`}>
                      {opportunity.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(opportunity.amount)}
                    </div>
                    {opportunity.weighted_amount && (
                      <div className="text-sm text-gray-500">
                        Weighted: {formatCurrency(opportunity.weighted_amount)}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${opportunity.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {opportunity.probability}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {opportunity.close_date ? (
                      <div className="text-sm text-gray-900">
                        {new Date(opportunity.close_date).toLocaleDateString('en-IN')}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-900">{opportunity.owner_name || 'Unassigned'}</div>
                  </td>
                  <td className="p-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination for List View */}
      {viewMode === 'list' && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 p-6">
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunity Management</h1>
          <p className="text-gray-600">Manage your sales pipeline and deals</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'pipeline' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={16} className="inline mr-1" />
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={16} className="inline mr-1" />
              List
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Content */}
      {viewMode === 'pipeline' ? <PipelineView /> : <ListView />}

      {/* Create Opportunity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Create New Opportunity</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opportunity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOpportunity.name}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter opportunity name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account *
                  </label>
                  <select
                    required
                    value={newOpportunity.accountId}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newOpportunity.amount}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Probability (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={newOpportunity.probability}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, probability: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600 mt-1">
                    {newOpportunity.probability}%
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={newOpportunity.closeDate}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, closeDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage
                  </label>
                  <select
                    value={newOpportunity.stage}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, stage: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="prospecting">Prospecting</option>
                    <option value="qualification">Qualification</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newOpportunity.description}
                  onChange={(e) => setNewOpportunity(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Opportunity description and details..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityManagement;