import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Send,
  Download,
  Eye,
  RefreshCw,
  Home,
  Building2,
  FolderOpen,
  Calendar,
  CreditCard,
  Gift,
  ShoppingBag,
  ArrowRight,
  Info,
  HelpCircle,
  TrendingUp,
  Loader2,
  ListChecks,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  initiated: { label: "Initiated", color: "bg-blue-100 text-blue-800", icon: Clock },
  docs_uploaded: { label: "Documents Uploaded", color: "bg-purple-100 text-purple-800", icon: Upload },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800", icon: RefreshCw },
  ready_for_sign: { label: "Ready for Signature", color: "bg-yellow-100 text-yellow-800", icon: FileText },
  qc_review: { label: "QC Review", color: "bg-indigo-100 text-indigo-800", icon: Eye },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-800", icon: AlertCircle },
  on_hold: { label: "On Hold", color: "bg-gray-100 text-gray-800", icon: Clock },
};

export default function ServiceRequestUI() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceRequests = [], isLoading } = useQuery({
    queryKey: ['/api/client/service-requests'],
  });

  const { data: businessEntities = [] } = useQuery({
    queryKey: ['/api/client/entities'],
  });

  // Client portal navigation
  const navigation = [
    { label: 'Overview', href: '/client-portal', icon: Home },
    { label: 'Entities', href: '/client-portal/entities', icon: Building2 },
    { label: 'Services', href: '/client-portal/services', icon: FileText, badge: (serviceRequests as any[])?.filter((s: any) => s.status !== 'completed').length || 0 },
    { label: 'Documents', href: '/client-portal/documents', icon: FolderOpen },
    { label: 'Calendar', href: '/compliance-calendar', icon: Calendar },
    { label: 'Payments', href: '/wallet', icon: CreditCard },
    { label: 'Referrals', href: '/referral-dashboard', icon: Gift },
  ];

  // Calculate summary statistics
  const requests = serviceRequests as any[];
  const activeCount = requests?.filter((s: any) => !['completed', 'failed'].includes(s.status)).length || 0;
  const completedCount = requests?.filter((s: any) => s.status === 'completed').length || 0;
  const pendingDocsCount = requests?.filter((s: any) => s.status === 'initiated').length || 0;
  const inProgressCount = requests?.filter((s: any) => ['in_progress', 'docs_uploaded', 'ready_for_sign', 'qc_review'].includes(s.status)).length || 0;

  return (
    <DashboardLayout
      navigation={navigation}
      title="Client Portal"
      user={{ name: 'Client User', email: 'client@company.com' }}
      notificationCount={pendingDocsCount}
    >
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header with Education */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Services</h1>
              <p className="text-muted-foreground mt-1">
                Track your ongoing compliance services and request new ones
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/services">
                <Button variant="outline" data-testid="button-browse-services">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Browse Services
                </Button>
              </Link>
              <Link href="/services">
                <Button data-testid="button-new-request">
                  <FileText className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </Link>
            </div>
          </div>

          {/* Educational Alert - Only show when user has no requests */}
          {requests.length === 0 && !isLoading && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Welcome to My Services</AlertTitle>
              <AlertDescription>
                This page shows all your compliance service requests. To get started:
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Browse our <Link href="/services" className="text-primary hover:underline font-medium">Services Catalog</Link> to find what you need</li>
                  <li>Request a service (GST Filing, ROC Compliance, Tax Returns, etc.)</li>
                  <li>Upload required documents when prompted</li>
                  <li>Track progress and communicate with our team here</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Summary Statistics Cards */}
        {requests.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Services</p>
                    <p className="text-2xl font-bold">{activeCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Docs</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingDocsCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{inProgressCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workflow Guide - Always visible for education */}
        {requests.length > 0 && pendingDocsCount > 0 && (
          <Alert variant="default" className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Action Required</AlertTitle>
            <AlertDescription className="text-orange-700">
              You have {pendingDocsCount} service request{pendingDocsCount > 1 ? 's' : ''} waiting for document upload.
              Click on a request below to upload the required documents and move forward.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Requests List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Service Requests
              </h2>
              {requests.length > 0 && (
                <Badge variant="secondary">{requests.length} total</Badge>
              )}
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Loading your service requests...</p>
                </CardContent>
              </Card>
            ) : requests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Service Requests Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't requested any compliance services. Browse our catalog to find
                    GST filing, ROC compliance, tax returns, and 90+ other services.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/services">
                      <Button size="lg">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Browse Service Catalog
                      </Button>
                    </Link>
                    <Link href="/compliance-calendar">
                      <Button variant="outline" size="lg">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Compliance Calendar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              requests.map((request: any) => (
                <ServiceRequestCard
                  key={request.id}
                  request={request}
                  onClick={() => setSelectedRequest(request)}
                  isSelected={selectedRequest?.id === request.id}
                />
              ))
            )}
          </div>

          {/* Request Details / Help Panel */}
          <div className="lg:col-span-1 space-y-4">
            {selectedRequest ? (
              <ServiceRequestDetails request={selectedRequest} />
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Select a Request</p>
                    <p className="text-sm">Click on any service request to view details and take action</p>
                  </CardContent>
                </Card>

                {/* Help & Workflow Guide */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      How It Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</div>
                      <div>
                        <p className="font-medium text-sm">Request Service</p>
                        <p className="text-xs text-muted-foreground">Choose from 90+ compliance services</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">2</div>
                      <div>
                        <p className="font-medium text-sm">Upload Documents</p>
                        <p className="text-xs text-muted-foreground">Provide required supporting documents</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">3</div>
                      <div>
                        <p className="font-medium text-sm">We Process</p>
                        <p className="text-xs text-muted-foreground">Our team handles compliance filing</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">4</div>
                      <div>
                        <p className="font-medium text-sm">Get Confirmation</p>
                        <p className="text-xs text-muted-foreground">Receive completed documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/services" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                      <span className="text-sm">Service Catalog</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="/compliance-calendar" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                      <span className="text-sm">Compliance Calendar</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="/client-portal/documents" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                      <span className="text-sm">My Documents</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}

function ServiceRequestCard({ request, onClick, isSelected }: any) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.initiated;
  const StatusIcon = statusConfig.icon;
  
  const progress = calculateProgress(request.status);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-primary border-2" : ""
      }`}
      onClick={onClick}
      data-testid={`service-request-${request.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Request #{request.id} - {request.serviceId}
            </CardTitle>
            <CardDescription>
              {new Date(request.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{progress}% Complete</span>
            {request.totalAmount && (
              <span className="font-semibold">₹{request.totalAmount}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceRequestDetails({ request }: any) {
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadDocMutation = useMutation({
    mutationFn: (formData: FormData) => 
      fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/service-requests'] });
      toast({ title: "Success", description: "Documents uploaded successfully" });
      setUploadedFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/communications', 'POST', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Message sent successfully" });
      setMessage("");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleUploadDocs = () => {
    if (uploadedFiles.length === 0) {
      toast({ title: "No Files", description: "Please select files to upload", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('serviceRequestId', request.id.toString());
    formData.append('entityId', request.businessEntityId?.toString() || '');

    uploadDocMutation.mutate(formData);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      serviceRequestId: request.id,
      message,
      type: 'client_message',
    });
  };

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.initiated;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Request Details</CardTitle>
        <CardDescription>#{request.id}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Badge className={`${statusConfig.color} w-full justify-center py-2`}>
                {statusConfig.label}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label>Service Type</Label>
              <p className="text-sm">{request.serviceId}</p>
            </div>

            {request.totalAmount && (
              <div className="space-y-2">
                <Label>Amount</Label>
                <p className="text-2xl font-bold">₹{request.totalAmount}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
            </div>

            {request.assignedTo && (
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <p className="text-sm">{request.assignedTo}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <Input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {uploadedFiles.length > 0 && (
                <div className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm bg-muted p-2 rounded"
                    >
                      <Paperclip className="h-4 w-4" />
                      {file.name}
                    </div>
                  ))}
                  <Button
                    onClick={handleUploadDocs}
                    disabled={uploadDocMutation.isPending}
                    size="sm"
                    className="w-full mt-2"
                  >
                    {uploadDocMutation.isPending ? "Uploading..." : "Upload Files"}
                  </Button>
                </div>
              )}
            </div>

            {request.uploadedDocs && request.uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Documents</Label>
                {request.uploadedDocs.map((doc: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Messages would be loaded from API */}
              <div className="text-center text-sm text-muted-foreground py-4">
                No messages yet
              </div>
            </div>

            <div className="space-y-2">
              <Label>Send Message</Label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !message.trim()}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function calculateProgress(status: string): number {
  const progressMap: Record<string, number> = {
    initiated: 10,
    docs_uploaded: 30,
    in_progress: 50,
    ready_for_sign: 70,
    qc_review: 85,
    completed: 100,
    failed: 0,
    on_hold: 25,
  };
  return progressMap[status] || 0;
}
