import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Service Requests</h1>
            <p className="text-muted-foreground">Track and manage your service requests</p>
          </div>
          
          <Button data-testid="button-new-request">
            <FileText className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="text-center py-12">Loading service requests...</div>
            ) : serviceRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Service Requests Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by creating your first service request
                  </p>
                  <Button>Create Request</Button>
                </CardContent>
              </Card>
            ) : (
              serviceRequests.map((request: any) => (
                <ServiceRequestCard
                  key={request.id}
                  request={request}
                  onClick={() => setSelectedRequest(request)}
                  isSelected={selectedRequest?.id === request.id}
                />
              ))
            )}
          </div>

          <div className="lg:col-span-1">
            {selectedRequest ? (
              <ServiceRequestDetails request={selectedRequest} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a service request to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
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
