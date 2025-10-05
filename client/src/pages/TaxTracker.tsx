import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Calculator,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Building2,
  Lightbulb,
} from "lucide-react";

export default function TaxTracker() {
  const [selectedClient, setSelectedClient] = useState("1");
  const [calcTab, setCalcTab] = useState<"gst" | "tds">("gst");

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['/api/tax/dashboard', selectedClient],
    queryFn: () => fetch(`/api/tax/dashboard/${selectedClient}`).then(r => r.json()),
  });

  const { data: gstHistory } = useQuery({
    queryKey: ['/api/tax/gst/history', selectedClient],
    queryFn: () => fetch(`/api/tax/gst/history/${selectedClient}`).then(r => r.json()),
  });

  const { data: tdsHistory } = useQuery({
    queryKey: ['/api/tax/tds/history', selectedClient],
    queryFn: () => fetch(`/api/tax/tds/history/${selectedClient}`).then(r => r.json()),
  });

  const { data: itrStatus } = useQuery({
    queryKey: ['/api/tax/itr/status', selectedClient],
    queryFn: () => fetch(`/api/tax/itr/status/${selectedClient}`).then(r => r.json()),
  });

  const { data: calendar } = useQuery({
    queryKey: ['/api/tax/calendar'],
    queryFn: () => fetch('/api/tax/calendar').then(r => r.json()),
  });

  const { data: insights } = useQuery({
    queryKey: ['/api/tax/insights', selectedClient],
    queryFn: () => fetch(`/api/tax/insights/${selectedClient}`).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading TaxTracker...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">TaxTracker</h1>
              <p className="text-muted-foreground">AI-Driven Multi-Entity Filing Tracker</p>
            </div>
          </div>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Demo Startup Pvt Ltd</SelectItem>
              <SelectItem value="2">Tech Innovations LLP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                GST Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.gst?.status}</div>
              <p className="text-sm text-muted-foreground">Next Due: {dashboard?.gst?.nextDueDate}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                TDS Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.tds?.status}</div>
              <p className="text-sm text-muted-foreground">Next Due: {dashboard?.tds?.nextDueDate}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                ITR Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.itr?.status}</div>
              <p className="text-sm text-muted-foreground">AY: {dashboard?.itr?.assessmentYear}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboard?.summary?.overdueCompliances || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {dashboard?.summary?.upcomingDeadlines} upcoming
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="gst">GST</TabsTrigger>
            <TabsTrigger value="tds">TDS</TabsTrigger>
            <TabsTrigger value="itr">ITR</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* GST Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    GST Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">GSTIN</span>
                    <span className="text-sm font-medium">{dashboard?.gst?.gstin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Filing Frequency</span>
                    <Badge>{dashboard?.gst?.filingFrequency}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Filed</span>
                    <span className="text-sm">{dashboard?.gst?.lastFiled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Next Due</span>
                    <Badge variant="destructive">{dashboard?.gst?.nextDue}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Yearly Liability</span>
                    <span className="text-sm font-bold text-green-600">
                      ₹{dashboard?.gst?.yearlyLiability?.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* TDS Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    TDS Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">TAN</span>
                    <span className="text-sm font-medium">{dashboard?.tds?.tan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Filing Frequency</span>
                    <Badge>{dashboard?.tds?.filingFrequency}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Filed</span>
                    <span className="text-sm">{dashboard?.tds?.lastFiled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Next Due</span>
                    <Badge variant="destructive">{dashboard?.tds?.nextDue}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Quarterly Liability</span>
                    <span className="text-sm font-bold text-green-600">
                      ₹{dashboard?.tds?.quarterlyLiability?.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* ITR Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    Income Tax Return
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">PAN</span>
                    <span className="text-sm font-medium">{dashboard?.itr?.pan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Assessment Year</span>
                    <Badge>{dashboard?.itr?.assessmentYear}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Filed</span>
                    <span className="text-sm">{dashboard?.itr?.lastFiled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Next Due</span>
                    <Badge variant="destructive">{dashboard?.itr?.nextDue}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Refund Status</span>
                    <span className="text-sm font-bold text-green-600">
                      {dashboard?.itr?.refundStatus}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gst">
            <Card>
              <CardHeader>
                <CardTitle>GST Filing History</CardTitle>
                <CardDescription>Track all GST return filings and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gstHistory?.map((filing: any) => (
                    <FilingCard key={filing.id} filing={filing} type="GST" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tds">
            <Card>
              <CardHeader>
                <CardTitle>TDS Filing History</CardTitle>
                <CardDescription>Quarterly TDS return filings and deductions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tdsHistory?.map((filing: any) => (
                    <FilingCard key={filing.id} filing={filing} type="TDS" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="itr">
            <Card>
              <CardHeader>
                <CardTitle>ITR Filing Status</CardTitle>
                <CardDescription>Income Tax Return filing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Assessment Year</Label>
                    <p className="text-lg font-semibold">{itrStatus?.assessmentYear}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">ITR Type</Label>
                    <p className="text-lg font-semibold">{itrStatus?.itrType}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Filing Status</Label>
                    <Badge variant="destructive">{itrStatus?.filingStatus}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Due Date</Label>
                    <p className="text-lg font-semibold">{itrStatus?.dueDate}</p>
                  </div>
                </div>

                {itrStatus?.previousYear && (
                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                    <h3 className="font-semibold mb-2">Previous Year (AY {itrStatus.previousYear.assessmentYear})</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge className="bg-green-500">{itrStatus.previousYear.status}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Filed On:</span>
                        <span>{itrStatus.previousYear.filedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Acknowledgment:</span>
                        <span>{itrStatus.previousYear.acknowledgment}</span>
                      </div>
                      {itrStatus.previousYear.refund && (
                        <div className="flex justify-between">
                          <span>Refund:</span>
                          <span className="font-semibold text-green-600">
                            ₹{itrStatus.previousYear.refund.claimed?.toLocaleString()} ({itrStatus.previousYear.refund.status})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Tax Compliance Calendar</CardTitle>
                <CardDescription>Upcoming deadlines and filing dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calendar?.map((deadline: any, index: number) => (
                    <DeadlineCard key={index} deadline={deadline} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Tax Savings Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights?.savingsOpportunities?.map((opportunity: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{opportunity.title}</h4>
                            <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                          </div>
                          <Badge>{opportunity.category}</Badge>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          Potential Saving: ₹{opportunity.potentialSaving?.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Compliance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights?.complianceAlerts?.map((alert: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          alert.type === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <AlertCircle className={`h-5 w-5 ${alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground">Due: {alert.dueDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{insights?.statistics?.onTimeFilingRate}%</p>
                      <p className="text-sm text-muted-foreground">On-Time Filing</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{insights?.statistics?.avgRefundTime}</p>
                      <p className="text-sm text-muted-foreground">Avg Refund Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">{insights?.statistics?.taxEfficiencyScore}</p>
                      <p className="text-sm text-muted-foreground">Tax Efficiency</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">{insights?.statistics?.complianceScore}</p>
                      <p className="text-sm text-muted-foreground">Compliance Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FilingCard({ filing, type }: any) {
  const statusColors: Record<string, string> = {
    filed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-semibold">{filing.returnType || filing.form} - {filing.period || filing.quarter}</h4>
          <p className="text-sm text-muted-foreground">Due: {filing.dueDate}</p>
        </div>
        <Badge className={statusColors[filing.status]}>{filing.status}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm">
        {filing.filedDate && (
          <span className="text-muted-foreground">Filed: {filing.filedDate}</span>
        )}
        {filing.taxPayable && (
          <span className="font-semibold text-green-600">
            ₹{filing.taxPayable?.toLocaleString()}
          </span>
        )}
        {filing.totalDeduction && (
          <span className="font-semibold text-green-600">
            ₹{filing.totalDeduction?.toLocaleString()}
          </span>
        )}
      </div>
      {filing.arn && (
        <p className="text-xs text-muted-foreground mt-2">ARN: {filing.arn}</p>
      )}
    </div>
  );
}

function DeadlineCard({ deadline }: any) {
  const priorityColors: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${priorityColors[deadline.priority]}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{deadline.deadline}</h4>
          <p className="text-sm text-muted-foreground">{deadline.date}</p>
        </div>
        <Badge>{deadline.type}</Badge>
      </div>
    </div>
  );
}
