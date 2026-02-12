import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, CheckCircle2, XCircle, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReviewDocument {
  id: number;
  documentType: string;
  category: string;
  fileName: string;
  originalFileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  fileUrl: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  createdAt: string;
  expiryDate?: string | null;
  businessEntityId?: number | null;
  userId: number;
  entityName?: string | null;
  uploaderName?: string | null;
  uploaderEmail?: string | null;
}

interface DocumentQueueResponse {
  data: ReviewDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const statusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "under_review":
      return "bg-yellow-100 text-yellow-800";
    case "pending":
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function OperationsDocumentReview() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<ReviewDocument | null>(null);

  const { data, isLoading } = useQuery<DocumentQueueResponse>({
    queryKey: ["/api/ops/document-vault", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      } else {
        params.set("status", "all");
      }
      const response = await fetch(`/api/ops/document-vault?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch documents" }));
        throw new Error(errorData.error || "Failed to fetch documents");
      }
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (documentId: number) =>
      apiRequest("PATCH", `/api/ops/document-vault/${documentId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/document-vault"] });
      toast({
        title: "Document Approved",
        description: "The document is now approved.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: number; reason: string }) =>
      apiRequest("PATCH", `/api/ops/document-vault/${documentId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/document-vault"] });
      toast({
        title: "Document Rejected",
        description: "The document rejection has been recorded.",
      });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedDocument(null);
    },
  });

  const openRejectDialog = (doc: ReviewDocument) => {
    setSelectedDocument(doc);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const documents = data?.data || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Document Review Queue</h1>
        <p className="text-muted-foreground">
          Review and approve evidence uploaded by clients across compliance checkpoints.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Evidence
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label className="text-sm">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading document queue...</div>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No documents in this queue.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.documentType} • {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.entityName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{doc.category}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.uploaderName || "Client User"}</p>
                        <p className="text-xs text-muted-foreground">{doc.uploaderEmail || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(doc.approvalStatus || "pending")}>
                        {(doc.approvalStatus || "pending").replace(/_/g, " ")}
                      </Badge>
                      {doc.approvalStatus === "rejected" && doc.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">{doc.rejectionReason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {doc.createdAt ? format(new Date(doc.createdAt), "dd MMM yyyy") : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {["pending", "under_review"].includes(doc.approvalStatus) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(doc.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(doc)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Provide a clear reason so the client knows what to re-upload.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason</Label>
            <Input
              placeholder="Example: Missing signature on the filing acknowledgment."
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedDocument &&
                rejectMutation.mutate({
                  documentId: selectedDocument.id,
                  reason: rejectReason,
                })
              }
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
