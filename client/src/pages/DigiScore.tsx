import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Award,
  Target,
} from "lucide-react";

export default function DigiScore() {
  const [selectedClient, setSelectedClient] = useState("1");

  // Mock data - in production would come from API
  const scoreData = {
    overallScore: 87,
    previousScore: 82,
    scoreChange: 5,
    grade: "A",
    rank: "Excellent",
    categories: [
      { name: "GST Compliance", score: 92, maxScore: 100, status: "excellent", weight: 30 },
      { name: "TDS Compliance", score: 88, maxScore: 100, status: "good", weight: 25 },
      { name: "ROC Filings", score: 85, maxScore: 100, status: "good", weight: 20 },
      { name: "ITR Filings", score: 90, maxScore: 100, status: "excellent", weight: 15 },
      { name: "PF/ESI Compliance", score: 75, maxScore: 100, status: "fair", weight: 10 },
    ],
    riskFactors: [
      { title: "Pending GST Returns", impact: "Medium", count: 0, status: "resolved" },
      { title: "Delayed ROC Filings", impact: "High", count: 1, status: "active" },
      { title: "TDS Payment Delays", impact: "Low", count: 0, status: "resolved" },
    ],
    recommendations: [
      {
        title: "File Annual ROC Returns",
        description: "Complete your Form AOC-4 and MGT-7 filing to avoid penalties",
        priority: "high",
        estimatedImpact: "+8 points",
      },
      {
        title: "Update PF/ESI Records",
        description: "Ensure monthly PF/ESI filings are up to date",
        priority: "medium",
        estimatedImpact: "+5 points",
      },
      {
        title: "Enable Auto-Reminders",
        description: "Set up automated deadline reminders for all filings",
        priority: "low",
        estimatedImpact: "+3 points",
      },
    ],
    timeline: [
      { month: "Jan", score: 78 },
      { month: "Feb", score: 80 },
      { month: "Mar", score: 79 },
      { month: "Apr", score: 82 },
      { month: "May", score: 84 },
      { month: "Jun", score: 87 },
    ],
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeBadgeColor = (grade: string) => {
    if (grade === "A") return "bg-green-500";
    if (grade === "B") return "bg-blue-500";
    if (grade === "C") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusColor = (status: string) => {
    if (status === "excellent") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (status === "good") return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (status === "fair") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">DigiScore</h1>
              <p className="text-muted-foreground">Automated Compliance Health Score Engine</p>
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

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Overall Compliance Score</CardTitle>
              <CardDescription>Your comprehensive compliance health rating</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-6xl font-bold ${getScoreColor(scoreData.overallScore)}`}>
                      {scoreData.overallScore}
                    </span>
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {scoreData.scoreChange > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {scoreData.scoreChange > 0 ? '+' : ''}{scoreData.scoreChange} points from last month
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <Badge className={`${getGradeBadgeColor(scoreData.grade)} text-white text-2xl px-6 py-3 mb-2`}>
                    Grade {scoreData.grade}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{scoreData.rank}</p>
                </div>
              </div>
              <Progress value={scoreData.overallScore} className="h-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Previous Score</span>
                <span className="font-semibold">{scoreData.previousScore}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Score</span>
                <span className="font-semibold text-green-600">{scoreData.overallScore}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Score Change</span>
                <span className="font-semibold text-green-600">
                  +{scoreData.scoreChange} pts
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm">Target Score</span>
                <span className="font-semibold">95</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Points to Target</span>
                <span className="font-semibold text-blue-600">+8 pts</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">Score Categories</TabsTrigger>
            <TabsTrigger value="risks">Risk Factors</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="trends">Score Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Category Scores</CardTitle>
                <CardDescription>
                  Breakdown of your compliance score across different categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {scoreData.categories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-semibold">{category.name}</h4>
                            <p className="text-sm text-muted-foreground">Weight: {category.weight}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(category.status)}>
                            {category.status}
                          </Badge>
                          <span className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                            {category.score}
                          </span>
                        </div>
                      </div>
                      <Progress value={category.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks">
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors & Alerts</CardTitle>
                <CardDescription>
                  Potential compliance risks affecting your score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scoreData.riskFactors.map((risk, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        risk.status === 'active' ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : 'bg-green-50 border-green-200 dark:bg-green-900/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          {risk.status === 'active' ? (
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-semibold">{risk.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Impact: {risk.impact} • Count: {risk.count}
                            </p>
                          </div>
                        </div>
                        <Badge variant={risk.status === 'active' ? 'destructive' : 'default'}>
                          {risk.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>Score Improvement Recommendations</CardTitle>
                <CardDescription>
                  Actions you can take to improve your compliance score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scoreData.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <Badge
                              variant={
                                rec.priority === 'high'
                                  ? 'destructive'
                                  : rec.priority === 'medium'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">
                              {rec.estimatedImpact}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" data-testid={`button-action-${index}`}>
                          Take Action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Score Trends</CardTitle>
                <CardDescription>Your compliance score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="h-64 flex items-end justify-between gap-2">
                    {scoreData.timeline.map((point, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-primary rounded-t" style={{ height: `${point.score * 2.5}px` }} />
                        <span className="text-sm font-semibold">{point.score}</span>
                        <span className="text-xs text-muted-foreground">{point.month}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">+9</p>
                      <p className="text-sm text-muted-foreground">Points gained (6 months)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">87</p>
                      <p className="text-sm text-muted-foreground">Current Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">95</p>
                      <p className="text-sm text-muted-foreground">Target Score</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
