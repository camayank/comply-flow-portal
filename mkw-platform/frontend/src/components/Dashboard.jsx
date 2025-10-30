import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, Building, Target, TrendingUp, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Activity, Award
} from 'lucide-react';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    accountStats: {},
    opportunityStats: {},
    accountIndustries: [],
    opportunityTrend: [],
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [accountStatsRes, opportunityStatsRes] = await Promise.all([
        axios.get('/api/v1/accounts/stats/dashboard'),
        axios.get('/api/v1/opportunities/stats/dashboard')
      ]);

      setDashboardData({
        accountStats: accountStatsRes.data.data.summary,
        opportunityStats: opportunityStatsRes.data.data.summary,
        accountIndustries: accountStatsRes.data.data.industryBreakdown,
        opportunityTrend: opportunityStatsRes.data.data.monthlyTrend,
        recentActivities: accountStatsRes.data.data.recentAccounts
      });
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your business performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Accounts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.accountStats.total_accounts)}
              </p>
              <div className="flex items-center mt-2">
                <ArrowUpRight size={16} className="text-green-500 mr-1" />
                <span className="text-sm text-green-600 font-medium">
                  +{formatNumber(dashboardData.accountStats.new_accounts)} this month
                </span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Building size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.opportunityStats.pipeline_value)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp size={16} className="text-green-500 mr-1" />
                <span className="text-sm text-green-600 font-medium">
                  {parseFloat(dashboardData.opportunityStats.average_probability || 0).toFixed(1)}% avg probability
                </span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Open Opportunities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Opportunities</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.opportunityStats.open_opportunities)}
              </p>
              <div className="flex items-center mt-2">
                <Target size={16} className="text-blue-500 mr-1" />
                <span className="text-sm text-blue-600 font-medium">
                  {parseFloat(dashboardData.opportunityStats.win_rate || 0).toFixed(1)}% win rate
                </span>
              </div>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Target size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Revenue Won */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Won</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.opportunityStats.won_value)}
              </p>
              <div className="flex items-center mt-2">
                <Award size={16} className="text-purple-500 mr-1" />
                <span className="text-sm text-purple-600 font-medium">
                  {formatNumber(dashboardData.opportunityStats.won_opportunities)} deals closed
                </span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Award size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <div className="text-sm text-gray-500">Monthly closed deals</div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={dashboardData.opportunityTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short' })}
                  className="text-sm"
                />
                <YAxis 
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  className="text-sm"
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  className="bg-white shadow-lg border border-gray-200 rounded-lg"
                />
                <Area 
                  type="monotone" 
                  dataKey="won_value" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Industry Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Accounts by Industry</h3>
            <div className="text-sm text-gray-500">Top industries</div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={dashboardData.accountIndustries.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ industry, account_count }) => `${industry} (${account_count})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="account_count"
                >
                  {dashboardData.accountIndustries.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value, 'Accounts']}
                  className="bg-white shadow-lg border border-gray-200 rounded-lg"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Pipeline Overview</h3>
            <button 
              onClick={() => window.location.href = '/opportunities'}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </button>
          </div>
          
          <div className="space-y-4">
            {['prospecting', 'qualification', 'proposal', 'negotiation'].map((stage) => {
              const stageData = dashboardData.opportunityTrend.find(s => s.stage === stage) || { count: 0, total_amount: 0 };
              const percentage = dashboardData.opportunityStats.total_opportunities > 0 
                ? (stageData.count / dashboardData.opportunityStats.total_opportunities * 100)
                : 0;
              
              return (
                <div key={stage} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {stage.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {stageData.count} opportunities
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(stageData.total_amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Activity size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {dashboardData.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full">
                  <Building size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.account_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    New account added
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(activity.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
            
            {dashboardData.recentActivities.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/accounts'}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building size={20} className="mr-2 text-blue-600" />
            <span className="text-gray-700">New Account</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/opportunities'}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target size={20} className="mr-2 text-green-600" />
            <span className="text-gray-700">New Opportunity</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/contacts'}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users size={20} className="mr-2 text-purple-600" />
            <span className="text-gray-700">New Contact</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/leads'}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp size={20} className="mr-2 text-orange-600" />
            <span className="text-gray-700">New Lead</span>
          </button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {parseFloat(dashboardData.accountStats.avg_health_score || 0).toFixed(1)}
            </div>
            <div className="text-blue-100 mt-1">Average Account Health</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold">
              {parseFloat(dashboardData.opportunityStats.win_rate || 0).toFixed(1)}%
            </div>
            <div className="text-blue-100 mt-1">Win Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold">
              {formatNumber(dashboardData.opportunityStats.recently_won)}
            </div>
            <div className="text-blue-100 mt-1">Recently Won Deals</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;