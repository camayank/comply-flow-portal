import React, { useState } from 'react';
import { TrendingUp, Plus, Search, Filter } from 'lucide-react';

const LeadManagement = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600">Capture and nurture potential customers</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus size={20} />
          <span>New Lead</span>
        </button>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Lead Management</h3>
        <p className="text-gray-600 mb-4">Advanced lead management and scoring system coming soon</p>
        <div className="text-sm text-gray-500">
          • Lead capture from multiple sources<br/>
          • Automated lead scoring and qualification<br/>
          • Lead nurturing workflows<br/>
          • Conversion tracking to opportunities
        </div>
      </div>
    </div>
  );
};

export default LeadManagement;