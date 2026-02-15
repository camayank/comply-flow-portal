/**
 * Access Reviews
 *
 * Periodic access certification for DPDP/SOC2 compliance:
 * - Create review cycles (quarterly/annual)
 * - Review user access permissions
 * - Approve/revoke/modify access
 * - Generate audit trails
 */

import { useState } from 'react';
import { DashboardLayout, PageShell } from '@/layouts';
import {
  LayoutDashboard,
  FileBarChart,
  Users as UsersIcon,
  Building2,
  ClipboardCheck as ClipboardCheckNav,
  Blocks,
  Server,
  FileText,
  Webhook,
  Key,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  useAccessReviews,
  useAccessReviewItems,
  useCreateAccessReview,
  useSubmitReviewDecision,
  type AccessReview,
  type AccessReviewItem,
} from '@/hooks/useAudit';
import {
  Shield,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Users,
  Calendar,
  Loader2,
  AlertTriangle,
  Edit,
  Eye,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';

const adminNavigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: UsersIcon },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Access Reviews", href: "/admin/access-reviews", icon: ClipboardCheckNav },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Blueprints", href: "/admin/blueprints", icon: Blocks },
      { label: "Services", href: "/admin/services", icon: Server },
      { label: "Documents", href: "/admin/documents", icon: FileText },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
      { label: "API Keys", href: "/admin/api-keys", icon: Key },
    ],
  },
];

const adminUser = {
  name: "Admin",
  email: "admin@digicomply.com",
};

export default function AccessReviews() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AccessReview | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [newReview, setNewReview] = useState({
    name: '',
    reviewType: 'periodic' as 'periodic' | 'termination' | 'role_change',
    dueDate: '',
  });

  // Fetch reviews
  const { data: reviewsData, isLoading } = useAccessReviews({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Fetch items for selected review
  const { data: itemsData, isLoading: itemsLoading } = useAccessReviewItems(
    selectedReview?.id || 0,
    { enabled: !!selectedReview }
  );

  // Mutations
  const createMutation = useCreateAccessReview();
  const decisionMutation = useSubmitReviewDecision();

  const reviews = reviewsData?.reviews || [];
  const summary = reviewsData?.summary || {};
  const items = itemsData?.items || [];
  const itemsSummary = itemsData?.summary || {};

  const handleCreateReview = async () => {
    if (!newReview.name || !newReview.dueDate) {
      toast({
        title: 'Missing Information',
        description: 'Please provide review name and due date',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: newReview.name,
        reviewType: newReview.reviewType,
        dueDate: newReview.dueDate,
      });
      setIsCreateOpen(false);
      setNewReview({ name: '', reviewType: 'periodic', dueDate: '' });
      toast({
        title: 'Review Cycle Created',
        description: 'Access review cycle has been created with review items.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create access review',
        variant: 'destructive',
      });
    }
  };

  const handleDecision = async (
    itemId: number,
    decision: 'approved' | 'revoked' | 'modified',
    comments?: string,
    newRole?: string
  ) => {
    if (!selectedReview) return;

    try {
      await decisionMutation.mutateAsync({
        reviewId: selectedReview.id,
        itemId,
        data: { decision, comments, newRole },
      });
      toast({
        title: 'Decision Submitted',
        description: `Access ${decision === 'approved' ? 'approved' : decision === 'revoked' ? 'revoked' : 'modified'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit decision',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      draft: 'bg-gray-500',
      active: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return <Badge className={statusStyles[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getItemStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
      approved: { bg: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
      revoked: { bg: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
      modified: { bg: 'bg-purple-500', icon: <Edit className="h-3 w-3" /> },
    };
    const style = statusStyles[status] || { bg: 'bg-gray-500', icon: null };
    return (
      <Badge className={style.bg}>
        <span className="flex items-center gap-1">
          {style.icon}
          {status}
        </span>
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      dateStyle: 'medium',
    });
  };

  const calculateProgress = (review: AccessReview) => {
    if (!review.totalItems || review.totalItems === 0) return 0;
    return Math.round((review.completedItems / review.totalItems) * 100);
  };

  return (
    <DashboardLayout
      navigation={adminNavigation}
      user={adminUser}
      logo={<span className="text-xl font-bold text-primary">DigiComply</span>}
    >
      <PageShell
        title="Access Reviews"
        subtitle="Periodic access certification for DPDP/SOC2 compliance"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Access Reviews" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Review Cycle
          </Button>
        }
      >

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Reviews</p>
                <p className="text-2xl font-bold text-blue-600">{summary.active || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Decisions</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pendingItems || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{summary.completed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{summary.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reviews">Review Cycles</TabsTrigger>
          <TabsTrigger value="items" disabled={!selectedReview}>
            Review Items {selectedReview && `(${selectedReview.name})`}
          </TabsTrigger>
        </TabsList>

        {/* Review Cycles Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Review Cycles</CardTitle>
                  <CardDescription>
                    Manage access review cycles and track progress
                  </CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No access reviews found.</p>
                  <p className="text-sm mt-2">Create a review cycle to start certifying user access.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-medium">{review.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{review.reviewType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(review.status)}</TableCell>
                        <TableCell>
                          <div className="w-32 space-y-1">
                            <Progress value={calculateProgress(review)} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {review.completedItems || 0}/{review.totalItems || 0} items
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(review.dueDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(review.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReview(review)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Items Tab */}
        <TabsContent value="items">
          {selectedReview && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedReview.name}
                      {getStatusBadge(selectedReview.status)}
                    </CardTitle>
                    <CardDescription>
                      Review and certify user access permissions
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Due:</span> {formatDate(selectedReview.dueDate)}
                    </div>
                    <Button variant="outline" onClick={() => setSelectedReview(null)}>
                      Back to Reviews
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Items Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-sm text-yellow-600">Pending</p>
                    <p className="text-xl font-bold">{itemsSummary.pending || 0}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-green-600">Approved</p>
                    <p className="text-xl font-bold">{itemsSummary.approved || 0}</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-sm text-red-600">Revoked</p>
                    <p className="text-xl font-bold">{itemsSummary.revoked || 0}</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <p className="text-sm text-purple-600">Modified</p>
                    <p className="text-xl font-bold">{itemsSummary.modified || 0}</p>
                  </div>
                </div>

                {itemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No review items found.</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {items.map((item) => (
                      <ReviewItemAccordion
                        key={item.id}
                        item={item}
                        onDecision={handleDecision}
                        isPending={decisionMutation.isPending}
                      />
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Review Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Access Review Cycle</DialogTitle>
            <DialogDescription>
              Start a new access review cycle to certify user permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Review Name *</Label>
              <Input
                id="name"
                value={newReview.name}
                onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                placeholder="Q1 2024 Access Review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewType">Review Type *</Label>
              <Select
                value={newReview.reviewType}
                onValueChange={(value: any) => setNewReview({ ...newReview, reviewType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="periodic">Periodic Review</SelectItem>
                  <SelectItem value="termination">Termination Review</SelectItem>
                  <SelectItem value="role_change">Role Change Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={newReview.dueDate}
                onChange={(e) => setNewReview({ ...newReview, dueDate: e.target.value })}
              />
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Compliance Note</p>
                  <p>This will create review items for all active users in your organization. Each reviewer will need to certify or revoke access.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateReview}
              disabled={!newReview.name || !newReview.dueDate || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Review Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}

// Review Item Accordion Component
function ReviewItemAccordion({
  item,
  onDecision,
  isPending,
}: {
  item: AccessReviewItem;
  onDecision: (
    itemId: number,
    decision: 'approved' | 'revoked' | 'modified',
    comments?: string,
    newRole?: string
  ) => void;
  isPending: boolean;
}) {
  const [comments, setComments] = useState('');
  const [newRole, setNewRole] = useState('');
  const [showModify, setShowModify] = useState(false);

  const getItemStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
      approved: { bg: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
      revoked: { bg: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
      modified: { bg: 'bg-purple-500', icon: <Edit className="h-3 w-3" /> },
    };
    const style = statusStyles[status] || { bg: 'bg-gray-500', icon: null };
    return (
      <Badge className={style.bg}>
        <span className="flex items-center gap-1">
          {style.icon}
          {status}
        </span>
      </Badge>
    );
  };

  return (
    <AccordionItem value={`item-${item.id}`} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">{item.userName || `User #${item.userId}`}</p>
              <p className="text-sm text-muted-foreground">{item.userEmail || 'No email'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{item.currentRole}</p>
              <p className="text-xs text-muted-foreground">Current Role</p>
            </div>
            {getItemStatusBadge(item.decision || 'pending')}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 pb-6">
        <div className="space-y-4">
          {/* Access Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Access Type</p>
              <p className="font-medium">{item.accessType || 'Full Access'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Login</p>
              <p className="font-medium">{item.lastLogin || 'Never'}</p>
            </div>
            {item.accessDetails && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Access Details</p>
                <p className="font-medium">{item.accessDetails}</p>
              </div>
            )}
          </div>

          {/* Decision Section */}
          {item.decision === 'pending' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Comments (Optional)</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any notes about this access review..."
                  rows={2}
                />
              </div>

              {showModify && (
                <div className="space-y-2">
                  <Label>New Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => onDecision(item.id, 'approved', comments)}
                  disabled={isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Access
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDecision(item.id, 'revoked', comments)}
                  disabled={isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Revoke Access
                </Button>
                {showModify ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (newRole) {
                        onDecision(item.id, 'modified', comments, newRole);
                      }
                    }}
                    disabled={isPending || !newRole}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Apply Modification
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowModify(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modify Role
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Decision:</span>
                {getItemStatusBadge(item.decision || 'pending')}
              </div>
              {item.newRole && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Role changed:</span>
                  <span>{item.currentRole}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-medium">{item.newRole}</span>
                </div>
              )}
              {item.comments && (
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium">Comments:</span> {item.comments}
                </p>
              )}
              {item.reviewedBy && (
                <p className="text-xs text-muted-foreground mt-2">
                  Reviewed by {item.reviewedByName || `User #${item.reviewedBy}`} on{' '}
                  {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : '-'}
                </p>
              )}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
