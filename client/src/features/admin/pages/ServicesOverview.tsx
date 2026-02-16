/**
 * ADMIN SERVICES OVERVIEW
 *
 * Administrative dashboard for managing 96+ services:
 * - View all services with stats
 * - Configure service details
 * - Monitor service performance
 * - Manage workflow configurations
 *
 * Access: ADMIN, SUPER_ADMIN only
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from '@/layouts';
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Settings,
  BarChart3,
  CheckCircle2,
  XCircle,
  Edit,
  Workflow,
  FileText,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Activity,
  Filter,
  Download,
  Upload
} from "lucide-react";

// Stats Card
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

// Service Edit Dialog
function ServiceEditDialog({
  service,
  open,
  onClose,
  onSave
}: {
  service: any;
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    category: service?.category || '',
    periodicity: service?.periodicity || 'ONE_TIME',
    description: service?.description || '',
    is_active: service?.isActive ?? true
  });

  const handleSave = () => {
    onSave({
      id: service?.id,
      service_key: service?.serviceKey,
      ...formData
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{service?.id ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>
            {service?.serviceKey || 'Configure service details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., GST Registration"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Business Registration">Business Registration</SelectItem>
                <SelectItem value="Taxation">Taxation</SelectItem>
                <SelectItem value="Compliance & Regulatory">Compliance & Regulatory</SelectItem>
                <SelectItem value="Intellectual Property">Intellectual Property</SelectItem>
                <SelectItem value="Legal & Documentation">Legal & Documentation</SelectItem>
                <SelectItem value="Accounting & Bookkeeping">Accounting & Bookkeeping</SelectItem>
                <SelectItem value="incorporation">Incorporation</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="accounting">Accounting</SelectItem>
                <SelectItem value="annual">Annual Filings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Periodicity</Label>
            <Select
              value={formData.periodicity}
              onValueChange={(v) => setFormData({ ...formData, periodicity: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONE_TIME">One-Time</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="ANNUAL">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Service description..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function AdminServicesOverview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingService, setEditingService] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch services overview
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/universal/admin/services-overview']
  });

  // Save service mutation
  const saveMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const res = await fetch('/api/universal/admin/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });
      if (!res.ok) throw new Error('Failed to save service');
      return res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Service Saved",
        description: `Service ${result.action} successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/universal/admin/services-overview'] });
      setEditingService(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive"
      });
    }
  });

  const { services, byCategory, totalServices, activeServices, summary } = data || {};

  // Filter services
  const filteredServices = (services || []).filter((service: any) => {
    const matchesSearch = !searchQuery ||
      service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.serviceKey?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && service.isActive) ||
      (activeTab === "inactive" && !service.isActive) ||
      (activeTab === "unconfigured" && !service.workflowConfigured);

    return matchesSearch && matchesCategory && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services Management</h1>
          <p className="text-muted-foreground">
            Configure and monitor all {totalServices || 96}+ services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setEditingService({})}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Services"
          value={totalServices || 0}
          icon={FileText}
          color="text-gray-900"
        />
        <StatsCard
          title="Active Services"
          value={activeServices || 0}
          icon={CheckCircle2}
          color="text-green-600"
        />
        <StatsCard
          title="Total Requests"
          value={summary?.totalRequests || 0}
          subtitle="All time"
          icon={BarChart3}
          color="text-blue-600"
        />
        <StatsCard
          title="Active Requests"
          value={summary?.activeRequests || 0}
          subtitle="In progress"
          icon={Activity}
          color="text-purple-600"
        />
        <StatsCard
          title="Completed"
          value={summary?.completedRequests || 0}
          subtitle="Delivered"
          icon={TrendingUp}
          color="text-teal-600"
        />
      </div>

      {/* Category Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Services by Category</CardTitle>
          <CardDescription>Request distribution across service categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(byCategory || {}).map(([category, data]: [string, any]) => (
              <div
                key={category}
                className="text-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => setSelectedCategory(category)}
              >
                <p className="font-medium text-sm">{category}</p>
                <p className="text-2xl font-bold text-primary">{data.services?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {data.activeRequests || 0} active
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Services</CardTitle>
              <CardDescription>
                Manage service configurations and workflows
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({services?.length || 0})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeServices || 0})</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
                <TabsTrigger value="unconfigured">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unconfigured
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(byCategory || {}).map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Periodicity</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service: any) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {service.serviceKey}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.category}</Badge>
                    </TableCell>
                    <TableCell>{service.periodicity}</TableCell>
                    <TableCell>
                      {service.workflowConfigured ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {service.statusCount} statuses
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not configured
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{service.requestStats?.total || 0}</span>
                        <span className="text-muted-foreground"> total</span>
                        {service.requestStats?.active > 0 && (
                          <span className="text-blue-600 ml-2">
                            ({service.requestStats.active} active)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingService(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Link href={`/status-management?service=${service.serviceKey}`}>
                          <Button variant="ghost" size="sm">
                            <Workflow className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium">No services found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Edit Dialog */}
        {editingService !== null && (
          <ServiceEditDialog
            service={editingService}
            open={true}
            onClose={() => setEditingService(null)}
            onSave={(data) => saveMutation.mutate(data)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
