import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Download,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Activity,
  TrendingUp,
  Building,
  Plus,
  Search,
  Filter,
  Paperclip,
  Send,
  Star,
  BarChart3,
  Settings,
  Bell,
  User,
  CreditCard,
  Shield,
  Zap,
  Target,
  Users
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Entity {
  id: number;
  name: string;
  type: string;
  identifiers: any;
  active: boolean;
  created_at: string;
}

interface ServiceOrder {
  id: number;
  entity_id: number;
  service_type: string;
  status: string;
  progress_percentage: number;
  due_at: string;
  created_at: string;
  entity: Entity;
  tasks: Task[];
  documents: Document[];
  messages: Message[];
}

interface Task {
  id: number;
  name: string;
  status: string;
  type: string;
  due_at: string;
  description: string;
  checklist: any[];
}

interface Document {
  id: number;
  filename: string;
  doctype: string;
  status: string;
  created_at: string;
  file_size: number;
  rejection_reason?: string;
}

interface Message {
  id: number;
  author_id: number;
  subject: string;
  body: string;
  created_at: string;
  attachments: any[];
  is_read: boolean;
}

const UniversalClientPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [messageFilter, setMessageFilter] = useState("all");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  // Queries
  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ["/api/client/entities"],
  });

  const { data: serviceOrders = [] } = useQuery<ServiceOrder[]>({
    queryKey: ["/api/client/service-orders", selectedEntity],
    enabled: !!selectedEntity,
  });

  const { data: clientMetrics } = useQuery({
    queryKey: ["/api/client/metrics", selectedEntity],
    enabled: !!selectedEntity,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/client/notifications"],
  });

  // Mutations
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/client/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/service-orders"] });
      toast({ title: "Document uploaded successfully" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch("/api/client/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/service-orders"] });
      setNewMessage("");
      toast({ title: "Message sent successfully" });
    },
  });

  // Set default entity if none selected
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities, selectedEntity]);

  const getStatusColor = (status: string) => {
    const colors = {
      created: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
      waiting_client: "bg-orange-100 text-orange-800 border-orange-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
      on_hold: "bg-purple-100 text-purple-800 border-purple-200"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getUrgencyColor = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "text-red-600";
    if (days <= 2) return "text-orange-600";
    if (days <= 7) return "text-yellow-600";
    return "text-green-600";
  };

  const handleDocumentUpload = (serviceOrderId: number, files: FileList) => {
    if (!files.length) return;

    const formData = new FormData();
    formData.append("service_order_id", serviceOrderId.toString());
    formData.append("document", files[0]);
    formData.append("doctype", "client_upload");

    uploadDocumentMutation.mutate(formData);
  };

  const sendMessage = (serviceOrderId: number) => {
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate({
      service_order_id: serviceOrderId,
      subject: "Client Message",
      body: newMessage,
      visibility: "client"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Service Portal
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage your services and track progress
                </p>
              </div>
              {/* Entity Switcher */}
              {entities.length > 1 && (
                <Select value={selectedEntity?.toString()} onValueChange={(value) => setSelectedEntity(parseInt(value))}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span>{entity.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {entity.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <Badge className="ml-1">{notifications.length}</Badge>
                )}
              </Button>
              <Button variant="outline" size="sm">
                <User className="w-4 h-4" />
                Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Active Services
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {serviceOrders.filter(s => !["completed", "cancelled"].includes(s.status)).length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 ml-1">In Progress</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Completion Rate
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {clientMetrics?.completionRate || 0}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 ml-1">On Track</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Pending Actions
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {serviceOrders.reduce((acc, order) => 
                          acc + (order.tasks?.filter(t => t.status === "waiting_client")?.length || 0), 0
                        )}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-orange-500 ml-1">Requires Action</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Documents
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {serviceOrders.reduce((acc, order) => acc + (order.documents?.length || 0), 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-purple-500 ml-1">Secure Storage</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                          {order.service_type.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {order.entity.name}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Progress
                        </span>
                        <span className="text-sm text-gray-500">
                          {order.progress_percentage}%
                        </span>
                      </div>
                      <Progress value={order.progress_percentage} className="h-2" />
                    </div>

                    {/* Key Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Due Date:</span>
                        <span className={`font-medium ${getUrgencyColor(order.due_at)}`}>
                          {new Date(order.due_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Tasks:</span>
                        <span className="text-gray-900 dark:text-white">
                          {order.tasks?.filter(t => t.status === "completed").length || 0}/
                          {order.tasks?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Documents:</span>
                        <span className="text-gray-900 dark:text-white">
                          {order.documents?.length || 0}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedServiceOrder(order)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {order.tasks?.some(t => t.status === "waiting_client") && (
                        <Button size="sm" className="flex-1">
                          <Zap className="w-4 h-4 mr-2" />
                          Take Action
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Service Timeline & Milestones
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Request New Service
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {serviceOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                            {order.service_type.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            Started: {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {/* Task Timeline */}
                      <div className="space-y-3">
                        {order.tasks?.map((task, index) => (
                          <div key={task.id} className="flex items-center gap-4 p-3 border rounded">
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                              task.status === "completed" 
                                ? "bg-green-500" 
                                : task.status === "in_progress"
                                ? "bg-blue-500"
                                : task.status === "waiting_client"
                                ? "bg-orange-500"
                                : "bg-gray-300"
                            }`} />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {task.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                <Badge variant="outline" className="capitalize">
                                  {task.type.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Due: {new Date(task.due_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {task.status === "waiting_client" && (
                              <Button size="sm">
                                Complete
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Document Management
                  <div className="flex items-center gap-2">
                    <Select value={documentFilter} onValueChange={setDocumentFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        <SelectItem value="uploaded">Uploaded</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Documents
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceOrders.flatMap(order => 
                    order.documents?.map(doc => ({
                      ...doc,
                      service_type: order.service_type,
                      entity_name: order.entity.name
                    })) || []
                  ).map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {document.filename}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{document.doctype}</Badge>
                            <Badge className={getStatusColor(document.status)}>
                              {document.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {(document.file_size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          {document.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              Rejection reason: {document.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Communications
                  <Select value={messageFilter} onValueChange={setMessageFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Messages</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceOrders.flatMap(order => 
                    order.messages?.map(msg => ({
                      ...msg,
                      service_order_id: order.id,
                      service_type: order.service_type
                    })) || []
                  ).map((message) => (
                    <div key={message.id} className={`p-4 border rounded-lg ${
                      !message.is_read ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : ""
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {message.subject}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {new Date(message.created_at).toLocaleDateString()} • 
                            Service: {message.service_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                        {!message.is_read && (
                          <Badge className="bg-blue-100 text-blue-800">New</Badge>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {message.body}
                      </p>
                      {message.attachments?.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {message.attachments.length} attachment(s)
                          </span>
                        </div>
                      )}
                      <Button variant="outline" size="sm">
                        Reply
                      </Button>
                    </div>
                  ))}

                  {/* New Message Form */}
                  <div className="border-t pt-4 mt-6">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Type your message here..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Attach File
                        </Button>
                        <Button onClick={() => selectedServiceOrder && sendMessage(selectedServiceOrder.id)}>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Total Outstanding
                          </h3>
                          <p className="text-2xl font-bold text-red-600">
                            ₹{clientMetrics?.totalOutstanding?.toLocaleString() || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            This Month
                          </h3>
                          <p className="text-2xl font-bold text-blue-600">
                            ₹{clientMetrics?.monthlySpend?.toLocaleString() || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Services Used
                          </h3>
                          <p className="text-2xl font-bold text-purple-600">
                            {serviceOrders.length}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Billing integration coming soon</p>
                    <Button>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Setup Payment Method
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Service Order Detail Modal */}
      {selectedServiceOrder && (
        <Dialog open={!!selectedServiceOrder} onOpenChange={() => setSelectedServiceOrder(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="capitalize">
                {selectedServiceOrder.service_type.replace(/_/g, ' ')} - Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Service Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedServiceOrder.status)}>
                    {selectedServiceOrder.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Progress</Label>
                  <Progress value={selectedServiceOrder.progress_percentage} className="mt-1" />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p className={getUrgencyColor(selectedServiceOrder.due_at)}>
                    {new Date(selectedServiceOrder.due_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label>Entity</Label>
                  <p>{selectedServiceOrder.entity.name}</p>
                </div>
              </div>

              {/* Tasks */}
              <div>
                <h3 className="font-semibold mb-3">Tasks</h3>
                <div className="space-y-2">
                  {selectedServiceOrder.tasks?.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-5 h-5 ${
                          task.status === "completed" ? "text-green-500" : "text-gray-300"
                        }`} />
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <Badge variant="outline" className="capitalize mt-1">
                            {task.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(task.due_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <h3 className="font-semibold mb-3">Documents</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">Drag & drop files or click to browse</p>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleDocumentUpload(selectedServiceOrder.id, e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload">Choose Files</label>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UniversalClientPortal;