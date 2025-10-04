import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusStyle, getPlanGradient } from '@/lib/theme-utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Shield, 
  Zap, 
  Star,
  CheckCircle, 
  Users, 
  Clock,
  PhoneCall,
  FileText,
  BarChart3,
  Calculator,
  CreditCard,
  Calendar,
  Gift,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { RetainershipPlan, UserRetainershipSubscription } from '@shared/schema';

interface RetainershipPlanWithMetrics extends RetainershipPlan {
  popularRank: number;
  savingsPercent: number;
  estimatedMonthlySavings: number;
  averageServicesUsed: number;
  customerSatisfaction: number;
}

interface SubscriptionMetrics {
  currentPlan?: UserRetainershipSubscription;
  monthlyUsage: number;
  totalSavings: number;
  servicesIncluded: number;
  servicesUsed: number;
  billingHistory: any[];
  nextBillingAmount: number;
  nextBillingDate: string;
}

const RetainershipPlans = () => {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch retainership plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<RetainershipPlanWithMetrics[]>({
    queryKey: ['/api/retainership-plans'],
  });

  // Fetch current subscription metrics
  const { data: subscriptionMetrics } = useQuery<SubscriptionMetrics>({
    queryKey: ['/api/user-subscription-metrics'],
  });

  // Subscribe to plan mutation
  const subscribeToPlanMutation = useMutation({
    mutationFn: ({ planId, cycle }: { planId: string; cycle: 'monthly' | 'yearly' }) =>
      apiRequest('POST', '/api/subscribe-to-plan', { planId, billingCycle: cycle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-subscription-metrics'] });
      toast({
        title: "Subscription Activated",
        description: "Your retainership plan has been activated successfully.",
      });
    },
  });

  // Upgrade/downgrade plan mutation
  const changePlanMutation = useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      apiRequest('POST', '/api/change-subscription-plan', { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-subscription-metrics'] });
      toast({
        title: "Plan Updated",
        description: "Your subscription plan has been updated successfully.",
      });
    },
  });

  const getPlanIcon = (category: string) => {
    switch (category) {
      case 'basic': return <Shield className="h-6 w-6" />;
      case 'standard': return <Star className="h-6 w-6" />;
      case 'premium': return <Crown className="h-6 w-6" />;
      case 'enterprise': return <Sparkles className="h-6 w-6" />;
      default: return <Shield className="h-6 w-6" />;
    }
  };

  const getPlanGradient = (category: string) => {
    switch (category) {
      case 'basic': return 'from-blue-500 to-blue-600';
      case 'standard': return 'from-purple-500 to-purple-600';
      case 'premium': return 'from-yellow-500 to-orange-500';
      case 'enterprise': return 'from-pink-500 to-rose-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const formatPrice = (price: number, cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      return Math.round(price * 12 * 0.85); // 15% yearly discount
    }
    return price;
  };

  const calculateYearlySavings = (monthlyPrice: number) => {
    const yearlyPrice = monthlyPrice * 12 * 0.85;
    const monthlySavings = (monthlyPrice * 12) - yearlyPrice;
    return Math.round(monthlySavings);
  };

  if (plansLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="space-y-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Retainership Plans</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Choose a retainership plan that fits your business needs. Save money, get priority support, 
          and enjoy seamless compliance management with predictable monthly costs.
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscriptionMetrics?.currentPlan && (
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-full shadow">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Current Plan: {plans.find(p => p.planId === subscriptionMetrics.currentPlan?.planId)?.name}
                  </h3>
                  <p className="text-gray-600">
                    Next billing: {subscriptionMetrics.nextBillingDate} • ₹{subscriptionMetrics.nextBillingAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  ₹{subscriptionMetrics.totalSavings.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Savings</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Services Used This Month</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{subscriptionMetrics.servicesUsed}</span>
                  <span className="text-gray-500">/ {subscriptionMetrics.servicesIncluded}</span>
                </div>
                <Progress 
                  value={(subscriptionMetrics.servicesUsed / subscriptionMetrics.servicesIncluded) * 100} 
                  className="mt-2"
                />
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Monthly Usage</p>
                <p className="text-2xl font-bold">₹{subscriptionMetrics.monthlyUsage.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-green-600">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-lg ${billingCycle === 'monthly' ? 'font-semibold' : 'text-gray-500'}`}>
          Monthly
        </span>
        <Switch
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <span className={`text-lg ${billingCycle === 'yearly' ? 'font-semibold' : 'text-gray-500'}`}>
          Yearly
        </span>
        {billingCycle === 'yearly' && (
          <Badge className={`${getStatusStyle('active')} ml-2`}>
            <Gift className="h-3 w-3 mr-1" />
            Save up to 15%
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrentPlan = subscriptionMetrics?.currentPlan?.planId === plan.planId;
          const price = formatPrice(plan.monthlyFee, billingCycle);
          const yearlySavings = calculateYearlySavings(plan.monthlyFee);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                isCurrentPlan ? 'ring-2 ring-green-500' : ''
              } ${plan.category === 'premium' ? 'border-2 border-yellow-400' : ''}`}
            >
              {plan.category === 'premium' && (
                <div className="absolute top-4 right-4">
                  <Badge className={getStatusStyle('official')}>
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-4 left-4">
                  <Badge className={getStatusStyle('active')}>
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className={`bg-gradient-to-r ${getPlanGradient(plan.category)} text-white`}>
                <div className="flex items-center gap-3">
                  {getPlanIcon(plan.category)}
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-white/80">
                      {plan.category.charAt(0).toUpperCase() + plan.category.slice(1)} Plan
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">₹{price.toLocaleString()}</span>
                    <span className="text-gray-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      Save ₹{yearlySavings.toLocaleString()} annually
                    </p>
                  )}
                  {(plan.discountPercentage || 0) > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {plan.discountPercentage}% discount on all services
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {(plan.features as string[]).slice(0, 5).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-lg font-bold">{plan.maxServices || '∞'}</p>
                    <p className="text-xs text-gray-600">Services/Month</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-lg font-bold">{plan.customerSatisfaction || 95}%</p>
                    <p className="text-xs text-gray-600">Satisfaction</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.dedicatedSupport && (
                    <div className="flex items-center gap-2 text-sm">
                      <PhoneCall className="h-4 w-4 text-blue-500" />
                      <span>Dedicated Support</span>
                    </div>
                  )}
                  {plan.priorityHandling && (
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Priority Processing</span>
                    </div>
                  )}
                  {plan.customReporting && (
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <span>Custom Reports</span>
                    </div>
                  )}
                </div>

                {isCurrentPlan ? (
                  <Button disabled className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Current Plan
                  </Button>
                ) : subscriptionMetrics?.currentPlan ? (
                  <Button
                    className="w-full"
                    variant={plan.category === 'premium' ? 'default' : 'outline'}
                    onClick={() => changePlanMutation.mutate({ planId: plan.planId })}
                    disabled={changePlanMutation.isPending}
                  >
                    {changePlanMutation.isPending ? 'Processing...' : 'Switch Plan'}
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${plan.category === 'premium' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : ''}`}
                    variant={plan.category === 'premium' ? 'default' : 'outline'}
                    onClick={() => subscribeToPlanMutation.mutate({ planId: plan.planId, cycle: billingCycle })}
                    disabled={subscribeToPlanMutation.isPending}
                  >
                    {subscribeToPlanMutation.isPending ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Plan Comparison</TabsTrigger>
          <TabsTrigger value="calculator">Savings Calculator</TabsTrigger>
          <TabsTrigger value="billing">Billing Management</TabsTrigger>
        </TabsList>

        {/* Plan Comparison */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Plan Comparison</CardTitle>
              <CardDescription>
                Compare all features and benefits across different retainership plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Features</th>
                      {plans.map((plan) => (
                        <th key={plan.id} className="text-center p-4 font-semibold">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Monthly Services</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.maxServices || 'Unlimited'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Service Discount</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.discountPercentage}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Dedicated Support</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.dedicatedSupport ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Priority Processing</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.priorityHandling ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Custom Reporting</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.customReporting ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings Calculator */}
        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Retainership Savings Calculator
              </CardTitle>
              <CardDescription>
                Calculate potential savings with different retainership plans based on your usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Estimated Monthly Usage</h3>
                  
                  <div className="space-y-3">
                    {[
                      { service: 'GST Return Filing', price: 2500, quantity: 1 },
                      { service: 'TDS Return Filing', price: 1500, quantity: 1 },
                      { service: 'Income Tax Filing', price: 3500, quantity: 1 },
                      { service: 'Payroll Processing', price: 2000, quantity: 1 },
                      { service: 'Compliance Consulting', price: 1000, quantity: 2 }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <span>{item.service}</span>
                        <span className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold">
                      <span>Total Monthly Cost</span>
                      <span>₹10,500</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Savings with Retainership Plans</h3>
                  
                  <div className="space-y-3">
                    {plans.slice(0, 3).map((plan) => {
                      const monthlyCost = 10500;
                      const planCost = plan.monthlyFee;
                      const discount = plan.discountPercentage || 0;
                      const discountedCost = monthlyCost * (1 - discount / 100);
                      const totalCost = planCost + discountedCost;
                      const savings = monthlyCost - totalCost;
                      const savingsPercent = Math.round((savings / monthlyCost) * 100);
                      
                      return (
                        <div key={plan.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{plan.name}</h4>
                            <Badge variant={savings > 0 ? 'default' : 'secondary'}>
                              {savings > 0 ? `Save ${savingsPercent}%` : 'No savings'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Plan Cost:</span>
                              <span>₹{planCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Service Cost ({discount}% off):</span>
                              <span>₹{discountedCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-1">
                              <span>Total Cost:</span>
                              <span>₹{totalCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-green-600">
                              <span>Monthly Savings:</span>
                              <span>₹{savings > 0 ? savings.toLocaleString() : '0'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Management */}
        <TabsContent value="billing">
          {subscriptionMetrics?.currentPlan ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Current Plan</p>
                      <p className="font-semibold">
                        {plans.find(p => p.planId === subscriptionMetrics.currentPlan?.planId)?.name}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Next Billing Date</p>
                      <p className="font-semibold">{subscriptionMetrics.nextBillingDate}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Next Amount</p>
                      <p className="font-semibold">₹{subscriptionMetrics.nextBillingAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Billing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { date: '2024-01-01', amount: 5000, status: 'Paid' },
                      { date: '2023-12-01', amount: 5000, status: 'Paid' },
                      { date: '2023-11-01', amount: 5000, status: 'Paid' },
                    ].map((bill, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{bill.date}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">₹{bill.amount.toLocaleString()}</span>
                          <Badge className={getStatusStyle(bill.status.toLowerCase())}>{bill.status}</Badge>
                          <Button variant="outline" size="sm">
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-4">
                  Subscribe to a retainership plan to access billing management features.
                </p>
                <Button>View Plans</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RetainershipPlans;