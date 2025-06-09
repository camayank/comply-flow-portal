import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Shield, FileText, Calendar, Zap } from 'lucide-react';

interface ComplianceItem {
  id: string;
  name: string;
  status: 'completed' | 'pending' | 'overdue' | 'upcoming';
  dueDate: string;
  penaltyRisk: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}

interface UpsellOpportunity {
  id: string;
  service: string;
  reason: string;
  benefit: string;
  discount: number;
  price: number;
  urgency: 'low' | 'medium' | 'high';
}

const UnifiedComplianceDashboard = () => {
  const [selectedView, setSelectedView] = useState<'heatmap' | 'timeline' | 'health'>('heatmap');

  // Sample compliance data with penalty risk
  const complianceItems: ComplianceItem[] = [
    {
      id: 'gstr3b',
      name: 'GSTR-3B Filing',
      status: 'overdue',
      dueDate: '2025-01-20',
      penaltyRisk: 25000,
      priority: 'critical',
      category: 'GST',
      description: 'Monthly GST return filing'
    },
    {
      id: 'tds',
      name: 'TDS Return Filing',
      status: 'pending',
      dueDate: '2025-01-31',
      penaltyRisk: 15000,
      priority: 'high',
      category: 'Income Tax',
      description: 'Quarterly TDS return'
    },
    {
      id: 'adt1',
      name: 'ADT-1 Filing',
      status: 'upcoming',
      dueDate: '2025-02-15',
      penaltyRisk: 50000,
      priority: 'high',
      category: 'MCA',
      description: 'Appointment of first auditor'
    },
    {
      id: 'roc',
      name: 'ROC Annual Filing',
      status: 'completed',
      dueDate: '2024-12-30',
      penaltyRisk: 0,
      priority: 'medium',
      category: 'MCA',
      description: 'Annual ROC compliance'
    }
  ];

  // AI-powered contextual upsells
  const upsellOpportunities: UpsellOpportunity[] = [
    {
      id: 'msme-upsell',
      service: 'MSME Registration',
      reason: 'You have GST services - get 50% GST discount with MSME!',
      benefit: 'Save ₹45,000 annually on GST payments',
      discount: 30,
      price: 999,
      urgency: 'high'
    },
    {
      id: 'esi-pf',
      service: 'ESI & PF Registration',
      reason: 'Your employee count suggests compliance requirement',
      benefit: 'Avoid ₹25,000 penalty for delayed registration',
      discount: 20,
      price: 2499,
      urgency: 'medium'
    }
  ];

  const calculateComplianceHealth = () => {
    const total = complianceItems.length;
    const completed = complianceItems.filter(item => item.status === 'completed').length;
    const overdue = complianceItems.filter(item => item.status === 'overdue').length;
    
    const baseScore = (completed / total) * 100;
    const penaltyDeduction = overdue * 15; // 15 points deduction per overdue item
    
    return Math.max(0, Math.round(baseScore - penaltyDeduction));
  };

  const getTotalPenaltyRisk = () => {
    return complianceItems
      .filter(item => item.status === 'overdue' || item.status === 'pending')
      .reduce((sum, item) => sum + item.penaltyRisk, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const formatIndianRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const complianceHealth = calculateComplianceHealth();
  const totalPenaltyRisk = getTotalPenaltyRisk();

  return (
    <div className="space-y-6">
      {/* Compliance Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Compliance Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                <span className={`${complianceHealth >= 80 ? 'text-green-600' : complianceHealth >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {complianceHealth}
                </span>
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <Progress value={complianceHealth} className="mb-2" />
              <p className="text-sm text-gray-600">
                {complianceHealth >= 80 ? 'Excellent' : complianceHealth >= 60 ? 'Good' : 'Needs Attention'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Penalty Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatIndianRupees(totalPenaltyRisk)}
              </div>
              <p className="text-sm text-gray-600">
                {complianceItems.filter(item => item.status === 'overdue' || item.status === 'pending').length} items at risk
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Next Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                5 days
              </div>
              <p className="text-sm text-gray-600">GSTR-3B Filing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedView === 'heatmap' ? 'default' : 'outline'}
          onClick={() => setSelectedView('heatmap')}
          size="sm"
        >
          Risk Heatmap
        </Button>
        <Button
          variant={selectedView === 'timeline' ? 'default' : 'outline'}
          onClick={() => setSelectedView('timeline')}
          size="sm"
        >
          Timeline View
        </Button>
        <Button
          variant={selectedView === 'health' ? 'default' : 'outline'}
          onClick={() => setSelectedView('health')}
          size="sm"
        >
          Health Metrics
        </Button>
      </div>

      {/* Penalty Risk Heatmap */}
      {selectedView === 'heatmap' && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Risk Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complianceItems.map((item) => (
                <Card key={item.id} className={`${getPriorityColor(item.priority)} transition-all hover:shadow-md`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Due Date:</span>
                        <span className="font-medium">{item.dueDate}</span>
                      </div>
                      
                      {item.penaltyRisk > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Penalty Risk:</span>
                          <span className="font-medium text-red-600">
                            {formatIndianRupees(item.penaltyRisk)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span>Category:</span>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contextual Upsell Opportunities */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upsellOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-green-800">{opportunity.service}</h3>
                  <Badge className="bg-green-600 text-white">
                    {opportunity.discount}% OFF
                  </Badge>
                </div>
                
                <p className="text-sm text-green-700 mb-2">{opportunity.reason}</p>
                <p className="text-sm font-medium text-green-800 mb-3">{opportunity.benefit}</p>
                
                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold text-green-600">
                    {formatIndianRupees(opportunity.price)}
                    <span className="text-sm text-gray-500 ml-2">+ 18% GST</span>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Add for {formatIndianRupees(opportunity.price)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedComplianceDashboard;